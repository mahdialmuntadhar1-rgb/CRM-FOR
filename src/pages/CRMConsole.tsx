import { useEffect, useMemo, useState } from 'react';
import { crmService } from '../services/crmService';
import { computeNormalizationStats, normalizeIraqiPhone, renderTemplate } from '../lib/crmTransformers';
import { crmSupabaseProject } from '../lib/supabase';
import { nabdaAdapter } from '../services/nabdaAdapter';
import { healthService, HealthCheckResult } from '../services/healthService';
import { Contact, MessageQueueItem, MessageTemplate, RecipientFilter, SendLog, SendMode } from '../types/crm';

type TabKey = 'overview' | 'templates' | 'recipients' | 'test' | 'campaigns' | 'logs' | 'inbox' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'templates', label: 'Templates' },
  { key: 'recipients', label: 'Recipients' },
  { key: 'test', label: 'Test Send' },
  { key: 'campaigns', label: 'Campaigns / Queue' },
  { key: 'logs', label: 'Send Logs' },
  { key: 'inbox', label: 'Inbox / Replies' },
  { key: 'settings', label: 'Settings' },
];

const sendModeOptions: { value: SendMode; label: string }[] = [
  { value: 'test_phone_only', label: 'Test to my phone only' },
  { value: 'one_random', label: 'Send to 1 random person' },
  { value: 'three_random', label: 'Send to 3 random persons' },
  { value: 'ten_random', label: 'Send to 10 random persons' },
  { value: 'first_n', label: 'Send to first N filtered persons' },
  { value: 'all_filtered', label: 'Send to all filtered persons' },
  { value: 'manual_selected', label: 'Send to manually selected only' },
];

const baseFilter: RecipientFilter = { query: '', governorate: '', category: '', validity: 'all', sentState: 'all' };

export default function CRMConsole() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [queue, setQueue] = useState<MessageQueueItem[]>([]);
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<RecipientFilter>(baseFilter);
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [sendMode, setSendMode] = useState<SendMode>('test_phone_only');
  const [firstN, setFirstN] = useState(25);
  const [testPhone, setTestPhone] = useState(localStorage.getItem('crm_test_phone') || '');
  const [campaignName, setCampaignName] = useState('Nabda WhatsApp Campaign');
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);

  const [draftTemplate, setDraftTemplate] = useState<Partial<MessageTemplate>>({ name: '', body: '', is_active: false });

  const activeTemplate = useMemo(() => templates.find((t) => t.is_active) || templates[0], [templates]);

  const filteredContacts = useMemo(() => crmService.filterContacts(contacts, filter), [contacts, filter]);
  const selectedRecipients = useMemo(
    () =>
      crmService.pickRecipients({
        mode: sendMode,
        contacts: filteredContacts,
        manualIds,
        firstN,
        testPhone,
      }),
    [filteredContacts, sendMode, manualIds, firstN, testPhone],
  );

  const normalizationStats = useMemo(() => computeNormalizationStats(contacts), [contacts]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [cts, tpls, queueAndLogs, healthResult] = await Promise.all([
        crmService.getContacts(),
        crmService.getTemplates(),
        crmService.getQueueAndLogs(),
        healthService.run(),
      ]);
      setContacts(cts);
      setTemplates(tpls);
      setQueue(queueAndLogs.messages);
      setLogs(queueAndLogs.logs);
      setHealth(healthResult);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load CRM data. Confirm Supabase tables exist.';
      if (String(msg).includes('schema cache') || String(msg).includes('relation') || String(msg).includes('does not exist')) {
        setError(`CRM schema error: ${msg}. Run the latest SQL migration in Supabase for this CRM project.`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }


  async function runHealthCheck() {
    try {
      setHealth(await healthService.run());
    } catch (e: any) {
      setError(e.message || 'Health check failed');
    }
  }

  async function saveTemplate() {
    if (!draftTemplate.name || !draftTemplate.body) return;
    setSaving(true);
    try {
      await crmService.upsertTemplate(draftTemplate);
      setDraftTemplate({ name: '', body: '', is_active: false });
      setTemplates(await crmService.getTemplates());
      setActiveTab('templates');
    } finally {
      setSaving(false);
    }
  }

  async function runNormalization() {
    setSaving(true);
    try {
      await crmService.normalizeContacts(contacts);
      setContacts(await crmService.getContacts());
    } finally {
      setSaving(false);
    }
  }

  async function queueCampaign() {
    if (!activeTemplate) {
      alert('Create/select an active template first.');
      return;
    }

    if (sendMode === 'all_filtered' && !window.confirm(`Send to ALL filtered recipients (${selectedRecipients.length})?`)) {
      return;
    }

    setSaving(true);
    try {
      await crmService.createCampaignAndQueue({
        name: campaignName,
        template: activeTemplate,
        contacts: selectedRecipients,
        sendMode,
        filterSummary: JSON.stringify(filter),
      });
      const refreshed = await crmService.getQueueAndLogs();
      setQueue(refreshed.messages);
      setLogs(refreshed.logs);
      setActiveTab('campaigns');
    } finally {
      setSaving(false);
    }
  }

  async function processQueue() {
    setSaving(true);
    try {
      await nabdaAdapter.processNextBatch(10, 1500);
      const refreshed = await crmService.getQueueAndLogs();
      setQueue(refreshed.messages);
      setLogs(refreshed.logs);
    } catch (e: any) {
      alert(`Queue processor error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const preview = activeTemplate && selectedRecipients[0] ? renderTemplate(activeTemplate.body, selectedRecipients[0]) : '';

  if (loading) return <div className="p-8">Loading CRM data...</div>;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="bg-white rounded-2xl border p-4 md:p-6">
        <h1 className="text-2xl font-bold">WhatsApp CRM (Nabda Orchestrator)</h1>
        <p className="text-sm text-slate-600">Locked Supabase project: {crmSupabaseProject}</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </header>

      <nav className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`rounded-xl border px-3 py-2 text-sm ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <section className="space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <Stat title="Total numbers" value={normalizationStats.total} />
            <Stat title="Valid normalized" value={normalizationStats.valid} />
            <Stat title="Invalid" value={normalizationStats.invalid} />
            <Stat title="Duplicates removed" value={normalizationStats.duplicates} />
          </div>
          <div className="bg-white border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Admin readiness checklist</h2>
              <button className="text-sm border rounded px-2 py-1" onClick={runHealthCheck}>Refresh checks</button>
            </div>
            {!health && <p className="text-sm text-slate-600 mt-2">Health check unavailable. Verify edge function <code>crm-health</code> is deployed.</p>}
            {health && (
              <ul className="mt-3 space-y-1 text-sm">
                <li>{health.supabase.urlMatchesLockedProject ? '✅' : '❌'} Supabase project URL locked to {crmSupabaseProject}</li>
                <li>{health.tables.every((t) => t.ok) ? '✅' : '❌'} Required tables found ({health.tables.filter((t) => t.ok).length}/{health.tables.length})</li>
                <li>{health.env.NABDA_API_URL && health.env.NABDA_INSTANCE_ID && health.env.NABDA_API_TOKEN ? '✅' : '❌'} Nabda server env vars configured</li>
                <li>{health.tables.some((t) => t.table === 'webhook_events' && t.ok) ? '✅' : '❌'} Webhook storage table configured</li>
                <li>{health.ok ? '✅' : '⚠️'} Test send ready</li>
              </ul>
            )}
            {health?.missingTables?.length ? (
              <p className="text-sm text-red-600 mt-2">Missing tables: {health.missingTables.map((t) => t.table).join(', ')}</p>
            ) : null}
          </div>
        </section>
      )}

      {activeTab === 'templates' && (
        <section className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold">Template Manager</h2>
            <input className="w-full border rounded p-2" placeholder="Template name" value={draftTemplate.name || ''} onChange={(e) => setDraftTemplate((s) => ({ ...s, name: e.target.value }))} />
            <textarea className="w-full border rounded p-2 min-h-40" placeholder="Body with {{business_name}} {{governorate}} {{category}}" value={draftTemplate.body || ''} onChange={(e) => setDraftTemplate((s) => ({ ...s, body: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(draftTemplate.is_active)} onChange={(e) => setDraftTemplate((s) => ({ ...s, is_active: e.target.checked }))} /> Set as active/default
            </label>
            <button className="px-4 py-2 rounded bg-blue-600 text-white" disabled={saving} onClick={saveTemplate}>Save template</button>
          </div>
          <div className="bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-3">Saved templates</h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {templates.map((t) => (
                <div key={t.id} className="border rounded p-3">
                  <div className="flex justify-between items-center">
                    <strong>{t.name}</strong>
                    {t.is_active && <span className="text-xs bg-green-100 px-2 rounded">Active</span>}
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{t.body}</p>
                  <div className="flex gap-2 mt-2">
                    <button className="text-xs border px-2 py-1 rounded" onClick={() => setDraftTemplate(t)}>Edit</button>
                    <button className="text-xs border px-2 py-1 rounded" onClick={() => setDraftTemplate({ ...t, id: undefined, name: `${t.name} Copy` })}>Duplicate</button>
                    <button className="text-xs border px-2 py-1 rounded text-red-600" onClick={async () => { await crmService.deleteTemplate(t.id); setTemplates(await crmService.getTemplates()); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'recipients' && (
        <section className="space-y-3">
          <div className="bg-white border rounded-2xl p-4 grid md:grid-cols-6 gap-2">
            <input className="border rounded p-2" placeholder="Search" value={filter.query} onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))} />
            <input className="border rounded p-2" placeholder="Governorate" value={filter.governorate} onChange={(e) => setFilter((f) => ({ ...f, governorate: e.target.value }))} />
            <input className="border rounded p-2" placeholder="Category" value={filter.category} onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))} />
            <select className="border rounded p-2" value={filter.validity} onChange={(e) => setFilter((f) => ({ ...f, validity: e.target.value as any }))}><option value="all">All</option><option value="valid">Valid</option><option value="invalid">Invalid</option></select>
            <select className="border rounded p-2" value={filter.sentState} onChange={(e) => setFilter((f) => ({ ...f, sentState: e.target.value as any }))}><option value="all">All sent states</option><option value="sent">Already sent</option><option value="not_sent">Not yet sent</option></select>
            <button className="border rounded p-2" onClick={runNormalization} disabled={saving}>Run normalization</button>
          </div>
          <div className="text-sm">Filtered recipients: {filteredContacts.length}</div>
          <div className="bg-white border rounded-2xl p-3">
            <button className="text-xs border rounded px-2 py-1 mr-2" onClick={() => setManualIds(filteredContacts.map((c) => c.id))}>Select all filtered</button>
            <button className="text-xs border rounded px-2 py-1" onClick={() => setManualIds([])}>Clear manual selection</button>
            <div className="max-h-80 overflow-auto mt-2">
              {filteredContacts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1 text-sm border-b">
                  <input type="checkbox" checked={manualIds.includes(c.id)} onChange={(e) => setManualIds((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id))} />
                  <span>{c.display_name || c.original_name || 'Unnamed'} - {c.normalized_phone || c.raw_phone}</span>
                  {!c.is_phone_valid && <span className="text-red-600">invalid</span>}
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'test' && (
        <section className="bg-white border rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold text-lg">Test Send (separate from real campaign)</h2>
          <input
            className="border rounded p-2 w-full md:w-80"
            placeholder="My phone number"
            value={testPhone}
            onChange={(e) => {
              setTestPhone(e.target.value);
              localStorage.setItem('crm_test_phone', e.target.value);
            }}
          />
          <p className="text-sm text-slate-600">Normalized: {normalizeIraqiPhone(testPhone).normalized || 'Invalid'}</p>
          <div className="border rounded p-3 bg-slate-50 whitespace-pre-wrap">{preview || 'No preview yet. Select active template and at least one recipient.'}</div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-green-600 text-white" onClick={() => { setSendMode('test_phone_only'); queueCampaign(); }} disabled={saving}>Queue test message to my phone only</button>
            <button
              className="px-4 py-2 rounded bg-slate-900 text-white"
              disabled={saving || !normalizeIraqiPhone(testPhone).normalized || !preview}
              onClick={async () => {
                try {
                  setSaving(true);
                  await nabdaAdapter.sendSingle({ phone: normalizeIraqiPhone(testPhone).normalized || '', text: preview });
                  const refreshed = await crmService.getQueueAndLogs();
                  setQueue(refreshed.messages);
                  setLogs(refreshed.logs);
                  alert('Test send request submitted to Nabda. Check Send Logs tab.');
                } catch (e: any) {
                  alert(`Direct test send failed: ${e.message}`);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Send test now (single number)
            </button>
          </div>
        </section>
      )}

      {activeTab === 'campaigns' && (
        <section className="space-y-3">
          <div className="bg-white border rounded-2xl p-4 grid md:grid-cols-2 gap-3">
            <input className="border rounded p-2" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            <select className="border rounded p-2" value={sendMode} onChange={(e) => setSendMode(e.target.value as SendMode)}>
              {sendModeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {sendMode === 'first_n' && (
              <input type="number" className="border rounded p-2" value={firstN} onChange={(e) => setFirstN(Number(e.target.value))} />
            )}
            <div className="md:col-span-2 text-sm bg-amber-50 border border-amber-200 rounded p-2">
              About to queue <b>{selectedRecipients.length}</b> recipients, template: <b>{activeTemplate?.name || 'none'}</b>, mode: <b>{sendMode}</b>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={queueCampaign} disabled={saving}>Queue campaign</button>
              <button className="px-4 py-2 rounded bg-slate-900 text-white" onClick={processQueue} disabled={saving}>Process next Nabda batch</button>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-2">
            {['pending', 'sending', 'sent', 'failed', 'replied'].map((s) => (
              <div key={s}>
                <Stat title={s} value={queue.filter((q) => q.status === s).length} />
              </div>
            ))}
          </div>

          <div className="bg-white border rounded-2xl p-3 max-h-80 overflow-auto">
            {queue.map((q) => (
              <div key={q.id} className="text-sm py-2 border-b">
                {q.normalized_phone} - {q.status} - attempts {q.attempts}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'logs' && (
        <section className="bg-white border rounded-2xl p-3 max-h-96 overflow-auto">
          {logs.map((l) => (
            <div key={l.id} className="border-b py-2 text-sm">
              {l.created_at} - {l.normalized_phone} - {l.status} - {l.details || 'no details'}
            </div>
          ))}
        </section>
      )}

      {activeTab === 'inbox' && <section className="bg-white border rounded-2xl p-4">Inbox/Replies table can be connected to a future <code>replies</code> table or Nabda webhook sync.</section>}
      {activeTab === 'settings' && <section className="bg-white border rounded-2xl p-4">Settings: Supabase project lock, Nabda edge function names, default test phone.</section>}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl p-3">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

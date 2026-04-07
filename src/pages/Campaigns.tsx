import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Send, 
  Trash2, 
  Plus, 
  Info, 
  Layout, 
  Type, 
  Target, 
  Eye,
  CheckCircle2,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, StatusBadge, LoadingState } from '../components/ui/Common';
import { Template, StrategyType, CTAType, Language, Governorate } from '../types';
import { cn } from '../lib/utils';

const governorates: Governorate[] = [
  'Baghdad', 'Basra', 'Nineveh', 'Erbil', 'Najaf', 'Karbala', 
  'Anbar', 'Babil', 'Diyala', 'Duhok', 'Kirkuk', 'Maysan', 
  'Muthanna', 'Qadisiyah', 'Salah al-Din', 'Sulaymaniyah', 'Wasit', 'Dhi Qar'
];

const strategies: { type: StrategyType; label: string; description: string }[] = [
  { type: 'single_template', label: 'Single Template', description: 'Send one specific template to all targets.' },
  { type: 'random_template', label: 'Random Template', description: 'Randomly pick one of the selected templates for each target.' },
  { type: 'even_rotation', label: 'Even Rotation', description: 'Rotate through selected templates equally.' },
  { type: 'weighted_ab_test', label: 'Weighted A/B Test', description: 'Distribute templates based on custom percentage weights.' },
];

const ctaExplanations: Record<CTAType, string> = {
  no_link: 'Pure text message with no external links.',
  ask_for_reply: 'Encourages the user to reply to the message.',
  send_profile_link: 'Includes a link to the business profile page.',
  send_claim_link: 'Includes a link for the owner to claim their business.',
  send_dashboard_link: 'Includes a link to the business owner dashboard.',
  send_more_info_prompt: 'Prompts the user to ask for more information.'
};

export default function Campaigns() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('Arabic');
  const [filters, setFilters] = useState({
    governorate: '' as Governorate | '',
    city: '',
    category: '',
  });
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<StrategyType>('single_template');
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await api.getTemplates();
        setTemplates(data);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleWeightChange = (id: string, val: string) => {
    const num = parseInt(val) || 0;
    setWeights(prev => ({ ...prev, [id]: num }));
  };

  const selectedTemplates = templates.filter(t => selectedTemplateIds.includes(t.id));
  const previewTemplate = selectedTemplates[0] || templates[0];

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-10 pb-20">
      <PageHeader 
        title="Campaign Builder" 
        description="Create and launch targeted WhatsApp outreach campaigns."
        actions={
          <>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all">
              <Trash2 className="w-5 h-5" />
              Clear
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-50 transition-all">
              <Save className="w-5 h-5" />
              Save Draft
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
              <Send className="w-5 h-5" />
              Queue Messages
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Left Column: Configuration */}
        <div className="xl:col-span-2 space-y-10">
          
          {/* Section A: Campaign Details */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Layout className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Campaign Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Campaign Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Ramadan Special 2024"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Language Preference</label>
                <select 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium appearance-none"
                  value={selectedLanguage}
                  onChange={e => setSelectedLanguage(e.target.value as Language)}
                >
                  <option value="Arabic">Arabic</option>
                  <option value="Kurdish">Kurdish</option>
                  <option value="English">English</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Notes (Optional)</label>
                <textarea 
                  placeholder="Internal notes about this campaign..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium min-h-[100px]"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Audience Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select 
                  className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-300 font-medium text-sm"
                  value={filters.governorate}
                  onChange={e => setFilters(prev => ({ ...prev, governorate: e.target.value as Governorate }))}
                >
                  <option value="">All Governorates</option>
                  {governorates.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input 
                  type="text" 
                  placeholder="City..." 
                  className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-300 font-medium text-sm"
                  value={filters.city}
                  onChange={e => setFilters(prev => ({ ...prev, city: e.target.value }))}
                />
                <input 
                  type="text" 
                  placeholder="Category..." 
                  className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-300 font-medium text-sm"
                  value={filters.category}
                  onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Section B: Template Selection */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Type className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Select Templates</h2>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedTemplateIds.length} Selected</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div 
                  key={template.id}
                  onClick={() => toggleTemplate(template.id)}
                  className={cn(
                    "p-5 rounded-3xl border-2 transition-all cursor-pointer group relative",
                    selectedTemplateIds.includes(template.id)
                      ? "border-blue-600 bg-blue-50/30 shadow-md shadow-blue-100"
                      : "border-slate-100 bg-white hover:border-blue-200 shadow-sm"
                  )}
                >
                  {selectedTemplateIds.includes(template.id) && (
                    <div className="absolute top-4 right-4 text-blue-600">
                      <CheckCircle2 className="w-6 h-6 fill-blue-50" />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <StatusBadge status={template.language} />
                    <StatusBadge status={template.tone} />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">{template.name}</h4>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {template.body}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{template.cta_type.replace(/_/g, ' ')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section C: Strategy Selector */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Template Strategy</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategies.map((s) => (
                <div 
                  key={s.type}
                  onClick={() => setStrategy(s.type)}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all cursor-pointer",
                    strategy === s.type
                      ? "border-amber-500 bg-amber-50/30"
                      : "border-slate-50 bg-slate-50/30 hover:border-amber-200"
                  )}
                >
                  <h4 className="font-bold text-slate-900 mb-1">{s.label}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>

            {strategy === 'weighted_ab_test' && selectedTemplates.length > 0 && (
              <div className="p-6 bg-slate-50 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Set Weights (%)</h4>
                <div className="space-y-3">
                  {selectedTemplates.map(t => (
                    <div key={t.id} className="flex items-center gap-4">
                      <span className="flex-1 text-sm font-bold text-slate-700">{t.name}</span>
                      <div className="w-32 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                        <input 
                          type="number" 
                          className="w-full bg-transparent outline-none text-sm font-bold text-right"
                          value={weights[t.id] || 0}
                          onChange={e => handleWeightChange(t.id, e.target.value)}
                        />
                        <span className="text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Total Weight</span>
                  <span className={cn(
                    Object.values(weights).reduce((a, b) => (a as number) + (b as number), 0) === 100 ? "text-emerald-600" : "text-rose-500"
                  )}>
                    {Object.values(weights).reduce((a, b) => (a as number) + (b as number), 0)}% / 100%
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Preview & Summary */}
        <div className="space-y-8">
          {/* Live Message Preview */}
          <section className="sticky top-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Live Preview</h2>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col aspect-[9/16] max-h-[700px]">
              {/* Phone Header */}
              <div className="bg-slate-900 p-6 flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold">
                  {previewTemplate ? previewTemplate.name.charAt(0) : 'T'}
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-none mb-1">WhatsApp CRM</p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">Business Account</p>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 bg-[#efeae2] p-6 space-y-4 overflow-y-auto">
                <div className="max-w-[85%] bg-white p-4 rounded-2xl rounded-tl-none shadow-sm relative">
                  <div className="absolute top-0 -left-2 w-0 h-0 border-t-[12px] border-t-white border-l-[12px] border-l-transparent" />
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {previewTemplate ? previewTemplate.body
                      .replace('{{business_name}}', 'Al Noor Cafe')
                      .replace('{{city}}', 'Baghdad')
                      .replace('{{category}}', 'Cafe')
                      .replace('{{profile_link}}', 'reachhub.iq/al-noor')
                      : 'Select a template to see preview...'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold text-right mt-2 uppercase tracking-widest">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {previewTemplate && previewTemplate.cta_type !== 'no_link' && (
                  <div className="max-w-[85%] bg-white p-3 rounded-xl shadow-sm flex items-center justify-between border-t-4 border-blue-600">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {previewTemplate.cta_type.replace(/_/g, ' ')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-blue-600" />
                  </div>
                )}
              </div>

              {/* Preview Info */}
              <div className="bg-white p-6 border-t border-slate-100 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={previewTemplate?.language || 'Arabic'} />
                  <StatusBadge status={previewTemplate?.tone || 'Friendly'} />
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-1">CTA Strategy</h5>
                    <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                      {previewTemplate ? ctaExplanations[previewTemplate.cta_type] : 'Select a template to see CTA details.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Summary Card */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl shadow-slate-200">
              <h3 className="text-lg font-black tracking-tight mb-4">Campaign Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold">Audience Size</span>
                  <span className="font-black">~1,240 Businesses</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold">Estimated Time</span>
                  <span className="font-black">45 Minutes</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold">Cost Estimate</span>
                  <span className="font-black">$12.40</span>
                </div>
                <div className="pt-3 border-t border-slate-800 mt-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Testing Mode Active</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

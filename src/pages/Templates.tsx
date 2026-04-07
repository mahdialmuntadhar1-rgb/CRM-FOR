import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Copy, 
  Edit2, 
  Archive, 
  Eye,
  ChevronRight,
  Info,
  Type,
  Layout,
  Target,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, StatusBadge, LoadingState, EmptyState } from '../components/ui/Common';
import { Template, CTAType, Language, Tone } from '../types';
import { cn } from '../lib/utils';

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState<Language | 'All'>('All');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);

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

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang = filterLang === 'All' || t.language === filterLang;
    return matchesSearch && matchesLang;
  });

  const openEditor = (template?: Template) => {
    setEditingTemplate(template || {
      name: '',
      language: 'Arabic',
      tone: 'Friendly',
      objective: '',
      cta_type: 'no_link',
      body: '',
      is_active: true
    });
    setIsEditorOpen(true);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-10">
      <PageHeader 
        title="Template Manager" 
        description="Create and organize your message templates for different outreach goals."
        actions={
          <button 
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Create Template
          </button>
        }
      />

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl w-full md:w-96 border border-slate-100 focus-within:border-blue-200 transition-all">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search templates..." 
            className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-900"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-700"
              value={filterLang}
              onChange={e => setFilterLang(e.target.value as any)}
            >
              <option value="All">All Languages</option>
              <option value="Arabic">Arabic</option>
              <option value="Kurdish">Kurdish</option>
              <option value="English">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div 
              key={template.id}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={template.language} />
                    <StatusBadge status={template.tone} />
                    <StatusBadge status={template.is_active ? 'Active' : 'Inactive'} />
                  </div>
                  <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{template.name}</h3>
                <p className="text-sm text-slate-500 font-medium line-clamp-4 leading-relaxed mb-4">
                  {template.body}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Target className="w-3 h-3" />
                  {template.cta_type.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between rounded-b-[2rem]">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Updated {new Date(template.last_updated).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openEditor(template)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Duplicate">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Archive">
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState 
          title="No templates found" 
          description="Try adjusting your search or create a new template to get started."
          icon={<FileText className="w-12 h-12" />}
          action={
            <button 
              onClick={() => openEditor()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
            >
              Create Template
            </button>
          }
        />
      )}

      {/* Template Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsEditorOpen(false)} />
          <div className="relative bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300">
            {/* Form Side */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingTemplate?.id ? 'Edit Template' : 'New Template'}
                </h2>
                <button onClick={() => setIsEditorOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Template Name</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium"
                    value={editingTemplate?.name}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Language</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium appearance-none"
                    value={editingTemplate?.language}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, language: e.target.value as any }))}
                  >
                    <option value="Arabic">Arabic</option>
                    <option value="Kurdish">Kurdish</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Tone</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium appearance-none"
                    value={editingTemplate?.tone}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, tone: e.target.value as any }))}
                  >
                    <option value="Friendly">Friendly</option>
                    <option value="Professional">Professional</option>
                    <option value="Direct">Direct</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">CTA Type</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium appearance-none"
                    value={editingTemplate?.cta_type}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, cta_type: e.target.value as any }))}
                  >
                    <option value="no_link">No Link</option>
                    <option value="ask_for_reply">Ask for Reply</option>
                    <option value="send_profile_link">Send Profile Link</option>
                    <option value="send_claim_link">Send Claim Link</option>
                    <option value="send_dashboard_link">Send Dashboard Link</option>
                    <option value="send_more_info_prompt">More Info Prompt</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Message Body</label>
                  <textarea 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium min-h-[150px]"
                    value={editingTemplate?.body}
                    onChange={e => setEditingTemplate(prev => ({ ...prev, body: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['business_name', 'city', 'governorate', 'category', 'profile_link'].map(p => (
                      <button 
                        key={p}
                        onClick={() => setEditingTemplate(prev => ({ ...prev, body: (prev?.body || '') + ` {{${p}}}` }))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-black text-slate-600 rounded-lg transition-colors uppercase tracking-wider"
                      >
                        + {p.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setIsEditorOpen(false)}
                  className="px-6 py-3 text-slate-600 font-bold hover:text-slate-900 transition-all"
                >
                  Cancel
                </button>
                <button className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                  Save Template
                </button>
              </div>
            </div>

            {/* Preview Side */}
            <div className="hidden md:flex md:w-[400px] bg-slate-50 p-12 flex-col items-center justify-center border-l border-slate-100">
              <div className="flex items-center gap-3 mb-8 w-full">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Live Preview</h3>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col w-full aspect-[9/16] max-h-[600px] scale-95 origin-center">
                <div className="bg-slate-900 p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {editingTemplate?.name?.charAt(0) || 'T'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold leading-none truncate">{editingTemplate?.name || 'New Template'}</p>
                  </div>
                </div>
                <div className="flex-1 bg-[#efeae2] p-4 space-y-3 overflow-y-auto">
                  <div className="max-w-[90%] bg-white p-3 rounded-xl rounded-tl-none shadow-sm relative">
                    <div className="absolute top-0 -left-1.5 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent" />
                    <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {(editingTemplate?.body || 'Start typing to see preview...')
                        .replace(/{{business_name}}/g, 'Al Noor Cafe')
                        .replace(/{{city}}/g, 'Baghdad')
                        .replace(/{{category}}/g, 'Cafe')
                        .replace(/{{profile_link}}/g, 'reachhub.iq/al-noor')}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold text-right mt-1 uppercase tracking-widest">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {editingTemplate?.cta_type && editingTemplate.cta_type !== 'no_link' && (
                    <div className="max-w-[90%] bg-white p-2.5 rounded-lg shadow-sm flex items-center justify-between border-t-2 border-blue-600">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                        {editingTemplate.cta_type.replace(/_/g, ' ')}
                      </span>
                      <ChevronRight className="w-3 h-3 text-blue-600" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 p-4 bg-white rounded-2xl border border-slate-200 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview Context</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium italic">
                  Showing sample data for "Al Noor Cafe" in "Baghdad".
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

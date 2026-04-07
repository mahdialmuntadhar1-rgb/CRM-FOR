import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Copy, 
  Archive, 
  HelpCircle, 
  Sparkles,
  MessageSquare,
  ChevronRight,
  PlusCircle,
  Type,
  Layout,
  Target,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, StatusBadge, LoadingState, EmptyState } from '../components/ui/Common';
import { FAQAnswer, Language } from '../types';
import { cn } from '../lib/utils';

export default function FAQ() {
  const [faqs, setFaqs] = useState<FAQAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState<Language | 'All'>('All');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<Partial<FAQAnswer> | null>(null);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const data = await api.getFAQs();
        setFaqs(data);
      } catch (error) {
        console.error('Error fetching FAQs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFAQs();
  }, []);

  const filteredFAQs = faqs.filter(f => {
    const matchesSearch = f.intent_key.toLowerCase().includes(searchQuery.toLowerCase()) || f.short_answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang = filterLang === 'All' || f.language === filterLang;
    return matchesSearch && matchesLang;
  });

  const openEditor = (faq?: FAQAnswer) => {
    setEditingFAQ(faq || {
      intent_key: '',
      language: 'Arabic',
      question_patterns: [],
      short_answer: '',
      full_answer: '',
      is_active: true
    });
    setIsEditorOpen(true);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-10">
      <PageHeader 
        title="FAQ / Suggested Replies" 
        description="Manage automated responses and suggested replies for common customer intents."
        actions={
          <button 
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Add FAQ
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Left Column: FAQ List */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl w-full md:w-96 border border-slate-100 focus-within:border-blue-200 transition-all">
              <Search className="w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search FAQs..." 
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

          <div className="space-y-4">
            {filteredFAQs.map((faq) => (
              <div 
                key={faq.id}
                className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{faq.intent_key.replace(/_/g, ' ')}</h3>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={faq.language} className="text-[9px] px-1.5 py-0" />
                        <StatusBadge status={faq.is_active ? 'Active' : 'Inactive'} className="text-[9px] px-1.5 py-0" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openEditor(faq)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-50">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Keywords / Patterns</h4>
                    <div className="flex flex-wrap gap-2">
                      {faq.question_patterns.map((p, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-100 uppercase tracking-wider">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Suggested Reply</h4>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                      "{faq.short_answer}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Preview & Editor */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 text-blue-400 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Suggested Reply Preview</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incoming Question</span>
                </div>
                <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700">
                  <p className="text-sm font-medium text-slate-200 leading-relaxed">
                    "Hello, can you tell me more about your pricing plans for Baghdad businesses?"
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="px-4 py-1.5 bg-blue-600/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-600/30">
                  Matched Intent: pricing_query
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested Answer</span>
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <div className="bg-blue-600 p-4 rounded-2xl rounded-tr-none shadow-lg shadow-blue-900/50">
                  <p className="text-sm font-medium text-white leading-relaxed">
                    "Thank you for your interest! Our basic plan starts at $50/month, which includes up to 1000 messages. For larger volumes, we have custom enterprise plans."
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  This preview shows how the AI matches incoming messages to your FAQ intents and suggests the appropriate reply.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">AI Training Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Total Intents</span>
                <span className="text-sm font-black text-slate-900">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Confidence Score</span>
                <span className="text-sm font-black text-emerald-600">92%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Last Trained</span>
                <span className="text-sm font-black text-slate-900">2 hours ago</span>
              </div>
            </div>
            <button className="w-full py-3 bg-slate-50 text-slate-900 text-xs font-black uppercase tracking-widest rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all">
              Retrain AI Model
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsEditorOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 md:p-12 overflow-y-auto space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {editingFAQ?.id ? 'Edit FAQ' : 'New FAQ'}
                </h2>
                <button onClick={() => setIsEditorOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Intent Key</label>
                  <input 
                    type="text" 
                    placeholder="e.g., pricing_query"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium"
                    value={editingFAQ?.intent_key}
                    onChange={e => setEditingFAQ(prev => ({ ...prev, intent_key: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Language</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium appearance-none"
                    value={editingFAQ?.language}
                    onChange={e => setEditingFAQ(prev => ({ ...prev, language: e.target.value as any }))}
                  >
                    <option value="Arabic">Arabic</option>
                    <option value="Kurdish">Kurdish</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Question Patterns (Comma separated)</label>
                  <input 
                    type="text" 
                    placeholder="how much, price, cost, كم السعر"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium"
                    value={editingFAQ?.question_patterns?.join(', ')}
                    onChange={e => setEditingFAQ(prev => ({ ...prev, question_patterns: e.target.value.split(',').map(s => s.trim()) }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Short Answer (Suggested Reply)</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium"
                    value={editingFAQ?.short_answer}
                    onChange={e => setEditingFAQ(prev => ({ ...prev, short_answer: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Full Answer (Detailed)</label>
                  <textarea 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-300 focus:bg-white transition-all font-medium min-h-[120px]"
                    value={editingFAQ?.full_answer}
                    onChange={e => setEditingFAQ(prev => ({ ...prev, full_answer: e.target.value }))}
                  />
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
                  Save FAQ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

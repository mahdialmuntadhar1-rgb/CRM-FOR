import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Filter, 
  MapPin, 
  Building2, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ChevronRight,
  Loader2,
  Save,
  Play,
  Users
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Business, Governorate } from '@/types';
import { cn } from '@/lib/utils';

const governorates: Governorate[] = [
  'Baghdad', 'Basra', 'Nineveh', 'Erbil', 'Najaf', 'Karbala', 
  'Anbar', 'Babil', 'Diyala', 'Duhok', 'Kirkuk', 'Maysan', 
  'Muthanna', 'Qadisiyah', 'Salah al-Din', 'Sulaymaniyah', 'Wasit', 'Dhi Qar'
];

export default function Campaigns() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState<Governorate | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [matchingBusinesses, setMatchingBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchMatching() {
      setLoading(true);
      try {
        let query = supabase.from('businesses').select('*').eq('whatsapp_enabled', true);
        
        if (selectedGovernorate) {
          query = query.eq('governorate', selectedGovernorate);
        }
        if (selectedCategory) {
          query = query.ilike('category', `%${selectedCategory}%`);
        }

        const { data, error } = await query.limit(50);
        if (error) throw error;
        setMatchingBusinesses(data || []);
      } catch (error) {
        console.error('Error fetching matching businesses:', error);
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(fetchMatching, 500);
    return () => clearTimeout(debounce);
  }, [selectedGovernorate, selectedCategory]);

  const handleCreateCampaign = async (queueNow = false) => {
    if (!name || !message) {
      alert('Please fill in campaign name and message');
      return;
    }

    setSaving(true);
    try {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name,
          message_text: message,
          filters: {
            governorate: selectedGovernorate || undefined,
            category: selectedCategory || undefined,
          },
          status: queueNow ? 'queued' : 'draft',
          total_targets: matchingBusinesses.length,
          sent_count: 0,
          failed_count: 0,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      if (queueNow && campaign) {
        // In a real app, this would be handled by a Supabase Edge Function
        // For now, we'll just insert the message records
        const messages = matchingBusinesses.map(b => ({
          campaign_id: campaign.id,
          business_id: b.id,
          status: 'queued'
        }));

        const { error: messagesError } = await supabase.from('messages').insert(messages);
        if (messagesError) throw messagesError;
      }

      alert(`Campaign ${queueNow ? 'queued' : 'saved'} successfully!`);
      // Reset form
      setName('');
      setMessage('');
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Campaign Builder</h2>
          <p className="text-slate-500 mt-1 font-medium">Design and target your outreach messages.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Builder Form */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Campaign Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ramadan Special Offer - Baghdad" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Message Template</label>
              <textarea 
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hello {{business_name}}, we have a special offer for businesses in {{governorate}}..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium resize-none"
              />
              <p className="text-xs text-slate-400 font-medium italic">Use variables like {"{{business_name}}"} and {"{{governorate}}"}.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Governorate</label>
                <select 
                  value={selectedGovernorate}
                  onChange={(e) => setSelectedGovernorate(e.target.value as Governorate)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium appearance-none"
                >
                  <option value="">All Governorates</option>
                  {governorates.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Category</label>
                <input 
                  type="text" 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  placeholder="e.g., Restaurant, Retail" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <input 
                type="checkbox" 
                id="testing"
                checked={isTestingMode}
                onChange={(e) => setIsTestingMode(e.target.checked)}
                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="testing" className="text-sm font-bold text-slate-700 cursor-pointer">
                Testing Mode (Send only to my number)
              </label>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button 
                onClick={() => handleCreateCampaign(false)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-slate-900 border border-slate-200 px-6 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Draft
              </button>
              <button 
                onClick={() => handleCreateCampaign(true)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                Queue Messages
              </button>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              Target Audience Preview
            </h3>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Matching Businesses</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h4 className="text-3xl font-black">{loading ? '...' : matchingBusinesses.length}</h4>
                  <span className="text-emerald-400 text-xs font-bold">WhatsApp Enabled</span>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Est. Delivery Time</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h4 className="text-3xl font-black">{Math.ceil(matchingBusinesses.length / 10)}</h4>
                  <span className="text-slate-400 text-xs font-bold">Minutes</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sample Targets</p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                  ))
                ) : matchingBusinesses.length > 0 ? (
                  matchingBusinesses.map((business) => (
                    <div key={business.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm">{business.name}</h5>
                          <p className="text-xs text-slate-400">{business.phone} • {business.governorate}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No businesses match your filters.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              Message Preview
            </h3>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative">
              <div className="absolute top-0 left-6 -translate-y-1/2 w-4 h-4 bg-slate-50 border-l border-t border-slate-100 rotate-45" />
              <p className="text-slate-900 font-medium leading-relaxed">
                {message ? message.replace('{{business_name}}', matchingBusinesses[0]?.name || 'Business Name').replace('{{governorate}}', matchingBusinesses[0]?.governorate || 'Governorate') : 'Your message will appear here...'}
              </p>
              <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>WhatsApp Message</span>
                <span>12:45 PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

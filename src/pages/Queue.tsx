import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  Search, 
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Message, Campaign } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function Queue() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [campaignsRes, messagesRes] = await Promise.all([
          supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
          supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(100)
        ]);

        setCampaigns(campaignsRes.data || []);
        setMessages(messagesRes.data || []);
      } catch (error) {
        console.error('Error fetching queue data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('message-updates')
      .on('postgres_changes' as any, { event: '*', table: 'messages' }, (payload: any) => {
        setMessages(prev => {
          if (payload.eventType === 'INSERT') return [payload.new as Message, ...prev];
          if (payload.eventType === 'UPDATE') return prev.map(m => m.id === payload.new.id ? payload.new as Message : m);
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStartSending = () => {
    setSending(true);
    // In a real app, this would call a Supabase Edge Function
    alert('Message sending started via background process.');
  };

  const handlePauseSending = () => {
    setSending(false);
    alert('Message sending paused.');
  };

  const filteredMessages = selectedCampaign === 'all' 
    ? messages 
    : messages.filter(m => m.campaign_id === selectedCampaign);

  const stats = {
    queued: messages.filter(m => m.status === 'queued').length,
    sent: messages.filter(m => m.status === 'sent').length,
    failed: messages.filter(m => m.status === 'failed').length,
  };

  const progress = messages.length > 0 ? (stats.sent / messages.length) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Message Queue</h2>
          <p className="text-slate-500 mt-1 font-medium">Monitor and control your message delivery.</p>
        </div>
        <div className="flex items-center gap-3">
          {sending ? (
            <button 
              onClick={handlePauseSending}
              className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all"
            >
              <Pause className="w-5 h-5" />
              Pause Sending
            </button>
          ) : (
            <button 
              onClick={handleStartSending}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
            >
              <Play className="w-5 h-5" />
              Start Sending
            </button>
          )}
          <button className="p-3 bg-white text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">Overall Progress</h3>
            <p className="text-sm text-slate-400 font-medium">Delivery status for all active campaigns</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Queued</p>
              <p className="text-2xl font-black text-slate-900">{stats.queued}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Sent</p>
              <p className="text-2xl font-black text-emerald-600">{stats.sent}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Failed</p>
              <p className="text-2xl font-black text-rose-600">{stats.failed}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span>{Math.round(progress)}% Completed</span>
            <span>{stats.sent} of {messages.length} messages</span>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 appearance-none pr-4"
              >
                <option value="all">All Campaigns</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                  </tr>
                ))
              ) : filteredMessages.length > 0 ? (
                filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xs">
                          {message.business_id.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900 text-sm">Business ID: {message.business_id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">
                        {campaigns.find(c => c.id === message.campaign_id)?.name || 'Unknown Campaign'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {message.status === 'sent' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {message.status === 'failed' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                        {message.status === 'queued' && <Clock className="w-4 h-4 text-blue-500" />}
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-wider",
                          message.status === 'sent' ? "text-emerald-600" : 
                          message.status === 'failed' ? "text-rose-600" : "text-blue-600"
                        )}>
                          {message.status}
                        </span>
                      </div>
                      {message.error_message && (
                        <p className="text-[10px] text-rose-400 mt-1 font-medium">{message.error_message}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400 font-medium">
                        {message.sent_at ? formatDistanceToNow(new Date(message.sent_at)) + ' ago' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Send className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-medium">No messages in queue.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-slate-50 flex items-center justify-between">
          <p className="text-sm text-slate-400 font-medium">Showing 1 to 10 of {messages.length} results</p>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30" disabled>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="w-8 h-8 bg-blue-600 text-white rounded-lg text-sm font-bold">1</button>
            <button className="w-8 h-8 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold">2</button>
            <button className="w-8 h-8 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold">3</button>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

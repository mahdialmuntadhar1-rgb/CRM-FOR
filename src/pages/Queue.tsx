import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RefreshCw, 
  Search, 
  Filter, 
  MoreVertical, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Send,
  ListOrdered,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, StatusBadge, LoadingState, StatCard, EmptyState } from '../components/ui/Common';
import { Message, MessageStatus } from '../types';
import { cn } from '../lib/utils';

export default function Queue() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<MessageStatus | 'All'>('All');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [m, s] = await Promise.all([
          api.getMessages(),
          api.getQueueStats()
        ]);
        setMessages(m);
        setStats(s);
      } catch (error) {
        console.error('Error fetching queue data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredMessages = messages.filter(m => {
    const matchesSearch = m.business_name.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery);
    const matchesStatus = filterStatus === 'All' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-10">
      <PageHeader 
        title="Message Queue" 
        description="Monitor and manage outgoing messages in real-time."
        actions={
          <>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all">
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-rose-600 rounded-2xl font-bold hover:bg-rose-50 transition-all">
              <RotateCcw className="w-5 h-5" />
              Retry Failed
            </button>
            <button 
              onClick={() => setIsSending(!isSending)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200",
                isSending 
                  ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200" 
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              )}
            >
              {isSending ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isSending ? 'Pause Sending' : 'Start Sending'}
            </button>
          </>
        }
      />

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Queued" value={stats.queued} icon={<Clock className="w-6 h-6" />} />
        <StatCard title="Sending" value={stats.sending} icon={<Send className="w-6 h-6 text-blue-600" />} />
        <StatCard title="Sent" value={stats.sent} icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} />
        <StatCard title="Failed" value={stats.failed} icon={<AlertCircle className="w-6 h-6 text-rose-600" />} />
      </div>

      {/* Progress Bar */}
      {isSending && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center animate-pulse">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Sending Messages...</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Campaign: Ramadan Special 2024</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900 leading-none">1,450 / 1,570</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">92% Complete</p>
            </div>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full w-[92%] transition-all duration-1000" />
          </div>
          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Started 12 mins ago</span>
            <span>Est. 4 mins remaining</span>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl w-full md:w-96 border border-slate-100 focus-within:border-blue-200 transition-all">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by business or phone..." 
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
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
            >
              <option value="All">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      {filteredMessages.length > 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Business</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Campaign / Template</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Message Preview</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900">{message.business_name}</p>
                      <p className="text-xs text-slate-500 font-medium">{message.phone}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-900">Ramadan Special</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Welcome Offer</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 max-w-xs leading-relaxed">
                        {message.rendered_body}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <StatusBadge status={message.status} />
                        {message.error_message && (
                          <p className="text-[10px] text-rose-500 font-bold leading-none">{message.error_message}</p>
                        )}
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {message.sent_at ? new Date(message.sent_at).toLocaleTimeString() : 'Pending'}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState 
          title="Queue is empty" 
          description="There are no messages currently in the queue. Start a new campaign to populate it."
          icon={<ListOrdered className="w-12 h-12" />}
          action={
            <button className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">
              Go to Campaigns
            </button>
          }
        />
      )}
    </div>
  );
}

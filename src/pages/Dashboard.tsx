import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Phone, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare,
  ArrowRight,
  Plus,
  Zap
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import { supabase } from '@/lib/supabase';
import { Campaign, Business } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    whatsappEnabled: 0,
    totalCampaigns: 0,
    queuedMessages: 0,
    sentMessages: 0,
    failedMessages: 0,
    repliedConversations: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [
          { count: businessesCount },
          { count: whatsappCount },
          { count: campaignsCount },
          { data: campaignsData },
          { count: queuedCount },
          { count: sentCount },
          { count: failedCount },
          { count: repliedCount },
        ] = await Promise.all([
          supabase.from('businesses').select('*', { count: 'exact', head: true }),
          supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('whatsapp_enabled', true),
          supabase.from('campaigns').select('*', { count: 'exact', head: true }),
          supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
          supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
          supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
          supabase.from('conversations').select('*', { count: 'exact', head: true }).gt('unread_count', 0),
        ]);

        setStats({
          totalBusinesses: businessesCount || 0,
          whatsappEnabled: whatsappCount || 0,
          totalCampaigns: campaignsCount || 0,
          queuedMessages: queuedCount || 0,
          sentMessages: sentCount || 0,
          failedMessages: failedCount || 0,
          repliedConversations: repliedCount || 0,
        });
        setRecentCampaigns(campaignsData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h2>
          <p className="text-slate-500 mt-1 font-medium">Welcome back, here's what's happening with your outreach.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/campaigns"
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </Link>
          <button className="flex items-center gap-2 bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all">
            <Zap className="w-5 h-5 text-orange-500" />
            Quick Action
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Businesses" 
          value={stats.totalBusinesses} 
          icon={Users} 
          color="blue"
        />
        <StatCard 
          title="WhatsApp Ready" 
          value={stats.whatsappEnabled} 
          icon={Phone} 
          color="green"
        />
        <StatCard 
          title="Active Campaigns" 
          value={stats.totalCampaigns} 
          icon={Send} 
          color="purple"
        />
        <StatCard 
          title="Unread Messages" 
          value={stats.repliedConversations} 
          icon={MessageSquare} 
          color="orange"
        />
      </div>

      {/* Message Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Queued</p>
            <h4 className="text-2xl font-black text-slate-900">{stats.queuedMessages}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sent</p>
            <h4 className="text-2xl font-black text-slate-900">{stats.sentMessages}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Failed</p>
            <h4 className="text-2xl font-black text-slate-900">{stats.failedMessages}</h4>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Campaigns */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Recent Campaigns</h3>
            <Link to="/campaigns" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentCampaigns.length > 0 ? (
              recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      campaign.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                      <Send className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{campaign.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">
                        {formatDistanceToNow(new Date(campaign.created_at))} ago • {campaign.total_targets} targets
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      campaign.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {campaign.status}
                    </span>
                    <div className="mt-2 w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full" 
                        style={{ width: `${(campaign.sent_count / campaign.total_targets) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium">No campaigns found. Start your first outreach!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats / Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-2xl font-black tracking-tight">Pro Tip</h3>
              <p className="mt-4 text-slate-300 leading-relaxed">
                Personalized messages have a <span className="text-blue-400 font-bold">45% higher response rate</span> in the Iraqi market. Use governorate-specific greetings for better engagement.
              </p>
              <button className="mt-8 bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold hover:bg-blue-50 transition-all">
                Learn More
              </button>
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/30 transition-all" />
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-sm font-medium text-slate-600">WhatsApp API</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-sm font-medium text-slate-600">Supabase DB</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-sm font-medium text-slate-600">Edge Functions</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

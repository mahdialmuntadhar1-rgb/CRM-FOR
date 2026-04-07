import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Send, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  ChevronRight,
  Filter,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, StatCard, LoadingState, StatusBadge } from '../components/ui/Common';
import { ExperimentMetric } from '../types';
import { cn } from '../lib/utils';

export default function Experiments() {
  const [metrics, setMetrics] = useState<ExperimentMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.getExperimentMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching experiment metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-10">
      <PageHeader 
        title="Template Testing & Experiments" 
        description="Compare template performance and optimize your outreach strategy with data-driven insights."
        actions={
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all">
            <RefreshCw className="w-5 h-5" />
            Refresh Data
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Avg. Reply Rate" 
          value="22.4%" 
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
          trend={{ value: 4.2, isPositive: true }}
        />
        <StatCard 
          title="Best Performer" 
          value="Welcome (Friendly)" 
          icon={<Target className="w-6 h-6 text-blue-600" />}
        />
        <StatCard 
          title="Total Experiments" 
          value="12" 
          icon={<BarChart3 className="w-6 h-6 text-indigo-600" />}
        />
      </div>

      {/* Comparison Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Experiments</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Filter by Campaign</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {metrics.map((metric, idx) => (
            <div key={metric.template_id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 space-y-6 flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg",
                      idx === 0 ? "bg-blue-600 shadow-blue-200" : "bg-indigo-600 shadow-indigo-200"
                    )}>
                      {idx === 0 ? 'A' : 'B'}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{metric.template_name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Template Variant</p>
                    </div>
                  </div>
                  {idx === 0 && (
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      Top Performer
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sent</p>
                    <p className="text-2xl font-black text-slate-900">{metric.sent.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Replies</p>
                    <p className="text-2xl font-black text-slate-900">{metric.replied.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reply Rate</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-black text-slate-900">{metric.reply_rate}%</p>
                      {idx === 0 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Positive Replies</p>
                    <p className="text-2xl font-black text-emerald-600">{metric.positive_replies.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Performance Score</span>
                    <span>{idx === 0 ? '92%' : '78%'}</span>
                  </div>
                  <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", idx === 0 ? "bg-blue-600 w-[92%]" : "bg-indigo-600 w-[78%]")} 
                    />
                  </div>
                </div>
              </div>
              <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                <button className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
                  View Template <ArrowRight className="w-3 h-3" />
                </button>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                  View Full Report <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Strategy Performance</h3>
          </div>

          <div className="space-y-6">
            {[
              { label: 'Direct Link vs. No Link', win: 'Direct Link', diff: '+12%', color: 'blue' },
              { label: 'Friendly vs. Professional Tone', win: 'Friendly', diff: '+8%', color: 'emerald' },
              { label: 'Arabic vs. English', win: 'Arabic', diff: '+45%', color: 'indigo' },
              { label: 'Ask for Reply vs. Send Info', win: 'Ask for Reply', diff: '+15%', color: 'amber' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-slate-900">Winner: <span className="text-blue-600">{item.win}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-600 leading-none">{item.diff}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Improvement</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 space-y-6 flex flex-col justify-center">
          <div className="p-4 bg-blue-600/20 text-blue-400 rounded-3xl border border-blue-600/30 mb-4">
            <TrendingUp className="w-10 h-10 mb-4" />
            <h4 className="text-xl font-black tracking-tight mb-2">Optimization Insight</h4>
            <p className="text-sm font-medium text-slate-300 leading-relaxed">
              Your "Friendly" tone templates in Arabic are performing 45% better than any other combination. We recommend switching your current "Basra Outreach" campaign to use this variant.
            </p>
          </div>
          <button className="w-full py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-900/50 hover:bg-blue-700 transition-all">
            Apply Optimization
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusStyles = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'active':
      case 'sent':
      case 'completed':
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'draft':
      case 'queued':
      case 'waiting':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'failed':
      case 'error':
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'sending':
      case 'in-progress':
        return 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse';
      case 'paused':
      case 'archived':
      case 'inactive':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'arabic':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'kurdish':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      case 'english':
        return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <span className={cn(
      'px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider',
      getStatusStyles(status),
      className
    )}>
      {status.replace('_', ' ')}
    </span>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, className }) => {
  return (
    <div className={cn(
      'bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg',
            trend.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          )}>
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
};

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, className }) => {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8', className)}>
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="text-slate-500 font-medium mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

export const EmptyState: React.FC<{ title: string; description: string; icon: React.ReactNode; action?: React.ReactNode }> = ({ title, description, icon, action }) => (
  <div className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center">
    <div className="p-4 bg-slate-50 rounded-full text-slate-400 mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 max-w-xs mb-6">{description}</p>
    {action}
  </div>
);

export const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center p-12">
    <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

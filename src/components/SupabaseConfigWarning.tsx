import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

export default function SupabaseConfigWarning() {
  const isMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!isMissing) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-md animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-orange-50 border-2 border-orange-200 rounded-3xl p-6 shadow-2xl shadow-orange-200/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-black text-orange-900 tracking-tight">Configuration Required</h4>
            <p className="text-sm text-orange-800 font-medium mt-1 leading-relaxed">
              Supabase credentials are missing. Please set <code className="bg-orange-100 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-orange-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in the <strong>Secrets</strong> panel.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-bold text-orange-900 flex items-center gap-1 hover:underline"
              >
                Get Keys <ExternalLink className="w-3 h-3" />
              </a>
              <div className="w-1 h-1 bg-orange-300 rounded-full" />
              <button 
                onClick={() => window.location.reload()}
                className="text-xs font-bold text-orange-900 hover:underline"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

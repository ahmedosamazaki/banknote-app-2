import { Shield } from 'lucide-react';
import { COMPANY_LOGO_URL, COMPANY_NAME } from '@/config';

export default function Header() {
  return (
    <header className="bg-gradient-to-l from-slate-900 to-slate-800 shadow-xl sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
            <img src={COMPANY_LOGO_URL} alt={COMPANY_NAME} className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight leading-tight">
              {COMPANY_NAME}
            </h1>
            <p className="text-emerald-400 text-xs font-medium tracking-wider">
              نظام تتبع التحويلات
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-medium">آمن</span>
        </div>
      </div>
    </header>
  );
}

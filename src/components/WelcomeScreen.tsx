import { ArrowLeft, ShieldCheck, Zap, Users } from 'lucide-react';
import { COMPANY_ABOUT, COMPANY_LOGO_URL, COMPANY_NAME, COMPANY_TAGLINE } from '@/config';

export default function WelcomeScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center px-6 py-10" dir="rtl">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl shadow-amber-500/10 flex items-center justify-center overflow-hidden mb-5 animate-scale-in border border-slate-200 dark:border-transparent">
          <img src={COMPANY_LOGO_URL} alt={COMPANY_NAME} className="w-full h-full object-contain p-2" />
        </div>

        <h1 className="text-slate-900 dark:text-white font-bold text-3xl tracking-tight">{COMPANY_NAME}</h1>
        <p className="text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-widest mt-1.5 uppercase">
          {COMPANY_TAGLINE}
        </p>

        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mt-6">{COMPANY_ABOUT}</p>

        <div className="grid grid-cols-3 gap-3 w-full mt-8">
          <Feature icon={<Zap className="w-4 h-4" />} label="تسجيل سريع" />
          <Feature icon={<ShieldCheck className="w-4 h-4" />} label="بيانات آمنة" />
          <Feature icon={<Users className="w-4 h-4" />} label="لكل المناديب" />
        </div>

        <button
          onClick={onEnter}
          className="w-full mt-9 bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/20 transition-all duration-200 text-base"
        >
          ابدأ تسجيل تحويل
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl py-3 px-2 shadow-sm dark:shadow-none">
      <span className="text-amber-600 dark:text-amber-400">{icon}</span>
      <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-tight">{label}</span>
    </div>
  );
}

import { Shield, Sun, Moon } from 'lucide-react';
import { COMPANY_LOGO_URL, COMPANY_NAME } from '@/config';
import { useTheme } from '@/lib/theme';

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-gradient-to-l from-slate-100 to-white dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-transparent shadow-sm dark:shadow-xl sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white dark:bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-transparent">
            <img src={COMPANY_LOGO_URL} alt={COMPANY_NAME} className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white font-bold text-lg tracking-tight leading-tight">
              {COMPANY_NAME}
            </h1>
            <p className="text-amber-600 dark:text-amber-400 text-xs font-medium tracking-wider">
              نظام تتبع التحويلات
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors duration-200"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">آمن</span>
          </div>
        </div>
      </div>
    </header>
  );
}

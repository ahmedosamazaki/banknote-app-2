import { MessageCircle, Sparkles } from 'lucide-react';
import { SUPPORT_WHATSAPP_URL } from '@/config';

export default function Footer({ showSupport = true }: { showSupport?: boolean }) {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/50 py-5 mt-auto">
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-3">
        {showSupport && (
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200"
          >
            <MessageCircle className="w-4 h-4" />
            تواصل مع الدعم الفني
          </a>
        )}
        <p
          dir="ltr"
          className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px] tracking-wide uppercase"
        >
          <Sparkles className="w-3 h-3 text-emerald-500/70" />
          Crafted by Technical Team
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold normal-case tracking-normal">
            Ahmed Osama
          </span>
        </p>
      </div>
    </footer>
  );
}

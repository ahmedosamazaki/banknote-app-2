import { MessageCircle } from 'lucide-react';
import { SUPPORT_WHATSAPP_URL } from '@/config';

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-700/50 py-4 mt-auto">
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-3">
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200"
        >
          <MessageCircle className="w-4 h-4" />
          تواصل مع الدعم الفني
        </a>
        <p className="text-slate-500 text-xs text-center">
          صنع بواسطة الفريق الفني —{' '}
          <span className="text-emerald-400 font-semibold">أحمد أسامة</span>
        </p>
      </div>
    </footer>
  );
}

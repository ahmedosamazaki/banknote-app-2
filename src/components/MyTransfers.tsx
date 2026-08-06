import { useState } from 'react';
import {
  Search,
  User,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  X,
  ChevronDown,
  Calendar,
  Hash,
  Building2,
  Banknote,
} from 'lucide-react';
import type { Transfer } from '@/lib/supabase';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  approved: <CheckCircle className="w-3.5 h-3.5" />,
  rejected: <XCircle className="w-3.5 h-3.5" />,
};

export default function MyTransfers() {
  const [searchType, setSearchType] = useState<'name' | 'phone'>('name');
  const [query, setQuery] = useState('');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-my-transfers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ type: searchType, query: query.trim() }),
        }
      );
      const body = await res.json();
      setTransfers(res.ok ? (body.transfers as Transfer[]) : []);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(n);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const totalAmount = transfers.reduce((s, t) => s + Number(t.transfer_amount), 0);
  const approvedCount = transfers.filter((t) => t.status === 'approved').length;

  return (
    <div className="p-4 space-y-5">
      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
        <User className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-700 dark:text-blue-300 font-medium text-sm">عرض تحويلاتي</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
            ابحث باسمك أو رقم هاتفك لعرض جميع التحويلات التي أرسلتها وحالتها.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        {/* Toggle: name vs phone */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setSearchType('name'); setQuery(''); setSearched(false); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
              searchType === 'name'
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'
            }`}
          >
            <User className="w-4 h-4" />
            بحث بالاسم
          </button>
          <button
            type="button"
            onClick={() => { setSearchType('phone'); setQuery(''); setSearched(false); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
              searchType === 'phone'
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Phone className="w-4 h-4" />
            بحث بالهاتف
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={searchType === 'phone' ? 'tel' : 'text'}
              inputMode={searchType === 'phone' ? 'tel' : 'text'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchType === 'name' ? 'أدخل اسمك كاملاً...' : '01xxxxxxxxx'}
              dir={searchType === 'phone' ? 'ltr' : 'rtl'}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pr-10 pl-4 py-3 text-sm outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm"
          >
            بحث
          </button>
        </div>
      </form>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36 mb-3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded w-24 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      {!loading && searched && transfers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 text-center">
            <p className="text-slate-900 dark:text-white font-bold text-lg">{transfers.length}</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">إجمالي</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{approvedCount}</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">مقبول</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
            <p className="text-blue-600 dark:text-blue-400 font-bold text-sm leading-tight">{formatAmount(totalAmount)}</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">المجموع</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && transfers.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">لا توجد تحويلات</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
            تحقق من {searchType === 'name' ? 'الاسم' : 'رقم الهاتف'} وحاول مجدداً
          </p>
        </div>
      )}

      {/* Transfer list */}
      {!loading && transfers.length > 0 && (
        <div className="space-y-3">
          {transfers.map((t) => (
            <RepTransferCard
              key={t.id}
              transfer={t}
              isExpanded={expanded === t.id}
              onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
              onViewImage={() => t.receipt_image_url && setLightboxUrl(t.receipt_image_url)}
              formatAmount={formatAmount}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 left-4 w-9 h-9 bg-slate-800/80 rounded-full flex items-center justify-center"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={lightboxUrl}
            alt="إيصال التحويل"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function RepTransferCard({
  transfer: t,
  isExpanded,
  onToggle,
  onViewImage,
  formatAmount,
  formatDate,
}: {
  transfer: Transfer;
  isExpanded: boolean;
  onToggle: () => void;
  onViewImage: () => void;
  formatAmount: (n: number) => string;
  formatDate: (s: string) => string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
      {/* Card Header - always visible */}
      <button
        className="w-full text-right p-4 flex items-start gap-3"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xl">{formatAmount(t.transfer_amount)}</p>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 flex-shrink-0 ${STATUS_COLORS[t.status]}`}
            >
              {STATUS_ICONS[t.status]}
              {STATUS_LABELS[t.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {t.branch_name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${t.transfer_type === 'instapay' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}
            >
              {t.transfer_type === 'instapay' ? 'InstaPay' : 'VF Cash'}
            </span>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(t.created_at)}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700/50 p-4 space-y-3">
          {t.reference_number && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                رقم المرجع
              </span>
              <span className="text-slate-700 dark:text-slate-200 text-sm font-mono" dir="ltr">
                {t.reference_number}
              </span>
            </div>
          )}
          {t.bank_name && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" />
                البنك / الجهة
              </span>
              <span className="text-slate-700 dark:text-slate-200 text-sm">{t.bank_name}</span>
            </div>
          )}
          {t.wallet_provider && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" />
                المحفظة
              </span>
              <span className="text-slate-700 dark:text-slate-200 text-sm">{t.wallet_provider}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              هاتف المرسل
            </span>
            <span className="text-slate-700 dark:text-slate-200 text-sm font-mono" dir="ltr">
              {t.sender_phone}
            </span>
          </div>
          {t.notes && (
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs mb-1">ملاحظات</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 leading-relaxed">
                {t.notes}
              </p>
            </div>
          )}
          {t.receipt_image_url && (
            <button
              onClick={onViewImage}
              className="w-full flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm py-2.5 rounded-xl transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              عرض صورة الإيصال
            </button>
          )}
        </div>
      )}
    </div>
  );
}

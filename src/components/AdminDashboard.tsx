import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Image as ImageIcon,
  X,
  ChevronDown,
  TrendingUp,
  Users,
  Banknote,
  Filter,
  Eye,
  Calendar,
  Download,
  Landmark,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import QRCode from 'qrcode';
import { supabase, Transfer } from '@/lib/supabase';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export default function AdminDashboard() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bankReport, setBankReport] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setTransfers(data as Transfer[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransfers();

    const channel = supabase
      .channel('transfers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => {
        fetchTransfers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTransfers]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    await supabase.from('transfers').update({ status }).eq('id', id);
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
    if (selectedTransfer?.id === id) {
      setSelectedTransfer((prev) => (prev ? { ...prev, status } : prev));
    }
    setUpdatingId(null);
  };

  const uniqueBanks = useMemo(
    () =>
      Array.from(new Set(transfers.map((t) => t.bank_name).filter((b): b is string => !!b?.trim()))).sort(
        (a, b) => a.localeCompare(b, 'ar')
      ),
    [transfers]
  );

  const filtered = transfers.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.representative_name.toLowerCase().includes(q) ||
      t.branch_name.toLowerCase().includes(q) ||
      (t.sender_phone || '').includes(q) ||
      (t.reference_number || '').toLowerCase().includes(q) ||
      (t.bank_name || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchType = typeFilter === 'all' || t.transfer_type === typeFilter;
    const matchBank = !bankReport || t.bank_name === bankReport;
    return matchSearch && matchStatus && matchType && matchBank;
  });

  const totalAmount = filtered.reduce((s, t) => s + Number(t.transfer_amount), 0);
  const pendingCount = transfers.filter((t) => t.status === 'pending').length;

  const bankReportStats = useMemo(() => {
    if (!bankReport) return null;
    const rows = transfers.filter((t) => t.bank_name === bankReport);
    return {
      count: rows.length,
      total: rows.reduce((s, t) => s + Number(t.transfer_amount), 0),
      pending: rows.filter((t) => t.status === 'pending').length,
      approved: rows.filter((t) => t.status === 'approved').length,
      rejected: rows.filter((t) => t.status === 'rejected').length,
    };
  }, [transfers, bankReport]);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const headers = [
      'اسم المندوب',
      'الفرع',
      'المبلغ',
      'هاتف المرسل',
      'رقم المرجع',
      'نوع التحويل',
      'المحفظة',
      'البنك',
      'تاريخ التحويل',
      'الحالة',
      'ملاحظات',
      'رابط الإيصال',
      'تاريخ الإرسال',
    ];
    const rows = filtered.map((t) => [
      t.representative_name,
      t.branch_name,
      t.transfer_amount,
      t.sender_phone,
      t.reference_number ?? '',
      t.transfer_type === 'instapay' ? 'InstaPay' : 'محفظة إلكترونية',
      t.wallet_provider ?? '',
      t.bank_name ?? '',
      t.transfer_date ?? '',
      STATUS_LABELS[t.status],
      t.notes ?? '',
      t.receipt_image_url ?? '',
      new Date(t.created_at).toLocaleString('ar-EG'),
    ]);
    const csvContent =
      '\uFEFF' + // BOM for Arabic Excel support
      [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banknotepay_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="p-4 space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Banknote className="w-5 h-5 text-emerald-400" />}
          label="إجمالي المبالغ"
          value={formatAmount(transfers.reduce((s, t) => s + Number(t.transfer_amount), 0))}
          bg="bg-emerald-500/10 border-emerald-500/20"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-400" />}
          label="إجمالي التحويلات"
          value={transfers.length.toString()}
          bg="bg-blue-500/10 border-blue-500/20"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          label="قيد المراجعة"
          value={pendingCount.toString()}
          bg="bg-amber-500/10 border-amber-500/20"
        />
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الفرع، رقم المرجع..."
            className="w-full bg-slate-800/60 border border-slate-700 focus:border-emerald-500 text-white placeholder-slate-500 rounded-xl pr-10 pl-4 py-3 text-sm outline-none transition-colors duration-200"
          />
        </div>

        <div className="flex gap-2">
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'كل الحالات' },
              { value: 'pending', label: 'قيد المراجعة' },
              { value: 'approved', label: 'مقبول' },
              { value: 'rejected', label: 'مرفوض' },
            ]}
          />
          <FilterSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'كل الأنواع' },
              { value: 'instapay', label: 'InstaPay' },
              { value: 'vodafone_cash', label: 'فودافون كاش' },
            ]}
          />
          <button
            onClick={fetchTransfers}
            className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-xl px-3 py-2 text-sm transition-colors duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            title="تصدير CSV"
            className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:border-emerald-600/50 hover:text-emerald-400 text-slate-300 rounded-xl px-3 py-2 text-sm transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowQrCode(true)}
            title="QR Code للتطبيق"
            className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:border-emerald-600/50 hover:text-emerald-400 text-slate-300 rounded-xl px-3 py-2 text-sm transition-colors duration-200"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bank Report Tool */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-1.5 text-slate-300 text-sm font-medium">
          <Landmark className="w-4 h-4 text-emerald-400" />
          تقرير تحويلات بنك معيّن
        </label>
        <div className="relative">
          <select
            value={bankReport}
            onChange={(e) => setBankReport(e.target.value)}
            className="w-full appearance-none bg-slate-800 border border-slate-700 focus:border-emerald-500 text-white rounded-xl px-4 py-2.5 pl-9 text-sm outline-none transition-colors duration-200"
          >
            <option value="">اختر بنك / جهة لعرض تقريرها...</option>
            {uniqueBanks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {bankReportStats && (
          <div className="grid grid-cols-4 gap-2 pt-1">
            <MiniStat label="الإجمالي" value={formatAmount(bankReportStats.total)} color="text-emerald-400" />
            <MiniStat label="العدد" value={bankReportStats.count.toString()} color="text-blue-400" />
            <MiniStat label="مقبول" value={bankReportStats.approved.toString()} color="text-emerald-400" />
            <MiniStat label="قيد المراجعة" value={bankReportStats.pending.toString()} color="text-amber-400" />
          </div>
        )}
      </div>

      {/* Results summary */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-xs">
            {filtered.length} تحويل {search || statusFilter !== 'all' || bankReport ? '(مفلتر)' : ''}
          </p>
          {filtered.length > 0 && (
            <p className="text-emerald-400 text-xs font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {formatAmount(totalAmount)}
            </p>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-4 bg-slate-700 rounded w-32" />
                <div className="h-5 bg-slate-700 rounded-full w-20" />
              </div>
              <div className="h-3 bg-slate-700/60 rounded w-24 mb-2" />
              <div className="h-3 bg-slate-700/60 rounded w-20" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">لا توجد تحويلات</p>
          <p className="text-slate-500 text-sm mt-1">
            {search || statusFilter !== 'all' ? 'جرّب تغيير الفلاتر' : 'ستظهر التحويلات هنا فور إرسالها'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TransferCard
              key={t.id}
              transfer={t}
              onView={() => setSelectedTransfer(t)}
              onViewImage={() => t.receipt_image_url && setLightboxUrl(t.receipt_image_url)}
              onApprove={() => updateStatus(t.id, 'approved')}
              onReject={() => updateStatus(t.id, 'rejected')}
              isUpdating={updatingId === t.id}
              formatAmount={formatAmount}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedTransfer && (
        <DetailModal
          transfer={selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
          onApprove={() => updateStatus(selectedTransfer.id, 'approved')}
          onReject={() => updateStatus(selectedTransfer.id, 'rejected')}
          isUpdating={updatingId === selectedTransfer.id}
          onViewImage={() =>
            selectedTransfer.receipt_image_url &&
            setLightboxUrl(selectedTransfer.receipt_image_url)
          }
          formatAmount={formatAmount}
          formatDate={formatDate}
        />
      )}

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 left-4 w-9 h-9 bg-slate-800/80 hover:bg-slate-700 rounded-full flex items-center justify-center transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={lightboxUrl}
            alt="إيصال التحويل"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* QR Code Modal */}
      {showQrCode && <QrCodeModal onClose={() => setShowQrCode(false)} />}
    </div>
  );
}

function TransferCard({
  transfer: t,
  onView,
  onViewImage,
  onApprove,
  onReject,
  isUpdating,
  formatAmount,
  formatDate,
}: {
  transfer: Transfer;
  onView: () => void;
  onViewImage: () => void;
  onApprove: () => void;
  onReject: () => void;
  isUpdating: boolean;
  formatAmount: (n: number) => string;
  formatDate: (s: string) => string;
}) {
  return (
    <div
      className={`bg-slate-800/40 border rounded-xl overflow-hidden transition-colors duration-200 ${
        t.ai_flagged ? 'border-red-500/50 hover:border-red-500/70' : 'border-slate-700/50 hover:border-slate-600/60'
      }`}
    >
      <div className="p-4">
        {t.ai_flagged && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium mb-2.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            إيصال مشتبه به — يحتاج مراجعة
          </div>
        )}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{t.representative_name}</p>
            <p className="text-slate-400 text-xs mt-0.5">{t.branch_name}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLORS[t.status]}`}>
            {STATUS_LABELS[t.status]}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-400 font-bold text-lg">{formatAmount(t.transfer_amount)}</p>
            <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {formatDate(t.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${t.transfer_type === 'instapay' ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/15 text-red-400'}`}>
              {t.transfer_type === 'instapay' ? 'InstaPay' : 'VF Cash'}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700/50 px-4 py-2.5 flex items-center gap-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 text-slate-300 hover:text-white text-xs py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          التفاصيل
        </button>
        {t.receipt_image_url && (
          <button
            onClick={onViewImage}
            className="flex items-center justify-center gap-1.5 text-slate-300 hover:text-white text-xs py-1.5 px-3 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            الإيصال
          </button>
        )}
        {t.status === 'pending' && (
          <>
            <button
              onClick={onApprove}
              disabled={isUpdating}
              className="flex items-center justify-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs py-1.5 px-2.5 rounded-lg hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              قبول
            </button>
            <button
              onClick={onReject}
              disabled={isUpdating}
              className="flex items-center justify-center gap-1 text-red-400 hover:text-red-300 text-xs py-1.5 px-2.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              رفض
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DetailModal({
  transfer: t,
  onClose,
  onApprove,
  onReject,
  isUpdating,
  onViewImage,
  formatAmount,
  formatDate,
}: {
  transfer: Transfer;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isUpdating: boolean;
  onViewImage: () => void;
  formatAmount: (n: number) => string;
  formatDate: (s: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-t-2xl w-full max-w-lg pb-safe-area-inset-bottom max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">تفاصيل التحويل</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">الحالة</span>
            <span className={`text-sm font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[t.status]}`}>
              {STATUS_LABELS[t.status]}
            </span>
          </div>

          {/* Amount highlight */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm mb-1">المبلغ</p>
            <p className="text-emerald-400 font-bold text-3xl">{formatAmount(t.transfer_amount)}</p>
            <p className={`text-xs mt-1.5 font-medium ${t.transfer_type === 'instapay' ? 'text-blue-400' : 'text-red-400'}`}>
              {t.transfer_type === 'instapay' ? 'InstaPay' : 'فودافون كاش'}
            </p>
          </div>

          {/* AI flag warning */}
          {t.ai_flagged && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5">
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-semibold">تنبيه من الفحص الآلي</p>
                <p className="text-red-300/90 text-sm leading-relaxed mt-0.5">
                  {t.ai_flag_reason || 'الإيصال يبدو مشتبهاً به، راجع الصورة بعناية قبل القبول.'}
                </p>
              </div>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-3">
            <DetailRow label="المندوب" value={t.representative_name} />
            <DetailRow label="الفرع" value={t.branch_name} />
            <DetailRow label="هاتف المرسل" value={t.sender_phone} dir="ltr" />
            {t.reference_number && (
              <DetailRow label="رقم المرجع" value={t.reference_number} dir="ltr" />
            )}
            {t.bank_name && <DetailRow label="البنك / الجهة" value={t.bank_name} />}
            {t.wallet_provider && <DetailRow label="المحفظة" value={t.wallet_provider} />}
            {t.transfer_date && <DetailRow label="تاريخ التحويل" value={t.transfer_date} />}
            {t.notes && <DetailRow label="ملاحظات" value={t.notes} />}
            <DetailRow label="تاريخ الإرسال" value={formatDate(t.created_at)} />
          </div>

          {/* Receipt image */}
          {t.receipt_image_url && (
            <button
              onClick={onViewImage}
              className="w-full border border-slate-700 hover:border-slate-600 rounded-xl overflow-hidden transition-colors"
            >
              <img
                src={t.receipt_image_url}
                alt="إيصال"
                className="w-full max-h-40 object-cover"
              />
              <p className="text-slate-400 text-xs py-2 text-center flex items-center justify-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                اضغط لعرض الإيصال كاملاً
              </p>
            </button>
          )}

          {/* Actions */}
          {t.status === 'pending' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onApprove}
                disabled={isUpdating}
                className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                قبول
              </button>
              <button
                onClick={onReject}
                disabled={isUpdating}
                className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                رفض
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500 text-sm flex-shrink-0">{label}</span>
      <span className="text-slate-200 text-sm text-left" dir={dir as 'ltr' | 'rtl' | undefined}>
        {value}
      </span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className={`border rounded-xl p-3 ${bg}`}>
      <div className="mb-2">{icon}</div>
      <p className="text-white font-bold text-sm leading-tight">{value}</p>
      <p className="text-slate-400 text-xs mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg py-2 px-1 text-center">
      <p className={`font-bold text-sm leading-tight ${color}`}>{value}</p>
      <p className="text-slate-500 text-[10px] mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function QrCodeModal({ onClose }: { onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const appUrl = window.location.origin;

  useEffect(() => {
    QRCode.toDataURL(appUrl, { width: 320, margin: 2, color: { dark: '#020617', light: '#ffffff' } }).then(
      setDataUrl
    );
  }, [appUrl]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'banknote-qr.png';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-xs w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-bold text-lg mb-1">QR Code للتطبيق</h3>
        <p className="text-slate-400 text-xs mb-4">اطبعه ووزّعه على المناديب للدخول المباشر</p>
        {dataUrl ? (
          <img src={dataUrl} alt="QR Code" className="w-full rounded-xl border border-slate-700" />
        ) : (
          <div className="aspect-square bg-slate-800 rounded-xl animate-pulse" />
        )}
        <p className="text-slate-500 text-xs mt-3 break-all" dir="ltr">
          {appUrl}
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={download}
            disabled={!dataUrl}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            تحميل الصورة
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs outline-none pr-3 pl-7 focus:border-slate-600"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  );
}

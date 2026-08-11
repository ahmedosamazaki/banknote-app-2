import { useState, useRef, useEffect } from 'react';
import {
  User,
  Building2,
  Phone,
  Camera,
  Images,
  Scan,
  CheckCircle,
  Loader2,
  X,
  ChevronDown,
  AlertCircle,
  Send,
  CreditCard,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { verifyReceiptWithAI, ReceiptVerification } from '@/lib/ocr';
import { compressReceiptImage } from '@/lib/image';
import { BRANCHES } from '@/config';

interface FormData {
  representative_name: string;
  branch_name: string;
  transfer_amount: string;
  sender_phone: string;
  reference_number: string;
  transfer_type: 'instapay' | 'vodafone_cash';
  wallet_provider: string;
  bank_name: string;
  transfer_date: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  representative_name: '',
  branch_name: '',
  transfer_amount: '',
  sender_phone: '',
  reference_number: '',
  transfer_type: 'instapay',
  wallet_provider: '',
  bank_name: '',
  transfer_date: '',
  notes: '',
};

const REMEMBERED_REP_KEY = 'banknote_rep_info';

interface RememberedRep {
  representative_name: string;
  sender_phone: string;
  branch_name: string;
}

function loadRememberedRep(): RememberedRep {
  const empty: RememberedRep = { representative_name: '', sender_phone: '', branch_name: '' };
  try {
    const raw = localStorage.getItem(REMEMBERED_REP_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      representative_name: typeof parsed.representative_name === 'string' ? parsed.representative_name : '',
      sender_phone: typeof parsed.sender_phone === 'string' ? parsed.sender_phone : '',
      branch_name: typeof parsed.branch_name === 'string' ? parsed.branch_name : '',
    };
  } catch {
    return empty;
  }
}

function getInitialForm(): FormData {
  return { ...INITIAL_FORM, ...loadRememberedRep() };
}

function rememberRep(info: RememberedRep) {
  try {
    localStorage.setItem(REMEMBERED_REP_KEY, JSON.stringify(info));
  } catch {
    // Storage unavailable (private browsing, etc.) — not critical
  }
}

const WALLET_PROVIDERS = ['فودافون كاش', 'اتصالات كاش', 'أورنج كاش'];
const OTHER_WALLET = 'محفظة أخرى';
const EGYPT_PHONE_REGEX = /^01[0125]\d{8}$/;

export default function TransferForm() {
  const [form, setForm] = useState<FormData>(getInitialForm);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [aiResult, setAiResult] = useState<ReceiptVerification | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [otherWalletMode, setOtherWalletMode] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const processReceiptFile = async (rawFile: File) => {
    setReceiptError(null);
    setOcrDone(false);
    setAiResult(null);

    const file = await compressReceiptImage(rawFile);
    setReceiptFile(file);

    const url = URL.createObjectURL(file);
    setReceiptPreview(url);

    // Auto-trigger AI receipt verification
    setOcrLoading(true);
    try {
      const result = await verifyReceiptWithAI(file);
      setAiResult(result);
      if (result.amount) set('transfer_amount', result.amount);
      if (result.referenceNumber) set('reference_number', result.referenceNumber);
      if (result.bankName) set('bank_name', result.bankName);
      if (result.date) set('transfer_date', result.date);
      if (result.transferType) set('transfer_type', result.transferType);
      setOcrDone(true);
    } catch {
      // AI check failed silently, user fills manually
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    await processReceiptFile(rawFile);
  };

  // Picks up an image shared from another app (e.g. WhatsApp's "Share"
  // sheet) via the PWA share_target — the service worker (public/sw.js)
  // stashes the file in Cache Storage and redirects here with ?shared=1.
  useEffect(() => {
    if (!window.location.search.includes('shared=1')) return;
    let cancelled = false;

    (async () => {
      try {
        const cache = await caches.open('banknote-share-target');
        const match = await cache.match('/shared-receipt');
        if (match && !cancelled) {
          const blob = await match.blob();
          const file = new File([blob], `whatsapp-receipt.${blob.type.split('/')[1] || 'jpg'}`, {
            type: blob.type || 'image/jpeg',
          });
          await processReceiptFile(file);
        }
        await cache.delete('/shared-receipt');
      } catch {
        // Cache Storage unsupported or empty — nothing to load
      } finally {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setOcrDone(false);
    setAiResult(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const validate = (): boolean => {
    // Amount / reference / bank / wallet-type are no longer asked of the rep
    // (the AI receipt scan attempts them silently in the background, but
    // isn't reliable enough to require) — only identity + proof matter here.
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.representative_name.trim())
      newErrors.representative_name = 'الاسم مطلوب';
    if (!form.branch_name.trim()) newErrors.branch_name = 'الفرع مطلوب';
    if (!EGYPT_PHONE_REGEX.test(form.sender_phone.replace(/\D/g, '')))
      newErrors.sender_phone = 'أدخل رقم موبايل مصري صحيح (01 ثم 10 أرقام)';
    if (form.transfer_type === 'vodafone_cash' && !form.wallet_provider.trim())
      newErrors.wallet_provider = 'اختر المحفظة';
    setErrors(newErrors);

    const receiptOk = !!receiptFile;
    setReceiptError(receiptOk ? null : 'صورة الإيصال مطلوبة');

    return Object.keys(newErrors).length === 0 && receiptOk;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    // AI suspicion no longer blocks submission — a real photo of a receipt
    // (camera shot, glare, angle) can trip the model even when it's
    // genuine. The flag still travels with the transfer (ai_flagged /
    // ai_flag_reason below) so the admin sees it and makes the actual call.
    setSubmitting(true);

    try {
      let receiptImageUrl: string | null = null;

      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop();
        const fileName = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
        receiptImageUrl = urlData.publicUrl;
      }

      const newTransfer = {
        representative_name: form.representative_name.trim(),
        branch_name: form.branch_name.trim(),
        // Not asked of the rep anymore — only ever set if the silent AI scan
        // (see processReceiptFile) managed to read it off the receipt.
        transfer_amount: form.transfer_amount ? Number(form.transfer_amount) : null,
        sender_phone: form.sender_phone.trim(),
        reference_number: form.reference_number.trim() || null,
        transfer_type: form.transfer_type,
        wallet_provider: form.transfer_type === 'vodafone_cash' ? form.wallet_provider.trim() || null : null,
        bank_name: form.bank_name.trim() || null,
        transfer_date: form.transfer_date.trim() || null,
        notes: form.notes.trim() || null,
        receipt_image_url: receiptImageUrl,
        ai_verified: aiResult?.configured ?? false,
        ai_flagged: aiResult?.isSuspicious ?? false,
        ai_flag_reason: aiResult?.suspicionReason ?? null,
      };

      const { error: insertError } = await supabase.from('transfers').insert(newTransfer);

      if (insertError) throw insertError;

      // Mirror to Google Sheets (fire-and-forget; data is safe in Supabase regardless).
      // Built client-side since reps (anon) no longer have SELECT access — see RLS migration.
      // Wrapped in try/catch (not just .catch) because fetch() can throw
      // synchronously while building the Headers object, before it ever
      // returns a promise — a malformed env var must never block submission.
      try {
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-to-sheets`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              ...newTransfer,
              status: 'pending',
              created_at: new Date().toISOString(),
            }),
          }
        ).catch(() => {
          // Silently ignore — Supabase is the source of truth
        });
      } catch {
        // Silently ignore — Supabase is the source of truth
      }

      rememberRep({
        representative_name: newTransfer.representative_name,
        sender_phone: newTransfer.sender_phone,
        branch_name: newTransfer.branch_name,
      });

      setSubmitted(true);
      setForm(getInitialForm());
      setReceiptFile(null);
      setReceiptPreview(null);
      setOcrDone(false);
      setAiResult(null);
      setOtherWalletMode(false);
    } catch (err: unknown) {
      let msg = 'حدث خطأ أثناء الإرسال';
      if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === 'object' && 'message' in err) {
        msg = String((err as { message: unknown }).message);
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 animate-scale-in">
          <CheckCircle className="w-12 h-12 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">تم الإرسال بنجاح!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          تم تسجيل التحويل وسيتم مراجعته من قِبل الإدارة.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/25"
        >
          تسجيل تحويل جديد
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-4" noValidate>
      {/* Transfer Type Toggle */}
      <div>
        <label className="block text-slate-600 dark:text-slate-300 text-sm font-medium mb-2">
          نوع التحويل
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              set('transfer_type', 'instapay');
              set('wallet_provider', '');
              setOtherWalletMode(false);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${
              form.transfer_type === 'instapay'
                ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400'
                : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            InstaPay
          </button>
          <button
            type="button"
            onClick={() => set('transfer_type', 'vodafone_cash')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${
              form.transfer_type === 'vodafone_cash'
                ? 'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400'
                : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            محفظة إلكترونية
          </button>
        </div>
      </div>

      {/* Wallet Provider (only for e-wallet transfers) */}
      {form.transfer_type === 'vodafone_cash' && (
        <FormField
          label="اختر المحفظة"
          icon={<Smartphone className="w-4 h-4" />}
          error={errors.wallet_provider}
        >
          <div className="grid grid-cols-2 gap-2">
            {WALLET_PROVIDERS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setOtherWalletMode(false);
                  set('wallet_provider', w);
                }}
                className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  !otherWalletMode && form.wallet_provider === w
                    ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                {w}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setOtherWalletMode(true);
                set('wallet_provider', '');
              }}
              className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                otherWalletMode
                  ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              {OTHER_WALLET}
            </button>
          </div>
          {otherWalletMode && (
            <input
              type="text"
              value={form.wallet_provider}
              onChange={(e) => set('wallet_provider', e.target.value)}
              placeholder="اكتب اسم المحفظة (مثال: OVO Pay)"
              className={`${inputClass(!!errors.wallet_provider)} mt-2`}
            />
          )}
        </FormField>
      )}

      {/* Receipt Upload & OCR */}
      <div>
        <label className="block text-slate-600 dark:text-slate-300 text-sm font-medium mb-2">
          إيصال التحويل <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        {!receiptPreview ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Camera button */}
            <label
              htmlFor="receipt-camera"
              className="flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500/50 bg-slate-50 dark:bg-slate-800/30 hover:bg-amber-500/5 rounded-xl py-5 px-3 cursor-pointer transition-all duration-200 group"
            >
              <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700/50 group-hover:bg-amber-500/10 rounded-full flex items-center justify-center transition-colors duration-200">
                <Camera className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors duration-200" />
              </div>
              <div className="text-center">
                <p className="text-slate-600 dark:text-slate-300 font-medium text-xs">تصوير الإيصال</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">فتح الكاميرا</p>
              </div>
              <input
                id="receipt-camera"
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {/* Gallery button */}
            <label
              htmlFor="receipt-gallery"
              className="flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500/50 bg-slate-50 dark:bg-slate-800/30 hover:bg-blue-500/5 rounded-xl py-5 px-3 cursor-pointer transition-all duration-200 group"
            >
              <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700/50 group-hover:bg-blue-500/10 rounded-full flex items-center justify-center transition-colors duration-200">
                <Images className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-200" />
              </div>
              <div className="text-center">
                <p className="text-slate-600 dark:text-slate-300 font-medium text-xs">اختيار من المعرض</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">الصور المحفوظة</p>
              </div>
              <input
                id="receipt-gallery"
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50">
            <img
              src={receiptPreview}
              alt="إيصال التحويل"
              className="w-full max-h-48 object-cover"
            />
            <button
              type="button"
              onClick={removeReceipt}
              className="absolute top-2 left-2 w-7 h-7 bg-slate-900/70 hover:bg-red-500/80 rounded-full flex items-center justify-center transition-colors duration-200"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            {ocrLoading && (
              <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center gap-2">
                <div className="relative">
                  <Scan className="w-8 h-8 text-amber-400 animate-pulse" />
                  <div className="absolute inset-0 border-2 border-amber-400/30 rounded-sm animate-scan-line" />
                </div>
                <p className="text-amber-400 text-sm font-medium">جاري فحص الإيصال بالذكاء الاصطناعي...</p>
              </div>
            )}
            {ocrDone && !ocrLoading && aiResult?.isSuspicious && (
              <div className="absolute bottom-0 inset-x-0 bg-red-500/90 px-3 py-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white text-xs font-medium">
                  الإيصال يحتاج مراجعة من الإدارة قبل القبول
                </span>
              </div>
            )}
            {ocrDone && !ocrLoading && aiResult && !aiResult.isSuspicious && aiResult.configured && (
              <div className="absolute bottom-0 inset-x-0 bg-amber-500/90 px-3 py-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white text-xs font-medium">تم فحص الإيصال واستخراج البيانات بنجاح</span>
              </div>
            )}
          </div>
        )}
        {aiResult?.isSuspicious && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 mt-2">
            <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 dark:text-red-400 text-sm leading-relaxed">
              {aiResult.suspicionReason || 'الصورة شكلها غير معتاد (زاوية، إضاءة..). تقدر تبعتها عادي، وهتترفع للإدارة تراجعها.'}
            </p>
          </div>
        )}
        {receiptError && (
          <p className="mt-1.5 text-red-500 dark:text-red-400 text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {receiptError}
          </p>
        )}
      </div>

      {/* Representative Name */}
      <FormField
        label="اسم المندوب"
        icon={<User className="w-4 h-4" />}
        error={errors.representative_name}
      >
        <input
          type="text"
          value={form.representative_name}
          onChange={(e) => set('representative_name', e.target.value)}
          placeholder="أدخل اسم المندوب"
          className={inputClass(!!errors.representative_name)}
          autoComplete="name"
        />
      </FormField>

      {/* Branch Name */}
      <FormField
        label="اسم الفرع"
        icon={<Building2 className="w-4 h-4" />}
        error={errors.branch_name}
      >
        <div className="relative">
          <select
            value={form.branch_name}
            onChange={(e) => set('branch_name', e.target.value)}
            className={`${inputClass(!!errors.branch_name)} appearance-none`}
          >
            <option value="">اختر الفرع</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </FormField>

      {/* Sender Phone */}
      <FormField
        label="رقم هاتف المرسل"
        icon={<Phone className="w-4 h-4" />}
        error={errors.sender_phone}
      >
        <input
          type="tel"
          inputMode="tel"
          value={form.sender_phone}
          onChange={(e) => set('sender_phone', e.target.value)}
          placeholder="01xxxxxxxxx"
          className={inputClass(!!errors.sender_phone)}
          autoComplete="tel"
          dir="ltr"
        />
      </FormField>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5">
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 dark:text-red-400 text-sm leading-relaxed">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:from-amber-600 active:to-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/20 transition-all duration-200 text-base"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري الإرسال...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            إرسال التحويل
          </>
        )}
      </button>
    </form>
  );
}

function FormField({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-sm font-medium mb-2">
        <span className="text-slate-500 dark:text-slate-400">{icon}</span>
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-red-500 dark:text-red-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full bg-slate-50 dark:bg-slate-800/60 border ${
    hasError ? 'border-red-500/60 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-amber-500'
  } text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition-colors duration-200 focus:bg-white dark:focus:bg-slate-800`;
}

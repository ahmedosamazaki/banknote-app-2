import { useState, useEffect } from 'react';
import { PlusCircle, History, LayoutDashboard, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TransferForm from '@/components/TransferForm';
import AdminDashboard from '@/components/AdminDashboard';
import MyTransfers from '@/components/MyTransfers';
import WelcomeScreen from '@/components/WelcomeScreen';
import { supabase } from '@/lib/supabase';
import { MANAGER_EMAIL_DOMAIN } from '@/config';

const ADMIN_PATH = '/admin';

function getPath() {
  return window.location.pathname;
}

// ─── Rep view (two tabs only, admin never visible) ──────────────────────────

type RepTab = 'form' | 'my-transfers';

function RepView() {
  const [welcomed, setWelcomed] = useState(false);
  const [tab, setTab] = useState<RepTab>('form');

  if (!welcomed) {
    return <WelcomeScreen onEnter={() => setWelcomed(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col" dir="rtl">
      <Header />
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-[60px] z-40">
        <div className="max-w-2xl mx-auto px-4 flex">
          <TabButton
            active={tab === 'form'}
            onClick={() => setTab('form')}
            icon={<PlusCircle className="w-4 h-4" />}
            label="إرسال تحويل"
          />
          <TabButton
            active={tab === 'my-transfers'}
            onClick={() => setTab('my-transfers')}
            icon={<History className="w-4 h-4" />}
            label="تحويلاتي"
          />
        </div>
      </nav>
      <main className="flex-1 max-w-2xl mx-auto w-full">
        {tab === 'form' && <TransferForm />}
        {tab === 'my-transfers' && <MyTransfers />}
      </main>
      <Footer />
    </div>
  );
}

// ─── Admin view (password-gated, only reachable via /admin) ─────────────────

function AdminView() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [input, setInput] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('كلمة المرور غير صحيحة، حاول مجدداً');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUnlocked(!!data.session);
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setHasError(false);
    try {
      if (username.trim()) {
        // Branch manager login: a real, distinct Supabase Auth account —
        // sign in directly, no shared-secret dance needed.
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: `${cleanUsername}@${MANAGER_EMAIL_DOMAIN}`,
          password: input,
        });
        if (signInError) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-login`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ password: input }),
          }
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'فشل الدخول');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        });
        if (sessionError) throw sessionError;
      }
      setUnlocked(true);
      setInput('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'كلمة المرور غير صحيحة، حاول مجدداً');
      setHasError(true);
      setInput('');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUnlocked(false);
    setUsername('');
    goBack();
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (unlocked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col" dir="rtl">
        <Header />
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-[60px] z-40">
          <div className="max-w-2xl mx-auto px-4 flex items-center justify-between py-2.5 pr-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm font-semibold">لوحة الإدارة</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              خروج
            </button>
          </div>
        </nav>
        <main className="flex-1 max-w-2xl mx-auto w-full">
          <AdminDashboard />
        </main>
        <Footer showSupport={false} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-6" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Back link */}
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للتطبيق
        </button>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-7 shadow-xl dark:shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <h2 className="text-slate-900 dark:text-white font-bold text-xl text-center mb-1">لوحة الإدارة</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
            هذه المنطقة مخصصة للمسؤولين فقط
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setHasError(false);
                }}
                placeholder="اسم المستخدم (اتركه فارغاً للأدمن العام)"
                autoComplete="username"
                dir="ltr"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition-colors text-center"
              />
              <p className="text-slate-400 dark:text-slate-500 text-xs text-center mt-1.5">
                مدير فرع؟ اكتب اسم المستخدم بتاعك هنا
              </p>
            </div>
            <input
              type="password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setHasError(false);
              }}
              placeholder="أدخل كلمة المرور"
              autoFocus
              className={`w-full bg-slate-50 dark:bg-slate-800 border ${
                hasError
                  ? 'border-red-500/70 focus:border-red-500'
                  : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500'
              } text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition-colors text-center tracking-widest`}
            />
            {hasError && (
              <div className="flex items-center justify-center gap-1.5 text-red-500 dark:text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={!input || submitting}
              className="w-full bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              دخول
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Root router ─────────────────────────────────────────────────────────────

export default function App() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (path === ADMIN_PATH || path.startsWith(ADMIN_PATH + '/')) {
    return <AdminView />;
  }
  return <RepView />;
}

// ─── Shared tab button ───────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
        active
          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

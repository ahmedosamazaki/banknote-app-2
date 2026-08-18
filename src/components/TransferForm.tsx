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
const OT

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type TransferStatus = 'pending' | 'approved' | 'rejected';
export type TransferType = 'instapay' | 'vodafone_cash';

export interface Transfer {
  id: string;
  representative_name: string;
  branch_name: string;
  transfer_amount: number;
  sender_phone: string;
  reference_number: string | null;
  transfer_type: TransferType;
  wallet_provider: string | null;
  bank_name: string | null;
  transfer_date: string | null;
  notes: string | null;
  receipt_image_url: string | null;
  status: TransferStatus;
  ai_verified: boolean;
  ai_flagged: boolean;
  ai_flag_reason: string | null;
  created_at: string;
}

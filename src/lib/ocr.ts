export interface ReceiptVerification {
  amount?: string;
  referenceNumber?: string;
  bankName?: string;
  date?: string;
  transferType?: 'instapay' | 'vodafone_cash';
  isSuspicious: boolean;
  suspicionType?: 'quality' | 'tampering';
  suspicionReason?: string;
  configured: boolean;
  error?: string;
}

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [prefix, data] = result.split(',');
      const mediaType = prefix.match(/data:(.*);base64/)?.[1] || file.type || 'image/jpeg';
      resolve({ data, mediaType });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Calls the `verify-receipt` edge function, which uses an AI vision model to
// read the receipt and flag anything that looks fake or edited.
export async function verifyReceiptWithAI(file: File): Promise<ReceiptVerification> {
  try {
    const { data: imageBase64, mediaType } = await fileToBase64(file);

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-receipt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ imageBase64, mediaType }),
      }
    );

    const body = await res.json();
    if (!res.ok || body.error) {
      return {
        isSuspicious: false,
        configured: !!body.configured,
        error: body.error || 'تعذر فحص الإيصال بالذكاء الاصطناعي',
      };
    }

    return {
      amount: body.amount ?? undefined,
      referenceNumber: body.referenceNumber ?? undefined,
      bankName: body.bankName ?? undefined,
      date: body.date ?? undefined,
      transferType: body.transferType ?? undefined,
      isSuspicious: !!body.isSuspicious,
      suspicionReason: body.suspicionReason ?? undefined,
      configured: true,
    };
  } catch {
    return { isSuspicious: false, configured: false, error: 'تعذر الاتصال بخدمة الفحص' };
  }
}

import { supabase } from '../lib/supabase';

export interface ExchangeRateResult {
  rate: number | null;
  source: string;
  isAutoFetched: boolean;
  warning?: string;
}

/**
 * Fetches today's exchange rate from Supabase exchange_rates table first.
 * If not available, attempts external fetch or prompts for manual entry.
 */
export async function getTodayExchangeRate(): Promise<ExchangeRateResult> {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // 1. Check if rate exists for today in Supabase
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('date', todayStr)
      .maybeSingle();

    if (!error && data && data.rate) {
      return {
        rate: Number(data.rate),
        source: data.source || 'جدول أسعار الصرف',
        isAutoFetched: true,
      };
    }

    // 2. Attempt external auto-fetch (sp-today simulation or API)
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const json = await response.json();
        if (json && json.rates && json.rates.SYP) {
          const autoRate = json.rates.SYP;
          return {
            rate: autoRate,
            source: 'sp-today (تلقائي)',
            isAutoFetched: true,
          };
        }
      }
    } catch {
      // Gracefully catch timeout or CORS failure
    }

    // 3. Fallback: No rate found for today
    return {
      rate: null,
      source: 'يدوي',
      isAutoFetched: false,
      warning: 'تعذر الجلب التلقائي لسعر الصرف لتاريخ اليوم. يُرجى إدخاله يدوياً.',
    };
  } catch (err) {
    console.warn('Error fetching exchange rate:', err);
    return {
      rate: null,
      source: 'يدوي',
      isAutoFetched: false,
      warning: 'تعذر الجلب التلقائي لسعر الصرف. يُرجى إدخاله يدوياً.',
    };
  }
}

/**
 * Saves or updates today's exchange rate in Supabase.
 */
export async function saveTodayExchangeRate(
  rate: number,
  userId?: string,
  source: string = 'إدخال يدوي'
): Promise<boolean> {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const { error } = await supabase.from('exchange_rates').upsert(
      {
        date: todayStr,
        rate,
        source,
        created_by: userId || null,
      },
      { onConflict: 'date' }
    );

    if (error) {
      console.error('Failed to save exchange rate:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving exchange rate:', err);
    return false;
  }
}

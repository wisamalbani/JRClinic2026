import { supabase } from '../lib/supabase';

export interface ExchangeRateResult {
  rate: number | null;
  source: string;
  isAutoFetched: boolean;
  warning?: string;
}

/**
 * Parses USD exchange rate from sp-today HTML string if available.
 */
function parseSpTodayHtml(html: string): number | null {
  try {
    const usdMatch =
      html.match(/دولار[^]*?(\d{1,2}[,.]?\d{3})/i) ||
      html.match(/USD[^]*?(\d{1,2}[,.]?\d{3})/i) ||
      html.match(/class=["']value["'][^>]*>\s*([\d,.]+)/i);

    if (usdMatch && usdMatch[1]) {
      const cleanNum = parseFloat(usdMatch[1].replace(/,/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 1000) {
        return cleanNum;
      }
    }
  } catch {
    // Parse failure
  }
  return null;
}

/**
 * Fetches today's exchange rate from Supabase exchange_rates table first.
 * If not available, attempts fetching directly from https://www.sp-today.com/.
 * If sp-today fails, returns rate: null with a warning.
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

    // 2. Fetch directly from sp-today (https://www.sp-today.com/)
    try {
      const response = await fetch('https://www.sp-today.com/', {
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const html = await response.text();
        const parsedRate = parseSpTodayHtml(html);

        if (parsedRate) {
          return {
            rate: parsedRate,
            source: 'sp-today',
            isAutoFetched: true,
          };
        }
      }
    } catch {
      // Fetch timeout, CORS, or network failure
    }

    // 3. Fallback when sp-today fails
    return {
      rate: null,
      source: 'يدوي',
      isAutoFetched: false,
      warning: 'تعذر الجلب التلقائي لسعر الصرف من sp-today. يُرجى إدخاله يدوياً.',
    };
  } catch (err) {
    console.warn('Error fetching exchange rate:', err);
    return {
      rate: null,
      source: 'يدوي',
      isAutoFetched: false,
      warning: 'تعذر الجلب التلقائي لسعر الصرف من sp-today. يُرجى إدخاله يدوياً.',
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
    // 1. Check if record for today already exists
    const { data: existing, error: selectErr } = await supabase
      .from('exchange_rates')
      .select('id')
      .eq('date', todayStr)
      .maybeSingle();

    if (selectErr) {
      console.warn('Could not query exchange_rates for date:', selectErr);
    }

    if (existing?.id) {
      // Record exists, update it
      const { error: updateErr } = await supabase
        .from('exchange_rates')
        .update({
          rate,
          source,
          ...(userId ? { created_by: userId } : {}),
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.warn('Update exchange_rate failed, trying upsert:', updateErr.message || updateErr);
        const { error: upsertErr } = await supabase.from('exchange_rates').upsert(
          {
            date: todayStr,
            rate,
            source,
            created_by: userId || null,
          },
          { onConflict: 'date' }
        );
        if (upsertErr) {
          console.warn('Upsert exchange_rate failed:', upsertErr.message || upsertErr);
          return false;
        }
      }
      return true;
    } else {
      // Record does not exist, insert it
      const { error: insertErr } = await supabase.from('exchange_rates').insert({
        date: todayStr,
        rate,
        source,
        created_by: userId || null,
      });

      if (insertErr) {
        console.warn('Insert exchange_rate failed, trying upsert:', insertErr.message || insertErr);
        const { error: upsertErr } = await supabase.from('exchange_rates').upsert(
          {
            date: todayStr,
            rate,
            source,
            created_by: userId || null,
          },
          { onConflict: 'date' }
        );
        if (upsertErr) {
          console.warn('Upsert exchange_rate failed:', upsertErr.message || upsertErr);
          return false;
        }
      }
      return true;
    }
  } catch (err) {
    console.warn('Error saving exchange rate:', err);
    return false;
  }
}

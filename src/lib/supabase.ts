import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

/** Fetch ALL rows from a table by paginating in batches of 1000 */
export async function fetchAll(tableName: string): Promise<any[]> {
  const PAGE_SIZE = 1000;
  const results: any[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < PAGE_SIZE) break; // last page
    page++;
  }

  return results;
}

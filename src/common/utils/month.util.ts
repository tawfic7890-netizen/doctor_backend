/**
 * Returns the Supabase column names for visit 1 and visit 2
 * that correspond to the current calendar month.
 */
export function getCurrentMonthFields(): { v1: string; v2: string } {
  const month = new Date().getMonth() + 1; // 1-12
  switch (month) {
    case 3:  return { v1: 'mar_visit1', v2: 'mar_visit2' };
    case 4:  return { v1: 'apr_visit1', v2: 'apr_visit2' };
    default: return { v1: 'visit1',    v2: 'visit2' };
  }
}

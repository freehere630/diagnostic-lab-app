import { supabase } from "../supabaseClient";
import { sanitizeSearchInput } from "./api";

export async function getAuditLogs({ limit = 200, search = "", dateFrom = "", dateTo = "" } = {}) {
  let query = supabase
    .from("audit_logs")
    .select(`
      *,
      user:staff_profiles!audit_logs_changed_by_fkey(full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Sanitize to prevent PostgREST control-character crashes
  const safeSearch = sanitizeSearchInput(search);
  
  if (safeSearch) {
    // FIX: Removed 'user.full_name' (causes parse crash) and added JSONB search for receipt_no
    query = query.or(
      `table_name.ilike.%${safeSearch}%,` +
      `record_id.ilike.%${safeSearch}%,` +
      `action.ilike.%${safeSearch}%,` +
      `new_data->>receipt_no.ilike.%${safeSearch}%,` +
      `old_data->>receipt_no.ilike.%${safeSearch}%`
    );
  }
  
  // Fix Timezone: new Date().toISOString() correctly converts local time to UTC
  if (dateFrom) {
    const fromIso = new Date(`${dateFrom}T00:00:00`).toISOString();
    query = query.gte("created_at", fromIso);
  }
  if (dateTo) {
    const toIso = new Date(`${dateTo}T23:59:59.999`).toISOString();
    query = query.lte("created_at", toIso);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
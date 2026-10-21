import { supabase } from "../supabaseClient";

export async function getAuditLogs({ limit = 100, search = "", dateFrom = "", dateTo = "" } = {}) {
  let query = supabase
    .from("audit_logs")
    .select(`
      *,
      user:staff_profiles!audit_logs_changed_by_fkey(full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`table_name.ilike.%${search}%,record_id.ilike.%${search}%`);
  }
  
  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
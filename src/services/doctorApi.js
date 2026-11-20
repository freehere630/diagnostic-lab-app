// src/services/doctorApi.js
import { supabase } from "../supabaseClient";

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ─────────────────────────── Dashboard ───────────────────────────
export async function getDoctorHomeSnapshot({ doctorId }) {
  const today = todayISO();

  const [apptsRes, rxTodayRes, rxFutRes, recentRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id,status")
      .eq("doctor_id", doctorId)
      .gte("scheduled_at", `${today}T00:00:00`)
      .lt("scheduled_at", `${today}T23:59:59`),
    supabase
      .from("prescriptions")
      .select("patient_id,id")
      .eq("doctor_id", doctorId)
      .gte("created_at", `${today}T00:00:00`),
    supabase
      .from("prescriptions")
      .select("id,patient_id,patient_name,follow_up_date")
      .eq("doctor_id", doctorId)
      .eq("follow_up_date", today),
    supabase
      .from("prescriptions")
      .select("id,patient_id,patient_name,diagnosis,created_at")
      .eq("doctor_id", doctorId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const waiting = (apptsRes.data || []).filter((a) => a.status === "waiting").length;
  const inConsult = (apptsRes.data || []).filter((a) => a.status === "in_consultation").length;
  const completed = (apptsRes.data || []).filter((a) => a.status === "completed").length;

  return {
    todayAppointments: apptsRes.data?.length || 0,
    waiting,
    inConsult,
    completed,
    todayPatients: new Set((rxTodayRes.data || []).map((r) => r.patient_id)).size,
    followUpsDue: rxFutRes.data || [],
    recent: recentRes.data || [],
  };
}

// ─────────────────────────── Appointments ───────────────────────────
export async function listAppointments({ doctorId, from = null, to = null, status = null }) {
  let q = supabase
    .from("appointments")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("scheduled_at", { ascending: true });
  if (from) q = q.gte("scheduled_at", from);
  if (to) q = q.lte("scheduled_at", to);
  if (status && status !== "ALL") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAppointment(payload) {
  const { data, error } = await supabase.from("appointments").insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAppointmentStatus(id, status) {
  const { error } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAppointment(id) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────── Medicine Library ───────────────────────────
export async function listFavoriteMedicines(doctorId) {
  const { data, error } = await supabase
    .from("medicine_favorites")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("brand_name");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addFavoriteMedicine(row) {
  const { error } = await supabase.from("medicine_favorites").insert(row);
  if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
}

export async function removeFavoriteMedicine(id) {
  const { error } = await supabase.from("medicine_favorites").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────── Templates ───────────────────────────
export async function listTemplates(doctorId) {
  const { data, error } = await supabase
    .from("prescription_templates")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertTemplate(row) {
  const { data, error } = await supabase
    .from("prescription_templates")
    .upsert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from("prescription_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────── Investigations ───────────────────────────
export async function listInvestigationOrders({ doctorId, status = "ALL", limit = 100 }) {
  let q = supabase
    .from("investigation_orders")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("ordered_at", { ascending: false })
    .limit(limit);
  if (status !== "ALL") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createInvestigationOrder(row) {
  const { data, error } = await supabase
    .from("investigation_orders")
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────── Reports ───────────────────────────
export async function getDoctorReport({ doctorId, from, to }) {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id,created_at,patient_id,diagnosis")
    .eq("doctor_id", doctorId)
    .gte("created_at", from)
    .lte("created_at", to);
  if (error) throw new Error(error.message);

  const rows = data || [];
  const byDay = {};
  const byDiag = {};
  for (const r of rows) {
    const d = r.created_at.slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
    const dx = (r.diagnosis || "").trim();
    if (dx) byDiag[dx] = (byDiag[dx] || 0) + 1;
  }
  return {
    total: rows.length,
    uniquePatients: new Set(rows.map((r) => r.patient_id)).size,
    byDay,
    topDiagnoses: Object.entries(byDiag).sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
}
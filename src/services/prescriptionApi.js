import { supabase } from "../supabaseClient";

const genId = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

/** Debounced autocomplete. Caller passes the raw typed text. */
export async function searchMedicines(query, limit = 10) {
  if (!query || query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc("search_medicines", {
    p_query: query.trim(),
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPrescriptionByOrder(orderId) {
  if (!orderId) return null;
  const { data: rx } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!rx) return null;

  const { data: items } = await supabase
    .from("prescription_items")
    .select("*")
    .eq("prescription_id", rx.id)
    .order("sort_order");
  return { ...rx, items: items || [] };
}

export async function savePrescription({
  orderId,
  patientId,
  doctorId,
  doctorName,
  diagnosis,
  advice,
  followUpDate,
  items,
  existingId,
  chief_complaint,
  history_notes,
  examination_notes,
  vitals,
}) {
  const rxId = existingId || genId("RX");

  const rxPayload = {
    id: rxId,
    order_id: orderId || null,
    patient_id: patientId,
    doctor_id: doctorId || null,
    doctor_name: doctorName || null,
    diagnosis: diagnosis || null,
    advice: advice || null,
    follow_up_date: followUpDate || null,
    chief_complaint: chief_complaint || null,
    history_notes: history_notes || null,
    examination_notes: examination_notes || null,
    vitals: vitals || null,
    updated_at: new Date().toISOString(),
  };

  const { error: rxErr } = await supabase
    .from("prescriptions")
    .upsert(rxPayload, { onConflict: "id" });
  if (rxErr) throw new Error(rxErr.message);

  // Replace items wholesale — simpler and safe for prescriptions.
  await supabase.from("prescription_items").delete().eq("prescription_id", rxId);

  if (items.length > 0) {
    const rows = items.map((it, idx) => ({
      id: it.id || genId("RXI"),
      prescription_id: rxId,
      medicine_id: it.medicine_id || null,
      medicine_name_snapshot: it.medicine_name,
      strength_snapshot: it.strength || null,
      dosage_form_snapshot: it.dosage_form || null,
      generic_snapshot: it.generic_name || null,
      freq_morning: it.freq_morning || null,
      freq_noon: it.freq_noon || null,
      freq_night: it.freq_night || null,
      meal_relation: it.meal_relation || null,
      duration: it.duration || null,
      instructions: it.instructions || null,
      sort_order: idx,
    }));
    const { error: itErr } = await supabase
      .from("prescription_items")
      .insert(rows);
    if (itErr) throw new Error(itErr.message);
  }

  return { id: rxId };
}
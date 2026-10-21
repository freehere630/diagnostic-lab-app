import { supabase } from "../supabaseClient";

const genId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

// ==========================================
// 1. Expenses
// ==========================================
export async function getExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveExpense(payload) {
  const row = {
    id: payload.id || genId("EXP"),
    expense_date: payload.expense_date || new Date().toISOString().slice(0, 10),
    category: payload.category,
    amount: parseFloat(payload.amount) || 0,
    description: payload.description,
    payment_method: payload.payment_method || "Cash",
  };
  const { data, error } = await supabase.from("expenses").upsert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteExpense(id) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ==========================================
// 2. Supplier Payments
// ==========================================
export async function getSupplierPayments() {
  const { data, error } = await supabase
    .from("supplier_payments")
    .select(`*, supplier:suppliers(name)`)
    .order("payment_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveSupplierPayment(payload) {
  const row = {
    id: payload.id || genId("PAY"),
    supplier_id: payload.supplier_id,
    payment_date: payload.payment_date || new Date().toISOString().slice(0, 10),
    amount: parseFloat(payload.amount) || 0,
    payment_method: payload.payment_method || "Bank Transfer",
    reference_no: payload.reference_no,
    notes: payload.notes,
  };
  const { data, error } = await supabase.from("supplier_payments").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getSupplierBalances() {
  const { data, error } = await supabase.rpc("get_supplier_balances");
  if (error) throw new Error(error.message);
  return data || [];
}

// ==========================================
// 3. Cash Closing
// ==========================================
export async function getSystemTotalsForPeriod(startIso, endIso) {
  const { data, error } = await supabase
    .from("payments")
    .select("amount, payment_method")
    .gte("created_at", startIso)
    .lte("created_at", endIso);
    
  if (error) throw new Error(error.message);

  let cash = 0;
  let online = 0;
  for (const p of data || []) {
    const amt = parseFloat(p.amount) || 0;
    if (p.payment_method === "Cash") cash += amt;
    else online += amt;
  }
  return { cash, online };
}

export async function saveCashClosing(payload) {
  const row = {
    id: genId("CC"),
    closing_date: payload.closing_date,
    period_start: payload.period_start,
    period_end: payload.period_end,
    system_cash: payload.system_cash,
    system_online: payload.system_online,
    physical_cash: payload.physical_cash,
    physical_online: payload.physical_online,
    difference: payload.difference,
    notes: payload.notes,
  };
  const { data, error } = await supabase.from("cash_closings").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCashClosings() {
  const { data, error } = await supabase.from("cash_closings").select("*").order("closing_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// Helper to clean names: "Dr. X (MBBS)" -> "drx"
const normalizeName = (name) => {
  return (name || "")
    .toLowerCase()
    .replace(/ref:/gi, "")        // Remove "Ref:"
    .replace(/\(.*?\)/g, "")      // Remove everything inside parentheses
    .replace(/[^a-z0-9]/g, "")    // Remove spaces, dots, and punctuation
    .trim();
};

export async function getDoctorCommissions() {
  // 1. Fetch doctors (Fallback to local storage if RLS blocks or offline)
  let doctors = [];
  try {
    const { data, error } = await supabase.from("doctors").select("*");
    if (!error && data && data.length > 0) {
      doctors = data;
    } else {
      doctors = JSON.parse(localStorage.getItem("apex_local_doctors") || "[]");
    }
  } catch (e) {
    doctors = JSON.parse(localStorage.getItem("apex_local_doctors") || "[]");
  }
  
  // 2. Fetch all valid orders
  const { data: orders } = await supabase
    .from("orders")
    .select("net_payable, patient:patients(address)");

  // 3. Fetch all payouts
  const { data: payouts } = await supabase.from("doctor_payouts").select("*");

  const doctorMap = new Map();
  
  // A BULLETPROOF NORMALIZER
  const normalizeName = (name) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .replace(/ref:/gi, "") 
      .split("(")[0]         
      .replace(/[^a-z0-9]/g, "") 
      .trim();
  };
  
  // Initialize map with existing doctors
  (doctors || []).forEach(d => {
    const key = normalizeName(d.name);
    doctorMap.set(key, {
      id: d.id,
      name: d.name,
      rate: parseFloat(d.commission_rate) || 20,
      total_orders: 0,
      total_revenue: 0,
      total_commission: 0,
      total_paid: 0,
      outstanding: 0
    });
  });

  (orders || []).forEach(o => {
    let docName = o.patient?.address?.replace("Ref: ", "") || "Self";
    if (docName === "Self" || !docName) return;

    const key = normalizeName(docName);
    if (!doctorMap.has(key)) {
      doctorMap.set(key, { id: null, name: docName.split("(")[0].trim(), rate: 0, total_orders: 0, total_revenue: 0, total_commission: 0, total_paid: 0, outstanding: 0 });
    }
    
    const entry = doctorMap.get(key);
    entry.total_orders += 1;
    entry.total_revenue += parseFloat(o.net_payable) || 0;
  });

  // Calculate commissions and match payouts
  for (const entry of doctorMap.values()) {
    entry.total_commission = (entry.total_revenue * entry.rate) / 100;
    const docPayouts = (payouts || []).filter(p => p.doctor_id === entry.id);
    entry.total_paid = docPayouts.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    entry.outstanding = Math.max(0, entry.total_commission - entry.total_paid);
  }

  return Array.from(doctorMap.values())
    .filter(d => d.total_revenue > 0 || d.total_paid > 0 || d.id !== null)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export async function saveDoctorPayout(payload) {
  const row = {
    id: genId("DP"),
    doctor_id: payload.doctor_id,
    payout_date: payload.payout_date,
    amount: parseFloat(payload.amount) || 0,
    reference_no: payload.reference_no,
    notes: payload.notes,
  };
  const { data, error } = await supabase.from("doctor_payouts").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function getDoctorPayouts() {
  const { data, error } = await supabase
    .from("doctor_payouts")
    .select(`
      *,
      doctor:doctors(name)
    `)
    .order("payout_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
export async function getDoctorProfileData(doctorId, doctorName) {
  // 1. Get doctor info
  const { data: doctor } = await supabase.from("doctors").select("*").eq("id", doctorId).single();

  // 2. Fetch ALL orders (with patient details)
  const { data: allOrders } = await supabase
    .from("orders")
    .select(`id, order_date, net_payable, patient:patients(name, id, address)`)
    .order("order_date", { ascending: false });

  // 3. Fetch payouts for this doctor
  const { data: payouts } = await supabase
    .from("doctor_payouts")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("payout_date", { ascending: false });

  // 4. Normalize names to match exactly what we do in getDoctorCommissions
  const normalizeName = (name) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .replace(/ref:/gi, "") 
      .split("(")[0]         
      .replace(/[^a-z0-9]/g, "") 
      .trim();
  };

  const targetName = normalizeName(doctorName);

  // 5. Filter orders in JavaScript
  const orders = (allOrders || []).filter(o => {
    let docName = o.patient?.address?.replace("Ref: ", "") || "Self";
    return normalizeName(docName) === targetName;
  });

  // 6. Calculate stats
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.net_payable) || 0), 0);
  const rate = parseFloat(doctor?.commission_rate) || 20;
  const totalCommission = (totalRevenue * rate) / 100;
  const totalPaid = (payouts || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const outstanding = Math.max(0, totalCommission - totalPaid);

  return {
    doctor: doctor || { name: doctorName, commission_rate: rate },
    orders: orders,
    payouts: payouts || [],
    stats: { totalRevenue, totalCommission, totalPaid, outstanding, rate }
  };
}
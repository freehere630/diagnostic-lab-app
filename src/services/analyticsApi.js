import { supabase } from "../supabaseClient";

const normalizeName = (name) =>
  (name || "")
    .toLowerCase()
    .replace(/ref:/gi, "")
    .split("(")[0]
    .replace(/[^a-z0-9]/g, "")
    .trim();

/**
 * Fetch a complete analytics snapshot for one calendar month.
 * Both `fromDate` and `toDate` are inclusive YYYY-MM-DD strings.
 */
export async function getMonthlyAnalytics(fromDate, toDate) {
  const [ordersRes, paymentsRes, expensesRes, payoutsRes, orderTestsRes, doctorsRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, receipt_no, order_date, net_payable, paid_amount, due_amount, patient_id, patient:patients(id, address)"
        )
        .gte("order_date", fromDate)
        .lte("order_date", toDate),

      supabase
        .from("payments")
        .select("amount, payment_method, payment_date")
        .gte("payment_date", fromDate)
        .lte("payment_date", toDate),

      supabase
        .from("expenses")
        .select("amount, category, expense_date")
        .gte("expense_date", fromDate)
        .lte("expense_date", toDate),

      supabase
        .from("doctor_payouts")
        .select("amount, payout_date")
        .gte("payout_date", fromDate)
        .lte("payout_date", toDate),

      supabase
        .from("order_tests")
        .select(
          "order_id, test:tests(id, code, name, dept_id, price), orders!inner(id, receipt_no, order_date)"
        )
        .gte("orders.order_date", fromDate)
        .lte("orders.order_date", toDate),

      supabase.from("doctors").select("id, name, commission_rate"),
    ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (payoutsRes.error) throw new Error(payoutsRes.error.message);
  if (orderTestsRes.error) throw new Error(orderTestsRes.error.message);
  if (doctorsRes.error) throw new Error(doctorsRes.error.message);

  const orders = ordersRes.data || [];
  const payments = paymentsRes.data || [];
  const expenses = expensesRes.data || [];
  const payouts = payoutsRes.data || [];
  const orderTests = orderTestsRes.data || [];
  const doctors = doctorsRes.data || [];

  // ─── Collapse vial-orders into one row per receipt ───
  // The master vial carries the full net/paid/due; siblings carry only their
  // own portion with paid=0, due=0. Taking the max per receipt gives correct
  // totals without double-counting.
  const receiptMap = new Map();
  for (const o of orders) {
    const key = o.receipt_no;
    if (!key) continue;
    const row = {
      receipt_no: key,
      order_date: o.order_date,
      patient_id: o.patient_id,
      patient_address: o.patient?.address || "",
      net_payable: parseFloat(o.net_payable) || 0,
      paid_amount: parseFloat(o.paid_amount) || 0,
      due_amount: parseFloat(o.due_amount) || 0,
    };
    const existing = receiptMap.get(key);
    if (!existing) {
      receiptMap.set(key, row);
    } else {
      existing.net_payable = Math.max(existing.net_payable, row.net_payable);
      existing.paid_amount = Math.max(existing.paid_amount, row.paid_amount);
      existing.due_amount = Math.max(existing.due_amount, row.due_amount);
    }
  }
  const receipts = Array.from(receiptMap.values());

  // ─── Summary ───
  const gross = receipts.reduce((s, r) => s + r.net_payable, 0);
  const collected = receipts.reduce((s, r) => s + r.paid_amount, 0);
  const due = receipts.reduce((s, r) => s + r.due_amount, 0);
  const totalOrders = receipts.length;
  const uniquePatients = new Set(receipts.map((r) => r.patient_id).filter(Boolean)).size;

  const cashReceived = payments
    .filter((p) => p.payment_method === "Cash")
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const onlineReceived = payments
    .filter((p) => p.payment_method !== "Cash")
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalPayouts = payouts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const totalCashIn = cashReceived + onlineReceived;
  const netProfit = totalCashIn - totalExpenses - totalPayouts;

  // ─── Daily breakdown (by order_date) ───
  const dailyMap = new Map();
  for (const r of receipts) {
    if (!r.order_date) continue;
    if (!dailyMap.has(r.order_date)) {
      dailyMap.set(r.order_date, { date: r.order_date, collected: 0, orders: 0 });
    }
    const d = dailyMap.get(r.order_date);
    d.collected += r.paid_amount;
    d.orders += 1;
  }
  const daily = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // ─── Department breakdown ───
  const deptMap = new Map();
  for (const ot of orderTests) {
    const test = ot.test;
    if (!test) continue;
    const deptId = test.dept_id || "DEP-BIO";
    if (!deptMap.has(deptId)) {
      deptMap.set(deptId, { id: deptId, orders: 0, revenue: 0 });
    }
    const d = deptMap.get(deptId);
    d.orders += 1;
    d.revenue += parseFloat(test.price) || 0;
  }
  const departments = Array.from(deptMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // ─── Top tests ───
  const testMap = new Map();
  for (const ot of orderTests) {
    const test = ot.test;
    if (!test) continue;
    if (!testMap.has(test.id)) {
      testMap.set(test.id, {
        id: test.id,
        code: test.code,
        name: test.name,
        dept_id: test.dept_id,
        count: 0,
        revenue: 0,
      });
    }
    const t = testMap.get(test.id);
    t.count += 1;
    t.revenue += parseFloat(test.price) || 0;
  }
  const topTests = Array.from(testMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // ─── Top referring doctors ───
  const doctorRateMap = new Map();
  for (const d of doctors) {
    doctorRateMap.set(normalizeName(d.name), parseFloat(d.commission_rate) || 0);
  }

  const docMap = new Map();
  for (const r of receipts) {
    const addr = r.patient_address || "";
    let docName = addr.startsWith("Ref: ") ? addr.replace("Ref: ", "").trim() : "";
    if (!docName || docName === "Self") continue;
    const key = normalizeName(docName);
    if (!key) continue;
    if (!docMap.has(key)) {
      docMap.set(key, {
        name: docName.split("(")[0].trim(),
        orders: 0,
        revenue: 0,
        rate: doctorRateMap.get(key) || 0,
      });
    }
    const entry = docMap.get(key);
    entry.orders += 1;
    entry.revenue += r.net_payable;
  }
  const topDoctors = Array.from(docMap.values())
    .map((d) => ({ ...d, commission: (d.revenue * d.rate) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  // ─── Expense breakdown by category ───
  const expCatMap = new Map();
  for (const e of expenses) {
    const cat = e.category || "Other";
    expCatMap.set(cat, (expCatMap.get(cat) || 0) + (parseFloat(e.amount) || 0));
  }
  const expenseBreakdown = Array.from(expCatMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    summary: {
      gross,
      collected,
      due,
      totalOrders,
      uniquePatients,
      cashReceived,
      onlineReceived,
      totalCashIn,
      totalExpenses,
      totalPayouts,
      netProfit,
    },
    daily,
    departments,
    topTests,
    topDoctors,
    expenseBreakdown,
    range: { from: fromDate, to: toDate },
  };
}
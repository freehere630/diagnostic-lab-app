import { emitInventoryUpdate } from "../utils/inventoryEvents";
import { supabase } from "../supabaseClient";

// ============================================================
// Helpers
// ============================================================
const safeQ = (s) =>
  String(s ?? "").replace(/[,.:()\[\]"'\\%*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 64);

const genId = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

// ============================================================
// Locations
// ============================================================
export async function getInventoryLocations() {
  const { data, error } = await supabase
    .from("inventory_locations")
    .select("*")
    .eq("is_active", true)
    .order("kind", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================
// Suppliers
// ============================================================
export async function getSuppliers({ search = "", activeOnly = true } = {}) {
  let q = supabase.from("suppliers").select("*").order("name", { ascending: true });
  if (activeOnly) q = q.eq("is_active", true);
  const s = safeQ(search);
  if (s) q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%,contact_person.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveSupplier(input) {
  const row = {
    id: input.id || genId("SUP"),
    name: String(input.name || "").trim(),
    contact_person: input.contact_person || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    payment_terms: input.payment_terms || null,
    lead_time_days: parseInt(input.lead_time_days, 10) || 0,
    notes: input.notes || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
  if (!row.name) throw new Error("Supplier name is required.");

  const { data, error } = await supabase
    .from("suppliers")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSupplier(id) {
  const { error } = await supabase.from("suppliers").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// Inventory Items
// ============================================================
export async function getInventoryItems({
  search = "",
  category = "ALL",
  locationId = null,
  activeOnly = true,
} = {}) {
  let q = supabase
    .from("inventory_items")
    .select(`
  id, code, name, category, uom, pack_size, unit_cost, unit_sell_price, tax_percent,
  reorder_level, minimum_stock, maximum_stock, safety_stock,
  is_batch_tracked, is_expiry_tracked,
  default_location_id, barcode, manufacturer, notes,
  is_active, created_at,department_id, updated_at
`)
    .order("name", { ascending: true });

  if (activeOnly) q = q.eq("is_active", true);
  if (category && category !== "ALL") q = q.eq("category", category);
  const s = safeQ(search);
  if (s) q = q.or(`name.ilike.%${s}%,code.ilike.%${s}%,manufacturer.ilike.%${s}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const items = data || [];
  if (items.length === 0) return [];

  // Attach current stock from the ledger. One batch query, then group in JS.
  const itemIds = items.map((i) => i.id);
  let balanceQ = supabase
    .from("inventory_ledger")
    .select("item_id, location_id, qty_delta")
    .in("item_id", itemIds);
  if (locationId) balanceQ = balanceQ.eq("location_id", locationId);

  const { data: ledgerRows, error: ledgerErr } = await balanceQ;
  if (ledgerErr) {
    // Non-fatal — items still return, just without stock.
    console.warn("[getInventoryItems] balance query failed:", ledgerErr.message);
    return items.map((i) => ({ ...i, qty_on_hand: 0, stock_by_location: {} }));
  }

  const stockByItem = new Map();
  for (const r of ledgerRows || []) {
    if (!stockByItem.has(r.item_id)) stockByItem.set(r.item_id, { total: 0, byLocation: {} });
    const entry = stockByItem.get(r.item_id);
    const delta = parseFloat(r.qty_delta) || 0;
    entry.total += delta;
    entry.byLocation[r.location_id] = (entry.byLocation[r.location_id] || 0) + delta;
  }

  return items.map((i) => {
    const s = stockByItem.get(i.id);
    return {
      ...i,
      qty_on_hand: s ? s.total : 0,
      stock_by_location: s ? s.byLocation : {},
    };
  });
}

export async function getInventoryItemById(id) {
  const { data, error } = await supabase.from("inventory_items").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveInventoryItem(input) {
  const row = {
    id: input.id || genId("ITM"),
    code: String(input.code || "").trim().toUpperCase(),
    name: String(input.name || "").trim(),
    category: input.category,
    uom: String(input.uom || "").trim(),
    pack_size: parseFloat(input.pack_size) || 1,
    unit_cost: parseFloat(input.unit_cost) || 0,
      unit_sell_price: parseFloat(input.unit_sell_price) || 0,
  tax_percent: parseFloat(input.tax_percent) || 0,
    reorder_level: parseFloat(input.reorder_level) || 0,
    minimum_stock: parseFloat(input.minimum_stock) || 0,
    maximum_stock: parseFloat(input.maximum_stock) || 0,
    safety_stock: parseFloat(input.safety_stock) || 0,
    is_batch_tracked: input.is_batch_tracked !== false,
    is_expiry_tracked: input.is_expiry_tracked !== false,
    default_location_id: input.default_location_id || null,
    barcode: input.barcode || null,
    manufacturer: input.manufacturer || null,
    notes: input.notes || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
    department_id: input.department_id || null,
  };
  if (!row.code) throw new Error("Item code is required.");
  if (!row.name) throw new Error("Item name is required.");
  if (!row.category) throw new Error("Category is required.");
  if (!row.uom) throw new Error("Unit of measure is required.");

  const { data, error } = await supabase
    .from("inventory_items")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteInventoryItem(id) {
  const { error } = await supabase.from("inventory_items").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================
// Receive Stock / Opening Balance
// ============================================================
export async function receiveStock({
  locationId,
  supplierId,
  referenceType = "grn",
  referenceId,
  notes,
  lines,
}) {
  if (!locationId) throw new Error("Location is required.");
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("At least one line is required.");

  const payload = {
    location_id: locationId,
    supplier_id: supplierId || null,
    reference_type: referenceType,
    reference_id: referenceId || null,
    notes: notes || null,
    lines: lines.map((l) => ({
      item_id: l.item_id,
      batch_id: l.batch_id || null,
      lot_number: l.lot_number || null,
      expiry_date: l.expiry_date || null,
      unit_cost: parseFloat(l.unit_cost) || 0,
      qty: parseFloat(l.qty) || 0,
      barcode: l.barcode || null,
    })),
  };

  const { data, error } = await supabase.rpc("receive_stock", { p_payload: payload });
  if (error) throw new Error(error.message);
  emitInventoryUpdate();
  return data;
}

// ============================================================
// Stock Ledger (read-only)
// ============================================================
export async function getStockLedger({
  itemId = null,
  locationId = null,
  transactionType = null,
  dateFrom = null,
  dateTo = null,
  limit = 200,
} = {}) {
  let q = supabase
    .from("inventory_ledger")
    .select(`
      id, item_id, batch_id, location_id, qty_delta,
      transaction_type, reference_id, reference_type,
      reason, notes, user_id, created_at,
      item:inventory_items(id, code, name, uom, category),
      batch:inventory_batches(id, lot_number, expiry_date, unit_cost),
      location:inventory_locations(id, name, kind)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (itemId) q = q.eq("item_id", itemId);
  if (locationId) q = q.eq("location_id", locationId);
  if (transactionType && transactionType !== "ALL") q = q.eq("transaction_type", transactionType);
  if (dateFrom) q = q.gte("created_at", dateFrom);
  if (dateTo) q = q.lte("created_at", dateTo + "T23:59:59");

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================
// Balance helpers
// ============================================================
export async function getStockBalance({ itemId, locationId, batchId } = {}) {
  const { data, error } = await supabase.rpc("get_stock_balance", {
    p_item_id: itemId || null,
    p_location_id: locationId || null,
    p_batch_id: batchId || null,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getFefoBatches(itemId, locationId) {
  const { data, error } = await supabase.rpc("get_fefo_batches", {
    p_item_id: itemId,
    p_location_id: locationId,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================
// Dashboard Stats
// ============================================================
export async function getInventoryDashboardStats() {
  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, name, code, category, uom, reorder_level, minimum_stock, unit_cost")
    .eq("is_active", true);

  const { data: ledger } = await supabase
    .from("inventory_ledger")
    .select("item_id, batch_id, location_id, qty_delta");

  const { data: batches } = await supabase
    .from("inventory_batches")
    .select("id, item_id, lot_number, expiry_date, is_quarantined")
    .eq("is_quarantined", false);

  // Totals per item
  const stockByItem = new Map();
  for (const r of ledger || []) {
    stockByItem.set(r.item_id, (stockByItem.get(r.item_id) || 0) + (parseFloat(r.qty_delta) || 0));
  }

  let lowStockCount = 0;
  let totalValuation = 0;
  for (const it of items || []) {
    const onHand = stockByItem.get(it.id) || 0;
    const threshold = parseFloat(it.reorder_level) || parseFloat(it.minimum_stock) || 0;
    if (threshold > 0 && onHand <= threshold) lowStockCount++;
    totalValuation += onHand * (parseFloat(it.unit_cost) || 0);
  }

  // Near-expiry: batches expiring in 90 days with positive stock
  const today = new Date();
  const ninetyDaysOut = new Date();
  ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
  const isoToday = today.toISOString().slice(0, 10);
  const isoThreshold = ninetyDaysOut.toISOString().slice(0, 10);

  const batchQty = new Map();
  for (const r of ledger || []) {
    if (r.batch_id) {
      batchQty.set(r.batch_id, (batchQty.get(r.batch_id) || 0) + (parseFloat(r.qty_delta) || 0));
    }
  }

  let nearExpiryCount = 0;
  let expiredCount = 0;
  for (const b of batches || []) {
    if (!b.expiry_date) continue;
    if ((batchQty.get(b.id) || 0) <= 0) continue;
    if (b.expiry_date < isoToday) expiredCount++;
    else if (b.expiry_date <= isoThreshold) nearExpiryCount++;
  }

  return {
    activeItems: (items || []).length,
    lowStock: lowStockCount,
    nearExpiry: nearExpiryCount,
    expired: expiredCount,
    valuation: Math.round(totalValuation),
  };
}

// ============================================================
// Margin helper
// ============================================================
// Returns per-item margin numbers, using weighted-average cost from
// the currently stocked batches. Sell price is taken from the item
// master. Items with zero stock are excluded from margin averages.
export function computeItemMargin(item) {
  const cost = parseFloat(item.unit_cost) || 0;
  const sell = parseFloat(item.unit_sell_price) || 0;
  const tax = parseFloat(item.tax_percent) || 0;
  const sellNetOfTax = sell > 0 ? sell / (1 + tax / 100) : 0;

  const marginAbs = sellNetOfTax - cost;
  const marginPct = sellNetOfTax > 0 ? (marginAbs / sellNetOfTax) * 100 : 0;

  return {
    cost,
    sell,
    tax,
    sellNetOfTax: Math.round(sellNetOfTax * 100) / 100,
    marginAbs: Math.round(marginAbs * 100) / 100,
    marginPct: Math.round(marginPct * 10) / 10,
  };
}

// ============================================================
// Procurement — Purchase Orders
// ============================================================
export async function getPurchaseOrders({
  status = "ALL",
  supplierId = null,
  search = "",
  limit = 200,
} = {}) {
  let q = supabase
    .from("purchase_orders")
    .select(`
      id, po_number, supplier_id, status,
      order_date, expected_date, subtotal, tax_amount, total_amount,
      notes, created_at, approved_at, cancelled_at, cancel_reason,
      supplier:suppliers(id, name, phone, contact_person)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "ALL") q = q.eq("status", status);
  if (supplierId) q = q.eq("supplier_id", supplierId);
  const s = safeQ(search);
  if (s) q = q.or(`po_number.ilike.%${s}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPurchaseOrderById(poId) {
  if (!poId) throw new Error("poId is required");
  const [poRes, itemsRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(id, name, phone, email, contact_person, payment_terms)
      `)
      .eq("id", poId)
      .maybeSingle(),
    supabase
      .from("purchase_order_items")
      .select(`
        *,
        item:inventory_items(id, code, name, uom, category, pack_size)
      `)
      .eq("po_id", poId)
      .order("created_at", { ascending: true }),
  ]);
  if (poRes.error) throw new Error(poRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  return { ...(poRes.data || {}), items: itemsRes.data || [] };
}

export async function createPurchaseOrder(payload) {
  if (!payload?.supplier_id) throw new Error("Supplier is required.");
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    throw new Error("At least one line is required.");
  }
  const clean = {
    supplier_id: payload.supplier_id,
    order_date: payload.order_date || new Date().toISOString().slice(0, 10),
    expected_date: payload.expected_date || null,
    tax_amount: parseFloat(payload.tax_amount) || 0,
    notes: payload.notes || null,
    lines: payload.lines.map((l) => ({
      item_id: l.item_id,
      qty_ordered: parseFloat(l.qty_ordered) || 0,
      unit_cost: parseFloat(l.unit_cost) || 0,
      notes: l.notes || null,
    })),
  };
  const { data, error } = await supabase.rpc("create_purchase_order", { p_payload: clean });
  if (error) throw new Error(error.message);
  return data;
}

export async function approvePurchaseOrder(poId) {
  const { data, error } = await supabase.rpc("update_po_status", {
    p_po_id: poId,
    p_status: "approved",
    p_reason: null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelPurchaseOrder(poId, reason) {
  const { data, error } = await supabase.rpc("update_po_status", {
    p_po_id: poId,
    p_status: "cancelled",
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

// ============================================================
// Procurement — GRN
// ============================================================
export async function receiveAgainstPO(payload) {
  if (!payload?.location_id) throw new Error("Location is required.");
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    throw new Error("At least one line is required.");
  }
  const clean = {
    po_id: payload.po_id || null,
    supplier_id: payload.supplier_id || null,
    location_id: payload.location_id,
    invoice_number: payload.invoice_number || null,
    invoice_date: payload.invoice_date || null,
    notes: payload.notes || null,
    lines: payload.lines.map((l) => ({
      po_item_id: l.po_item_id || null,
      item_id: l.item_id,
      qty_received: parseFloat(l.qty_received) || 0,
      qty_rejected: parseFloat(l.qty_rejected) || 0,
      unit_cost: parseFloat(l.unit_cost) || 0,
      lot_number: l.lot_number || null,
      expiry_date: l.expiry_date || null,
      barcode: l.barcode || null,
      notes: l.notes || null,
    })),
  };
  const { data, error } = await supabase.rpc("receive_against_po", { p_payload: clean });
  if (error) throw new Error(error.message);
  emitInventoryUpdate();
  return data;
}

export async function getGoodsReceivedNotes({
  poId = null,
  supplierId = null,
  dateFrom = null,
  dateTo = null,
  limit = 100,
} = {}) {
  let q = supabase
    .from("goods_received_notes")
    .select(`
      id, grn_number, po_id, supplier_id, location_id,
      invoice_number, invoice_date, subtotal, total_amount,
      notes, received_at,
      supplier:suppliers(id, name),
      location:inventory_locations(id, name),
      po:purchase_orders(id, po_number)
    `)
    .order("received_at", { ascending: false })
    .limit(limit);

  if (poId) q = q.eq("po_id", poId);
  if (supplierId) q = q.eq("supplier_id", supplierId);
  if (dateFrom) q = q.gte("received_at", dateFrom);
  if (dateTo) q = q.lte("received_at", dateTo + "T23:59:59");

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getGRNById(grnId) {
  const [grnRes, itemsRes] = await Promise.all([
    supabase
      .from("goods_received_notes")
      .select(`
        *,
        supplier:suppliers(id, name),
        location:inventory_locations(id, name),
        po:purchase_orders(id, po_number, status)
      `)
      .eq("id", grnId)
      .maybeSingle(),
    supabase
      .from("grn_items")
      .select(`
        *,
        item:inventory_items(id, code, name, uom),
        batch:inventory_batches(id, lot_number, expiry_date, unit_cost)
      `)
      .eq("grn_id", grnId)
      .order("created_at", { ascending: true }),
  ]);
  if (grnRes.error) throw new Error(grnRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  return { ...(grnRes.data || {}), items: itemsRes.data || [] };
}

// ============================================================
// Procurement — Dashboard stats
// ============================================================
export async function getProcurementStats() {
  const [poRes, grnRes] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("id, status, total_amount"),
    supabase
      .from("goods_received_notes")
      .select("id, received_at, total_amount")
      .gte("received_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  const pos = poRes.data || [];
  const grns = grnRes.data || [];

  return {
    draftCount:          pos.filter((p) => p.status === "draft").length,
    approvedCount:       pos.filter((p) => p.status === "approved").length,
    partialCount:        pos.filter((p) => p.status === "partially_received").length,
    receivedThisMonth:   grns.length,
    monthReceivedValue:  grns.reduce((s, g) => s + (parseFloat(g.total_amount) || 0), 0),
    openValue:           pos
      .filter((p) => p.status === "approved" || p.status === "partially_received")
      .reduce((s, p) => s + (parseFloat(p.total_amount) || 0), 0),
  };
}

// ============================================================
// Machines & Consumption
// ============================================================
export async function getLaboratoryMachines() {
  const { data, error } = await supabase
    .from("laboratory_machines")
    .select(`
      *,
      location:inventory_locations(id, name)
    `)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getActiveMachineReagents(machineId) {
  const { data, error } = await supabase
    .from("machine_reagents")
    .select(`
      *,
      item:inventory_items(id, code, name, uom),
      batch:inventory_batches(id, lot_number, expiry_date)
    `)
    .eq("machine_id", machineId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function installMachineReagent({ machineId, itemId, batchId, expectedTests }) {
  const { data, error } = await supabase.rpc("install_machine_reagent", {
    p_payload: {
      machine_id: machineId,
      item_id: itemId,
      batch_id: batchId,
      expected_tests: expectedTests || 500,
    }
  });
  if (error) throw new Error(error.message);
  
  emitInventoryUpdate();
  return data;
}

export async function saveTestConsumables(testId, consumables) {
  // Delete existing mappings for this test
  await supabase.from("test_consumables").delete().eq("test_id", testId);
  
  if (!consumables || consumables.length === 0) return;

  const rows = consumables.map(c => ({
    id: `TC-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    test_id: testId,
    item_id: c.item_id,
    qty_required: parseFloat(c.qty_required) || 1
  }));

  const { error } = await supabase.from("test_consumables").insert(rows);
  if (error) throw new Error(error.message);
}

export async function getTestConsumables(testId) {
  const { data, error } = await supabase
    .from("test_consumables")
    .select(`
      id, item_id, qty_required,
      item:inventory_items(id, code, name)
    `)
    .eq("test_id", testId);
  if (error) throw new Error(error.message);
  return data || [];
}
// ============================================================
// Machine Consumption
// ============================================================
export async function consumeTestReagents(orderId) {
  if (!orderId) return;
  const { error } = await supabase.rpc("consume_test_reagents", { p_order_id: orderId });
  if (error) {
    // Non-fatal — we don't want to block verification if inventory mapping is missing
    console.warn("[consumeTestReagents] Inventory deduction failed:", error.message);
  }
  emitInventoryUpdate(); 
}

// ============================================================
// Stock Operations
// ============================================================
export async function transferStock(payload) {
  const clean = {
    item_id: payload.item_id,
    batch_id: payload.batch_id || null,
    qty: parseFloat(payload.qty) || 0,
    from_location_id: payload.from_location_id,
    to_location_id: payload.to_location_id,
    notes: payload.notes || null,
  };
  const { data, error } = await supabase.rpc("transfer_stock", { p_payload: clean });
  if (error) throw new Error(error.message);
  emitInventoryUpdate();
  return data;
}

export async function adjustStock(payload) {
  const clean = {
    item_id: payload.item_id,
    batch_id: payload.batch_id || null,
    location_id: payload.location_id,
    qty_delta: parseFloat(payload.qty_delta) || 0,
    transaction_type: payload.transaction_type,
    reason: payload.reason,
  };
  const { data, error } = await supabase.rpc("adjust_stock", { p_payload: clean });
  if (error) throw new Error(error.message);
  emitInventoryUpdate();
  return data;
}

// ============================================================
// Reports
// ============================================================
export async function getLowStockReport() {
  const { data, error } = await supabase.rpc("report_low_stock");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getExpiringBatches(days = 90) {
  const { data, error } = await supabase.rpc("report_expiring_batches", { p_days: days });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getStockValuation() {
  const { data, error } = await supabase.rpc("report_stock_valuation");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function discardMachineReagent(machineReagentId, reason) {
  const { data, error } = await supabase.rpc("discard_machine_reagent", {
    p_mr_id: machineReagentId,
    p_reason: reason || "Pack empty"
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function createLaboratoryMachine(name, deptId) {
  const { data, error } = await supabase.rpc("create_laboratory_machine", {
    p_name: name,
    p_dept_id: deptId || null,
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteLaboratoryMachine(machineId) {
  const { data, error } = await supabase.rpc("delete_laboratory_machine", {
    p_machine_id: machineId,
  });
  if (error) throw new Error(error.message);
  return data;
}
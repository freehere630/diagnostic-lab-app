import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardList, Plus, Search, RefreshCw, X, Trash2,
  Check, AlertTriangle, ChevronRight, Filter,
} from "lucide-react";
import {
  getPurchaseOrders, createPurchaseOrder,
  getSuppliers, getInventoryItems,
} from "../services/inventoryApi";

const STATUS_STYLE = {
  draft:                "bg-slate-100 text-slate-700 border-slate-200",
  pending_approval:     "bg-amber-50 text-amber-700 border-amber-200",
  approved:             "bg-blue-50 text-blue-700 border-blue-200",
  partially_received:   "bg-purple-50 text-purple-700 border-purple-200",
  received:             "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:            "bg-rose-50 text-rose-700 border-rose-200",
  rejected:             "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_LABEL = {
  draft:              "Draft",
  pending_approval:   "Pending Approval",
  approved:           "Approved",
  partially_received: "Partially Received",
  received:           "Received",
  cancelled:          "Cancelled",
  rejected:           "Rejected",
};

const FILTER_TABS = [
  { id: "ALL",                label: "All" },
  { id: "draft",              label: "Drafts" },
  { id: "approved",           label: "Approved" },
  { id: "partially_received", label: "Partial" },
  { id: "received",           label: "Received" },
  { id: "cancelled",          label: "Cancelled" },
];

const newLine = () => ({
  _key: Math.random().toString(36).slice(2),
  item_id: "",
  qty_ordered: "",
  unit_cost: "",
  notes: "",
});

export default function PurchaseOrders({ onOpenPO }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: "",
    tax_amount: "0",
    notes: "",
  });
  const [lines, setLines] = useState([newLine()]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPurchaseOrders({ status: filterStatus, search });
      setOrders(data);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterStatus]);

  useEffect(() => {
    (async () => {
      try {
        const [sups, its] = await Promise.all([
          getSuppliers({}),
          getInventoryItems({}),
        ]);
        setSuppliers(sups);
        setItems(its);
      } catch (e) { /* silent */ }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      (o.po_number || "").toLowerCase().includes(q) ||
      (o.supplier?.name || "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const openNew = () => {
    setForm({
      supplier_id: suppliers[0]?.id || "",
      order_date: new Date().toISOString().slice(0, 10),
      expected_date: "",
      tax_amount: "0",
      notes: "",
    });
    setLines([newLine()]);
    setIsNewOpen(true);
  };

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleItemChange = (idx, itemId) => {
    const it = items.find((i) => i.id === itemId);
    const packSize = parseFloat(it?.pack_size) || 1;
    const defaultPackCost = it ? (parseFloat(it.unit_cost || 0) * packSize).toFixed(2) : "";
    updateLine(idx, { item_id: itemId, unit_cost: defaultPackCost });
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (idx) => {
    if (lines.length <= 1) return alert("At least one line is required.");
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = lines.reduce(
    (s, l) => s + ((parseFloat(l.qty_ordered) || 0) * (parseFloat(l.unit_cost) || 0)),
    0
  );
  const tax = parseFloat(form.tax_amount) || 0;
  const total = subtotal + tax;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id) return alert("Please select a supplier.");
    for (const [i, l] of lines.entries()) {
      if (!l.item_id) return alert(`Line ${i + 1}: choose an item.`);
      if (!(parseFloat(l.qty_ordered) > 0)) return alert(`Line ${i + 1}: qty must be > 0.`);
    }

    setSaving(true);
    try {
      const res = await createPurchaseOrder({
        ...form,
        lines: lines.map((l) => {
          const item = items.find(i => i.id === l.item_id);
          const packSize = parseFloat(item?.pack_size) || 1;
          const qtyPacks = parseFloat(l.qty_ordered) || 0;
          const packCost = parseFloat(l.unit_cost) || 0;

          return {
            item_id: l.item_id,
            qty_ordered: qtyPacks * packSize, // Save UoM to DB
            unit_cost: packCost / packSize,   // Save cost per mL/pc to DB
            notes: l.notes,
          };
        }),
      });
      alert(`✅ ${res.po_number} created.`);
      setIsNewOpen(false);
      await load();
      onOpenPO?.(res.po_id);
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">

      {/* Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Purchase Orders</h2>
            <p className="text-[10px] text-slate-400">
              Order reagents from suppliers. Track approval, delivery and partial receipts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO number, supplier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={load}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openNew}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> New PO
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        {FILTER_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterStatus(t.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
              filterStatus === t.id
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            {orders.length === 0 ? "No purchase orders yet." : "No POs match your filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
                  <th className="py-2.5 px-3">PO #</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Order / Expected</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">·</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => onOpenPO?.(o.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-2 px-3 font-mono text-[11px] font-bold text-slate-700">
                      {o.po_number}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900 truncate max-w-[220px]">
                        {o.supplier?.name || "—"}
                      </div>
                      {o.supplier?.contact_person && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                          {o.supplier.contact_person}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[11px] font-mono text-slate-600">
                      <div>{o.order_date}</div>
                      {o.expected_date && (
                        <div className="text-[10px] text-slate-400">→ {o.expected_date}</div>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${STATUS_STYLE[o.status] || STATUS_STYLE.draft}`}>
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      ৳{parseFloat(o.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      <ChevronRight className="w-4 h-4 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New PO modal */}
      {isNewOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-5xl w-full max-h-[94vh] overflow-y-auto text-xs">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm text-slate-900">New Purchase Order</span>
              </div>
              <button onClick={() => setIsNewOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-4 space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Supplier *</label>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-semibold"
                  >
                    <option value="">— choose supplier —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Order Date</label>
                  <input
                    type="date"
                    value={form.order_date}
                    onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Expected Date</label>
                  <input
                    type="date"
                    value={form.expected_date}
                    onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                      <th className="py-2 px-2 w-[40%]">Item</th>
                      <th className="py-2 px-2 w-[12%] text-right">Qty (Packs)</th>
                      <th className="py-2 px-2 w-[15%] text-right">Cost / Pack ৳</th>
                      <th className="py-2 px-2 w-[15%] text-right">Line Total ৳</th>
                      <th className="py-2 px-2 w-[12%]">Notes</th>
                      <th className="py-2 px-2 w-[6%] text-center">·</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((l, i) => {
                      const item = items.find(it => it.id === l.item_id);
                      const packSize = parseFloat(item?.pack_size) || 1;
                      const qtyPacks = parseFloat(l.qty_ordered) || 0;
                      const packCost = parseFloat(l.unit_cost) || 0;
                      const lineTotal = qtyPacks * packCost;

                      return (
                        <tr key={l._key}>
                          <td className="py-1.5 px-2">
                            <select
                              value={l.item_id}
                              onChange={(e) => handleItemChange(i, e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg bg-white outline-none"
                            >
                              <option value="">-- choose item --</option>
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.code} — {it.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number" step="0.01" min="0"
                              value={l.qty_ordered}
                              onChange={(e) => updateLine(i, { qty_ordered: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-right"
                            />
                            {packSize > 1 && (
                              <div className="text-[9px] text-slate-400 text-right mt-0.5 font-mono">
                                = {qtyPacks * packSize} {item?.uom}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number" step="0.01" min="0"
                              value={l.unit_cost}
                              onChange={(e) => updateLine(i, { unit_cost: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-right"
                            />
                            {packSize > 1 && packCost > 0 && (
                              <div className="text-[9px] text-slate-400 text-right mt-0.5 font-mono">
                                = ৳{(packCost / packSize).toFixed(2)} / {item?.uom}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800">
                            ৳{lineTotal.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={l.notes}
                              onChange={(e) => updateLine(i, { notes: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none text-[11px]"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="bg-slate-50/60 border-t border-slate-200 py-1.5 px-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                  <span className="text-[10px] text-slate-500">{lines.length} line{lines.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Tax / VAT Amount (৳)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.tax_amount}
                    onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-mono font-semibold">৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Tax</span>
                    <span className="font-mono font-semibold">৳{tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1">
                    <span>Total</span>
                    <span className="font-mono text-blue-700">৳{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                  placeholder="Optional remarks"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-bold shadow-xs"
                >
                  {saving ? "Creating…" : "Create Draft PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { PackagePlus, X, Plus, Trash2, Barcode } from "lucide-react";
import {
  getInventoryItems, getSuppliers, getInventoryLocations, receiveStock
} from "../services/inventoryApi";

const newLine = (defaultItemId = "") => ({
  _key: Math.random().toString(36).slice(2),
  item_id: defaultItemId,
  lot_number: "",
  expiry_date: "",
  unit_cost: "",
  qty: "",
  barcode: "",
});

export default function ReceiveStockModal({ open, onClose, initialItemId = null, onReceived }) {
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [header, setHeader] = useState({
    location_id: "",
    supplier_id: "",
    reference_type: "grn",
    reference_id: "",
    notes: "",
  });
  const [lines, setLines] = useState([newLine(initialItemId || "")]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const [locs, sups, its] = await Promise.all([
          getInventoryLocations(),
          getSuppliers(),
          getInventoryItems({}),
        ]);
        setLocations(locs);
        setSuppliers(sups);
        setItems(its);
        setHeader((h) => ({
          ...h,
          location_id: h.location_id || locs.find((l) => l.kind === "main_store")?.id || locs[0]?.id || "",
        }));
        setLines([newLine(initialItemId || "")]);
      } catch (e) {
        alert("Could not load form data: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, initialItemId]);

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, newLine(initialItemId || "")]);

  const removeLine = (idx) => {
    if (lines.length <= 1) return alert("At least one line is required.");
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, itemId) => {
    const it = items.find((i) => i.id === itemId);
    updateLine(idx, {
      item_id: itemId,
      unit_cost: it ? String(it.unit_cost ?? 0) : "",
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!header.location_id) return alert("Please choose a location.");

    for (const [i, l] of lines.entries()) {
      if (!l.item_id) return alert(`Line ${i + 1}: choose an item.`);
      const qty = parseFloat(l.qty);
      if (!qty || qty <= 0) return alert(`Line ${i + 1}: quantity must be > 0.`);
    }

    setSubmitting(true);
    try {
      await receiveStock({
        locationId: header.location_id,
        supplierId: header.supplier_id || null,
        referenceType: header.reference_type,
        referenceId: header.reference_id || null,
        notes: header.notes || null,
        lines: lines.map((l) => ({
          item_id: l.item_id,
          lot_number: l.lot_number || null,
          expiry_date: l.expiry_date || null,
          unit_cost: l.unit_cost || 0,
          qty: l.qty,
          barcode: l.barcode || null,
        })),
      });
      alert("✅ Stock received.");
      if (onReceived) onReceived();
      onClose();
    } catch (err) {
      alert("Receive failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-5xl w-full max-h-[94vh] overflow-y-auto text-xs">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-sm text-slate-900">Receive Stock</span>
            <span className="text-[10px] text-slate-400">Batch + expiry + cost per line</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : (
          <form onSubmit={submit} className="p-4 space-y-4">

            {/* Header row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Receive Into *</label>
                <select
                  value={header.location_id}
                  onChange={(e) => setHeader({ ...header, location_id: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-semibold"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Supplier</label>
                <select
                  value={header.supplier_id}
                  onChange={(e) => setHeader({ ...header, supplier_id: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50"
                >
                  <option value="">— none —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Type</label>
                <select
                  value={header.reference_type}
                  onChange={(e) => setHeader({ ...header, reference_type: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-semibold"
                >
                  <option value="grn">GRN (Purchased)</option>
                  <option value="opening">Opening Balance</option>
                  <option value="return">Return from Dept</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Reference No.</label>
                <input
                  type="text"
                  value={header.reference_id}
                  onChange={(e) => setHeader({ ...header, reference_id: e.target.value })}
                  placeholder="GRN-2026-001"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>
            </div>

            {/* Lines */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
                    <th className="py-2 px-2 w-[26%]">Item</th>
                    <th className="py-2 px-2 w-[14%]">Lot No.</th>
                    <th className="py-2 px-2 w-[13%]">Expiry</th>
                    <th className="py-2 px-2 w-[12%] text-right">Qty</th>
                    <th className="py-2 px-2 w-[12%] text-right">Unit Cost ৳</th>
                    <th className="py-2 px-2 w-[15%]">Barcode</th>
                    <th className="py-2 px-2 w-[6%] text-center">·</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, i) => (
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
                          type="text"
                          value={l.lot_number}
                          onChange={(e) => updateLine(i, { lot_number: e.target.value })}
                          placeholder="SY-2026-A1"
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="date"
                          value={l.expiry_date}
                          onChange={(e) => updateLine(i, { expiry_date: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-[11px]"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={l.qty}
                          onChange={(e) => updateLine(i, { qty: e.target.value })}
                          placeholder="0"
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-right"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={l.unit_cost}
                          onChange={(e) => updateLine(i, { unit_cost: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-right"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="relative">
                          <Barcode className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                          <input
                            type="text"
                            value={l.barcode}
                            onChange={(e) => updateLine(i, { barcode: e.target.value })}
                            placeholder="scan"
                            className="w-full pl-7 pr-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-[11px]"
                          />
                        </div>
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
                  ))}
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
                <span className="text-[10px] text-slate-500">
                  {lines.length} line{lines.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Notes</label>
              <input
                type="text"
                value={header.notes}
                onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                placeholder="Optional remarks for this receipt"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-bold shadow-xs flex items-center gap-1"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                {submitting ? "Receiving…" : "Receive Stock"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
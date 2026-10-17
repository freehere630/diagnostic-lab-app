import React, { useState, useEffect } from "react";
import { PackagePlus, X, AlertTriangle, Barcode, Check } from "lucide-react";
import {
  getPurchaseOrderById, getInventoryLocations, receiveAgainstPO,
} from "../services/inventoryApi";

export default function ReceiveAgainstPOModal({ open, poId, onClose, onReceived }) {
  const [po, setPo] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [header, setHeader] = useState({
    location_id: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (!open || !poId) return;
    (async () => {
      setLoading(true);
      try {
        const [p, locs] = await Promise.all([
          getPurchaseOrderById(poId),
          getInventoryLocations(),
        ]);
        setPo(p);
        setLocations(locs);
        setHeader((h) => ({
          ...h,
          location_id: h.location_id || locs.find((l) => l.kind === "main_store")?.id || locs[0]?.id || "",
        }));

        // Pre-populate lines with outstanding quantities in PACKS
        const newLines = (p.items || [])
          .filter((it) => (parseFloat(it.qty_received) || 0) < (parseFloat(it.qty_ordered) || 0))
          .map((it) => {
            const packSize = parseFloat(it.item?.pack_size) || 1;
            const qtyRemainingUom = (parseFloat(it.qty_ordered) || 0) - (parseFloat(it.qty_received) || 0);
            const qtyRemainingPacks = qtyRemainingUom / packSize;
            const defaultPackCost = (parseFloat(it.unit_cost) || 0) * packSize;

            return {
              _key: Math.random().toString(36).slice(2),
              po_item_id: it.id,
              item_id: it.item_id,
              item_code: it.item?.code || "",
              item_name: it.item?.name || "",
              uom: it.item?.uom || "",
              pack_size: packSize,
              qty_ordered_uom: parseFloat(it.qty_ordered) || 0,
              qty_ordered_packs: (parseFloat(it.qty_ordered) || 0) / packSize,
              qty_already_uom: parseFloat(it.qty_received) || 0,
              qty_remaining_uom: qtyRemainingUom,
              qty_remaining_packs: qtyRemainingPacks,
              qty_received: String(qtyRemainingPacks),
              qty_rejected: "0",
              unit_cost: String(defaultPackCost), // Pack Cost
              lot_number: "",
              expiry_date: "",
              barcode: "",
              notes: "",
            };
          });
        setLines(newLines);
      } catch (e) {
        alert("Load failed: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, poId]);

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!header.location_id) return alert("Location is required.");
    if (lines.length === 0) return alert("There are no outstanding lines on this PO.");

    for (const [i, l] of lines.entries()) {
      const rc = parseFloat(l.qty_received) || 0;
      const rj = parseFloat(l.qty_rejected) || 0;
      if (rc <= 0 && rj <= 0) {
        return alert(`Line ${i + 1}: enter qty received or qty rejected.`);
      }
      if (rc > 0 && !l.lot_number.trim()) {
        if (!window.confirm(`Line ${i + 1} has no lot number. Continue anyway?`)) return;
      }
    }

    setSubmitting(true);
    try {
      const res = await receiveAgainstPO({
        po_id: poId,
        supplier_id: po.supplier_id,
        location_id: header.location_id,
        invoice_number: header.invoice_number || null,
        invoice_date: header.invoice_date || null,
        notes: header.notes || null,
        lines: lines.map((l) => {
          const packSize = l.pack_size || 1;
          const packCost = parseFloat(l.unit_cost) || 0;
          return {
            po_item_id: l.po_item_id,
            item_id: l.item_id,
            qty_received: (parseFloat(l.qty_received) || 0) * packSize,
            qty_rejected: (parseFloat(l.qty_rejected) || 0) * packSize,
            unit_cost: packCost / packSize,
            lot_number: l.lot_number,
            expiry_date: l.expiry_date || null,
            barcode: l.barcode || null,
            notes: l.notes || null,
          };
        }),
      });
      alert(`✅ ${res.grn_number} recorded.`);
      onReceived?.();
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
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-6xl w-full max-h-[94vh] overflow-y-auto text-xs">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="font-bold text-sm text-slate-900">Receive Against PO</span>
              {po && (
                <span className="text-[11px] text-slate-400 ml-2 font-mono">
                  {po.po_number} · {po.supplier?.name}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading PO…
          </div>
        ) : (
          <form onSubmit={submit} className="p-4 space-y-4">
            {/* Header */}
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
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Supplier Invoice #</label>
                <input
                  type="text"
                  value={header.invoice_number}
                  onChange={(e) => setHeader({ ...header, invoice_number: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={header.invoice_date}
                  onChange={(e) => setHeader({ ...header, invoice_date: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Notes</label>
                <input
                  type="text"
                  value={header.notes}
                  onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>
            </div>

            {/* Lines */}
            {lines.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
                Every line on this PO has been fully received.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                        <th className="py-2 px-2 w-[22%]">Item</th>
                        <th className="py-2 px-2 text-right w-[8%]">Ordered<br/>(Packs)</th>
                        <th className="py-2 px-2 text-right w-[8%]">Already<br/>(Packs)</th>
                        <th className="py-2 px-2 text-right w-[8%]">Remaining<br/>(Packs)</th>
                        <th className="py-2 px-2 text-right w-[9%]">Recv Now<br/>(Packs)</th>
                        <th className="py-2 px-2 text-right w-[8%]">Rej'd<br/>(Packs)</th>
                        <th className="py-2 px-2 w-[12%]">Lot #</th>
                        <th className="py-2 px-2 w-[10%]">Expiry</th>
                        <th className="py-2 px-2 text-right w-[10%]">Cost / Pack</th>
                        <th className="py-2 px-2 w-[10%]">Barcode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((l, i) => {
                        const rc = parseFloat(l.qty_received) || 0;
                        const over = rc > l.qty_remaining_packs;
                        const packCost = parseFloat(l.unit_cost) || 0;
                        
                        return (
                          <tr key={l._key} className={over ? "bg-amber-50/40" : ""}>
                            <td className="py-1.5 px-2">
                              <div className="font-semibold text-slate-800 truncate max-w-[200px]">{l.item_name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{l.item_code}</div>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-600 text-[11px]">
                              {l.qty_ordered_packs.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-600 text-[11px]">
                              {(l.qty_already_uom / l.pack_size).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-amber-700 font-bold text-[11px]">
                              {l.qty_remaining_packs.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number" step="0.01" min="0"
                                value={l.qty_received}
                                onChange={(e) => updateLine(i, { qty_received: e.target.value })}
                                className={`w-full px-2 py-1 border rounded-lg outline-none font-mono text-right font-bold ${
                                  over ? "border-amber-400 bg-amber-50 text-amber-900" : "border-slate-200"
                                }`}
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number" step="0.01" min="0"
                                value={l.qty_rejected}
                                onChange={(e) => updateLine(i, { qty_rejected: e.target.value })}
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-right"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={l.lot_number}
                                onChange={(e) => updateLine(i, { lot_number: e.target.value })}
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-[11px]"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="date"
                                value={l.expiry_date}
                                onChange={(e) => updateLine(i, { expiry_date: e.target.value })}
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-[10px]"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number" step="0.01" min="0"
                                value={l.unit_cost}
                                onChange={(e) => updateLine(i, { unit_cost: e.target.value })}
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none font-mono text-right"
                              />
                              {l.pack_size > 1 && packCost > 0 && (
                                <div className="text-[9px] text-slate-400 text-right mt-0.5 font-mono">
                                  = ৳{(packCost / l.pack_size).toFixed(2)} / {l.uom}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-2">
                              <div className="relative">
                                <Barcode className="w-3 h-3 absolute left-1.5 top-2 text-slate-400" />
                                <input
                                  type="text"
                                  value={l.barcode}
                                  onChange={(e) => updateLine(i, { barcode: e.target.value })}
                                  placeholder="scan"
                                  className="w-full pl-6 pr-1 py-1 border border-slate-200 rounded-lg outline-none font-mono text-[10px]"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                disabled={submitting || lines.length === 0}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-bold shadow-xs flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                {submitting ? "Recording GRN…" : "Record GRN"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
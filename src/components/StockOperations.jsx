import React, { useState, useEffect } from "react";
import {
  ArrowRightLeft, SlidersHorizontal, RefreshCw, AlertTriangle,
  ArrowRight, CheckCircle2,Cpu, X, Box, Package, ShieldAlert
} from "lucide-react";
import {
  getInventoryItems, getInventoryLocations, getFefoBatches,
  transferStock, adjustStock
} from "../services/inventoryApi";

export default function StockOperations({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("TRANSFER");
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [transferForm, setTransferForm] = useState({
    item_id: "", batch_id: "", qty: "",
    from_location_id: "", to_location_id: "", notes: ""
  });
  const [batches, setBatches] = useState([]);

  const [adjustForm, setAdjustForm] = useState({
    item_id: "", batch_id: "", location_id: "",
    adjust_type: "wastage", adjust_qty: "", reason: ""
  });
  const [adjBatches, setAdjBatches] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [its, locs] = await Promise.all([
        getInventoryItems({}),
        getInventoryLocations(),
      ]);
      setItems(its);
      setLocations(locs);
      
      setTransferForm(f => ({ ...f, from_location_id: locs.find(l => l.kind === "main_store")?.id || locs[0]?.id }));
      setAdjustForm(f => ({ ...f, location_id: locs.find(l => l.kind === "main_store")?.id || locs[0]?.id }));
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Fetch batches when item or source location changes
  useEffect(() => {
    if (transferForm.item_id && transferForm.from_location_id) {
      getFefoBatches(transferForm.item_id, transferForm.from_location_id)
        .then(bs => {
          setBatches(bs);
          setTransferForm(f => ({ ...f, batch_id: bs[0]?.batch_id || "" }));
        });
    } else {
      setBatches([]);
    }
  }, [transferForm.item_id, transferForm.from_location_id]);

  useEffect(() => {
    if (adjustForm.item_id && adjustForm.location_id) {
      getFefoBatches(adjustForm.item_id, adjustForm.location_id)
        .then(bs => {
          setAdjBatches(bs);
          setAdjustForm(f => ({ ...f, batch_id: bs[0]?.batch_id || "" }));
        });
    } else {
      setAdjBatches([]);
    }
  }, [adjustForm.item_id, adjustForm.location_id]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.item_id || !transferForm.from_location_id || !transferForm.to_location_id) return alert("Fill all required fields");
    if (transferForm.from_location_id === transferForm.to_location_id) return alert("Source and destination must be different");
    
    setSaving(true);
    try {
      await transferStock(transferForm);
      alert("✅ Transfer complete.");
      setTransferForm({ ...transferForm, qty: "", notes: "" });
    } catch (err) {
      alert("Transfer failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjustForm.item_id || !adjustForm.location_id || !adjustForm.adjust_qty) return alert("Fill all required fields");
    if (!adjustForm.reason) return alert("A reason is required for adjustments");

    // Determine sign based on type
    let delta = parseFloat(adjustForm.adjust_qty);
    if (adjustForm.adjust_type === "wastage" || adjustForm.adjust_type === "expiry_writeoff") {
      delta = -Math.abs(delta); // Force negative for wastage
    } else if (adjustForm.adjust_type === "recount") {
      // In a real recount, you'd enter the actual qty, and the system would calculate delta.
      // For simplicity here, we ask for the delta (+ or -).
    }

    setSaving(true);
    try {
      await adjustStock({
        item_id: adjustForm.item_id,
        batch_id: adjustForm.batch_id,
        location_id: adjustForm.location_id,
        qty_delta: delta,
        transaction_type: adjustForm.adjust_type,
        reason: adjustForm.reason
      });
      alert("✅ Stock adjusted.");
      setAdjustForm({ ...adjustForm, adjust_qty: "", reason: "" });
    } catch (err) {
      alert("Adjustment failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto text-slate-900">
      
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Stock Operations</h2>
            <p className="text-[10px] text-slate-400">Transfer between locations or adjust for wastage/counts</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate && onNavigate("inventory-machines")}
          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
        >
          <Cpu className="w-3.5 h-3.5" /> Analyzer Dashboard
        </button>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab("TRANSFER")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "TRANSFER" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" /> Internal Transfer
        </button>
        <button
          onClick={() => setActiveTab("ADJUST")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "ADJUST" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust / Wastage
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200/80">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading data…
        </div>
      ) : (
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
          
          {activeTab === "TRANSFER" && (
            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Select Item *</label>
                <select
                  value={transferForm.item_id}
                  onChange={(e) => setTransferForm({ ...transferForm, item_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-semibold"
                >
                  <option value="">— choose item —</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.name} ({it.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">From Location *</label>
                  <select
                    value={transferForm.from_location_id}
                    onChange={(e) => setTransferForm({ ...transferForm, from_location_id: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50"
                  >
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="font-semibold text-slate-600 text-[11px] block mb-1">To Location *</label>
                    <select
                      value={transferForm.to_location_id}
                      onChange={(e) => setTransferForm({ ...transferForm, to_location_id: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50"
                    >
                      <option value="">— select —</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 mt-4 shrink-0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Batch / Lot *</label>
                  <select
                    value={transferForm.batch_id}
                    onChange={(e) => setTransferForm({ ...transferForm, batch_id: e.target.value })}
                    disabled={batches.length === 0}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-mono"
                  >
                    {batches.length === 0 ? (
                      <option value="">No stock available here</option>
                    ) : (
                      batches.map((b) => (
                        <option key={b.batch_id} value={b.batch_id}>
                          {b.lot_number} (Exp: {b.expiry_date}) — {b.qty_on_hand} left
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Quantity *</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={transferForm.qty}
                    onChange={(e) => setTransferForm({ ...transferForm, qty: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Notes</label>
                <input
                  type="text"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  placeholder="e.g. Issued to Hematology for morning run"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving || batches.length === 0}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs transition"
              >
                {saving ? "Transferring..." : "Complete Transfer"}
              </button>
            </form>
          )}

          {activeTab === "ADJUST" && (
            <form onSubmit={handleAdjust} className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-start gap-2 text-amber-800">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Adjustments alter stock balances permanently. Use only for physical recounts, breakages, or expiry write-offs.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Select Item *</label>
                  <select
                    value={adjustForm.item_id}
                    onChange={(e) => setAdjustForm({ ...adjustForm, item_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-semibold"
                  >
                    <option value="">— choose item —</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Location *</label>
                  <select
                    value={adjustForm.location_id}
                    onChange={(e) => setAdjustForm({ ...adjustForm, location_id: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50"
                  >
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Batch / Lot *</label>
                <select
                  value={adjustForm.batch_id}
                  onChange={(e) => setAdjustForm({ ...adjustForm, batch_id: e.target.value })}
                  disabled={adjBatches.length === 0}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-mono"
                >
                  {adjBatches.length === 0 ? (
                    <option value="">No stock available here</option>
                  ) : (
                    adjBatches.map((b) => (
                      <option key={b.batch_id} value={b.batch_id}>
                        {b.lot_number} (Exp: {b.expiry_date}) — {b.qty_on_hand} left
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Type *</label>
                  <select
                    value={adjustForm.adjust_type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, adjust_type: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-bold text-blue-700"
                  >
                    <option value="wastage">Wastage / Breakage</option>
                    <option value="expiry_writeoff">Expiry Write-off</option>
                    <option value="adjustment">Recount Adjustment (+/-)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">
                    {adjustForm.adjust_type === "adjustment" ? "Qty (Use - for reduction)" : "Quantity to Remove *"}
                  </label>
                  <input
                    type="number" step="0.01"
                    value={adjustForm.adjust_qty}
                    onChange={(e) => setAdjustForm({ ...adjustForm, adjust_qty: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Reason / Remarks *</label>
                <input
                  type="text"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g. Dropped during transport, or Physical count was 45 not 50"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving || adjBatches.length === 0}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs transition"
              >
                {saving ? "Recording..." : "Record Adjustment"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
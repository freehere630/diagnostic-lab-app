import React, { useState, useEffect } from "react";
import {
  Cpu, Plus, RefreshCw, AlertTriangle, CheckCircle2,
  X, Trash2, Box, Barcode
} from "lucide-react";
import {
  getLaboratoryMachines, getActiveMachineReagents, installMachineReagent,
  getInventoryItems, getFefoBatches
} from "../services/inventoryApi";

export default function MachineDashboard() {
  const [machines, setMachines] = useState([]);
  const [activeReagents, setActiveReagents] = useState({});
  const [loading, setLoading] = useState(true);

  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [items, setItems] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  
  const [form, setForm] = useState({
    item_id: "",
    batch_id: "",
    expected_tests: "500",
  });
  const [installing, setInstalling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const macs = await getLaboratoryMachines();
      setMachines(macs);
      
      const reagentsMap = {};
      for (const m of macs) {
        const reagents = await getActiveMachineReagents(m.id);
        reagentsMap[m.id] = reagents;
      }
      setActiveReagents(reagentsMap);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openInstall = async (machine) => {
    setSelectedMachine(machine);
    setForm({ item_id: "", batch_id: "", expected_tests: "500" });
    setAvailableBatches([]);
    setIsInstallOpen(true);
    try {
      const its = await getInventoryItems({});
      setItems(its);
    } catch (e) { /* silent */ }
  };

  const handleItemChange = async (itemId) => {
    setForm({ ...form, item_id: itemId, batch_id: "" });
    setAvailableBatches([]);
    if (!itemId) return;

    try {
      // Get batches available in the Main Store for this item
      const batches = await getFefoBatches(itemId, "LOC-MAIN");
      setAvailableBatches(batches);
      if (batches.length > 0) {
        setForm((f) => ({ ...f, batch_id: batches[0].batch_id }));
      }
    } catch (e) { /* silent */ }
  };

  const submitInstall = async (e) => {
    e.preventDefault();
    if (!form.item_id || !form.batch_id) return alert("Select an item and a batch.");
    setInstalling(true);
    try {
      await installMachineReagent({
        machineId: selectedMachine.id,
        itemId: form.item_id,
        batchId: form.batch_id,
        expectedTests: parseInt(form.expected_tests) || 500,
      });
      await load(); // Refresh the machine view
      setIsInstallOpen(false);
    } catch (err) {
      alert("Install failed: " + err.message);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Analyzer Dashboard</h2>
            <p className="text-[10px] text-slate-400">
              Install packs on machines. Test counts deduct automatically on verification.
            </p>
          </div>
        </div>
        <button onClick={load} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading machines…
        </div>
      ) : machines.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs italic bg-white rounded-xl border border-slate-200/80">
          No machines found in the database. Run the SQL setup to add a machine.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {machines.map((machine) => {
            const reagents = activeReagents[machine.id] || [];
            return (
              <div key={machine.id} className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="bg-slate-50/70 p-3 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">{machine.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Location: {machine.location?.name}</p>
                  </div>
                  <button
                    onClick={() => openInstall(machine)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Install Pack
                  </button>
                </div>

                <div className="p-3 space-y-3">
                  {reagents.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs italic border border-dashed rounded-lg">
                      No active reagents installed.
                    </div>
                  ) : (
                    reagents.map((r) => {
                      const pct = Math.min(100, (r.tests_used / r.expected_tests) * 100);
                      const remaining = Math.max(0, r.expected_tests - r.tests_used);
                      const isLow = remaining < (r.expected_tests * 0.15);

                      return (
                        <div key={r.id} className="border border-slate-200 rounded-lg p-3 relative">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold text-xs text-slate-900">{r.item?.name}</div>
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                Lot: {r.batch?.lot_number} · Exp: {r.batch?.expiry_date}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-bold ${isLow ? "text-rose-600" : "text-emerald-600"}`}>
                                {remaining} tests
                              </span>
                              <div className="text-[9px] text-slate-400 uppercase">Remaining</div>
                            </div>
                          </div>
                          
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${isLow ? "bg-rose-500" : "bg-emerald-500"}`}
                              style={{ width: `${100 - pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
                            <span>{r.tests_used} used</span>
                            <span>{r.expected_tests} total</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Install Modal */}
      {isInstallOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-sm">Install Reagent Pack</span>
              </div>
              <button onClick={() => setIsInstallOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={submitInstall} className="p-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Reagent Item *</label>
                <select
                  value={form.item_id}
                  onChange={(e) => handleItemChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-semibold"
                >
                  <option value="">— choose item —</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.name} ({it.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Batch / Lot from Main Store *</label>
                <select
                  value={form.batch_id}
                  onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                  disabled={!form.item_id || availableBatches.length === 0}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-mono"
                >
                  {availableBatches.length === 0 ? (
                    <option value="">No batches in Main Store</option>
                  ) : (
                    availableBatches.map((b) => (
                      <option key={b.batch_id} value={b.batch_id}>
                        {b.lot_number} (Exp: {b.expiry_date}) — {b.qty_on_hand} on hand
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Expected Tests per Pack</label>
                <input
                  type="number"
                  min="1"
                  value={form.expected_tests}
                  onChange={(e) => setForm({ ...form, expected_tests: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Default is 500. Check the manufacturer's box.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsInstallOpen(false)} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={installing} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">
                  {installing ? "Installing…" : "Install Pack"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
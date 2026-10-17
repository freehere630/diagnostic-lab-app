import React, { useState, useEffect } from "react";
import {
  BarChart3, AlertTriangle, Clock, Wallet, RefreshCw,
  ChevronRight, Package, Download
} from "lucide-react";
import {
  getLowStockReport, getExpiringBatches, getStockValuation
} from "../services/inventoryApi";

export default function InventoryReports() {
  const [activeTab, setActiveTab] = useState("LOW_STOCK");
  const [loading, setLoading] = useState(true);
  
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [valuation, setValuation] = useState([]);
  
  const [expiryDays, setExpiryDays] = useState(90);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ls, ex, val] = await Promise.all([
        getLowStockReport(),
        getExpiringBatches(expiryDays),
        getStockValuation()
      ]);
      setLowStock(ls);
      setExpiring(ex);
      setValuation(val);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [expiryDays]);

  const totalValuation = valuation.reduce((s, v) => s + parseFloat(v.total_value), 0);

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* Header */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Inventory Reports</h2>
            <p className="text-[10px] text-slate-400">Low stock, expiry tracking, and financial valuation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-bold text-xs flex items-center gap-1.5">
            <Wallet className="w-4 h-4" /> Total Value: ৳{totalValuation.toLocaleString()}
          </div>
          <button onClick={loadData} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab("LOW_STOCK")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "LOW_STOCK" ? "bg-white text-rose-600 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Low Stock ({lowStock.length})
        </button>
        <button
          onClick={() => setActiveTab("EXPIRY")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "EXPIRY" ? "bg-white text-amber-600 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Clock className="w-3.5 h-3.5" /> Expiry Alert ({expiring.length})
        </button>
        <button
          onClick={() => setActiveTab("VALUATION")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "VALUATION" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Wallet className="w-3.5 h-3.5" /> Valuation
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Generating reports…
          </div>
        ) : (
          <>
            {/* LOW STOCK */}
            {activeTab === "LOW_STOCK" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/75 border-b border-slate-200">
                    <tr className="text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">On Hand</th>
                      <th className="py-2.5 px-3 text-right">Reorder At</th>
                      <th className="py-2.5 px-3 text-right">Suggested Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStock.length === 0 ? (
                      <tr><td colSpan="5" className="py-8 text-center text-slate-400 italic">All items are above reorder levels.</td></tr>
                    ) : (
                      lowStock.map((r) => (
                        <tr key={r.item_id} className="hover:bg-rose-50/30 transition">
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">{r.item_name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{r.item_code}</div>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-600 capitalize">{r.category}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                            {r.qty_on_hand} <span className="text-[10px] text-slate-400 font-normal">{r.uom}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {r.reorder_level}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            +{r.suggested_order}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* EXPIRY */}
            {activeTab === "EXPIRY" && (
              <div>
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Show expiries within:</span>
                  {[30, 60, 90, 180].map(d => (
                    <button
                      key={d}
                      onClick={() => setExpiryDays(d)}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition ${expiryDays === d ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/75 border-b border-slate-200">
                      <tr className="text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
                        <th className="py-2.5 px-3">Item / Lot</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">Expiry Date</th>
                        <th className="py-2.5 px-3 text-right">Qty Left</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expiring.length === 0 ? (
                        <tr><td colSpan="5" className="py-8 text-center text-slate-400 italic">No batches expiring within {expiryDays} days.</td></tr>
                      ) : (
                        expiring.map((r) => {
                          const isExpired = r.days_until_expiry < 0;
                          return (
                            <tr key={r.batch_id} className={`hover:bg-amber-50/30 transition ${isExpired ? "bg-rose-50/40" : ""}`}>
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-900">{r.item_name}</div>
                                <div className="text-[10px] font-mono text-slate-500">Lot: {r.lot_number}</div>
                              </td>
                              <td className="py-2 px-3 text-[11px] text-slate-600">{r.location_name}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-700">{r.expiry_date}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold">{r.qty_on_hand}</td>
                              <td className="py-2 px-3 text-right">
                                {isExpired ? (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">EXPIRED</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">{r.days_until_expiry} Days</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VALUATION */}
            {activeTab === "VALUATION" && (
              <div className="p-4">
                <table className="w-full text-left text-xs border-collapse max-w-2xl mx-auto">
                  <thead className="border-b border-slate-200">
                    <tr className="text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Total Items (Qty)</th>
                      <th className="py-2 px-3 text-right">Total Value (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {valuation.map((v) => (
                      <tr key={v.category} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-bold text-slate-800 capitalize">{v.category.replace('_', ' ')}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">{parseFloat(v.total_quantity).toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          ৳{parseFloat(v.total_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold text-sm border-t-2 border-slate-300">
                      <td className="py-3 px-3 text-slate-900">TOTAL</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {valuation.reduce((s, v) => s + parseFloat(v.total_quantity), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">
                        ৳{totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
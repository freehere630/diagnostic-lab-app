import React, { useState } from "react";
import { Search, Calendar, Receipt, DollarSign, CheckCircle2, AlertCircle, X } from "lucide-react";

export default function Dashboard({
  orders,
  departments,
  testCatalog,
  setSelectedOrderId,
  setActiveTab,
  handlePrintMoneyReceipt,
  handleSettleDue,
  dashboardSearch,
  setDashboardSearch,
  dateRange,
  setDateRange
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [activePreset, setActivePreset] = useState("ALL"); // Tracks active preset button
  const [settleOrder, setSettleOrder] = useState(null);
  const [collectionAmount, setCollectionAmount] = useState("");

  const setPreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();

    if (preset === "TODAY") {
      setDateRange({ from: todayStr, to: todayStr });
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setDateRange({ from: yStr, to: yStr });
    } else if (preset === "LAST_7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDateRange({ from: d.toISOString().slice(0, 10), to: todayStr });
    } else if (preset === "THIS_MONTH") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      setDateRange({ from: startOfMonth, to: todayStr });
    } else if (preset === "ALL") {
      setDateRange({ from: "", to: "" });
    }
  };

  const handleCustomDateChange = (type, val) => {
    setActivePreset("CUSTOM");
    setDateRange({ ...dateRange, [type]: val });
  };

  const totalRevenue = orders.reduce((acc, o) => acc + (o.billing?.paid || 0), 0);
  const totalDue = orders.reduce((acc, o) => acc + (o.billing?.due || 0), 0);
  const pendingQC = orders.filter((o) => o.qcStatus === "Pending").length;
  const verifiedCount = orders.filter((o) => o.qcStatus === "Verified").length;

  const openSettleModal = (ord) => {
    setSettleOrder(ord);
    setCollectionAmount(ord.billing?.due || "");
  };

  const submitSettlement = () => {
    if (!settleOrder) return;
    const amt = parseFloat(collectionAmount);
    if (isNaN(amt) || amt <= 0) return alert("Please enter a valid collection amount.");
    handleSettleDue(settleOrder.orderId, amt);
    setSettleOrder(null);
  };

  const metrics = [
    { label: "Filtered Orders", val: orders.length, color: "text-slate-900", border: "border-blue-500" },
    { label: "Master Tests", val: testCatalog.length, color: "text-indigo-600", border: "border-purple-500" },
    { label: "Pending QC", val: pendingQC, color: "text-amber-600", border: "border-amber-500" },
    { label: "Verified Ready", val: verifiedCount, color: "text-emerald-600", border: "border-emerald-500" },
    { label: "Total Collected", val: `৳ ${totalRevenue.toFixed(0)}`, color: "text-emerald-700 font-black", border: "border-emerald-600" },
    { label: "Outstanding Due", val: `৳ ${totalDue.toFixed(0)}`, color: "text-rose-600 font-black", border: "border-rose-500" },
  ];

  // Preset button styling helper
  const getPresetBtnClass = (presetName) => {
    const isActive = activePreset === presetName;
    return `px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
      isActive 
        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600/30" 
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
    }`;
  };

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Top Search and Date Range Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Laboratory Operations Dashboard</h2>
            <p className="text-xs text-slate-500">Live search by Receipt No, Patient ID, Barcode, Phone, Name, and Date Range</p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Receipt, Patient ID, Barcode, Phone..."
              value={dashboardSearch}
              onChange={(e) => setDashboardSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Date Range Controls & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date Range:
            </span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleCustomDateChange("from", e.target.value)}
              className="p-1.5 border rounded-lg bg-slate-50 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleCustomDateChange("to", e.target.value)}
              className="p-1.5 border rounded-lg bg-slate-50 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ACTIVE HIGHLIGHTED PRESET BUTTONS */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              type="button" 
              onClick={() => setPreset("TODAY")} 
              className={getPresetBtnClass("TODAY")}
            >
              Today
            </button>
            <button 
              type="button" 
              onClick={() => setPreset("YESTERDAY")} 
              className={getPresetBtnClass("YESTERDAY")}
            >
              Yesterday
            </button>
            <button 
              type="button" 
              onClick={() => setPreset("LAST_7")} 
              className={getPresetBtnClass("LAST_7")}
            >
              Last 7 Days
            </button>
            <button 
              type="button" 
              onClick={() => setPreset("THIS_MONTH")} 
              className={getPresetBtnClass("THIS_MONTH")}
            >
              This Month
            </button>
            <button 
              type="button" 
              onClick={() => setPreset("ALL")} 
              className={getPresetBtnClass("ALL")}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        {metrics.map((m, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-2xl border-t-4 ${m.border} shadow-sm border-x border-b border-slate-200`}>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider truncate">{m.label}</p>
            <p className={`text-xl sm:text-2xl font-black mt-1 ${m.color}`}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm w-full">
        <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 flex items-center justify-between">
          <span>Patient Order Queue ({orders.length} Records)</span>
          {activePreset !== "ALL" && (
            <span className="text-xs text-blue-600 font-semibold lowercase">
              filtered by {activePreset.replace("_", " ")}
            </span>
          )}
        </h3>

        {orders.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-8 text-center">No orders match the selected search or date range.</p>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Paid / Due</th>
                  <th className="py-3 px-4">QC Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => {
                  const hasDue = (ord.billing?.due || 0) > 0;

                  return (
                    <tr key={ord.orderId} className="hover:bg-blue-50/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{ord.receiptNo}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{ord.date}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{ord.patient?.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{ord.patient?.name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{ord.patient?.phone}</td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        ৳{ord.billing?.paid || 0} /{" "}
                        {hasDue ? (
                          <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-black">
                            Due ৳{ord.billing?.due}
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                            PAID
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ord.qcStatus === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {ord.qcStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {hasDue && (
                          <button
                            onClick={() => openSettleModal(ord)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] transition inline-flex items-center gap-1 shadow-sm"
                            title="Collect remaining due"
                          >
                            <DollarSign className="w-3 h-3" /> Collect Due
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintMoneyReceipt(ord)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[11px] transition"
                        >
                          <Receipt className="w-3.5 h-3.5 inline mr-1" /> A5 Receipt
                        </button>
                        <button
                          onClick={() => { setSelectedOrderId(ord.orderId); setActiveTab("reports"); }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded font-bold text-[11px] transition"
                        >
                          Report ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Due Settlement Popup Modal */}
      {settleOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-slate-800">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border overflow-hidden">
            <div className="bg-amber-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Collect Due on Report Delivery
              </h3>
              <button onClick={() => setSettleOrder(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-900">{settleOrder.patient?.name} ({settleOrder.patient?.id})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-bold text-slate-700">{settleOrder.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Net Payable:</span>
                  <span className="font-mono font-bold">৳ {settleOrder.billing?.netPayable}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="font-mono font-bold text-emerald-700">৳ {settleOrder.billing?.paid}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold text-sm text-rose-600">
                  <span>Current Due:</span>
                  <span>৳ {settleOrder.billing?.due}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Amount Collected Now (৳)</label>
                <input
                  type="number"
                  value={collectionAmount}
                  onChange={(e) => setCollectionAmount(e.target.value)}
                  className="w-full p-2.5 text-base font-mono font-black border-2 border-amber-400 bg-amber-50/50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleOrder(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitSettlement}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm & Clear Due
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
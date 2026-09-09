import React from "react";
import { Search, Calendar, Receipt, RotateCcw, Filter } from "lucide-react";

export default function Dashboard({
  orders,
  departments,
  testCatalog,
  setSelectedOrderId,
  setActiveTab,
  handlePrintMoneyReceipt,
  dashboardSearch,
  setDashboardSearch,
  dateRange,
  setDateRange
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Quick Date Range Filter Presets
  const setPreset = (preset) => {
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

  const totalRevenue = orders.reduce((acc, o) => acc + (o.billing?.paid || 0), 0);
  const pendingQC = orders.filter((o) => o.qcStatus === "Pending").length;
  const verifiedCount = orders.filter((o) => o.qcStatus === "Verified").length;

  const metrics = [
    { label: "Filtered Orders", val: orders.length, color: "text-slate-900", border: "border-blue-500" },
    { label: "Departments", val: departments.length, color: "text-blue-600", border: "border-indigo-500" },
    { label: "Master Tests", val: testCatalog.length, color: "text-indigo-600", border: "border-purple-500" },
    { label: "Pending QC", val: pendingQC, color: "text-amber-600", border: "border-amber-500" },
    { label: "Verified Reports", val: verifiedCount, color: "text-emerald-600", border: "border-emerald-500" },
    { label: "Filtered Revenue", val: `৳ ${totalRevenue}`, color: "text-blue-700 font-black", border: "border-emerald-600" },
  ];

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Universal Search & Date Range Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Laboratory Operations Dashboard</h2>
            <p className="text-xs text-slate-500">Live search by Receipt No, Patient ID, Barcode, Phone, Name, and Date Range</p>
          </div>

          {/* Universal Text Search Input */}
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

        {/* Date Range Selector & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date Range:
            </span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="p-1.5 border rounded-lg bg-slate-50 text-xs font-mono font-bold"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="p-1.5 border rounded-lg bg-slate-50 text-xs font-mono font-bold"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border">
            <button onClick={() => setPreset("TODAY")} className="px-2.5 py-1 rounded-lg font-bold bg-white text-slate-800 shadow-sm hover:bg-blue-50">Today</button>
            <button onClick={() => setPreset("YESTERDAY")} className="px-2.5 py-1 rounded-lg font-bold text-slate-600 hover:text-slate-900">Yesterday</button>
            <button onClick={() => setPreset("LAST_7")} className="px-2.5 py-1 rounded-lg font-bold text-slate-600 hover:text-slate-900">Last 7 Days</button>
            <button onClick={() => setPreset("THIS_MONTH")} className="px-2.5 py-1 rounded-lg font-bold text-slate-600 hover:text-slate-900">This Month</button>
            <button onClick={() => setPreset("ALL")} className="px-2.5 py-1 rounded-lg font-bold text-slate-600 hover:text-slate-900">All Time</button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        {metrics.map((m, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-2xl border-t-4 ${m.border} shadow-sm border-x border-b border-slate-200`}>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider truncate">{m.label}</p>
            <p className={`text-xl sm:text-2xl font-black mt-1 ${m.color}`}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* Filtered Patient Queue Table */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm w-full">
        <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 flex items-center justify-between">
          <span>Patient Order Queue ({orders.length} Records)</span>
          {(dashboardSearch || dateRange.from || dateRange.to) && (
            <span className="text-xs text-blue-600 font-normal">Active Filters Applied</span>
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
                {orders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-blue-50/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{ord.receiptNo}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{ord.date}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{ord.patient?.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{ord.patient?.name} ({ord.patient?.age}Y/{ord.patient?.gender})</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{ord.patient?.phone}</td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      ৳{ord.billing?.paid || 0} / <span className="text-rose-600">৳{ord.billing?.due || 0}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ord.qcStatus === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {ord.qcStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handlePrintMoneyReceipt(ord)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[11px] transition"
                        title="Print A5 Money Receipt"
                      >
                        <Receipt className="w-3.5 h-3.5 inline mr-1" /> A5 Receipt
                      </button>
                      <button
                        onClick={() => { setSelectedOrderId(ord.orderId); setActiveTab("verifier"); }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded font-bold text-[11px] transition"
                      >
                        Open ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
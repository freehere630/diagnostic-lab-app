import React, { useMemo, useState, useEffect } from "react";
import {
  Search, Calendar, Receipt, DollarSign, CheckCircle2,
  X, ChevronLeft, ChevronRight, Clock,
  MessageCircle, RotateCcw, AlertTriangle, ChevronDown, Filter
} from "lucide-react";
import { sendRecollectionWhatsApp } from "../utils/whatsappHelper";
import { markSampleRecollected } from "../services/api";
import { getAllOrderVials } from "../utils/printHelpers";

export default function Dashboard({
  orders = [],
  departments = [],
  testCatalog = [],
  setSelectedOrderId,
  setActiveTab,
  handlePrintMoneyReceipt,
  handleSettleDue,
  handleMarkRecollected,
  dashboardSearch,
  setDashboardSearch,
  dateRange,
  setDateRange,
  activePreset,
  setPreset,
  currentPage,
  setCurrentPage,
  totalPages,
  totalCount,
  pageSize = 20,
  isLoading
}) {
  const [settleOrder, setSettleOrder] = useState(null);
  const [collectionAmount, setCollectionAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [isBubbleOpen, setIsBubbleOpen] = useState(false);
  const [localOrders, setLocalOrders] = useState(orders);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const sortedOrders = useMemo(() => {
    const q = (dashboardSearch || "").trim().toLowerCase();
    return [...localOrders]
      .filter((ord) => {
        if (!q) return true;
        const orderVials = getAllOrderVials(ord);
        const allBarcodes = [ord.barcode, ...orderVials.map((v) => v.barcode)].filter(Boolean);
        return (
          allBarcodes.some((b) => String(b).toLowerCase().includes(q)) ||
          (ord.patient?.name && ord.patient.name.toLowerCase().includes(q)) ||
          (ord.patient?.id && String(ord.patient.id).toLowerCase().includes(q)) ||
          (ord.patient?.phone && ord.patient.phone.includes(q))
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.created_at || a.date).getTime() || 0;
        const timeB = new Date(b.createdAt || b.created_at || b.date).getTime() || 0;
        return timeB - timeA;
      });
  }, [localOrders, dashboardSearch]);

  const recollectionOrders = useMemo(() => {
    return sortedOrders.filter((o) => {
      const status = (o.sample_status || o.sampleStatus || "").toLowerCase();
      const remarks = (o.verifierRemarks || o.verifier_remarks || "").toUpperCase();

      if (status.includes("recollected") || status === "sample recollected") {
        return false;
      }

      return (
        status.includes("repeat collection required") ||
        status === "repeat collection" ||
        (remarks.includes("RECOLLECTION REQUIRED") && !status.includes("recollected"))
      );
    });
  }, [sortedOrders]);

  const totalRevenue = sortedOrders.reduce((acc, o) => acc + (o.billing?.paid || 0), 0);
  const totalDue = sortedOrders.reduce((acc, o) => acc + (o.billing?.due || 0), 0);
  const pendingQC = sortedOrders.filter((o) => o.qcStatus === "Pending").length;
  const verifiedCount = sortedOrders.filter((o) => o.qcStatus === "Verified").length;

  const openSettleModal = (ord) => {
    setSettleOrder(ord);
    setCollectionAmount(ord.billing?.due || "");
  };

  const submitSettlement = () => {
    if (!settleOrder) return;
    const amt = parseFloat(collectionAmount);
    if (isNaN(amt) || amt <= 0) return alert("Please enter a valid collection amount.");
    handleSettleDue(settleOrder.orderId || settleOrder.id, amt);
    setSettleOrder(null);
  };

  const handleMarkRecollectedAction = async (ord) => {
    const targetId = ord?.orderId || ord?.id || ord;
    if (!targetId) return;

    setActionLoading(true);
    try {
      if (handleMarkRecollected) {
        await handleMarkRecollected(targetId);
      } else {
        await markSampleRecollected(targetId);
      }

      setLocalOrders((prev) =>
        prev.map((o) =>
          (o.orderId === targetId || o.id === targetId)
            ? {
                ...o,
                sample_status: "Sample Recollected",
                sampleStatus: "Sample Recollected",
                verifierRemarks: "New sample recollected. Clinically correlated and verified with quality control standards.",
                verifier_remarks: "New sample recollected. Clinically correlated and verified with quality control standards."
              }
            : o
        )
      );

      if (recollectionOrders.length <= 1) {
        setIsBubbleOpen(false);
      }
    } catch (e) {
      console.error("Recollection error:", e);
      alert("Error marking sample recollected: " + (e.message || e));
    } finally {
      setActionLoading(false);
    }
  };

  const formatEntryTime = (dateStr, createdAtStr) => {
    if (createdAtStr && createdAtStr.includes("T")) {
      try {
        const d = new Date(createdAtStr);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } catch (e) {}
    }
    return dateStr || "Today";
  };

  const getPresetBtnClass = (presetName) => {
    const isActive = activePreset === presetName;
    return `px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
      isActive
        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
        : "text-slate-500 hover:text-slate-800"
    }`;
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* 1. COMPACT ANALYTICS STRIP (SPACE SAVING) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Page Orders</span>
          <span className="text-lg font-bold text-slate-800">{sortedOrders.length}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Period Total</span>
          <span className="text-lg font-bold text-blue-600">{totalCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Pending QC</span>
          <span className="text-lg font-bold text-amber-600">{pendingQC}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Verified Ready</span>
          <span className="text-lg font-bold text-emerald-600">{verifiedCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Total Collected</span>
          <span className="text-lg font-bold text-slate-900 font-mono">৳{totalRevenue.toLocaleString()}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Outstanding Due</span>
          <span className="text-lg font-bold text-rose-600 font-mono">৳{totalDue.toLocaleString()}</span>
        </div>
      </div>

      {/* 2. DENSE FILTER & TOOLBAR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter Barcode, Patient UHID, Phone, Name..."
            value={dashboardSearch}
            onChange={(e) => {
              setDashboardSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition font-medium"
          />
        </div>

        {/* Date Pickers & Range Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => {
                setDateRange({ ...dateRange, from: e.target.value });
                setCurrentPage(1);
              }}
              className="bg-transparent text-[11px] font-mono outline-none font-semibold text-slate-700"
            />
            <span className="text-slate-300">-</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => {
                setDateRange({ ...dateRange, to: e.target.value });
                setCurrentPage(1);
              }}
              className="bg-transparent text-[11px] font-mono outline-none font-semibold text-slate-700"
            />
          </div>

          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button type="button" onClick={() => setPreset("TODAY")} className={getPresetBtnClass("TODAY")}>Today</button>
            <button type="button" onClick={() => setPreset("YESTERDAY")} className={getPresetBtnClass("YESTERDAY")}>Yesterday</button>
            <button type="button" onClick={() => setPreset("LAST_7")} className={getPresetBtnClass("LAST_7")}>7D</button>
            <button type="button" onClick={() => setPreset("THIS_MONTH")} className={getPresetBtnClass("THIS_MONTH")}>Month</button>
            <button type="button" onClick={() => setPreset("ALL")} className={getPresetBtnClass("ALL")}>All</button>
          </div>
        </div>

      </div>

      {/* 3. PATIENT QUEUE TABLE (SLIM & FAST) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Syncing database records...
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            No patient orders found in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Receipt / Barcode</th>
                  <th className="py-2.5 px-3">Patient (UHID)</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Paid / Due</th>
                  <th className="py-2.5 px-3">QC Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedOrders.map((ord) => {
                  const hasDue = (ord.billing?.due || 0) > 0;
                  const statusStr = (ord.sample_status || ord.sampleStatus || "").toLowerCase();
                  const isRecollection = statusStr.includes("repeat") && !statusStr.includes("recollected");

                  return (
                    <tr
                      key={ord.orderId || ord.id}
                      className={`hover:bg-slate-50/80 transition group ${isRecollection ? "bg-rose-50/30" : ""}`}
                    >
                      {/* Time */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-700 font-medium block">
                          {formatEntryTime(ord.date, ord.createdAt || ord.created_at)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">{ord.date}</span>
                      </td>

                      {/* Receipt & Barcode */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 block text-[11px]">{ord.receiptNo}</span>
                        <span className="font-mono text-[10px] text-slate-400 block">{ord.barcode}</span>
                      </td>

                      {/* Patient */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[160px] sm:max-w-[200px]">
                          {ord.patient?.name}
                        </div>
                        <div className="text-[10px] text-blue-600 font-mono font-semibold">
                          {ord.patient?.id} • {ord.patient?.age || "?"}Y / {ord.patient?.gender || "?"}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {ord.patient?.phone || "—"}
                      </td>

                      {/* Paid / Due */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                        <span className="font-semibold text-slate-700">৳{ord.billing?.paid || 0}</span>
                        {hasDue ? (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            Due ৳{ord.billing?.due}
                          </span>
                        ) : (
                          <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                            PAID
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isRecollection ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Repeat Specimen
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            ord.qcStatus === "Verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {ord.qcStatus || "Pending"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap space-x-1">
                        {hasDue && (
                          <button
                            onClick={() => openSettleModal(ord)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[11px] font-bold transition inline-flex items-center gap-1 shadow-xs"
                            title="Collect balance"
                          >
                            <DollarSign className="w-3 h-3" /> Due
                          </button>
                        )}

                        <button
                          onClick={() => handlePrintMoneyReceipt(ord)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" /> A5 Receipt
                        </button>

                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.orderId || ord.id);
                            setActiveTab("reports");
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded-md text-[11px] font-semibold transition shadow-xs"
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

        {/* 4. COMPACT PAGINATION FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 text-[11px] bg-slate-50/50">
          <span className="text-slate-500 font-medium">
            Showing <b>{sortedOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</b>–<b>{Math.min(currentPage * pageSize, totalCount)}</b> of <b>{totalCount}</b> entries
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="p-1 border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 py-0.5 text-slate-700 font-mono font-semibold">
              {currentPage} / {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1 border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 5. FLOATING MINIMAL RECOLLECTION NOTIFIER */}
      {recollectionOrders.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          {isBubbleOpen && (
            <div className="mb-2 bg-white w-80 sm:w-96 rounded-xl shadow-xl border border-rose-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="bg-rose-600 text-white px-3 py-2 flex justify-between items-center text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Repeat Collection Needed ({recollectionOrders.length})
                </span>
                <button onClick={() => setIsBubbleOpen(false)} className="hover:opacity-75">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1 text-xs">
                {recollectionOrders.map((ord) => (
                  <div key={ord.orderId || ord.id} className="p-2 hover:bg-rose-50/50 rounded-lg space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">{ord.patient?.name}</span>
                      <span className="font-mono text-blue-600 text-[10px] font-semibold">{ord.patient?.id}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      📞 {ord.patient?.phone} • Barcode: {ord.barcode}
                    </div>
                    <div className="flex gap-1 pt-1">
                      <button
                        onClick={() => sendRecollectionWhatsApp(ord, "Hemolyzed Specimen")}
                        className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleMarkRecollectedAction(ord)}
                        className="py-1 px-2 bg-slate-900 hover:bg-blue-600 text-white rounded text-[10px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" /> Recollected
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setIsBubbleOpen(!isBubbleOpen)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg text-xs font-bold transition active:scale-95 border-2 border-white"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            <span>{recollectionOrders.length} Recalls</span>
            {isBubbleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* 6. COMPACT SETTLE DUE PAYMENT MODAL */}
      {settleOrder && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-amber-600 text-white px-4 py-3 flex justify-between items-center font-bold">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Collect Due Balance
              </span>
              <button onClick={() => setSettleOrder(null)} className="hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Patient:</span>
                  <span className="font-bold text-slate-800">{settleOrder.patient?.name} ({settleOrder.patient?.id})</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Receipt No:</span>
                  <span className="font-mono text-slate-700">{settleOrder.receiptNo}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-600 border-t pt-1">
                  <span>Current Due:</span>
                  <span className="font-mono">৳{settleOrder.billing?.due}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Collected (৳)</label>
                <input
                  type="number"
                  value={collectionAmount}
                  onChange={(e) => setCollectionAmount(e.target.value)}
                  className="w-full p-2 text-sm font-mono font-bold border border-amber-300 bg-amber-50/40 rounded-lg outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleOrder(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitSettlement}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Settlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
import React, { useMemo, useState } from "react";
import { 
  Search, Calendar, Receipt, DollarSign, CheckCircle2, 
  AlertCircle, X, ChevronLeft, ChevronRight, Clock,
  MessageCircle, RotateCcw, AlertTriangle, ChevronDown 
} from "lucide-react";
import { sendRecollectionWhatsApp } from "../utils/whatsappHelper";
import { markSampleRecollected } from "../services/api";

export default function Dashboard({
  orders = [],
  departments = [],
  testCatalog = [],
  setSelectedOrderId,
  setActiveTab,
  handlePrintMoneyReceipt,
  handleSettleDue,
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

  // Messenger Bubble Open/Close State
  const [isBubbleOpen, setIsBubbleOpen] = useState(false);

  // Local state for orders so recollection clears instantly without page reload
  const [localOrders, setLocalOrders] = useState(orders);

  // Sync if parent orders update
  React.useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // STRICT TIME SORTING: Latest registration on top
  const sortedOrders = useMemo(() => {
    return [...localOrders].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || a.date).getTime() || 0;
      const timeB = new Date(b.createdAt || b.created_at || b.date).getTime() || 0;
      return timeB - timeA;
    });
  }, [localOrders]);

  // REPEAT SAMPLE RECOLLECTION FILTER
  const recollectionOrders = useMemo(() => {
    return sortedOrders.filter((o) => {
      const status = (o.sample_status || "").toLowerCase();
      const remarks = (o.verifierRemarks || "").toUpperCase();
      const isPendingRecollection = 
        status.includes("repeat collection required") || 
        status === "repeat collection" ||
        (remarks.includes("RECOLLECTION REQUIRED") && !status.includes("recollected"));
      return isPendingRecollection;
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
    handleSettleDue(settleOrder.orderId, amt);
    setSettleOrder(null);
  };

  // Instant local clear without full reload
  const handleMarkRecollectedAction = async (orderId) => {
    setActionLoading(true);
    try {
      await markSampleRecollected(orderId);
      
      // Update local state instantly so the bubble updates in real time
      setLocalOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                sample_status: "Sample Recollected",
                verifierRemarks: "New sample recollected. In analysis."
              }
            : o
        )
      );

      // If all cleared, close bubble
      if (recollectionOrders.length <= 1) {
        setIsBubbleOpen(false);
      }
    } catch (e) {
      alert("Error: " + e.message);
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

  const metrics = [
    { label: "Orders", val: sortedOrders.length, color: "text-slate-900", border: "border-blue-500" },
    { label: "Total in Period", val: totalCount, color: "text-indigo-600", border: "border-purple-500" },
    { label: "Pending QC", val: pendingQC, color: "text-amber-600", border: "border-amber-500" },
    { label: "Verified Ready", val: verifiedCount, color: "text-emerald-600", border: "border-emerald-500" },
    { label: "Collected", val: `৳ ${totalRevenue.toFixed(0)}`, color: "text-emerald-700 font-black", border: "border-emerald-600" },
    { label: "Due", val: `৳ ${totalDue.toFixed(0)}`, color: "text-rose-600 font-black", border: "border-rose-500" },
  ];

  const getPresetBtnClass = (presetName) => {
    const isActive = activePreset === presetName;
    return `px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
      isActive 
        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600/30" 
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
    }`;
  };

  return (
    <div className="space-y-6 w-full font-sans text-slate-800 relative">
      
      {/* Search & Preset Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Laboratory Operations Dashboard</h2>
            <p className="text-xs text-slate-500">
              Showing <b>{activePreset === "TODAY" ? "Today's Clinical Activity" : activePreset.replace("_", " ")}</b> (Newest Registration on Top)
            </p>
          </div>

          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Barcode, Patient ID, Name..."
              value={dashboardSearch}
              onChange={(e) => {
                setDashboardSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Date Filters & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date:
            </span>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => {
                setDateRange({ ...dateRange, from: e.target.value });
                setCurrentPage(1);
              }}
              className="p-1.5 border rounded-lg bg-slate-50 text-xs font-mono font-bold outline-none"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => {
                setDateRange({ ...dateRange, to: e.target.value });
                setCurrentPage(1);
              }}
              className="p-1.5 border rounded-lg bg-slate-50 text-xs font-mono font-bold outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button type="button" onClick={() => setPreset("TODAY")} className={getPresetBtnClass("TODAY")}>Today</button>
            <button type="button" onClick={() => setPreset("YESTERDAY")} className={getPresetBtnClass("YESTERDAY")}>Yesterday</button>
            <button type="button" onClick={() => setPreset("LAST_7")} className={getPresetBtnClass("LAST_7")}>Last 7 Days</button>
            <button type="button" onClick={() => setPreset("THIS_MONTH")} className={getPresetBtnClass("THIS_MONTH")}>This Month</button>
            <button type="button" onClick={() => setPreset("ALL")} className={getPresetBtnClass("ALL")}>All Time</button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        {metrics.map((m, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-2xl border-t-4 ${m.border} shadow-sm border-x border-b border-slate-200`}>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider truncate">{m.label}</p>
            <p className={`text-xl sm:text-2xl font-black mt-1 ${m.color}`}>{m.val}</p>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm w-full space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
            <span>Patient Queue (Newest First)</span>
            <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {totalCount} Total in Period
            </span>
          </h3>

          <span className="text-xs text-slate-500 font-semibold">
            Page {currentPage} of {totalPages || 1}
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading database records...
          </div>
        ) : sortedOrders.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-12 text-center">No orders found for this period.</p>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3 px-4">Time / Date</th>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Paid / Due</th>
                  <th className="py-3 px-4">QC Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedOrders.map((ord) => {
                  const hasDue = (ord.billing?.due || 0) > 0;
                  const isRecollection = (ord.sample_status || "").toLowerCase().includes("repeat");

                  return (
                    <tr key={ord.orderId} className={`hover:bg-blue-50/40 transition ${isRecollection ? "bg-rose-50/30" : ""}`}>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          {formatEntryTime(ord.date, ord.createdAt || ord.created_at)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{ord.date}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{ord.receiptNo}</td>
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
                        {isRecollection ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Repeat Required
                          </span>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ord.qcStatus === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {ord.qcStatus}
                          </span>
                        )}
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

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Showing <b>{sortedOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</b> to{" "}
            <b>{Math.min(currentPage * pageSize, totalCount)}</b> of <b>{totalCount}</b> records
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="px-3 py-1.5 border rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Prev Page
            </button>

            <span className="px-3 py-1.5 bg-slate-100 rounded-xl font-mono font-bold text-slate-800">
              {currentPage} / {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="px-3 py-1.5 border rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 transition"
            >
              Next Page <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COMPACT MESSENGER BUBBLE NOTIFICATION (SAVES SPACE)                       */}
      {/* ========================================================================= */}
      {recollectionOrders.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
          
          {/* EXPANDABLE MESSENGER CARD */}
          {isBubbleOpen && (
            <div className="mb-3 bg-white w-84 sm:w-96 rounded-2xl shadow-2xl border border-rose-300 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
              
              {/* Card Header */}
              <div className="bg-rose-600 text-white px-4 py-3 flex justify-between items-center shadow">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
                  <span className="font-extrabold text-xs tracking-wide">
                    Urgent Recollection Needed ({recollectionOrders.length})
                  </span>
                </div>
                <button
                  onClick={() => setIsBubbleOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg text-white/90 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Patient List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-2 text-xs">
                {recollectionOrders.map((ord) => (
                  <div key={ord.orderId} className="p-2.5 hover:bg-rose-50/50 rounded-xl transition space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-black text-slate-900">{ord.patient?.name}</span>
                        <span className="font-mono text-blue-700 font-bold ml-1.5">({ord.patient?.id})</span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[9px] uppercase">
                        Hemolyzed
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      📞 {ord.patient?.phone} • Barcode: {ord.barcode}
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => sendRecollectionWhatsApp(ord, "Hemolyzed Specimen")}
                        className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 shadow-sm transition"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp Recall
                      </button>

                      <button
                        disabled={actionLoading}
                        onClick={() => handleMarkRecollectedAction(ord.orderId)}
                        className="py-1 px-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 shadow-sm transition"
                      >
                        <RotateCcw className="w-3 h-3" /> Recollected
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FLOATING MESSENGER BUBBLE BUTTON */}
          <button
            onClick={() => setIsBubbleOpen(!isBubbleOpen)}
            className="flex items-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-2xl font-black text-xs transition-all transform hover:scale-105 active:scale-95 border-2 border-white"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span>{recollectionOrders.length} Sample Recall{recollectionOrders.length > 1 ? 's' : ''}</span>
            {isBubbleOpen ? <ChevronDown className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </button>
        </div>
      )}

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
                  className="w-full p-2.5 text-base font-mono font-black border-2 border-amber-400 bg-amber-50/50 rounded-xl outline-none text-slate-900"
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
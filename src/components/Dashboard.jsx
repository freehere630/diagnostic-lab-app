import React, { useMemo, useState, useEffect } from "react";
import {
  Search, Calendar, Receipt, DollarSign, CheckCircle2,
  X, ChevronLeft, ChevronRight, Clock,
  MessageCircle, RotateCcw, AlertTriangle, ChevronDown, Filter,
  Barcode
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
  // Group sibling vial-orders (same receiptNo) into one row per visit
  const visitGroups = useMemo(() => {
    const groups = new Map();
    for (const o of localOrders) {
      const key = o.receiptNo || o.orderId || o.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    }

    return Array.from(groups.values()).map((vials) => {
      const sorted = [...vials].sort((a, b) =>
        String(a.barcode || "").localeCompare(String(b.barcode || ""))
      );
      const master = sorted[0];
      const allBarcodes = [];
      const allTests = [];
      let totalPaid = 0;
      let totalDue = 0;
      let netPayable = 0;

      for (const v of sorted) {
        const bc = String(v.barcode || "").split(/[\s,]+/)[0];
        if (bc && !allBarcodes.includes(bc)) allBarcodes.push(bc);
        for (const t of (v.tests || [])) allTests.push(t);

        // Sum billing across siblings, but count the master's full net only once
        totalPaid += parseFloat(v.billing?.paid || 0);
        totalDue  += parseFloat(v.billing?.due  || 0);
        netPayable = Math.max(netPayable, parseFloat(v.billing?.netPayable || 0));
      }

      const anyPending = sorted.some((v) => (v.qcStatus || v.qc_status) !== "Verified");
      const anyRepeat = sorted.some((v) => {
        const s = (v.sample_status || v.sampleStatus || "").toLowerCase();
        return s.includes("repeat") && !s.includes("recollected");
      });

      return {
        master,
        vials: sorted,
        allBarcodes,
        allTests,
        totalPaid,
        totalDue,
        netPayable,
        anyPending,
        anyRepeat,
        createdAt: master.createdAt || master.created_at || master.date,
        date: master.date,
        patient: master.patient,
        receiptNo: master.receiptNo,
        isLocked: sorted.every((v) => v.isLocked === true || v.qcStatus === "Verified")
      };
    });
  }, [localOrders]);
  // Universal multi-barcode search: Matches primary, secondary, and test barcodes
  const sortedOrders = useMemo(() => {
    const q = (dashboardSearch || "").trim().toLowerCase();
    return visitGroups
      .filter((g) => {
        if (!q) return true;
        return (
          g.allBarcodes.some((b) => String(b).toLowerCase().includes(q)) ||
          (g.patient?.name && g.patient.name.toLowerCase().includes(q)) ||
          (g.patient?.id && String(g.patient.id).toLowerCase().includes(q)) ||
          (g.patient?.phone && g.patient.phone.includes(q)) ||
          (g.receiptNo && g.receiptNo.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime() || 0;
        const timeB = new Date(b.createdAt).getTime() || 0;
        return timeB - timeA;
      });
  }, [visitGroups, dashboardSearch]);
  const recollectionOrders = useMemo(() => {
    return sortedOrders.filter((g) => {
      const status = (g.master.sample_status || g.master.sampleStatus || "").toLowerCase();
      const remarks = (g.master.verifierRemarks || g.master.verifier_remarks || "").toUpperCase();

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

  const totalRevenue = sortedOrders.reduce((acc, g) => acc + g.totalPaid, 0);
  const totalDue = sortedOrders.reduce((acc, g) => acc + g.totalDue, 0);
  const pendingQC = sortedOrders.filter((g) => g.anyPending).length;
  const verifiedCount = sortedOrders.filter((g) => !g.anyPending).length;

  const openSettleModal = (g) => {
    // Find the sibling that actually carries the due balance
    const withDue = g.vials.find((v) => (v.billing?.due || 0) > 0) || g.master;
    setSettleOrder(withDue);
    setCollectionAmount(withDue.billing?.due || g.totalDue || "");
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
      
      {/* 1. ANALYTICS STRIP */}
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

      {/* 2. FILTER & TOOLBAR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Universal Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Scan / Type ANY Vial Barcode, UHID, Phone, Name..."
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

      {/* 3. PATIENT QUEUE TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Syncing database records...
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            No patient orders found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Receipt / All Specimen Vials</th>
                  <th className="py-2.5 px-3">Patient (UHID)</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Paid / Due</th>
                  <th className="py-2.5 px-3">QC Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
                            <tbody className="divide-y divide-slate-100">
                {sortedOrders.map((g) => {
                  const masterId = g.master.orderId || g.master.id;
                  const hasDue = g.totalDue > 0;
                  const isRecollection = g.anyRepeat;
                  const searchTrimmed = (dashboardSearch || "").trim().toLowerCase();

                  return (
                    <tr
                      key={masterId}
                      className={`hover:bg-slate-50/80 transition group ${isRecollection ? "bg-rose-50/30" : ""}`}
                    >
                      {/* Time */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-700 font-medium block">
                          {formatEntryTime(g.date, g.createdAt)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">{g.date}</span>
                      </td>

                      {/* Receipt & All Specimen Vials */}
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-slate-800 block text-[11px]">{g.receiptNo}</span>

                        <div className="flex flex-wrap gap-1 mt-0.5 max-w-xs">
                          {g.allBarcodes.map((bc, vIdx) => {
                            const isMatchedSearch = searchTrimmed && String(bc).toLowerCase().includes(searchTrimmed);
                            const matchingVial = g.vials.find(v => String(v.barcode || "").split(/[\s,]+/)[0] === bc);
                            const tubeShort = matchingVial?.vials?.[0]?.tubeColor?.split(" ")[0]
                              || matchingVial?.tests?.[0]?.tube_color?.split(" ")[0]
                              || "Vial";
                            return (
                              <span
                                key={vIdx}
                                className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-semibold border flex items-center gap-0.5 ${
                                  isMatchedSearch
                                    ? "bg-blue-600 text-white border-blue-600 font-bold ring-2 ring-blue-300"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                                title={`Vial ${bc}`}
                              >
                                <span>{bc}</span>
                                <span className={isMatchedSearch ? "text-blue-100" : "text-slate-400"}>
                                  ({tubeShort})
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[160px] sm:max-w-[200px]">
                          {g.patient?.name}
                        </div>
                        <div className="text-[10px] text-blue-600 font-mono font-semibold">
                          {g.patient?.id} • {g.patient?.age || "?"}Y / {g.patient?.gender || "?"}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {g.patient?.phone || "—"}
                      </td>

                      {/* Paid / Due */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">
                        <span className="font-semibold text-slate-700">৳{g.totalPaid}</span>
                        {hasDue ? (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            Due ৳{g.totalDue}
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
                            g.isLocked
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {g.isLocked ? "Verified" : "Pending"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap space-x-1">
                        {hasDue && (
                          <button
                            onClick={() => openSettleModal(g)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[11px] font-bold transition inline-flex items-center gap-1 shadow-xs"
                            title="Collect balance"
                          >
                            <DollarSign className="w-3 h-3" /> Due
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedOrderId(masterId);
                            setActiveTab("samples");
                          }}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold transition inline-flex items-center gap-1"
                          title="Open vials & barcode labels"
                        >
                          <Barcode className="w-3 h-3" /> Vials
                        </button>

                        <button
                          onClick={() => {
                            const fullVisitOrder = {
                              ...g.master,
                              tests: g.allTests,
                              allBarcodes: g.allBarcodes,
                              barcodesList: g.allBarcodes,
                              vials: g.vials,
                              billing: {
                                ...g.master.billing,
                                subTotal: g.allTests.reduce(
                                  (s, t) => s + parseFloat(t.price || 0),
                                  0
                                ),
                              },
                            };
                            handlePrintMoneyReceipt(fullVisitOrder);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" /> Receipt
                        </button>

                        <button
                          onClick={() => {
                            setSelectedOrderId(masterId);
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

        {/* 4. PAGINATION FOOTER */}
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

      {/* 5. FLOATING RECOLLECTION NOTIFIER */}
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
                {recollectionOrders.map((g) => (
                  <div key={g.master.orderId || g.master.id} className="p-2 hover:bg-rose-50/50 rounded-lg space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">{g.patient?.name}</span>
                      <span className="font-mono text-blue-600 text-[10px] font-semibold">{g.patient?.id}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      📞 {g.patient?.phone} • Barcodes: {g.allBarcodes.join(", ")}
                    </div>
                    <div className="flex gap-1 pt-1">
                      <button
                        onClick={() => sendRecollectionWhatsApp(g.master, "Hemolyzed Specimen")}
                        className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleMarkRecollectedAction(g.master)}
                        className="py-1 px-2 bg-slate-900 hover:bg-blue-600 text-white rounded text-[10px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Recollected
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

      {/* 6. SETTLE DUE PAYMENT MODAL */}
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
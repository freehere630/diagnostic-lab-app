import React, { useState, useMemo } from "react";
import { Search, Clock, Layers, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { getDepartmentVialBarcode, getAllOrderVials } from "../utils/printHelpers";

export default function Worklists({ orders = [], departments = [], setSelectedOrderId, setActiveTab }) {
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [worklistSearch, setWorklistSearch] = useState("");

  const sortedAndFiltered = useMemo(() => {
    return orders
      .filter((ord) => {
        const matchDept =
          deptFilter === "ALL" ||
          (ord.tests && ord.tests.some((t) => (t.dept_id || t.deptId) === deptFilter));
        const q = worklistSearch.trim().toLowerCase();
        const orderVials = getAllOrderVials(ord);
        const allBarcodes = [ord.barcode, ...orderVials.map((v) => v.barcode)].filter(Boolean);
        const matchSearch =
          !q ||
          allBarcodes.some((b) => String(b).toLowerCase().includes(q)) ||
          (ord.patient?.name && ord.patient.name.toLowerCase().includes(q)) ||
          (ord.patient?.id && String(ord.patient.id).toLowerCase().includes(q));
        return matchDept && matchSearch;
      })
      .sort((a, b) => {
        const statusA = (a.sample_status || a.sampleStatus || "").toLowerCase();
        const statusB = (b.sample_status || b.sampleStatus || "").toLowerCase();
        const isRepeatA = statusA.includes("repeat") && !statusA.includes("recollected");
        const isRepeatB = statusB.includes("repeat") && !statusB.includes("recollected");

        if (isRepeatA && !isRepeatB) return -1;
        if (!isRepeatA && isRepeatB) return 1;

        const isPendingA = (a.qcStatus || a.qc_status) !== "Verified" && !a.isLocked;
        const isPendingB = (b.qcStatus || b.qc_status) !== "Verified" && !b.isLocked;
        if (isPendingA && !isPendingB) return -1;
        if (!isPendingA && isPendingB) return 1;

        const timeA = new Date(a.createdAt || a.created_at || a.date).getTime() || 0;
        const timeB = new Date(b.createdAt || b.created_at || b.date).getTime() || 0;
        return timeB - timeA;
      });
  }, [orders, deptFilter, worklistSearch]);

  const pendingCount = useMemo(() => {
    return sortedAndFiltered.filter((o) => (o.qcStatus || o.qc_status) !== "Verified" && !o.isLocked).length;
  }, [sortedAndFiltered]);

  const completedCount = sortedAndFiltered.length - pendingCount;

  const formatEntryTime = (dateStr, createdAtStr) => {
    if (createdAtStr && createdAtStr.includes("T")) {
      try {
        const d = new Date(createdAtStr);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } catch (e) {}
    }
    return dateStr || "Today";
  };

  return (
    <div className="space-y-3.5 max-w-[1720px] mx-auto text-slate-900">
      
      {/* 1. COMPACT TOOLBAR & DEPARTMENT SELECTOR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Left: Department Icon & Active Stats */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xs sm:text-sm text-slate-900">Laboratory Worklists</h2>
              {pendingCount > 0 ? (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" /> {pendingCount} Pending
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Complete
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Showing pending specimens on top ({pendingCount} pending • {completedCount} verified)
            </p>
          </div>
        </div>

        {/* Right: Department Select & Search Input */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 outline-none focus:bg-white focus:border-blue-500 transition text-slate-700"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search barcode, patient UHID..."
              value={worklistSearch}
              onChange={(e) => setWorklistSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 outline-none focus:bg-white focus:border-blue-500 transition font-medium"
            />
          </div>
        </div>

      </div>

      {/* 2. DENSE WORKLIST SPECIMEN TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Department Vial Barcode(s)</th>
                <th className="py-2.5 px-3">Patient (UHID)</th>
                <th className="py-2.5 px-3">Assigned Tests</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAndFiltered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 italic">
                    No patient specimens found for this department filter.
                  </td>
                </tr>
              ) : (
                sortedAndFiltered.map((o) => {
                  const isPending = (o.qcStatus || o.qc_status) !== "Verified" && !o.isLocked;
                  const statusStr = (o.sample_status || o.sampleStatus || "").toLowerCase();
                  const isRepeat = statusStr.includes("repeat") && !statusStr.includes("recollected");
                  const orderVials = getAllOrderVials(o);

                  return (
                    <tr
                      key={o.orderId || o.id}
                      className={`hover:bg-slate-50/70 transition group ${
                        isRepeat 
                          ? "bg-rose-50/40" 
                          : isPending 
                            ? "bg-amber-50/20" 
                            : ""
                      }`}
                    >
                      {/* Time */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-800 font-semibold block text-[11px]">
                          {formatEntryTime(o.date, o.createdAt || o.created_at)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">{o.date}</span>
                      </td>

                      {/* Vial Barcodes */}
                      <td className="py-2 px-3">
                        {deptFilter === "ALL" ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {orderVials.length > 0 ? (
                              orderVials.map((v, i) => (
                                <span 
                                  key={i} 
                                  className="font-mono font-bold text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded border border-slate-200"
                                >
                                  {v.barcode} <span className="text-[9px] text-slate-400 font-normal">({v.tubeColor?.split(" ")[0]})</span>
                                </span>
                              ))
                            ) : (
                              <span className="font-mono font-bold text-xs text-blue-600">{o.barcode}</span>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                            {getDepartmentVialBarcode(o, deptFilter)}
                          </span>
                        )}
                      </td>

                      {/* Patient Details */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[150px]">{o.patient?.name}</div>
                        <div className="text-[10px] text-blue-600 font-mono font-semibold">{o.patient?.id}</div>
                      </td>

                      {/* Assigned Tests */}
                       <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {(() => {
                            const qSearch = (worklistSearch || "").trim().toLowerCase();
                            const testsForVial = qSearch
                              ? (o.tests || []).filter((t) =>
                                  String(t.vialBarcode || "").toLowerCase().includes(qSearch) ||
                                  String(t.barcode || "").toLowerCase().includes(qSearch)
                                )
                              : (deptFilter !== "ALL"
                                  ? (o.tests || []).filter((t) => (t.dept_id || t.deptId) === deptFilter)
                                  : o.tests || []);

                            const listToRender = testsForVial.length > 0 ? testsForVial : (o.tests || []);

                            return listToRender.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200/60"
                                title={`Vial: ${t.vialBarcode || o.barcode}`}
                              >
                                {t.code || t.name}
                              </span>
                            ));
                          })()}
                        </div>
                      </td>

                      {/* QC Status */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isRepeat ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Repeat Required
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            o.qcStatus === "Verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {o.qcStatus || "Pending"}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        {isRepeat ? (
                          <button
                            onClick={() => {
                              setSelectedOrderId(o.orderId || o.id);
                              setActiveTab("verifier");
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-bold shadow-xs inline-flex items-center gap-1 transition active:scale-95"
                          >
                            <AlertTriangle className="w-3 h-3" /> Recollect ➔
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedOrderId(o.orderId || o.id);
                              setActiveTab("verifier");
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition shadow-xs ${
                              isPending
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-slate-900 hover:bg-slate-800 text-white"
                            }`}
                          >
                            {isPending ? "Enter Results ➔" : "Review ➔"}
                          </button>
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

    </div>
  );
}
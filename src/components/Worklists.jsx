import React, { useState, useMemo } from "react";
import { Search, Layers, CheckCircle2, AlertCircle, AlertTriangle, Barcode } from "lucide-react";

export default function Worklists({ orders = [], departments = [], setSelectedOrderId, setActiveTab }) {
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [worklistSearch, setWorklistSearch] = useState("");

  // Group sibling vial-orders by receiptNo → one row per patient visit
  const visitGroups = useMemo(() => {
    const groups = new Map();
    for (const o of orders) {
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

      // Count total vs filled parameters across every vial in the visit
      let totalParams = 0;
      let filledParams = 0;

      for (const v of sorted) {
        const bc = String(v.barcode || "").split(/[\s,]+/)[0];
        if (bc && !allBarcodes.includes(bc)) allBarcodes.push(bc);

        for (const t of (v.tests || [])) {
          allTests.push({
            ...t,
            _owningOrderId: v.orderId || v.id,
            _owningBarcode: bc
          });

          const params = t.test_parameters || t.parameters || [];
          const effectiveParams = params.length > 0
            ? params
            : [{ id: t.id, name: t.name || "Result" }];

          for (const p of effectiveParams) {
            totalParams++;
            const raw =
              v.results?.[p.id]?.value ??
              v.results?.[p.id] ??
              v.results?.[t.id]?.value;
            const val = raw === undefined || raw === null ? "" : String(raw).trim();
            if (val !== "" && val.toLowerCase() !== "undefined" && val.toLowerCase() !== "null") {
              filledParams++;
            }
          }
        }
      }

      const allResultsFilled = totalParams > 0 && filledParams >= totalParams;

      const anyPending = sorted.some((v) =>
        (v.qcStatus || v.qc_status) !== "Verified" && !v.isLocked
      );
      const anyRepeat = sorted.some((v) => {
        const s = (v.sample_status || v.sampleStatus || "").toLowerCase();
        return s.includes("repeat") && !s.includes("recollected");
      });

      return {
        master,
        vials: sorted,
        allBarcodes,
        allTests,
        anyPending,
        anyRepeat,
        totalParams,
        filledParams,
        allResultsFilled,
        createdAt: master.createdAt || master.created_at || master.date,
        patient: master.patient,
        receiptNo: master.receiptNo
      };
    });
  }, [orders]);

  const sortedAndFiltered = useMemo(() => {
    return visitGroups
      .filter((g) => {
        const matchDept = deptFilter === "ALL" ||
          g.allTests.some((t) => (t.dept_id || t.deptId) === deptFilter);
        const q = worklistSearch.trim().toLowerCase();
        const matchSearch = !q ||
          g.allBarcodes.some((b) => String(b).toLowerCase().includes(q)) ||
          (g.patient?.name && g.patient.name.toLowerCase().includes(q)) ||
          (g.patient?.id && String(g.patient.id).toLowerCase().includes(q));
        return matchDept && matchSearch;
      })
      .sort((a, b) => {
        if (a.anyRepeat && !b.anyRepeat) return -1;
        if (!a.anyRepeat && b.anyRepeat) return 1;
        if (a.anyPending && !b.anyPending) return -1;
        if (!a.anyPending && b.anyPending) return 1;
        const timeA = new Date(a.createdAt).getTime() || 0;
        const timeB = new Date(b.createdAt).getTime() || 0;
        return timeB - timeA;
      });
  }, [visitGroups, deptFilter, worklistSearch]);

  const pendingCount = useMemo(() => sortedAndFiltered.filter((g) => g.anyPending).length, [sortedAndFiltered]);
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
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
              One row per patient visit ({pendingCount} pending • {completedCount} verified)
            </p>
          </div>
        </div>

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

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Specimen Barcode(s)</th>
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
                sortedAndFiltered.map((g) => {
                  const masterId = g.master.orderId || g.master.id;
                  const isPending = g.anyPending;
                  const isRepeat = g.anyRepeat;

                  const qSearch = (worklistSearch || "").trim().toLowerCase();
                  let testsToShow = g.allTests;
                  if (qSearch) {
                    testsToShow = g.allTests.filter((t) =>
                      String(t._owningBarcode || t.vialBarcode || "").toLowerCase().includes(qSearch)
                    );
                  }
                  if (deptFilter !== "ALL") {
                    testsToShow = g.allTests.filter((t) => (t.dept_id || t.deptId) === deptFilter);
                  }

                  return (
                    <tr
                      key={masterId}
                      className={`hover:bg-slate-50/70 transition ${
                        isRepeat ? "bg-rose-50/40" : isPending ? "bg-amber-50/20" : ""
                      }`}
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-800 font-semibold block text-[11px]">
                          {formatEntryTime(g.master.date, g.createdAt)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">{g.master.date}</span>
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {g.allBarcodes.map((bc, i) => (
                            <span
                              key={i}
                              className="font-mono font-bold text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 inline-flex items-center gap-0.5"
                            >
                              <Barcode className="w-2.5 h-2.5" />
                              {bc}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[150px]">{g.patient?.name}</div>
                        <div className="text-[10px] text-blue-600 font-mono font-semibold">{g.patient?.id}</div>
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {testsToShow.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">No matching tests</span>
                          ) : (
                            testsToShow.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200/60"
                                title={`Vial: ${t._owningBarcode || ""}`}
                              >
                                {t.code || t.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        {isRepeat ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Repeat Required
                          </span>
                        ) : !isPending ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Verified
                          </span>
                        ) : g.allResultsFilled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Ready to Verify
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                            Pending ({g.filledParams}/{g.totalParams})
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedOrderId(masterId);
                            setActiveTab("verifier");
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition shadow-xs ${
                            isRepeat
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : !isPending
                                ? "bg-slate-900 hover:bg-slate-800 text-white"
                                : g.allResultsFilled
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {isRepeat
                            ? "Recollect ➔"
                            : !isPending
                              ? "Review ➔"
                              : g.allResultsFilled
                                ? "Verify ➔"
                                : "Enter Results ➔"}
                        </button>
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
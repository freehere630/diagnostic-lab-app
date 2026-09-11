import React, { useState, useMemo } from "react";
import { Search, Clock, Layers } from "lucide-react";

export default function Worklists({ orders, departments, setSelectedOrderId, setActiveTab }) {
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [worklistSearch, setWorklistSearch] = useState("");

  // Sort orders so LATEST entry by date & time is always on top
  const sortedAndFiltered = useMemo(() => {
    return orders
      .filter((ord) => {
        const matchDept =
          deptFilter === "ALL" ||
          (ord.tests && ord.tests.some((t) => (t.dept_id || t.deptId) === deptFilter));

        const q = worklistSearch.trim().toLowerCase();
        const matchSearch =
          !q ||
          (ord.barcode && ord.barcode.toLowerCase().includes(q)) ||
          (ord.patient?.name && ord.patient.name.toLowerCase().includes(q)) ||
          (ord.patient?.id && String(ord.patient.id).toLowerCase().includes(q));

        return matchDept && matchSearch;
      })
      .sort((a, b) => {
        // Sort descending: newest created_at / timestamp first
        const timeA = new Date(a.createdAt || a.created_at || a.date).getTime() || 0;
        const timeB = new Date(b.createdAt || b.created_at || b.date).getTime() || 0;
        return timeB - timeA;
      });
  }, [orders, deptFilter, worklistSearch]);

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
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border flex flex-wrap gap-3 items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">Laboratory Department Worklists</h2>
            <p className="text-[11px] text-slate-500">
              Sorted by Latest Entry First ({sortedAndFiltered.length} orders)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="p-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
            ))}
          </select>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search barcode, patient, UHID..."
              value={worklistSearch}
              onChange={(e) => setWorklistSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Worklists Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-500 font-bold">
              <th className="py-3 px-4">Time / Date</th>
              <th className="py-3 px-4">Barcode</th>
              <th className="py-3 px-4">Patient (UHID)</th>
              <th className="py-3 px-4">Assigned Tests</th>
              <th className="py-3 px-4">QC Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedAndFiltered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                  No patient orders found in worklist.
                </td>
              </tr>
            ) : (
              sortedAndFiltered.map((o) => (
                <tr key={o.orderId} className="hover:bg-blue-50/40 transition">
                  <td className="py-3 px-4 font-mono text-slate-600">
                    <span className="flex items-center gap-1 font-bold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {formatEntryTime(o.date, o.createdAt || o.created_at)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{o.date}</span>
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{o.barcode}</td>

                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div>{o.patient?.name}</div>
                    <div className="font-mono text-[10px] text-slate-500 font-normal">{o.patient?.id}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(o.tests || []).map((t, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-100 border rounded font-bold text-[10px]">
                          {t.code || t.name}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      o.qcStatus === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {o.qcStatus}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => { 
                        setSelectedOrderId(o.orderId); 
                        setActiveTab("verifier"); 
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg font-bold text-xs transition"
                    >
                      Enter Results ➔
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
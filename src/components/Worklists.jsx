import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";

export default function Worklists({ orders, departments, setSelectedOrderId, setActiveTab }) {
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [worklistSearch, setWorklistSearch] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((ord) => {
      const matchDept = deptFilter === "ALL" || ord.tests.some((t) => (t.dept_id || t.deptId) === deptFilter);
      const matchSearch =
        worklistSearch === "" ||
        ord.barcode.toLowerCase().includes(worklistSearch.toLowerCase()) ||
        ord.patient?.name?.toLowerCase().includes(worklistSearch.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [orders, deptFilter, worklistSearch]);

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white p-4 rounded-2xl border flex flex-wrap gap-3 items-center justify-between shadow-sm">
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="p-2 border rounded-xl text-xs font-bold bg-slate-50 outline-none"
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
            placeholder="Search barcode or patient..."
            value={worklistSearch}
            onChange={(e) => setWorklistSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-500 font-bold">
              <th className="py-3 px-4">Barcode</th>
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Tests</th>
              <th className="py-3 px-4">QC Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((o) => (
              <tr key={o.orderId} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-mono font-bold text-blue-700">{o.barcode}</td>
                <td className="py-3 px-4 font-semibold">{o.patient?.name}</td>
                <td className="py-3 px-4">{o.tests.map((t) => t.code).join(", ")}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded font-bold ${o.qcStatus === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {o.qcStatus}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => { setSelectedOrderId(o.orderId); setActiveTab("verifier"); }}
                    className="px-3 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded text-xs transition"
                  >
                    Open ➔
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
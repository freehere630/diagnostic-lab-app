import React, { useState, useEffect } from "react";
import {
  ShieldAlert, Search, RefreshCw, ChevronDown, ChevronRight,
  PlusCircle, Edit, Trash2, Clock, Calendar, X
} from "lucide-react";
import { getAuditLogs } from "../services/auditApi";

const ACTION_STYLE = {
  INSERT: { color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: PlusCircle },
  UPDATE: { color: "text-amber-700 bg-amber-50 border-amber-200", icon: Edit },
  DELETE: { color: "text-rose-700 bg-rose-50 border-rose-200", icon: Trash2 },
};

// Helper to get today's date in YYYY-MM-DD
const toLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ─── SMART SUMMARY GENERATOR ──────────────────────────────────────────
const getChangeSummary = (log) => {
  const { action, table_name, old_data, new_data } = log;
  
  if (action === "INSERT") {
    if (table_name === "tests") return `Created test: ${new_data.name}`;
    if (table_name === "orders") return `Created order: ${new_data.receipt_no}`;
    if (table_name === "results") return `Entered result: ${new_data.result_value || "empty"}`;
    if (table_name === "doctors") return `Added doctor: ${new_data.name}`;
    return `Created new record`;
  }

  if (action === "DELETE") {
    return `Deleted record`;
  }

  if (action === "UPDATE" && old_data && new_data) {
    const changes = [];
    
    // Only show important fields (ignore updated_at timestamps)
    const fieldsToWatch = {
      tests: ["name", "price", "is_available", "code", "report_type"],
      results: ["result_value"],
      orders: ["qc_status", "paid_amount", "due_amount", "sample_status", "is_locked"],
      doctors: ["name", "commission_rate", "phone"],
      inventory_items: ["name", "unit_cost", "reorder_level", "unit_sell_price"],
      expenses: ["amount", "category", "description"],
    };

    const fields = fieldsToWatch[table_name] || Object.keys(new_data).filter(k => k !== 'updated_at');

    for (const field of fields) {
      if (old_data[field] !== new_data[field]) {
        const oldVal = old_data[field] === null || old_data[field] === "" ? "empty" : old_data[field];
        const newVal = new_data[field] === null || new_data[field] === "" ? "empty" : new_data[field];
        changes.push(`${field}: ${oldVal} → ${newVal}`);
      }
    }

    if (changes.length > 0) return changes.join(", ");
    return "Updated other details";
  }

  return "";
};

export default function AuditLog() {
  const today = toLocalDateStr();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Set default dates to Today
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [expandedRow, setExpandedRow] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({ limit: 200, search, dateFrom, dateTo });
      setLogs(data);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Debounced auto-search: triggers 300ms after you stop typing
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFrom, dateTo]);

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* Header & Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">System Audit Trail</h2>
            <p className="text-[10px] text-slate-400">Immutable record of all database changes</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-[11px] font-mono outline-none text-slate-700 w-28"
              title="From Date"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg">
            <span className="text-slate-400 text-[10px] font-bold">TO</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-[11px] font-mono outline-none text-slate-700 w-28"
              title="To Date"
            />
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Table, ID, Action, or Receipt No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-slate-800 bg-slate-50 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1.5 p-0.5 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button 
            onClick={loadData} 
            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading logs…
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            No audit records found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
                  <th className="py-2.5 px-3 w-8"></th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Table</th>
                  <th className="py-2.5 px-3">What Changed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const style = ACTION_STYLE[log.action] || ACTION_STYLE.UPDATE;
                  const Icon = style.icon;
                  const isExpanded = expandedRow === log.id;
                  const summary = getChangeSummary(log);

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`hover:bg-slate-50 transition cursor-pointer ${isExpanded ? "bg-slate-50" : ""}`}
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                      >
                        <td className="py-2 px-3 text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3 text-slate-400" /> {formatTime(log.created_at)}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap">
                          {log.user?.full_name || "System/Unknown"}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${style.color}`}>
                            <Icon className="w-3 h-3" /> {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] uppercase text-slate-700">
                          {log.table_name}
                          <span className="block text-[9px] text-slate-400 normal-case font-sans">{log.record_id}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-700 truncate max-w-md" title={summary}>
                          {summary}
                        </td>
                      </tr>
                      
                      {/* Expanded JSON View (For Developers) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" className="p-0 border-b border-slate-200">
                            <div className="bg-slate-900 p-3 text-[10px] font-mono text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              {/* OLD DATA */}
                              <div>
                                <span className="text-rose-400 font-bold block mb-1 border-b border-slate-700 pb-1">
                                  {log.action === 'INSERT' ? '(No Previous Data)' : 'OLD DATA (Before)'}
                                </span>
                                {log.old_data ? (
                                  <pre className="overflow-x-auto max-h-60 whitespace-pre-wrap">
                                    {JSON.stringify(log.old_data, null, 2)}
                                  </pre>
                                ) : <span className="text-slate-600 italic">null</span>}
                              </div>

                              {/* NEW DATA */}
                              <div>
                                <span className="text-emerald-400 font-bold block mb-1 border-b border-slate-700 pb-1">
                                  {log.action === 'DELETE' ? '(Record Deleted)' : 'NEW DATA (After)'}
                                </span>
                                {log.new_data ? (
                                  <pre className="overflow-x-auto max-h-60 whitespace-pre-wrap">
                                    {JSON.stringify(log.new_data, null, 2)}
                                  </pre>
                                ) : <span className="text-slate-600 italic">null</span>}
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
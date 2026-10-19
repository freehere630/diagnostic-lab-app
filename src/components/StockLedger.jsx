import { onInventoryUpdate } from "../utils/inventoryEvents";
import React, { useState, useEffect } from "react";
import { ListChecks, RefreshCw, Filter, ArrowUpRight, ArrowDownLeft, Download } from "lucide-react";
import {
  getStockLedger, getInventoryItems, getInventoryLocations
} from "../services/inventoryApi";

const TX_TYPES = [
  "ALL", "opening", "receive", "issue", "return_to_supplier",
  "transfer_in", "transfer_out", "adjustment", "wastage",
  "expiry_writeoff", "reversal",
];

const TX_COLOR = {
  opening:            "bg-slate-100 text-slate-700 border-slate-200",
  receive:            "bg-emerald-50 text-emerald-700 border-emerald-200",
  issue:              "bg-blue-50 text-blue-700 border-blue-200",
  return_to_supplier: "bg-amber-50 text-amber-700 border-amber-200",
  transfer_in:        "bg-teal-50 text-teal-700 border-teal-200",
  transfer_out:       "bg-orange-50 text-orange-700 border-orange-200",
  adjustment:         "bg-purple-50 text-purple-700 border-purple-200",
  wastage:            "bg-rose-50 text-rose-700 border-rose-200",
  expiry_writeoff:    "bg-rose-100 text-rose-800 border-rose-300",
  reversal:           "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function StockLedger() {
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    itemId: "",
    locationId: "",
    transactionType: "ALL",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const [its, locs] = await Promise.all([
          getInventoryItems({}),
          getInventoryLocations(),
        ]);
        setItems(its);
        setLocations(locs);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getStockLedger({
        itemId: filters.itemId || null,
        locationId: filters.locationId || null,
        transactionType: filters.transactionType,
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
        limit: 300,
      });
      setRows(data);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const unsub = onInventoryUpdate(load);
    return () => unsub();
  }, []);
  const totals = rows.reduce(
    (acc, r) => {
      const d = parseFloat(r.qty_delta) || 0;
      if (d > 0) acc.in += d;
      else acc.out += Math.abs(d);
      return acc;
    },
    { in: 0, out: 0 }
  );

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">

      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ListChecks className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Stock Ledger</h2>
            <p className="text-[10px] text-slate-400">
              Every movement — append-only, immutable. {rows.length} recent rows shown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono">
            <span className="text-emerald-700 font-bold">+{totals.in.toLocaleString()}</span>
            <span className="text-slate-300 mx-1">/</span>
            <span className="text-rose-700 font-bold">−{totals.out.toLocaleString()}</span>
          </span>
          <button
            onClick={load}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <select
          value={filters.itemId}
          onChange={(e) => setFilters({ ...filters, itemId: e.target.value })}
          className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-slate-50 outline-none max-w-[240px]"
        >
          <option value="">All items</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>{it.code} — {it.name}</option>
          ))}
        </select>
        <select
          value={filters.locationId}
          onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
          className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-slate-50 outline-none"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select
          value={filters.transactionType}
          onChange={(e) => setFilters({ ...filters, transactionType: e.target.value })}
          className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-slate-50 outline-none"
        >
          {TX_TYPES.map((t) => (
            <option key={t} value={t}>{t === "ALL" ? "All types" : t}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-slate-50 outline-none font-mono"
        />
        <span className="text-slate-300">–</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-slate-50 outline-none font-mono"
        />
        <button
          onClick={load}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold"
        >
          Apply
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading ledger…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            No stock movements match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/75 border-b border-slate-200">
                <tr className="text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
                  <th className="py-2 px-3 whitespace-nowrap">Time</th>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3">Lot / Batch</th>
                  <th className="py-2 px-3">Location</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const delta = parseFloat(r.qty_delta) || 0;
                  const isPositive = delta > 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {formatTime(r.created_at)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[220px]">
                          {r.item?.name || r.item_id}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {r.item?.code}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {r.batch?.lot_number ? (
                          <>
                            <div className="font-mono text-[11px] text-slate-700">{r.batch.lot_number}</div>
                            {r.batch.expiry_date && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                exp {r.batch.expiry_date}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-[160px]">
                        {r.location?.name || r.location_id}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${TX_COLOR[r.transaction_type] || TX_COLOR.adjustment}`}>
                          {r.transaction_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${isPositive ? "text-emerald-700" : "text-rose-700"}`}>
                        <span className="inline-flex items-center gap-0.5">
                          {isPositive ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isPositive ? "+" : ""}{delta.toLocaleString()}
                        </span>
                        <div className="text-[10px] text-slate-400 font-normal">{r.item?.uom}</div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-500 truncate max-w-[160px]">
                        {r.reference_id || "—"}
                      </td>
                    </tr>
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
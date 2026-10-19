import { onInventoryUpdate } from "../utils/inventoryEvents";
import React, { useState, useEffect } from "react";
import {
  Package, AlertTriangle, Clock, TrendingDown, Wallet,
  RefreshCw, ArrowRight, ArrowDownLeft, ArrowUpRight, PackagePlus,
  ListChecks
} from "lucide-react";
import {
  getInventoryDashboardStats, getStockLedger, getInventoryItems
} from "../services/inventoryApi";

export default function InventoryDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, items] = await Promise.all([
        getInventoryDashboardStats(),
        getStockLedger({ limit: 15 }),
        getInventoryItems({}),
      ]);
      setStats(s);
      setRecent(r);
      const low = items
        .filter((it) => {
          const threshold = parseFloat(it.reorder_level) || parseFloat(it.minimum_stock) || 0;
          return threshold > 0 && (it.qty_on_hand || 0) <= threshold;
        })
        .sort((a, b) => {
          const ta = parseFloat(a.reorder_level) || parseFloat(a.minimum_stock) || 0;
          const tb = parseFloat(b.reorder_level) || parseFloat(b.minimum_stock) || 0;
          return (a.qty_on_hand / (ta || 1)) - (b.qty_on_hand / (tb || 1));
        })
        .slice(0, 8);
      setLowStockItems(low);
    } catch (e) {
      console.error("[InventoryDashboard] load failed:", e);
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
    useEffect(() => {
    const unsub = onInventoryUpdate(load);
    return () => unsub();
  }, []);

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">

      {/* Header */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Inventory Home</h2>
            <p className="text-[10px] text-slate-400">Stock health, movement, and alerts across all departments</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => onNavigate && onNavigate("inventory-items")}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <ListChecks className="w-3.5 h-3.5" /> Item Master
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <StatCard
          label="Active Items"
          value={loading ? "—" : stats?.activeItems ?? 0}
          icon={Package}
          tone="slate"
        />
        <StatCard
          label="Low Stock"
          value={loading ? "—" : stats?.lowStock ?? 0}
          icon={TrendingDown}
          tone={stats?.lowStock > 0 ? "rose" : "slate"}
        />
        <StatCard
          label="Near Expiry (90d)"
          value={loading ? "—" : stats?.nearExpiry ?? 0}
          icon={Clock}
          tone={stats?.nearExpiry > 0 ? "amber" : "slate"}
        />
        <StatCard
          label="Expired"
          value={loading ? "—" : stats?.expired ?? 0}
          icon={AlertTriangle}
          tone={stats?.expired > 0 ? "rose" : "slate"}
        />
        <StatCard
          label="Stock Value"
          value={loading ? "—" : `৳${(stats?.valuation ?? 0).toLocaleString()}`}
          icon={Wallet}
          tone="emerald"
          mono
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Low stock list */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Reorder Soon
            </span>
            <span className="text-[10px] text-slate-400">{lowStockItems.length} items</span>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              All items above reorder level.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStockItems.map((it) => {
                const threshold = parseFloat(it.reorder_level) || parseFloat(it.minimum_stock) || 0;
                const onHand = parseFloat(it.qty_on_hand) || 0;
                const pct = threshold > 0 ? Math.min(100, (onHand / threshold) * 100) : 0;
                return (
                  <li key={it.id} className="px-3 py-2 hover:bg-slate-50 transition">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-semibold text-xs text-slate-900 truncate">{it.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{it.code}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pct < 40 ? "bg-rose-500" : pct < 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {onHand.toLocaleString()} / {threshold.toLocaleString()} {it.uom}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            onClick={() => onNavigate && onNavigate("inventory-items")}
            className="w-full py-2 border-t border-slate-100 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1 transition"
          >
            Open Item Master <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Recent movements */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5 text-blue-600" /> Recent Movements
            </span>
            <button
              onClick={() => onNavigate && onNavigate("inventory-ledger")}
              className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              View full ledger <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading…
            </div>
          ) : recent.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs italic">
              No stock movements yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {recent.map((r) => {
                const delta = parseFloat(r.qty_delta) || 0;
                const pos = delta > 0;
                return (
                  <li key={r.id} className="px-3 py-2 hover:bg-slate-50 transition flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${pos ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {pos ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {r.item?.name || r.item_id}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {r.item?.code} · {r.location?.name} · {r.transaction_type.replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-sm ${pos ? "text-emerald-700" : "text-rose-700"}`}>
                        {pos ? "+" : ""}{delta.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {formatTime(r.created_at)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick action: receive stock */}
      <button
        onClick={() => onNavigate && onNavigate("inventory-items")}
        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-4 rounded-xl shadow-xs flex items-center justify-between group transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">Receive Stock</div>
            <div className="text-[11px] opacity-80">Log a new GRN or opening balance — batches, expiry, and cost per line</div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition" />
      </button>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = "slate", mono = false }) {
  const toneMap = {
    slate:   { bg: "bg-white",          ring: "border-slate-200/80",  icon: "bg-slate-100 text-slate-600",   value: "text-slate-800" },
    rose:    { bg: "bg-rose-50/60",     ring: "border-rose-200",      icon: "bg-rose-100 text-rose-700",     value: "text-rose-700" },
    amber:   { bg: "bg-amber-50/60",    ring: "border-amber-200",     icon: "bg-amber-100 text-amber-700",   value: "text-amber-700" },
    emerald: { bg: "bg-emerald-50/60",  ring: "border-emerald-200",   icon: "bg-emerald-100 text-emerald-700", value: "text-emerald-700" },
  };
  const t = toneMap[tone] || toneMap.slate;
  return (
    <div className={`p-3 rounded-xl border shadow-xs ${t.bg} ${t.ring}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${t.icon}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className={`text-lg font-bold ${mono ? "font-mono" : ""} ${t.value}`}>
        {value}
      </div>
    </div>
  );
}
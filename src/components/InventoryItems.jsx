import React, { useState, useEffect, useMemo } from "react";
import {
  Package, Plus, Edit, Trash2, Search, X, AlertTriangle,
  PackagePlus, RefreshCw, Filter, ChevronLeft, ChevronRight, Cpu
} from "lucide-react";
import {
  getInventoryItems, saveInventoryItem, deleteInventoryItem,
  getInventoryLocations
} from "../services/inventoryApi";

const CATEGORIES = [
  { id: "reagent",             label: "Reagent" },
  { id: "control",             label: "Control" },
  { id: "calibrator",          label: "Calibrator" },
  { id: "consumable",          label: "Consumable" },
  { id: "specimen_collection", label: "Specimen Tube" },
  { id: "imaging_supply",      label: "Imaging Supply" },
  { id: "general_supply",      label: "General Supply" },
  { id: "cleaning_safety",     label: "Cleaning / Safety" },
];

const CATEGORY_COLOR = {
  reagent:             "bg-blue-50 text-blue-700 border-blue-200",
  control:             "bg-purple-50 text-purple-700 border-purple-200",
  calibrator:          "bg-indigo-50 text-indigo-700 border-indigo-200",
  consumable:          "bg-emerald-50 text-emerald-700 border-emerald-200",
  specimen_collection: "bg-amber-50 text-amber-700 border-amber-200",
  imaging_supply:      "bg-rose-50 text-rose-700 border-rose-200",
  general_supply:      "bg-slate-100 text-slate-700 border-slate-200",
  cleaning_safety:     "bg-teal-50 text-teal-700 border-teal-200",
};

const EMPTY_FORM = {
  id: "", code: "", name: "", category: "reagent", department_id: "", uom: "mL", pack_size: "1",
  unit_cost: "0", unit_sell_price: "0", tax_percent: "0",
  reorder_level: "0", minimum_stock: "0", maximum_stock: "0", safety_stock: "0",
  is_batch_tracked: true, is_expiry_tracked: true,
  default_location_id: "", barcode: "", manufacturer: "", notes: "",
  is_active: true,
};

const PAGE_SIZE = 20;

export default function InventoryItems({ onReceiveStock, onNavigate, departments = [] }) {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [its, locs] = await Promise.all([
        getInventoryItems({}),
        getInventoryLocations(),
      ]);
      setItems(its);
      setLocations(locs);
    } catch (e) {
      console.error("[InventoryItems] load failed:", e);
      alert("Could not load inventory: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter !== "ALL" && it.category !== categoryFilter) return false;
      const threshold = parseFloat(it.reorder_level) || parseFloat(it.minimum_stock) || 0;
      if (showLowStockOnly && !(threshold > 0 && (it.qty_on_hand || 0) <= threshold)) return false;
      if (!q) return true;
      return (
        (it.name || "").toLowerCase().includes(q) ||
        (it.code || "").toLowerCase().includes(q) ||
        (it.manufacturer || "").toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter, showLowStockOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [search, categoryFilter, showLowStockOnly]);

  const openNewModal = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, default_location_id: locations[0]?.id || "" });
    setIsModalOpen(true);
  };

  const openEditModal = (it) => {
    setEditing(it);
    setForm({
      id: it.id || "",
      code: it.code || "",
      name: it.name || "",
      category: it.category || "reagent",
      department_id: it.department_id || "",
      uom: it.uom || "",
      pack_size: String(it.pack_size ?? 1),
      unit_cost: String(it.unit_cost ?? 0),
      unit_sell_price: String(it.unit_sell_price ?? 0),
      tax_percent: String(it.tax_percent ?? 0),
      reorder_level: String(it.reorder_level ?? 0),
      minimum_stock: String(it.minimum_stock ?? 0),
      maximum_stock: String(it.maximum_stock ?? 0),
      safety_stock: String(it.safety_stock ?? 0),
      is_batch_tracked: it.is_batch_tracked !== false,
      is_expiry_tracked: it.is_expiry_tracked !== false,
      default_location_id: it.default_location_id || "",
      barcode: it.barcode || "",
      manufacturer: it.manufacturer || "",
      notes: it.notes || "",
      is_active: it.is_active !== false,
    });
    setIsModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) return alert("Item code is required.");
    if (!form.name.trim()) return alert("Item name is required.");
    if (!form.uom.trim()) return alert("Unit of measure is required.");

    setSaving(true);
    try {
      await saveInventoryItem(form);
      await load();
      setIsModalOpen(false);
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (it) => {
    if (!window.confirm(`Deactivate "${it.name}"? Existing ledger rows are preserved.`)) return;
    try {
      await deleteInventoryItem(it.id);
      await load();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">

      {/* Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Inventory Item Master</h2>
            <p className="text-[10px] text-slate-400">
              Reagents, controls, consumables — with reorder levels and pack-to-unit conversion
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 transition"
            />
          </div>
          <button
            onClick={load}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          
          <button
            onClick={() => onNavigate && onNavigate("inventory-machines")}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Cpu className="w-3.5 h-3.5" /> Analyzer Dashboard
          </button>

          <button
            onClick={() => onReceiveStock && onReceiveStock()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <PackagePlus className="w-3.5 h-3.5" /> Receive Stock
          </button>
          <button
            onClick={openNewModal}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
      </div>

      {/* Category filter pills + low-stock toggle */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setCategoryFilter("ALL")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
            categoryFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All ({items.length})
        </button>
        {CATEGORIES.map((c) => {
          const count = items.filter((i) => i.category === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition ${
                categoryFilter === c.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c.label} ({count})
            </button>
          );
        })}
        <span className="flex-1" />
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            className="w-3.5 h-3.5 text-rose-600 rounded"
          />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading items…
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            {items.length === 0
              ? "No items yet. Click \"Add Item\" to create the first one."
              : "No items match your filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">On Hand</th>
                  <th className="py-2.5 px-3 text-right">Reorder At</th>
                  <th className="py-2.5 px-3 text-right">Cost</th>
                  <th className="py-2.5 px-3 text-right">Sell</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((it) => {
                  const onHand = parseFloat(it.qty_on_hand || 0);
                  const threshold = parseFloat(it.reorder_level) || parseFloat(it.minimum_stock) || 0;
                  const isLow = threshold > 0 && onHand <= threshold;
                  const sell = parseFloat(it.unit_sell_price) || 0;
                  const cost = parseFloat(it.unit_cost) || 0;
                  const margin = sell > 0 ? sell - cost : 0;

                  return (
                    <tr key={it.id} className={`hover:bg-slate-50/80 transition ${isLow ? "bg-rose-50/30" : ""}`}>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{it.code}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[240px]">{it.name}</div>
                        {it.manufacturer && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[240px]">
                            {it.manufacturer}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${CATEGORY_COLOR[it.category] || CATEGORY_COLOR.general_supply}`}>
                          {CATEGORIES.find((c) => c.id === it.category)?.label || it.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-mono font-bold ${isLow ? "text-rose-600" : "text-slate-800"}`}>
                          {onHand.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1 font-mono">{it.uom}</span>
                        {isLow && (
                          <div className="text-[9px] font-bold text-rose-600 mt-0.5 flex items-center justify-end gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Low
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500 text-[11px]">
                        {threshold > 0 ? threshold.toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 text-[11px]">
                        ৳{cost.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {sell > 0 ? (
                          <>
                            <span className="font-bold text-emerald-700">৳{sell.toFixed(2)}</span>
                            {margin > 0 && (
                              <div className="text-[9px] text-emerald-600">+৳{margin.toFixed(2)}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onReceiveStock && onReceiveStock(it.id)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-semibold transition inline-flex items-center gap-1 mr-1"
                          title="Receive stock for this item"
                        >
                          <PackagePlus className="w-3 h-3" /> Receive
                        </button>
                        <button
                          onClick={() => openEditModal(it)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold transition inline-flex items-center gap-1 mr-1"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(it)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Deactivate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-100 text-[11px] bg-slate-50/50">
            <span className="text-slate-500 font-medium">
              Showing <b>{(currentPage - 1) * PAGE_SIZE + 1}</b>–<b>{Math.min(currentPage * PAGE_SIZE, filtered.length)}</b> of <b>{filtered.length}</b>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-0.5 text-slate-700 font-mono font-semibold">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 border border-slate-200 rounded-md bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[92vh] overflow-y-auto text-xs">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm text-slate-900">
                  {editing ? "Edit Item" : "New Inventory Item"}
                </span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-4 space-y-3">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Item Code *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="HEM-DIL-001"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono font-bold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Item Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Sysmex Diluent 20L"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-medium"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Department</label>
                  <select
                    value={form.department_id || ""}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-medium"
                  >
                    <option value="">— General / No Dept —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Unit of Measure *</label>
                  <input
                    type="text"
                    value={form.uom}
                    onChange={(e) => setForm({ ...form, uom: e.target.value })}
                    placeholder="mL / box / pcs"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Pack Size</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.pack_size}
                    onChange={(e) => setForm({ ...form, pack_size: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Unit Cost (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.unit_cost}
                    onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Unit Sell Price (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.unit_sell_price}
                    onChange={(e) => setForm({ ...form, unit_sell_price: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Tax / VAT %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.tax_percent}
                    onChange={(e) => setForm({ ...form, tax_percent: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.reorder_level}
                    onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Min Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.minimum_stock}
                    onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Max Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.maximum_stock}
                    onChange={(e) => setForm({ ...form, maximum_stock: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Safety Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.safety_stock}
                    onChange={(e) => setForm({ ...form, safety_stock: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Default Location</label>
                  <select
                    value={form.default_location_id}
                    onChange={(e) => setForm({ ...form, default_location_id: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50"
                  >
                    <option value="">— none —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Barcode</label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Supplier barcode"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 py-1">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_batch_tracked}
                    onChange={(e) => setForm({ ...form, is_batch_tracked: e.target.checked })}
                    className="w-3.5 h-3.5 rounded"
                  />
                  Batch / Lot tracking
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_expiry_tracked}
                    onChange={(e) => setForm({ ...form, is_expiry_tracked: e.target.checked })}
                    className="w-3.5 h-3.5 rounded"
                  />
                  Expiry tracking
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-3.5 h-3.5 rounded"
                  />
                  Active
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none resize-y"
                  placeholder="Storage requirements, analyzer compatibility, etc."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-bold shadow-xs"
                >
                  {saving ? "Saving…" : (editing ? "Update Item" : "Create Item")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
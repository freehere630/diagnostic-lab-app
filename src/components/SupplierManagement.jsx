import React, { useState, useEffect } from "react";
import { Truck, Plus, Edit, Trash2, Search, X, Phone, Mail, MapPin, RefreshCw } from "lucide-react";
import { getSuppliers, saveSupplier, deleteSupplier } from "../services/inventoryApi";

const EMPTY_FORM = {
  id: "", name: "", contact_person: "", phone: "", email: "",
  address: "", payment_terms: "", lead_time_days: "0", notes: "", is_active: true,
};

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers({ search, activeOnly: false });
      setSuppliers(data);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      id: s.id, name: s.name || "", contact_person: s.contact_person || "",
      phone: s.phone || "", email: s.email || "", address: s.address || "",
      payment_terms: s.payment_terms || "",
      lead_time_days: String(s.lead_time_days ?? 0),
      notes: s.notes || "", is_active: s.is_active !== false,
    });
    setIsModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Supplier name is required.");
    setSaving(true);
    try {
      await saveSupplier(form);
      await load();
      setIsModalOpen(false);
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Deactivate supplier "${s.name}"?`)) return;
    try {
      await deleteSupplier(s.id);
      await load();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Supplier Directory</h2>
            <p className="text-[10px] text-slate-400">
              Vendors you order reagents and consumables from
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, phone, contact…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 transition"
            />
          </div>
          <button
            onClick={load}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openNew}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Supplier
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200/80">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading suppliers…
        </div>
      ) : suppliers.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs italic bg-white rounded-xl border border-slate-200/80">
          No suppliers yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {suppliers.map((s) => (
            <div key={s.id} className={`bg-white p-3 rounded-xl border shadow-xs flex flex-col justify-between transition ${s.is_active === false ? "border-slate-200 opacity-60" : "border-slate-200/80 hover:border-slate-300"}`}>
              <div>
                <div className="flex justify-between items-start gap-1">
                  <h3 className="font-bold text-xs text-slate-900 leading-snug truncate">{s.name}</h3>
                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[9px] font-mono font-bold shrink-0">
                    {s.id.slice(-6)}
                  </span>
                </div>
                {s.contact_person && (
                  <p className="text-[11px] text-slate-600 mt-1 truncate">{s.contact_person}</p>
                )}
                {s.phone && (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 shrink-0 text-slate-400" /> {s.phone}
                  </p>
                )}
                {s.email && (
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0 text-slate-400" /> {s.email}
                  </p>
                )}
                {s.address && (
                  <p className="text-[10px] text-slate-500 mt-1 flex items-start gap-1">
                    <MapPin className="w-3 h-3 shrink-0 text-slate-400 mt-0.5" />
                    <span className="line-clamp-2">{s.address}</span>
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                  {s.payment_terms && (
                    <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold">
                      {s.payment_terms}
                    </span>
                  )}
                  {s.lead_time_days > 0 && (
                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-semibold">
                      Lead {s.lead_time_days}d
                    </span>
                  )}
                  {s.is_active === false && (
                    <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 rounded font-semibold">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEdit(s)}
                  className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition flex items-center justify-center gap-1"
                >
                  <Edit className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  title="Deactivate"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[92vh] overflow-y-auto text-xs">
            <div className="border-b border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm">{editing ? "Edit Supplier" : "New Supplier"}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none resize-y"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={form.payment_terms}
                    onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                    placeholder="e.g. Net 30"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Lead Time (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.lead_time_days}
                    onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-3.5 h-3.5 rounded"
                />
                Active
              </label>

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
                  {saving ? "Saving…" : (editing ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
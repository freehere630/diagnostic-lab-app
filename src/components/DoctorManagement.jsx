import React, { useState } from "react";
import { Stethoscope, Plus, Edit, Trash2, Phone, Building2, GraduationCap, X, Search } from "lucide-react";

export default function DoctorManagement({ doctorsList = [], handleSaveDoctor, handleDeleteDoctor, isLoading }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    degrees: "",
    designation: "",
    chamber: "",
    phone: "",
    email: ""
  });

  const openNewDoctorModal = () => {
    setEditingDoctor(null);
    setFormData({ name: "", degrees: "", designation: "", chamber: "", phone: "", email: "" });
    setIsModalOpen(true);
  };

  const openEditDoctorModal = (doc) => {
    setEditingDoctor(doc);
    setFormData({
      id: doc.id,
      name: doc.name || "",
      degrees: doc.degrees || "",
      designation: doc.designation || "",
      chamber: doc.chamber || "",
      phone: doc.phone || "",
      email: doc.email || ""
    });
    setIsModalOpen(true);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("Doctor name is required.");
    handleSaveDoctor(formData);
    setIsModalOpen(false);
  };

  const filteredDoctors = doctorsList.filter((d) => {
    const q = searchTerm.trim().toLowerCase();
    return (
      !q ||
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.degrees && d.degrees.toLowerCase().includes(q)) ||
      (d.chamber && d.chamber.toLowerCase().includes(q)) ||
      (d.phone && d.phone.includes(q))
    );
  });

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* 1. COMPACT TOOLBAR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900 leading-none">Referring Doctor Directory</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Doctors configured here auto-suggest in 1 click during Reception POS patient billing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctor, degree, chamber..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 transition"
            />
          </div>

          <button
            onClick={openNewDoctorModal}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Doctor
          </button>
        </div>
      </div>

      {/* 2. HIGH-DENSITY DOCTORS DIRECTORY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {filteredDoctors.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs italic bg-white rounded-xl border border-dashed border-slate-200">
            No doctors found matching your query.
          </div>
        ) : (
          filteredDoctors.map((doc) => (
            <div 
              key={doc.id} 
              className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex justify-between items-start gap-1">
                  <h3 className="font-bold text-xs text-slate-900 leading-snug truncate">{doc.name}</h3>
                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[9px] font-mono font-bold shrink-0">
                    {doc.id}
                  </span>
                </div>

                {doc.degrees && (
                  <p className="text-[11px] text-blue-700 font-semibold mt-1 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                    <span className="truncate">{doc.degrees}</span>
                  </p>
                )}

                {doc.chamber && (
                  <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{doc.chamber}</span>
                  </p>
                )}

                {doc.phone && (
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                    <span>{doc.phone}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEditDoctorModal(doc)}
                  className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition flex items-center justify-center gap-1"
                >
                  <Edit className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete doctor "${doc.name}"?`)) {
                      handleDeleteDoctor(doc.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  title="Delete Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. COMPACT ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-xl border border-slate-200 text-xs">
            
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                {editingDoctor ? "Edit Doctor Profile" : "Register Referring Doctor"}
              </span>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-2.5">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Doctor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Dr. M. A. Rahman"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Degrees & Qualifications</label>
                <input
                  type="text"
                  placeholder="e.g. MBBS, FCPS, MD (Cardiology)"
                  value={formData.degrees}
                  onChange={(e) => setFormData({ ...formData, degrees: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Hospital / Chamber / Clinic</label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka Medical College Hospital"
                  value={formData.chamber}
                  onChange={(e) => setFormData({ ...formData, chamber: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="017xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Associate Professor"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save Doctor
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
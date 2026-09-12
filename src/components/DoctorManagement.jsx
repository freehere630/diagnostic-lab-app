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
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" /> Referring Doctor Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain authorized medical practitioners for 1-click auto-filling in Reception POS.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctor, degree, chamber..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <button
            onClick={openNewDoctorModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Doctor
          </button>
        </div>
      </div>

      {/* Doctor Cards Directory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDoctors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white rounded-2xl border border-dashed">
            No doctors found matching your search.
          </div>
        ) : (
          filteredDoctors.map((doc) => (
            <div key={doc.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">{doc.name}</h3>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-mono font-bold">
                    {doc.id}
                  </span>
                </div>

                {doc.degrees && (
                  <p className="text-xs text-blue-700 font-semibold mt-1 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
                    <span className="truncate">{doc.degrees}</span>
                  </p>
                )}

                {doc.chamber && (
                  <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{doc.chamber}</span>
                  </p>
                )}

                {doc.phone && (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    <span>{doc.phone}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEditDoctorModal(doc)}
                  className="flex-1 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 text-slate-700"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete doctor "${doc.name}"?`)) {
                      handleDeleteDoctor(doc.id);
                    }
                  }}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  title="Delete Doctor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                {editingDoctor ? "Edit Doctor Profile" : "Register Referring Doctor"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Doctor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Dr. M. A. Rahman"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Degrees & Qualifications</label>
                <input
                  type="text"
                  placeholder="e.g. MBBS, FCPS, MD (Cardiology)"
                  value={formData.degrees}
                  onChange={(e) => setFormData({ ...formData, degrees: e.target.value })}
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Hospital / Chamber / Clinic</label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka Medical College Hospital"
                  value={formData.chamber}
                  onChange={(e) => setFormData({ ...formData, chamber: e.target.value })}
                  className="w-full p-2.5 border rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="017xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 border rounded-xl outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Associate Professor"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full p-2.5 border rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow"
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
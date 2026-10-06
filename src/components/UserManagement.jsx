import React, { useState } from "react";
import { UserCheck, Plus, Trash2, Upload, X, Image as ImageIcon, Shield } from "lucide-react";

export default function UserManagement({
  staffList = [],
  handleRegisterStaff,
  handleDeleteStaff,
  isLoading
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "technologist",
    designation: "BSc in Medical Technology - Senior Technologist",
    signatureData: ""
  });

  const [previewUrl, setPreviewUrl] = useState("");

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Please upload a signature file smaller than 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, signatureData: reader.result }));
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearSignature = () => {
    setFormData(prev => ({ ...prev, signatureData: "" }));
    setPreviewUrl("");
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      alert("Name, Email, and Password are required.");
      return;
    }
    handleRegisterStaff({
      ...formData,
      signatureData: formData.signatureData || formData.fullName
    });

    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "technologist",
      designation: "BSc in Medical Technology - Senior Technologist",
      signatureData: ""
    });
    setPreviewUrl("");
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* 1. REGISTRATION FORM (COMPACT) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-xs uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" /> Register Laboratory Staff & Official Signatures
            </h2>
            <p className="text-[10px] text-slate-400">
              Uploaded signature stamps will print automatically on authorized diagnostic reports.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Arthur Pendelton"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Workstation Role *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const r = e.target.value;
                  let defaultDesig = "BSc in Medical Technology - Senior Technologist";
                  if (r === "verifier") defaultDesig = "MBBS, MD (Pathology) - Consultant Pathologist";
                  if (r === "admin") defaultDesig = "MBBS, FCPS - Chief Laboratory Director";
                  if (r === "receptionist") defaultDesig = "Front Desk Executive";
                  setFormData({ ...formData, role: r, designation: defaultDesig });
                }}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold outline-none"
              >
                <option value="technologist">🧪 Lab Technologist (Left Sign)</option>
                <option value="verifier">👨‍🔬 Verifier / Pathologist (Right Sign)</option>
                <option value="admin">👨‍💼 Laboratory Director</option>
                <option value="receptionist">🧑‍💼 Front Desk Executive</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Official Medical Designation *</label>
              <input
                type="text"
                required
                placeholder="e.g. MBBS, MD (Pathology) - Consultant Pathologist"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Workstation Login Email *</label>
              <input
                type="email"
                required
                placeholder="staff@lab.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
              />
            </div>

            {/* Signature Upload Zone (Compact) */}
            <div className="lg:col-span-2 flex items-center gap-2">
              <label className="flex-1 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-slate-50 rounded-lg p-2 flex items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-700">Select Signature Stamp (PNG / JPG)</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />
              </label>

              {/* Live Preview Stamp */}
              <div className="w-28 h-10 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center relative p-1 shrink-0">
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Signature" className="h-full object-contain mix-blend-multiply" />
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No image</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> {isLoading ? "Saving..." : "Register Staff Member"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. REGISTERED STAFF DIRECTORY */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
            Registered Staff & Authorized Signatures ({staffList.length} Active Accounts)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {staffList.map((user) => {
            const hasImageSignature = user.signature_data && user.signature_data.startsWith("data:image");

            return (
              <div 
                key={user.id} 
                className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-slate-900 leading-snug">{user.full_name}</span>
                    <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] uppercase ${
                      user.role === "admin" ? "bg-purple-100 text-purple-800" :
                      user.role === "verifier" ? "bg-amber-100 text-amber-800" :
                      user.role === "technologist" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {user.role}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium truncate">{user.designation}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</p>

                  {/* Scanned Image / Stamp Preview Box */}
                  <div className="mt-2 p-1.5 bg-white border border-dashed border-slate-200 rounded-lg text-center h-12 flex items-center justify-center">
                    {hasImageSignature ? (
                      <img
                        src={user.signature_data}
                        alt="Signature Stamp"
                        className="h-10 max-w-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <span className="font-serif italic text-blue-900 font-bold text-xs">
                        {user.signature_data || user.full_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 flex justify-between items-center text-[10px] text-slate-400">
                  <span>Pass: ••••••••</span>
                  <button
                    onClick={() => handleDeleteStaff(user.id, user.full_name)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Remove Staff User"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
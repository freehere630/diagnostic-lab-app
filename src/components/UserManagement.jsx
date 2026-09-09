import React, { useState } from "react";
import { UserCheck, Plus, Trash2, Upload, FileImage, X, Image as ImageIcon } from "lucide-react";

export default function UserManagement({
  staffList,
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

  // Handle Image / File Upload & convert to Base64
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

    // Reset Form
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
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Registration Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
        <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" /> Register Laboratory Staff & Official Signatures
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Upload scanned signature images (PNG, JPG, PDF) that will automatically print on all diagnostic reports.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 uppercase block mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Arthur Pendelton"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 uppercase block mb-1">Workstation Role *</label>
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
                className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold outline-none"
              >
                <option value="technologist">🧪 Lab Technologist (Prints on Left)</option>
                <option value="verifier">👨‍🔬 Biochemist / Verifier (Prints on Right)</option>
                <option value="admin">👨‍💼 Lab Manager / Director</option>
                <option value="receptionist">🧑‍💼 Receptionist</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-600 uppercase block mb-1">Medical Designation (Printed on Report) *</label>
              <input
                type="text"
                required
                placeholder="e.g. MBBS, MD (Pathology) - Consultant Pathologist"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 uppercase block mb-1">Login Email *</label>
              <input
                type="email"
                required
                placeholder="staff@apexlab.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 uppercase block mb-1">Password *</label>
              <input
                type="password"
                required
                placeholder="Set password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2.5 border rounded-xl outline-none"
              />
            </div>
          </div>

          {/* UPLOAD SCANNED SIGNATURE FILE BOX */}
          <div className="border-t pt-4">
            <label className="font-bold text-slate-700 uppercase text-xs block mb-2">
              Upload Official Scanned Signature (Image / PDF)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* File Upload Zone */}
              <div className="sm:col-span-2">
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center">
                  <Upload className="w-6 h-6 text-blue-600 mb-1" />
                  <span className="text-xs font-bold text-slate-800">Click to select signature file</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Supports PNG (Transparent recommended), JPG, JPEG, PDF</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Signature Live Preview Box */}
              <div className="p-3 border rounded-2xl bg-slate-50 flex flex-col items-center justify-center min-h-[90px] relative">
                <span className="text-[10px] font-bold uppercase text-slate-400 mb-1">Report Stamp Preview</span>
                {previewUrl ? (
                  <div className="relative group w-full text-center">
                    <img
                      src={previewUrl}
                      alt="Signature Preview"
                      className="h-12 max-w-full object-contain mx-auto mix-blend-multiply"
                    />
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="absolute top-0 right-0 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-xs italic">
                    <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-40" />
                    No image uploaded (Will use font name)
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {isLoading ? "Saving..." : "Save Staff Member & Signature in Database"}
            </button>
          </div>
        </form>
      </div>

      {/* Registered Staff Directory Cards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
        <h3 className="font-bold text-sm text-slate-900 mb-4">
          Registered Staff & Official Signatures ({staffList.length} Active Users)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {staffList.map((user) => {
            const hasImageSignature = user.signature_data && user.signature_data.startsWith("data:image");

            return (
              <div key={user.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-sm text-slate-900">{user.full_name}</span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] uppercase ${
                      user.role === "admin" ? "bg-purple-100 text-purple-800" :
                      user.role === "verifier" ? "bg-amber-100 text-amber-800" :
                      user.role === "technologist" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {user.role}
                    </span>
                  </div>

                  <p className="text-slate-600 font-medium">{user.designation}</p>
                  <p className="text-slate-400 font-mono text-[11px] mt-1">{user.email}</p>

                  {/* Scanned Image / Stamp Display */}
                  <div className="mt-3 p-2 bg-white border border-dashed rounded-xl text-center min-h-[55px] flex flex-col justify-center items-center">
                    <p className="text-[9px] text-slate-400 uppercase font-mono mb-1">Official Signature</p>
                    {hasImageSignature ? (
                      <img
                        src={user.signature_data}
                        alt="Signature Stamp"
                        className="h-9 max-w-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <p className="font-serif italic text-blue-900 font-bold text-base">
                        {user.signature_data || user.full_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Pass: ••••••••</span>
                  <button
                    onClick={() => handleDeleteStaff(user.id, user.full_name)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remove Staff"
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
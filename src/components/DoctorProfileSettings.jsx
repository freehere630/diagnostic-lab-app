import React, { useState } from "react";
import { Save, Upload, X } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function DoctorProfileSettings({ doctor, onUpdated }) {
  const [form, setForm] = useState({
    name: doctor?.name || "",
    degrees: doctor?.degrees || "",
    specialization: doctor?.specialization || "",
    bmdc_reg_no: doctor?.bmdc_reg_no || "",
    chamber: doctor?.chamber || "",
    chamber_address: doctor?.chamber_address || "",
    phone: doctor?.phone || "",
    signature_data: doctor?.signature_data || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, signature_data: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({
          name: form.name,
          degrees: form.degrees,
          specialization: form.specialization,
          bmdc_reg_no: form.bmdc_reg_no,
          chamber: form.chamber,
          chamber_address: form.chamber_address,
          phone: form.phone,
          signature_data: form.signature_data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", doctor.id);

      if (error) throw error;
      alert("Profile updated successfully!");
      if (onUpdated) onUpdated();
    } catch (err) {
      alert("Error saving profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl mx-auto space-y-4">
      <div className="border-b pb-2 mb-4">
        <h2 className="text-lg font-bold text-slate-900">My Profile & Settings</h2>
        <p className="text-xs text-slate-500">These details will appear on your printed prescriptions.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Full Name *</label>
          <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Qualifications (Degrees)</label>
          <input type="text" value={form.degrees} onChange={(e) => setForm({ ...form, degrees: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Specialization</label>
          <input type="text" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">BMDC Reg. No.</label>
          <input type="text" value={form.bmdc_reg_no} onChange={(e) => setForm({ ...form, bmdc_reg_no: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Chamber / Hospital</label>
          <input type="text" value={form.chamber} onChange={(e) => setForm({ ...form, chamber: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Phone / Contact</label>
          <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-bold text-slate-600 block mb-1">Chamber Address</label>
          <input type="text" value={form.chamber_address} onChange={(e) => setForm({ ...form, chamber_address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <label className="text-xs font-bold text-slate-600 block mb-2">Digital Signature (For Prescriptions)</label>
        <div className="flex items-center gap-4">
          {form.signature_data ? (
            <div className="relative border rounded-lg p-2 bg-slate-50">
              <img src={form.signature_data} alt="Signature" className="h-12 object-contain" />
              <button type="button" onClick={() => setForm({ ...form, signature_data: "" })} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1"><X className="w-3 h-3"/></button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">Upload Signature Image</span>
              <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
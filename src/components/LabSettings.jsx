import React, { useState, useEffect } from "react";
import { Building2, Save, Upload, X, RotateCcw, CheckCircle2, Phone, MapPin, Mail, Globe, Palette } from "lucide-react";
import { DEFAULT_LAB_SETTINGS } from "../services/api";

export default function LabSettings({ labSettings, handleSaveSettings, isLoading }) {
  const [formData, setFormData] = useState(DEFAULT_LAB_SETTINGS);
  const [previewTab, setPreviewTab] = useState("report"); // 'report' or 'receipt'
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (labSettings) {
      setFormData({
        lab_name: labSettings.lab_name || labSettings.labName || DEFAULT_LAB_SETTINGS.lab_name,
        tagline: labSettings.tagline || DEFAULT_LAB_SETTINGS.tagline,
        address: labSettings.address || DEFAULT_LAB_SETTINGS.address,
        phone: labSettings.phone || DEFAULT_LAB_SETTINGS.phone,
        email: labSettings.email || DEFAULT_LAB_SETTINGS.email,
        website: labSettings.website || DEFAULT_LAB_SETTINGS.website,
        logo_data: labSettings.logo_data || labSettings.logoData || "",
        header_bg: labSettings.header_bg || labSettings.headerBg || "#20122e",
        header_color: labSettings.header_color || labSettings.headerColor || "#ffffff",
        receipt_footer: labSettings.receipt_footer || labSettings.receiptFooter || DEFAULT_LAB_SETTINGS.receipt_footer,
        report_footer: labSettings.report_footer || labSettings.reportFooter || DEFAULT_LAB_SETTINGS.report_footer
      });
    }
  }, [labSettings]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Please upload a logo image smaller than 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, logo_data: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, logo_data: "" }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await handleSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Reset all hospital branding fields to defaults?")) return;
    setFormData(DEFAULT_LAB_SETTINGS);
  };

  const HEADER_COLOR_PRESETS = [
    { label: "Deep Purple", bg: "#20122e", text: "#ffffff" },
    { label: "Navy Blue", bg: "#0f172a", text: "#ffffff" },
    { label: "Medical Indigo", bg: "#1e1b4b", text: "#ffffff" },
    { label: "Dark Emerald", bg: "#064e3b", text: "#ffffff" },
    { label: "Clinical Slate", bg: "#1e293b", text: "#ffffff" }
  ];

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" /> Hospital Branding & Template Authority
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure laboratory name, logo, contact hotlines, address, and color scheme for all printed reports & receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" /> Branding Saved!
            </span>
          )}

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
        </div>
      </div>

      {/* Grid: Editor Left, Live Canvas Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-6 space-y-4">
          <form onSubmit={onSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            
            {/* Identity */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">Laboratory / Hospital Name *</label>
              <input
                type="text"
                required
                value={formData.lab_name}
                onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
                placeholder="e.g. AL FATTAH DIAGNOSTIC & CONSULTATION CENTER"
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. With Al-Fattah on the Journey to Wellness"
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              />
            </div>

            {/* Address & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Full Physical Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Address, Area, City"
                    className="w-full pl-9 pr-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Hotline / Phone Numbers</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="017xxxxxxxx, 016xxxxxxxx"
                    className="w-full pl-9 pr-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Email & Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Official Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@lab.com"
                    className="w-full pl-9 pr-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Website URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="www.lab.com"
                    className="w-full pl-9 pr-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Official Logo Upload */}
            <div className="border-t pt-3">
              <label className="font-bold text-slate-700 uppercase block mb-1">Official Diagnostic Center Logo</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition text-slate-600 font-bold">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Choose Logo File (PNG / JPG)</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>

                {formData.logo_data && (
                  <div className="relative p-1 bg-slate-100 rounded-xl border border-slate-200 flex-shrink-0">
                    <img src={formData.logo_data} alt="Logo Preview" className="h-12 w-14 object-contain" />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow"
                      title="Remove Logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Header Theme Color Presets */}
            <div className="border-t pt-3">
              <label className="font-bold text-slate-700 uppercase-block mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-purple-600" /> Printed Header Background Color
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {HEADER_COLOR_PRESETS.map((p) => (
                  <button
                    key={p.bg}
                    type="button"
                    onClick={() => setFormData({ ...formData, header_bg: p.bg, header_color: p.text })}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 ${
                      formData.header_bg === p.bg ? "ring-2 ring-blue-500 shadow-md scale-105" : "opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: p.bg, color: p.text }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white/40"></span>
                    {p.label}
                  </button>
                ))}

                <input
                  type="color"
                  value={formData.header_bg}
                  onChange={(e) => setFormData({ ...formData, header_bg: e.target.value })}
                  className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  title="Custom Color"
                />
              </div>
            </div>

            {/* Disclaimers */}
            <div className="border-t pt-3 space-y-3">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">A4 Clinical Report Footer Disclaimer</label>
                <input
                  type="text"
                  value={formData.report_footer}
                  onChange={(e) => setFormData({ ...formData, report_footer: e.target.value })}
                  className="w-full p-2 border rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">A5 POS Money Receipt Footer</label>
                <input
                  type="text"
                  value={formData.receipt_footer}
                  onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                  className="w-full p-2 border rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Save className="w-4 h-4" /> {isLoading ? "Saving..." : "Save Hospital Branding to System"}
            </button>
          </form>
        </div>

        {/* Right Column: Live Header & Footer Canvas Preview */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Visual Preview</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewTab("report")}
                className={`px-3 py-1 rounded-lg transition ${previewTab === "report" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
              >
                A4 Report Header
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("receipt")}
                className={`px-3 py-1 rounded-lg transition ${previewTab === "receipt" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
              >
                A5 Receipt Header
              </button>
            </div>
          </div>

          {previewTab === "report" ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xl space-y-4">
              {/* Header Preview */}
              <div
                style={{ backgroundColor: formData.header_bg, color: formData.header_color }}
                className="p-4 rounded-xl flex justify-between items-center shadow-md transition-colors"
              >
                <div className="flex flex-col items-center gap-1">
                  {formData.logo_data ? (
                    <img src={formData.logo_data} alt="Logo" className="h-11 max-w-[80px] object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center text-rose-600 font-black text-sm">
                      AF
                    </div>
                  )}
                  <span className="text-[9px] text-slate-200 tracking-wide text-center">
                    {formData.tagline}
                  </span>
                </div>

                <div className="text-right max-w-xs">
                  <h3 className="font-black text-sm sm:text-base leading-tight uppercase tracking-wider">
                    {formData.lab_name}
                  </h3>
                  <p className="text-[10px] text-slate-300 mt-1">{formData.address}</p>
                </div>
              </div>

              {/* Sample Content Mock */}
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400 text-center font-mono py-8">
                [ Patient Demographics & Investigation Results Table Appears Here ]
              </div>

              {/* Footer Preview */}
              <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center text-[10px] font-bold text-slate-900">
                <div className="flex items-center gap-1 truncate max-w-[260px]">
                  <span className="text-rose-600">📍</span>
                  <span className="truncate">{formData.address}</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <span>🎧</span>
                  <span>{formData.phone}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xl space-y-4 font-mono">
              {/* Receipt Header Preview */}
              <div className="border-b-2 border-dashed border-slate-900 pb-3 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-xs text-slate-900 leading-tight uppercase">{formData.lab_name}</h4>
                  <p className="text-[10px] text-slate-600 mt-0.5">{formData.tagline}</p>
                  <p className="text-[9px] text-slate-500">{formData.address} • Tel: {formData.phone}</p>
                </div>
                <div className="border border-slate-900 px-2 py-1 font-black text-[9px] uppercase">
                  MONEY RECEIPT
                </div>
              </div>

              {/* Receipt Body Mock */}
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-400 text-center py-6">
                [ Itemized Billing, Paid & Due Balance ]
              </div>

              {/* Receipt Footer */}
              <div className="border-t-2 border-dashed border-slate-900 pt-2 text-center text-[9px] text-slate-600">
                {formData.receipt_footer}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
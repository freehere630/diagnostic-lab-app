// src/components/LabSettings.jsx
import React, { useState, useEffect } from "react";
import { 
  Building2, Save, Upload, X, RotateCcw, CheckCircle2, 
  Phone, MapPin, Mail, Globe, Palette, Layout, FileText, ArrowRight 
} from "lucide-react";
import { DEFAULT_LAB_SETTINGS } from "../services/api";
import ReportLayoutDesigner from "./ReportLayoutDesigner";
import { getReportLayout } from "../utils/reportLayout";

export default function LabSettings({ labSettings, handleSaveSettings, isLoading }) {
  const [activeTab, setActiveTab] = useState("designer"); // 'designer' | 'info'
  const [formData, setFormData] = useState(DEFAULT_LAB_SETTINGS);
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
        report_footer: labSettings.report_footer || labSettings.reportFooter || DEFAULT_LAB_SETTINGS.report_footer,
        report_layout: getReportLayout(labSettings)
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
    if (e) e.preventDefault();
    await handleSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Reset all hospital branding and layouts to defaults?")) return;
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
            <Building2 className="w-5 h-5 text-blue-600" /> Hospital Branding & Layout Designer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure hospital identity and customize report letterhead layout like Microsoft Word (drag & drop, fonts, alignment, dynamic fields).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" /> Layout Saved!
            </span>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Save className="w-4 h-4" /> {isLoading ? "Saving..." : "Save Branding & Layout"}
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 bg-slate-200 p-1.5 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("designer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "designer" ? "bg-white text-blue-700 shadow-md" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layout className="w-4 h-4" /> Word-Style Layout Designer (WYSIWYG)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "info" ? "bg-white text-blue-700 shadow-md" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="w-4 h-4" /> Hospital Details & Logo
        </button>
      </div>

      {/* Tab 1: Word-Style Visual Designer */}
      {activeTab === "designer" && (
        <div className="space-y-4">
          <ReportLayoutDesigner
            layout={formData.report_layout || getReportLayout(formData)}
            onChange={(newLayout) => setFormData((prev) => ({ ...prev, report_layout: newLayout }))}
            settings={formData}
          />
        </div>
      )}

      {/* Tab 2: Hospital Details & Contact Settings */}
      {activeTab === "info" && (
        <form onSubmit={onSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs max-w-4xl">
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

          <div className="border-t pt-4 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setActiveTab("designer")}
              className="text-blue-600 font-bold text-xs flex items-center gap-1 hover:underline"
            >
              Open Word-Style Layout Designer <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
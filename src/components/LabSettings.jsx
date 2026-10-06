import React, { useState, useEffect } from "react";
import { 
  Building2, Save, Upload, X, RotateCcw, CheckCircle2, 
  Phone, MapPin, Mail, Globe, Palette, Layout, FileText, ArrowRight 
} from "lucide-react";
import { DEFAULT_LAB_SETTINGS } from "../services/api";
import ReportLayoutDesigner from "./ReportLayoutDesigner";
import { getReportLayout, DEFAULT_REPORT_LAYOUT } from "../utils/reportLayout";

export default function LabSettings({ labSettings, handleSaveSettings, isLoading }) {
  const [activeTab, setActiveTab] = useState("designer"); // 'designer' | 'info'
  const [formData, setFormData] = useState(DEFAULT_LAB_SETTINGS);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (labSettings) {
      const resolvedLayout = getReportLayout(labSettings);
      setFormData((prev) => ({
        ...prev,
        lab_name: labSettings.lab_name || labSettings.labName || prev.lab_name || DEFAULT_LAB_SETTINGS.lab_name,
        tagline: labSettings.tagline || prev.tagline || DEFAULT_LAB_SETTINGS.tagline,
        address: labSettings.address || prev.address || DEFAULT_LAB_SETTINGS.address,
        phone: labSettings.phone || prev.phone || DEFAULT_LAB_SETTINGS.phone,
        email: labSettings.email || prev.email || DEFAULT_LAB_SETTINGS.email,
        website: labSettings.website || prev.website || DEFAULT_LAB_SETTINGS.website,
        logo_data: labSettings.logo_data || labSettings.logoData || prev.logo_data || "",
        header_bg: labSettings.header_bg || labSettings.headerBg || prev.header_bg || "#20122e",
        header_color: labSettings.header_color || labSettings.headerColor || prev.header_color || "#ffffff",
        receipt_footer: labSettings.receipt_footer || labSettings.receiptFooter || prev.receipt_footer || DEFAULT_LAB_SETTINGS.receipt_footer,
        report_footer: labSettings.report_footer || labSettings.reportFooter || prev.report_footer || DEFAULT_LAB_SETTINGS.report_footer,
        report_layout: resolvedLayout || prev.report_layout || DEFAULT_REPORT_LAYOUT
      }));
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
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Reset all laboratory branding and letterhead layouts to defaults?")) return;
    setFormData(DEFAULT_LAB_SETTINGS);
  };

  const HEADER_COLOR_PRESETS = [
    { label: "Deep Purple", bg: "#20122e", text: "#ffffff" },
    { label: "Navy Blue", bg: "#0f172a", text: "#ffffff" },
    { label: "Indigo", bg: "#1e1b4b", text: "#ffffff" },
    { label: "Emerald", bg: "#064e3b", text: "#ffffff" },
    { label: "Slate", bg: "#1e293b", text: "#ffffff" }
  ];

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* 1. COMPACT TOOLBAR & TABS */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Left: Section Info & View Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-xs sm:text-sm text-slate-900 leading-none">Branding & Layout Designer</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Customize letterhead headers, logos, and report design</p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("designer")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                activeTab === "designer" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Layout className="w-3.5 h-3.5 text-blue-600" /> Visual Designer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                activeTab === "info" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Hospital Details & Logo
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {saveSuccess && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition active:scale-95"
          >
            <Save className="w-3.5 h-3.5" /> {isLoading ? "Saving..." : "Save Branding"}
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            title="Reset Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 2. TAB CONTENT */}
      {activeTab === "designer" && (
        <div className="space-y-3">
          <ReportLayoutDesigner
            layout={formData.report_layout || getReportLayout(formData)}
            onChange={(newLayout) => setFormData((prev) => ({ ...prev, report_layout: newLayout }))}
            settings={formData}
          />
        </div>
      )}

      {activeTab === "info" && (
        <form onSubmit={onSubmit} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 text-xs max-w-4xl">
          <div>
            <label className="font-semibold text-slate-700 text-[11px] block mb-1">Laboratory / Hospital Full Name *</label>
            <input
              type="text"
              required
              value={formData.lab_name}
              onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
              placeholder="e.g. AL FATTAH DIAGNOSTIC & CONSULTATION CENTER"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-bold text-sm"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 text-[11px] block mb-1">Official Tagline / Motto</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="e.g. With Al-Fattah on the Journey to Wellness"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="font-semibold text-slate-700 text-[11px] block mb-1">Physical Address</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Address, Area, City"
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 text-[11px] block mb-1">Hotline / Phone Numbers</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="017xxxxxxxx, 016xxxxxxxx"
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 text-[11px] block mb-1">Official Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@lab.com"
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 text-[11px] block mb-1">Website URL</label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.lab.com"
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Logo Upload Strip */}
          <div className="border-t border-slate-100 pt-3">
            <label className="font-semibold text-slate-700 text-[11px] block mb-1">Official Logo</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-slate-50 rounded-lg p-2.5 flex items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-700 text-xs">Choose Logo Image (PNG / JPG)</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>

              {formData.logo_data && (
                <div className="relative p-1 bg-slate-50 rounded-lg border border-slate-200 shrink-0">
                  <img src={formData.logo_data} alt="Logo" className="h-10 w-12 object-contain" />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-600 text-white rounded-full hover:bg-rose-700"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Color Palettes */}
          <div className="border-t border-slate-100 pt-3">
            <label className="font-semibold text-slate-700 text-[11px] block mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-blue-600" /> Printed Header Accent Color
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {HEADER_COLOR_PRESETS.map((p) => (
                <button
                  key={p.bg}
                  type="button"
                  onClick={() => setFormData({ ...formData, header_bg: p.bg, header_color: p.text })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    formData.header_bg === p.bg ? "ring-2 ring-blue-500 shadow-xs scale-105" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: p.bg, color: p.text }}
                >
                  {p.label}
                </button>
              ))}
              <input
                type="color"
                value={formData.header_bg}
                onChange={(e) => setFormData({ ...formData, header_bg: e.target.value })}
                className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
                title="Custom Color"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setActiveTab("designer")}
              className="text-blue-600 font-semibold text-xs flex items-center gap-1 hover:underline"
            >
              Open Visual Layout Designer <ArrowRight className="w-3 h-3" />
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
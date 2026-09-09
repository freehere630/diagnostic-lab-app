import React, { useState, useEffect } from "react";
import { 
  Layers, Palette, Type, Sliders, Save, Plus, Trash2, 
  Eye, EyeOff, Layout, FileText, Receipt, QrCode, 
  GripVertical, X, Image as ImageIcon, Printer
} from "lucide-react";

import { printMoneyReceiptA5 } from "../utils/printHelpers";

// 1. DEFAULT A4 REPORT BLOCKS (1-4 Top, 5-6 Bottom)
const INITIAL_REPORT_BLOCKS = [
  { id: "header", name: "1. Hospital Letterhead & Logo", visible: true, fontFamily: "sans", fontSize: 16, textColor: "#000000", bgColor: "#ffffff", innerHeaderBg: "#f8fafc", borderColor: "#000000", borderWidth: 2, borderStyle: "solid", borderRadius: 0, padding: 12, logoSize: 48, logoAlign: "left", showQr: true },
  { id: "patient_box", name: "2. Patient Demographics Box", visible: true, fontFamily: "sans", fontSize: 9.5, textColor: "#000000", bgColor: "#f8fafc", innerHeaderBg: "#e2e8f0", borderColor: "#cbd5e1", borderWidth: 1, borderStyle: "solid", borderRadius: 8, padding: 10 },
  { id: "results_table", name: "3. Test Results Table & Banner", visible: true, fontFamily: "sans", fontSize: 9.5, textColor: "#000000", bgColor: "#ffffff", innerHeaderBg: "#0f172a", borderColor: "#000000", borderWidth: 1.5, borderStyle: "solid", borderRadius: 4, padding: 8 },
  { id: "clinical_remarks", name: "4. Pathologist Clinical Remarks", visible: true, fontFamily: "sans", fontSize: 9, textColor: "#000000", bgColor: "#fafaf9", innerHeaderBg: "#e7e5e4", borderColor: "#000000", borderWidth: 1, borderStyle: "solid", borderRadius: 6, padding: 8 },
  { id: "signatures", name: "5. Dual Signatures (Tech & Doctor)", visible: true, fontFamily: "sans", fontSize: 9.5, textColor: "#000000", bgColor: "#ffffff", innerHeaderBg: "#ffffff", borderColor: "#000000", borderWidth: 1, borderStyle: "solid", borderRadius: 0, padding: 12 },
  { id: "footer", name: "6. Accreditation Disclaimer Footer", visible: true, fontFamily: "sans", fontSize: 7.5, textColor: "#475569", bgColor: "#ffffff", innerHeaderBg: "#ffffff", borderColor: "#cbd5e1", borderWidth: 1, borderStyle: "dashed", borderRadius: 0, padding: 6 }
];

// 2. DEFAULT A5 RECEIPT BLOCKS (1-4 Top, 5 Bottom Footer)
const INITIAL_RECEIPT_BLOCKS = [
  { id: "receipt_header", name: "1. Receipt Header & Logo", visible: true, fontFamily: "sans", fontSize: 13, textColor: "#000000", bgColor: "#ffffff", innerHeaderBg: "#0f172a", borderColor: "#000000", borderWidth: 1.5, borderStyle: "solid", borderRadius: 0, padding: 10, logoSize: 36, logoAlign: "left" },
  { id: "receipt_patient", name: "2. Patient Demographics & Date", visible: true, fontFamily: "sans", fontSize: 8.5, textColor: "#000000", bgColor: "#f8fafc", innerHeaderBg: "#e2e8f0", borderColor: "#cbd5e1", borderWidth: 1, borderStyle: "solid", borderRadius: 6, padding: 8 },
  { id: "receipt_items", name: "3. Itemized Test Bill Table", visible: true, fontFamily: "sans", fontSize: 8.5, textColor: "#000000", bgColor: "#ffffff", innerHeaderBg: "#f1f5f9", borderColor: "#000000", borderWidth: 1, borderStyle: "solid", borderRadius: 0, padding: 6 },
  { id: "receipt_totals", name: "4. Total, Discount & Dues Box", visible: true, fontFamily: "sans", fontSize: 9, textColor: "#000000", bgColor: "#ffffff", innerHeaderBg: "#0f172a", borderColor: "#000000", borderWidth: 1, borderStyle: "solid", borderRadius: 0, padding: 6 },
  { id: "receipt_barcode_sign", name: "5. Patient Barcode & Cashier Stamp", visible: true, fontFamily: "sans", fontSize: 7.5, textColor: "#000000", bgColor: "#ffffff", innerHeaderBg: "#ffffff", borderColor: "#94a3b8", borderWidth: 1, borderStyle: "dashed", borderRadius: 0, padding: 8 }
];

export default function LabSettings({ labSettings, handleSaveSettings, isLoading }) {
  const [activeDocMode, setActiveDocMode] = useState("report"); // 'report' or 'receipt'
  const [reportBlocks, setReportBlocks] = useState(INITIAL_REPORT_BLOCKS);
  const [receiptBlocks, setReceiptBlocks] = useState(INITIAL_RECEIPT_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState("header");
  const [draggedIndex, setDraggedIndex] = useState(null);

  const [formData, setFormData] = useState({
    labName: "APEX DIAGNOSTIC LABORATORIES",
    tagline: "ISO 15189:2022 Certified Clinical Reference Laboratory",
    address: "House 42, Road 11, Dhanmondi, Dhaka",
    phone: "+880 9612-345678",
    email: "reports@apexlab.com",
    website: "www.apexlab.com",
    logoData: "",
    receiptFooter: "Please bring this original receipt during report collection.",
    reportFooter: "This is a clinically verified electronic laboratory report."
  });

  useEffect(() => {
    if (labSettings) {
      setFormData({
        labName: labSettings.lab_name || "APEX DIAGNOSTIC LABORATORIES",
        tagline: labSettings.tagline || "ISO 15189:2022 Certified Clinical Reference Laboratory",
        address: labSettings.address || "House 42, Road 11, Dhanmondi, Dhaka",
        phone: labSettings.phone || "+880 9612-345678",
        email: labSettings.email || "reports@apexlab.com",
        website: labSettings.website || "www.apexlab.com",
        logoData: labSettings.logo_data || "",
        receiptFooter: labSettings.receipt_footer || "Please bring this original receipt during report collection.",
        reportFooter: labSettings.report_footer || "This is a clinically verified electronic laboratory report."
      });

      if (labSettings.report_design?.customBlocks?.length > 0 && labSettings.report_design.customBlocks[0].id.startsWith("header")) {
        setReportBlocks(labSettings.report_design.customBlocks);
      }
      if (labSettings.receipt_design?.customBlocks?.length > 0 && labSettings.receipt_design.customBlocks[0].id.startsWith("receipt")) {
        setReceiptBlocks(labSettings.receipt_design.customBlocks);
      }
    }
  }, [labSettings]);

  const currentBlocks = activeDocMode === "report" ? reportBlocks : receiptBlocks;
  const setCurrentBlocks = activeDocMode === "report" ? setReportBlocks : setReceiptBlocks;
  const selectedBlock = currentBlocks.find((b) => b.id === selectedBlockId) || currentBlocks[0];

  const updateBlockProperty = (key, value) => {
    setCurrentBlocks((prev) =>
      prev.map((b) => (b.id === selectedBlockId ? { ...b, [key]: value } : b))
    );
  };

  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newBlocks = [...currentBlocks];
    const draggedItem = newBlocks[draggedIndex];
    newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setCurrentBlocks(newBlocks);
  };
  const handleDragEnd = () => setDraggedIndex(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData((prev) => ({ ...prev, logoData: reader.result }));
    reader.readAsDataURL(file);
  };

  const onSave = () => {
    handleSaveSettings({
      ...formData,
      reportDesign: { customBlocks: reportBlocks },
      receiptDesign: { customBlocks: receiptBlocks }
    });
  };

  const handleTestPrintReceipt = () => {
    printMoneyReceiptA5(null, {
      ...formData,
      receipt_design: { customBlocks: receiptBlocks }
    });
  };

  // A4 Report Stacks: 1-4 Top, 5-6 Bottom
  const topReportBlocks = reportBlocks.filter((b) => b.id !== "signatures" && b.id !== "footer" && b.visible);
  const bottomReportBlocks = reportBlocks.filter((b) => (b.id === "signatures" || b.id === "footer") && b.visible);

  // A5 Receipt Stacks: 1-4 Top, 5 Bottom Footer
  const topReceiptBlocks = receiptBlocks.filter((b) => b.id !== "receipt_barcode_sign" && b.visible);
  const bottomReceiptBlocks = receiptBlocks.filter((b) => b.id === "receipt_barcode_sign" && b.visible);

  return (
    <div className="space-y-4 w-full font-sans text-slate-800">
      
      {/* STUDIO TOP TOOLBAR */}
      <div className="bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 sticky top-16 z-40 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Layout className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight flex items-center gap-2">
              Visual Template Studio
            </h2>
            <p className="text-[10px] text-slate-400">
              {activeDocMode === "report" ? "A4 Report: 1-4 stack at top, 5-6 pinned at bottom" : "A5 Receipt: 1-4 stack at top, 5 pinned at bottom footer"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => { setActiveDocMode("report"); setSelectedBlockId("header"); }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeDocMode === "report" ? "bg-blue-600 text-white shadow" : "text-slate-400"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> A4 Report Studio
            </button>
            <button
              onClick={() => { setActiveDocMode("receipt"); setSelectedBlockId("receipt_header"); }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeDocMode === "receipt" ? "bg-blue-600 text-white shadow" : "text-slate-400"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> A5 Receipt Studio
            </button>
          </div>

          {activeDocMode === "receipt" && (
            <button
              onClick={handleTestPrintReceipt}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition"
              title="Test Print A5 Receipt"
            >
              <Printer className="w-3.5 h-3.5" /> Test Print Receipt
            </button>
          )}

          <button
            onClick={onSave}
            disabled={isLoading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition"
          >
            <Save className="w-3.5 h-3.5" /> {isLoading ? "Saving..." : "Save Template to Supabase"}
          </button>
        </div>
      </div>

      {/* 3-COLUMN STUDIO LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        
        {/* COLUMN 1: DRAGGABLE LAYERS (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> Draggable Blocks ({activeDocMode === "report" ? "A4 Report" : "A5 Receipt"})
            </h3>

            <div className="space-y-1.5">
              {currentBlocks.map((block, idx) => {
                const isSelected = selectedBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-grab active:cursor-grabbing transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-400 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{block.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateBlockProperty("visible", !block.visible);
                      }}
                      className="p-1 hover:bg-white rounded text-slate-500 flex-shrink-0"
                    >
                      {block.visible ? <Eye className="w-3 h-3 text-blue-600" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Institution Content</h3>
            
            <div>
              <label className="font-bold text-slate-500 block mb-1">Hospital / Lab Name</label>
              <input
                type="text"
                value={formData.labName}
                onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                className="w-full p-2 border rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Address & Phone</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2 border rounded-lg mb-1.5"
              />
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {activeDocMode === "receipt" ? (
              <div>
                <label className="font-bold text-slate-500 block mb-1">Receipt Footer Note</label>
                <textarea
                  rows={2}
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            ) : (
              <div>
                <label className="font-bold text-slate-500 block mb-1">Report Footer Disclaimer</label>
                <textarea
                  rows={2}
                  value={formData.reportFooter}
                  onChange={(e) => setFormData({ ...formData, reportFooter: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            )}

            <div className="border-t pt-2">
              <label className="font-bold text-slate-500 block mb-1">Hospital Logo</label>
              <div className="flex gap-2 items-center">
                <label className="flex-1 border-2 border-dashed rounded-lg p-2 text-center cursor-pointer hover:bg-blue-50 text-blue-600 font-bold border-slate-300">
                  Upload Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {formData.logoData && (
                  <img src={formData.logoData} alt="Logo" className="h-8 w-8 object-contain border rounded p-0.5 bg-slate-50" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: LIVE CANVAS (6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-start overflow-x-auto">
          <div className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-widest flex items-center gap-1">
            <span>{activeDocMode === "report" ? "📄 A4 Document Canvas" : "💵 A5 Money Receipt Canvas"}</span>
            <span className="text-blue-600 font-normal">(1-4 top stack, footer pinned at bottom)</span>
          </div>

          {/* ========================================================= */}
          {/* A4 REPORT CANVAS: 1-4 TOP STACK, 5-6 FOOTER STACK */}
          {/* ========================================================= */}
          {activeDocMode === "report" && (
            <div className="bg-white shadow-2xl p-6 sm:p-10 w-full max-w-[540px] min-h-[740px] rounded-lg border border-slate-300 text-slate-900 relative flex flex-col justify-between">
              
              {/* TOP STACK: 1, 2, 3, 4 */}
              <div className="space-y-3">
                {topReportBlocks.map((block) => {
                  const isSelected = selectedBlockId === block.id;
                  return (
                    <div
                      key={block.id}
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`relative transition cursor-pointer rounded ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:outline hover:outline-1 hover:outline-blue-300"}`}
                      style={{
                        fontFamily: block.fontFamily === "serif" ? "Times New Roman, serif" : block.fontFamily === "mono" ? "Courier New, monospace" : "sans-serif",
                        backgroundColor: block.bgColor,
                        borderColor: block.borderColor,
                        borderWidth: `${block.borderWidth}px`,
                        borderStyle: block.borderStyle,
                        borderRadius: `${block.borderRadius}px`,
                        padding: `${block.padding}px`,
                        color: block.textColor
                      }}
                    >
                      {block.id === "header" && (
                        <div className="flex items-center justify-between" style={{ flexDirection: block.logoAlign === "center" ? "column" : "row" }}>
                          <div className={`flex items-center gap-2.5 ${block.logoAlign === "center" ? "flex-col text-center" : ""}`}>
                            {formData.logoData ? (
                              <img src={formData.logoData} alt="Logo" style={{ height: `${block.logoSize || 48}px` }} className="object-contain mix-blend-multiply" />
                            ) : (
                              <div className="p-2 bg-slate-900 rounded-lg text-white font-bold text-sm">🏥</div>
                            )}
                            <div>
                              <h1 className="font-black tracking-tight" style={{ fontSize: `${block.fontSize}pt`, color: block.textColor }}>{formData.labName.toUpperCase()}</h1>
                              <p className="text-[8.5px] font-bold text-slate-600">{formData.tagline}</p>
                              <p className="text-[7.5px] text-slate-400">{formData.address} • Hotline: {formData.phone}</p>
                            </div>
                          </div>
                          {block.showQr && (
                            <div className="text-center"><QrCode className="w-9 h-9 mx-auto text-slate-800" /><span className="text-[6.5px] text-slate-400 block font-mono">Verify QR</span></div>
                          )}
                        </div>
                      )}

                      {block.id === "patient_box" && (
                        <div className="grid grid-cols-3 gap-1.5 text-[8.5px]">
                          <div><span className="text-slate-400 uppercase">Patient:</span> <b>Rahim Ahmed</b></div>
                          <div><span className="text-slate-400 uppercase">Age/Sex:</span> <b>35 Y / Male</b></div>
                          <div><span className="text-slate-400 uppercase">Patient ID:</span> <b className="font-mono text-blue-700">PT-10024</b></div>
                          <div><span className="text-slate-400 uppercase">Ref. By:</span> <b>Dr. K. S. Hossain, MD</b></div>
                          <div><span className="text-slate-400 uppercase">Date:</span> <b>2026-09-06</b></div>
                          <div><span className="text-slate-400 uppercase">Barcode:</span> <b className="font-mono">LAB-20260906-0012</b></div>
                        </div>
                      )}

                      {block.id === "results_table" && (
                        <div>
                          <div className="p-1 pl-2 text-white font-bold text-[9px] rounded-t uppercase" style={{ backgroundColor: block.innerHeaderBg || "#0f172a" }}>DEPARTMENT OF BIOCHEMISTRY</div>
                          <table className="w-full text-left text-[8.5px] border-collapse bg-white">
                            <thead>
                              <tr className="border-b text-slate-600 font-bold bg-slate-100">
                                <th className="py-1 px-1.5">Test Parameter</th>
                                <th className="py-1 px-1.5">Observed Result</th>
                                <th className="py-1 px-1.5">Unit</th>
                                <th className="py-1 px-1.5">Reference Range</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              <tr>
                                <td className="py-1.5 px-1.5 font-semibold">SGPT / ALT</td>
                                <td className="py-1.5 px-1.5 font-mono font-bold text-slate-900">64.0</td>
                                <td className="py-1.5 px-1.5 text-slate-500 font-mono">U/L</td>
                                <td className="py-1.5 px-1.5 text-slate-600 font-mono">7.0 - 56.0</td>
                              </tr>
                              <tr>
                                <td className="py-1.5 px-1.5 font-semibold">Serum Creatinine</td>
                                <td className="py-1.5 px-1.5 font-mono font-bold text-slate-900">0.95</td>
                                <td className="py-1.5 px-1.5 text-slate-500 font-mono">mg/dL</td>
                                <td className="py-1.5 px-1.5 text-slate-600 font-mono">0.70 - 1.30</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}

                      {block.id === "clinical_remarks" && (
                        <div className="text-[8.5px]"><span className="font-bold uppercase text-[7.5px] block mb-0.5">Pathologist Remarks:</span><p className="italic">Values indicate elevated transaminase with normal renal clearance.</p></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* BOTTOM FOOTER STACK: 5, 6 */}
              <div className="space-y-2 mt-8 pt-4">
                {bottomReportBlocks.map((block) => (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className="cursor-pointer"
                    style={{
                      fontFamily: block.fontFamily === "serif" ? "Times New Roman, serif" : block.fontFamily === "mono" ? "Courier New, monospace" : "sans-serif",
                      padding: `${block.padding}px`
                    }}
                  >
                    {block.id === "signatures" && (
                      <div className="flex justify-between items-end text-[8.5px] text-center pt-2">
                        <div className="w-32"><div className="font-serif italic font-bold text-xs mb-0.5">Md. Al-Amin</div><p className="font-bold border-t border-slate-900 pt-0.5">Md. Al-Amin, BSc</p><p className="text-[7px] text-slate-400">Medical Technologist</p></div>
                        <div className="w-32"><div className="font-serif italic font-bold text-xs mb-0.5">Dr. S. Rahman</div><p className="font-bold border-t border-slate-900 pt-0.5">Dr. S. Rahman, MD</p><p className="text-[7px] text-slate-400">Consultant Pathologist</p></div>
                      </div>
                    )}
                    {block.id === "footer" && <p className="text-[7px] text-slate-500 text-center">{formData.reportFooter}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* A5 MONEY RECEIPT CANVAS: 1-4 TOP STACK, 5 BOTTOM FOOTER */}
          {/* ========================================================= */}
          {activeDocMode === "receipt" && (
            <div className="bg-white shadow-2xl p-6 sm:p-8 w-full max-w-[460px] min-h-[580px] rounded-lg border border-slate-300 text-slate-900 flex flex-col justify-between">
              
              {/* UPPER STACK: BLOCKS 1, 2, 3, 4 */}
              <div className="space-y-2.5">
                {topReceiptBlocks.map((block) => {
                  const isSelected = selectedBlockId === block.id;

                  return (
                    <div
                      key={block.id}
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`relative transition cursor-pointer rounded ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:outline hover:outline-1 hover:outline-blue-300"}`}
                      style={{
                        fontFamily: block.fontFamily === "serif" ? "Times New Roman, serif" : block.fontFamily === "mono" ? "Courier New, monospace" : "sans-serif",
                        backgroundColor: block.bgColor || "#ffffff",
                        borderColor: block.borderColor || "#000000",
                        borderWidth: `${block.borderWidth !== undefined ? block.borderWidth : 1}px`,
                        borderStyle: block.borderStyle || "solid",
                        borderRadius: `${block.borderRadius || 0}px`,
                        padding: `${block.padding || 8}px`,
                        color: block.textColor || "#000000"
                      }}
                    >
                      {isSelected && (
                        <span className="absolute -top-2.5 left-2 px-1.5 py-0.2 bg-blue-600 text-white rounded text-[8px] font-bold uppercase font-mono shadow">
                          {block.name}
                        </span>
                      )}

                      {/* 1. Receipt Header */}
                      {block.id === "receipt_header" && (
                        <div className="flex justify-between items-center border-b pb-2">
                          <div className="flex items-center gap-2">
                            {formData.logoData && <img src={formData.logoData} alt="Logo" style={{ height: `${block.logoSize || 36}px` }} className="object-contain mix-blend-multiply" />}
                            <div>
                              <h2 className="font-black text-xs" style={{ color: block.textColor, fontSize: `${block.fontSize}pt` }}>{formData.labName.toUpperCase()}</h2>
                              <p className="text-[7.5px] text-slate-500">{formData.address} • Phone: {formData.phone}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 text-white font-bold text-[8px] rounded" style={{ backgroundColor: block.innerHeaderBg || "#0f172a" }}>MONEY RECEIPT</span>
                        </div>
                      )}

                      {/* 2. Patient Demographics */}
                      {block.id === "receipt_patient" && (
                        <div className="grid grid-cols-2 gap-1 text-[8.5px]" style={{ color: block.textColor }}>
                          <div><b>Receipt No:</b> RCP-2026-1001</div>
                          <div><b>Date:</b> 2026-09-06</div>
                          <div><b>Patient ID:</b> <span className="font-mono font-bold text-blue-700">PT-10024</span></div>
                          <div><b>Phone:</b> 01712345678</div>
                          <div className="col-span-2"><b>Name:</b> Rahim Ahmed (35Y / Male)</div>
                        </div>
                      )}

                      {/* 3. Items Table */}
                      {block.id === "receipt_items" && (
                        <table className="w-full text-left text-[8.5px]">
                          <thead>
                            <tr className="border-b font-bold" style={{ backgroundColor: block.innerHeaderBg || "#f1f5f9" }}>
                              <th className="py-1 px-1">Test Description</th>
                              <th className="py-1 px-1 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr><td className="py-1 px-1 font-medium">1. Complete Blood Count (CBC)</td><td className="py-1 px-1 text-right font-mono font-bold">৳ 800</td></tr>
                            <tr><td className="py-1 px-1 font-medium">2. SGPT / ALT Liver Test</td><td className="py-1 px-1 text-right font-mono font-bold">৳ 300</td></tr>
                          </tbody>
                        </table>
                      )}

                      {/* 4. Payment Totals */}
                      {block.id === "receipt_totals" && (
                        <div className="flex justify-end text-[8.5px]">
                          <div className="w-44 space-y-0.5 border-t pt-1">
                            <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">৳ 1100</span></div>
                            <div className="flex justify-between font-black text-[9px] border-t border-b py-0.5" style={{ color: block.innerHeaderBg || "#0f172a" }}>
                              <span>Net Payable:</span><span className="font-mono">৳ 990</span>
                            </div>
                            <div className="flex justify-between font-bold text-emerald-700"><span>Paid (Cash):</span><span className="font-mono">৳ 990</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* BOTTOM FOOTER CONTAINER: BLOCK 5 (BARCODE, STAMP & NOTE PINNED TO BOTTOM) */}
              <div className="mt-6 pt-3 border-t">
                {bottomReceiptBlocks.map((block) => {
                  const isSelected = selectedBlockId === block.id;

                  return (
                    <div
                      key={block.id}
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`relative transition cursor-pointer rounded ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "hover:outline hover:outline-1 hover:outline-blue-300"}`}
                      style={{
                        fontFamily: block.fontFamily === "serif" ? "Times New Roman, serif" : block.fontFamily === "mono" ? "Courier New, monospace" : "sans-serif",
                        backgroundColor: block.bgColor || "#ffffff",
                        padding: `${block.padding || 8}px`,
                        color: block.textColor || "#000000"
                      }}
                    >
                      {isSelected && (
                        <span className="absolute -top-2.5 left-2 px-1.5 py-0.2 bg-blue-600 text-white rounded text-[8px] font-bold uppercase font-mono shadow">
                          {block.name}
                        </span>
                      )}

                      {/* 5. Barcode & Cashier Signature */}
                      <div className="flex justify-between items-end text-[7.5px]">
                        <div className="text-center w-28">
                          <div className="font-mono text-[10px] font-black tracking-widest leading-none">||| | ||||| | ||</div>
                          <p className="font-mono font-bold text-[7.5px] mt-0.5">PT-10024</p>
                        </div>
                        <div className="text-center w-24">
                          <div className="border-b border-slate-400 h-3 mb-0.5"></div>
                          <span className="font-bold text-[7px]">Cashier Stamp</span>
                        </div>
                      </div>
                      <p className="text-center text-[6.5px] text-slate-500 mt-2">{formData.receiptFooter}</p>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* COLUMN 3: FIGMA PROPERTY INSPECTOR (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="border-b pb-2 flex items-center justify-between">
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" /> Block Inspector
              </h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-mono font-bold text-[9px]">
                {selectedBlock.id}
              </span>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-600 uppercase text-[10px] block">Typography</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Typeface</span>
                  <select
                    value={selectedBlock.fontFamily || "sans"}
                    onChange={(e) => updateBlockProperty("fontFamily", e.target.value)}
                    className="w-full p-1.5 border rounded-lg font-bold text-xs bg-slate-50"
                  >
                    <option value="sans">Modern Sans</option>
                    <option value="serif">Classic Serif</option>
                    <option value="mono">Clean Mono</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400">Font Size ({selectedBlock.fontSize || 10}pt)</span>
                  <input
                    type="range"
                    min="8"
                    max="22"
                    value={selectedBlock.fontSize || 10}
                    onChange={(e) => updateBlockProperty("fontSize", Number(e.target.value))}
                    className="w-full cursor-pointer mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <label className="font-bold text-slate-600 uppercase text-[10px] block">Color Access</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-xl border flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-bold">Text Color</span>
                  <input
                    type="color"
                    value={selectedBlock.textColor || "#000000"}
                    onChange={(e) => updateBlockProperty("textColor", e.target.value)}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                  />
                </div>

                <div className="p-2 bg-slate-50 rounded-xl border flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-bold">Block BG</span>
                  <input
                    type="color"
                    value={selectedBlock.bgColor || "#ffffff"}
                    onChange={(e) => updateBlockProperty("bgColor", e.target.value)}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                  />
                </div>

                <div className="p-2 bg-slate-50 rounded-xl border flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-bold">Header Bar BG</span>
                  <input
                    type="color"
                    value={selectedBlock.innerHeaderBg || "#0f172a"}
                    onChange={(e) => updateBlockProperty("innerHeaderBg", e.target.value)}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                  />
                </div>

                <div className="p-2 bg-slate-50 rounded-xl border flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-bold">Border Color</span>
                  <input
                    type="color"
                    value={selectedBlock.borderColor || "#000000"}
                    onChange={(e) => updateBlockProperty("borderColor", e.target.value)}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <label className="font-bold text-slate-600 uppercase text-[10px] block">Frame & Spacing</label>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400"><span>Padding</span><span className="font-mono">{selectedBlock.padding || 0}px</span></div>
                <input type="range" min="0" max="24" value={selectedBlock.padding || 0} onChange={(e) => updateBlockProperty("padding", Number(e.target.value))} className="w-full cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400"><span>Border Width</span><span className="font-mono">{selectedBlock.borderWidth || 0}px</span></div>
                <input type="range" min="0" max="5" value={selectedBlock.borderWidth || 0} onChange={(e) => updateBlockProperty("borderWidth", Number(e.target.value))} className="w-full cursor-pointer" />
              </div>
            </div>

            {(selectedBlock.id === "header" || selectedBlock.id === "receipt_header") && (
              <div className="border-t pt-3 space-y-2">
                <label className="font-bold text-slate-600 uppercase text-[10px] block">Logo Controls</label>
                <div className="flex justify-between text-[10px] text-slate-400"><span>Logo Height</span><span className="font-mono">{selectedBlock.logoSize || 48}px</span></div>
                <input type="range" min="24" max="80" value={selectedBlock.logoSize || 48} onChange={(e) => updateBlockProperty("logoSize", Number(e.target.value))} className="w-full cursor-pointer" />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
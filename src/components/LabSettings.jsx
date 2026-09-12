import React, { useState, useEffect } from "react";
import { 
  FileText, Receipt, Save, Sparkles, RotateCcw, Building2, Upload 
} from "lucide-react";
import { buildUnifiedResultsTable } from "../utils/printHelpers";

export default function LabSettings({ labSettings, handleSaveSettings, isLoading }) {
  const [activeTab, setActiveTab] = useState("report"); // 'report' or 'receipt'

  const [formData, setFormData] = useState({
    labName: "APEX DIAGNOSTIC LABORATORIES",
    tagline: "ISO 15189:2022 Certified Clinical Reference Laboratory",
    address: "House 42, Road 11, Dhanmondi, Dhaka",
    phone: "+880 9612-345678",
    email: "reports@apexlab.com",
    website: "www.apexlab.com",
    logoData: "",
    receiptFooter: "Please scan the QR code to check real-time report status & download results.",
    reportFooter: "This is a clinically verified electronic laboratory report."
  });

  const DEFAULT_REPORT_TEMPLATE = `
<div style="border: 2px solid #000; border-radius: 8px; padding: 14px 16px; min-height: 270mm; display: flex; flex-direction: column; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div>
    <!-- HOSPITAL HEADER -->
    <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 12px;">
        {{hospital_logo}}
        <div>
          <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a;">{{hospital_name}}</h1>
          <p style="font-size: 8.5pt; font-weight: 700; color: #334155; margin: 2px 0;">DEPARTMENT OF {{department_name}} ({{hospital_tagline}})</p>
          <p style="font-size: 7.5pt; color: #475569; margin: 0;">{{hospital_address}} • Phone: {{hospital_phone}}</p>
        </div>
      </div>
      <div style="text-align: right; width: 85px;">
        {{qr_code}}
        <span style="font-size: 6pt; font-family: monospace; display: block; text-align: center; margin-top: 2px;">Scan to Verify</span>
      </div>
    </div>

    <!-- PATIENT DEMOGRAPHICS -->
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 14px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 14px; font-size: 8.5pt;">
      <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Patient:</span> <b>{{patient_name}}</b></div>
      <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Age/Sex:</span> <b>{{age_gender}}</b></div>
      <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Patient ID:</span> <b style="font-family: monospace; color: #1d4ed8;">{{patient_id}}</b></div>
      <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Ref. By:</span> <b>{{doctor}}</b></div>
      <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Date:</span> <b>{{date}}</b></div>
      <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Barcode:</span> <b style="font-family: monospace;">{{barcode}}</b></div>
    </div>

    <!-- UNIFIED RESULTS TABLE -->
    {{results_table}}

    <!-- REMARKS -->
    {{remarks}}
  </div>

  <!-- DUAL SIGNATURES & FOOTER -->
  <div>
    <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #334155; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
      <div style="text-align: center; width: 220px;">
        {{tech_signature}}
        <div style="border-top: 1.5px solid #000; padding-top: 4px;">
          <div style="font-weight: 800; font-size: 8.5pt;">{{tech_name}}</div>
          <div style="font-size: 7pt; color: #334155;">{{tech_designation}}</div>
        </div>
      </div>
      <div style="text-align: center; width: 220px;">
        {{doctor_signature}}
        <div style="border-top: 1.5px solid #000; padding-top: 4px;">
          <div style="font-weight: 800; font-size: 8.5pt;">{{doctor_name}}</div>
          <div style="font-size: 7pt; color: #334155;">{{doctor_designation}}</div>
        </div>
      </div>
    </div>
    <p style="text-align: center; font-size: 6.5pt; color: #64748b; margin: 10px 0 0 0; border-top: 0.5px dashed #cbd5e1; padding-top: 4px;">{{report_footer}}</p>
  </div>
</div>`;

  const DEFAULT_RECEIPT_TEMPLATE = `
<div style="border: 1.5px solid #000; border-radius: 8px; padding: 10px 12px; min-height: 190mm; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div>
    <!-- HEADER -->
    <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 8px;">
        {{hospital_logo}}
        <div>
          <h1 style="margin: 0; font-size: 13pt; font-weight: 900;">{{hospital_name}}</h1>
          <p style="margin: 1px 0; font-size: 7.5pt; color: #334155;">{{hospital_tagline}}</p>
          <p style="margin: 0; font-size: 7pt; color: #475569;">{{hospital_address}} • Phone: {{hospital_phone}}</p>
        </div>
      </div>
      <div style="background: #000; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: 900; font-size: 8pt;">MONEY RECEIPT</div>
    </div>

    <!-- PATIENT INFO -->
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; font-size: 8pt;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td><b>Receipt No:</b> {{receipt_no}}</td><td><b>Date:</b> {{date}}</td><td><b>Patient ID:</b> <b style="color: #1d4ed8;">{{patient_id}}</b></td></tr>
        <tr><td colspan="2"><b>Name:</b> {{patient_name}} ({{age_gender}})</td><td><b>Phone:</b> {{patient_phone}}</td></tr>
        <tr><td colspan="3"><b>Ref. Doctor:</b> {{doctor}}</td></tr>
      </table>
    </div>

    <!-- ITEMS BILL -->
    <table style="width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 8px;">
      <thead>
        <tr style="background: #f1f5f9; border-bottom: 1px solid #000; font-weight: 900;">
          <th style="padding: 4px 8px; text-align: left;">Test Description</th>
          <th style="padding: 4px 8px; text-align: left;">Specimen</th>
          <th style="padding: 4px 8px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>{{items_table}}</tbody>
    </table>

    <!-- TOTALS -->
    <div style="display: flex; justify-content: flex-end;">
      <table style="width: 220px; font-size: 8.5pt;">
        <tr><td>Subtotal:</td><td style="text-align: right; font-family: monospace;">৳ {{subtotal}}</td></tr>
        <tr><td>Discount ({{discount}}%):</td><td style="text-align: right; font-family: monospace;">- ৳ {{discount_amount}}</td></tr>
        <tr style="font-weight: 900; font-size: 10pt; border-top: 1px solid #000; border-bottom: 1px solid #000;"><td>Net Payable:</td><td style="text-align: right; font-family: monospace;">৳ {{net_payable}}</td></tr>
        <tr style="font-weight: bold;"><td>Paid (Cash):</td><td style="text-align: right; font-family: monospace;">৳ {{paid_amount}}</td></tr>
        <tr style="font-weight: bold;"><td>Due Balance:</td><td style="text-align: right; font-family: monospace;">৳ {{due_amount}}</td></tr>
      </table>
    </div>
  </div>

  <!-- FOOTER: COLUMN 1 = BARCODE + PID | COLUMN 2 = QR | COLUMN 3 = CASHIER -->
  <div>
    <div style="border-top: 1px dashed #94a3b8; padding: 6px 0; display: flex; justify-content: space-between; align-items: center;">
      
      <!-- COLUMN 1: Barcode with Patient ID directly underneath -->
      <div style="text-align: center; width: 140px;">
        {{patient_barcode}}
        <p style="margin: 2px 0 0 0; font-family: monospace; font-size: 8pt; font-weight: 900; color: #000;">{{patient_id}}</p>
      </div>

      <!-- COLUMN 2: Real-Time Report Tracker QR -->
      <div style="text-align: center; width: 95px;">
        {{report_tracking_qr}}
      </div>

      <!-- COLUMN 3: Cashier Signature -->
      <div style="text-align: center; width: 120px;">
        <div style="border-bottom: 1px solid #000; height: 16px; margin-bottom: 2px;"></div>
        <span style="font-size: 7pt; font-weight: bold;">Authorized Cashier</span>
      </div>

    </div>
    <p style="text-align: center; margin: 3px 0 0 0; font-size: 6.5pt; color: #475569;">{{receipt_footer}}</p>
  </div>
</div>`;

  const [reportTemplate, setReportTemplate] = useState(DEFAULT_REPORT_TEMPLATE);
  const [receiptTemplate, setReceiptTemplate] = useState(DEFAULT_RECEIPT_TEMPLATE);

  useEffect(() => {
    const localReport = localStorage.getItem("apex_report_template");
    const localReceipt = localStorage.getItem("apex_receipt_template");
    if (localReport) setReportTemplate(localReport);
    if (localReceipt) setReceiptTemplate(localReceipt);

    if (labSettings) {
      setFormData({
        labName: labSettings.lab_name || "APEX DIAGNOSTIC LABORATORIES",
        tagline: labSettings.tagline || "ISO 15189:2022 Certified Clinical Reference Laboratory",
        address: labSettings.address || "House 42, Road 11, Dhanmondi, Dhaka",
        phone: labSettings.phone || "+880 9612-345678",
        email: labSettings.email || "reports@apexlab.com",
        website: labSettings.website || "www.apexlab.com",
        logoData: labSettings.logo_data || "",
        receiptFooter: labSettings.receipt_footer || "Please scan the QR code to check real-time report status & download results.",
        reportFooter: labSettings.report_footer || "This is a clinically verified electronic laboratory report."
      });

      if (labSettings.report_design?.templateHtml && !localReport) {
        setReportTemplate(labSettings.report_design.templateHtml);
      }
      if (labSettings.receipt_design?.templateHtml && !localReceipt) {
        setReceiptTemplate(labSettings.receipt_design.templateHtml);
      }
    }
  }, [labSettings]);

  const currentTemplate = activeTab === "report" ? reportTemplate : receiptTemplate;
  const setCurrentTemplate = activeTab === "report" ? setReportTemplate : setReceiptTemplate;

  const insertToken = (tokenKey) => {
    const placeholder = `{{${tokenKey}}}`;
    setCurrentTemplate((prev) => prev + "\n" + placeholder);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData((prev) => ({ ...prev, logoData: reader.result }));
    reader.readAsDataURL(file);
  };

  const onSave = () => {
    localStorage.setItem("apex_report_template", reportTemplate);
    localStorage.setItem("apex_receipt_template", receiptTemplate);

    const payload = {
      ...formData,
      reportDesign: { templateHtml: reportTemplate },
      receiptDesign: { templateHtml: receiptTemplate },
      report_design: { templateHtml: reportTemplate },
      receipt_design: { templateHtml: receiptTemplate }
    };

    localStorage.setItem("apex_lab_settings", JSON.stringify(payload));
    handleSaveSettings(payload);
  };

  // Compile Live Preview
  const getCompiledPreview = () => {
    const sampleBiochemTests = [
      {
        name: "Liver Function Tests (LFT)",
        code: "LFT",
        is_profile: true,
        test_parameters: [
          { id: "b1", name: "Bilirubin (Total)", unit: "mg/dL", min_range: 0.2, max_range: 1.2, param_type: "numeric" },
          { id: "b2", name: "SGPT / ALT", unit: "U/L", min_range: 0, max_range: 45, param_type: "numeric" },
          { id: "b3", name: "SGOT / AST", unit: "U/L", min_range: 0, max_range: 40, param_type: "numeric" },
          { id: "b4", name: "Alkaline Phosphatase (ALP)", unit: "U/L", min_range: 30, max_range: 120, param_type: "numeric" }
        ]
      },
      {
        name: "Renal / Kidney Function Tests (KFT)",
        code: "KFT",
        is_profile: true,
        test_parameters: [
          { id: "k1", name: "Serum Creatinine", unit: "mg/dL", min_range: 0.6, max_range: 1.3, param_type: "numeric" },
          { id: "k2", name: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", min_range: 7, max_range: 20, param_type: "numeric" },
          { id: "k3", name: "Serum Uric Acid", unit: "mg/dL", min_range: 3.5, max_range: 7.2, param_type: "numeric" }
        ]
      },
      {
        name: "Lipid Profile Panel",
        code: "LIPID",
        is_profile: true,
        test_parameters: [
          { id: "l1", name: "Total Cholesterol", unit: "mg/dL", min_range: 0, max_range: 200, param_type: "numeric" },
          { id: "l2", name: "Triglycerides", unit: "mg/dL", min_range: 0, max_range: 150, param_type: "numeric" },
          { id: "l3", name: "HDL Cholesterol", unit: "mg/dL", min_range: 40, max_range: 60, param_type: "numeric" },
          { id: "l4", name: "LDL Cholesterol", unit: "mg/dL", min_range: 0, max_range: 100, param_type: "numeric" }
        ]
      }
    ];

    const sampleResults = {
      b1: { value: "0.9" }, b2: { value: "68" }, b3: { value: "45" }, b4: { value: "88" },
      k1: { value: "1.1" }, k2: { value: "14" }, k3: { value: "5.8" },
      l1: { value: "220" }, l2: { value: "185" }, l3: { value: "44" }, l4: { value: "145" }
    };

    const multiProfileUnifiedTable = buildUnifiedResultsTable(sampleBiochemTests, sampleResults);

    const sampleTokens = {
      hospital_name: formData.labName.toUpperCase(),
      hospital_tagline: formData.tagline,
      hospital_address: formData.address,
      hospital_phone: formData.phone,
      hospital_logo: formData.logoData 
        ? `<img src="${formData.logoData}" style="height: 40px; max-width: 100px; object-fit: contain;" />` 
        : `<div style="padding: 4px 8px; background: #000; color: #fff; border-radius: 6px; font-weight: bold;">🏥 LOGO</div>`,
      department_name: "CLINICAL BIOCHEMISTRY",
      patient_name: "Rahim Ahmed",
      patient_id: "PT-10024",
      age_gender: "48Y / Male",
      patient_phone: "01712345678",
      doctor: "Prof. Dr. M. Rahman, FCPS",
      date: new Date().toISOString().slice(0, 10),
      receipt_no: "RCP-2026-1001",
      barcode: "LAB-20260906-0012",
      qr_code: `<div style="border: 1px solid #000; padding: 4px; text-align: center; font-family: monospace; font-size: 8px;">[VERIFY QR]</div>`,
      patient_barcode: `<div style="font-family: monospace; font-size: 14pt; letter-spacing: 2px; font-weight: bold;">||| | ||||| | ||</div>`,
      report_tracking_qr: `
        <div style="text-align: center;">
          <div style="border: 1px solid #000; padding: 2px; font-family: monospace; font-size: 8px; font-weight: bold; width: 60px; margin: 0 auto;">[LIVE QR]</div>
          <span style="font-size: 5.5pt; font-family: sans-serif; font-weight: bold; display: block; margin-top: 1px;">Scan for Live Report</span>
        </div>
      `,
      results_table: multiProfileUnifiedTable,
      items_table: `
        <tr><td style="padding: 3px 0;">1. Liver Function Tests (LFT)</td><td>Serum</td><td style="text-align: right; font-weight: bold;">৳ 1,200</td></tr>
        <tr><td style="padding: 3px 0;">2. Kidney Function Tests (KFT)</td><td>Serum</td><td style="text-align: right; font-weight: bold;">৳ 900</td></tr>
        <tr><td style="padding: 3px 0;">3. Lipid Profile Panel</td><td>Serum</td><td style="text-align: right; font-weight: bold;">৳ 1,000</td></tr>
      `,
      subtotal: "3100",
      discount: "10",
      discount_amount: "310",
      net_payable: "2790",
      paid_amount: "2790",
      due_amount: "0",
      remarks: `<div style="background: #fafaf9; border: 1px solid #000; padding: 6px 10px; border-radius: 4px; font-size: 8pt; margin-top: 8px;"><b>Pathologist Interpretation:</b> Mild transaminase elevation noted with hyperlipidemia. Clinical correlation recommended.</div>`,
      tech_name: "Md. Al-Amin, BSc",
      tech_designation: "Senior Medical Laboratory Technologist",
      tech_signature: `<div style="font-family: cursive; font-size: 16pt;">Md. Al-Amin</div>`,
      doctor_name: "Dr. S. Rahman, MD",
      doctor_designation: "Consultant Biochemist & Head of QC",
      doctor_signature: `<div style="font-family: cursive; font-size: 16pt;">Dr. S. Rahman</div>`,
      report_footer: formData.reportFooter,
      receipt_footer: formData.receiptFooter
    };

    let compiled = currentTemplate;
    Object.keys(sampleTokens).forEach((key) => {
      const reg = new RegExp(`{{${key}}}`, "g");
      compiled = compiled.replace(reg, sampleTokens[key]);
    });
    return compiled;
  };

  const REPORT_TOKENS = [
    { label: "Hospital Name", token: "hospital_name" },
    { label: "Hospital Logo", token: "hospital_logo" },
    { label: "Department Name", token: "department_name" },
    { label: "Patient Name", token: "patient_name" },
    { label: "Patient ID (UHID)", token: "patient_id" },
    { label: "Age / Sex", token: "age_gender" },
    { label: "Doctor", token: "doctor" },
    { label: "Date", token: "date" },
    { label: "Barcode", token: "barcode" },
    { label: "Verification QR", token: "qr_code" },
    { label: "Results Table (Single Header)", token: "results_table" },
    { label: "Pathologist Remarks", token: "remarks" },
    { label: "Technologist Signature", token: "tech_signature" },
    { label: "Doctor Signature", token: "doctor_signature" }
  ];

  const RECEIPT_TOKENS = [
    { label: "Hospital Name", token: "hospital_name" },
    { label: "Hospital Logo", token: "hospital_logo" },
    { label: "Receipt No", token: "receipt_no" },
    { label: "Patient ID", token: "patient_id" },
    { label: "Patient Name", token: "patient_name" },
    { label: "Itemized Bill Table", token: "items_table" },
    { label: "Subtotal", token: "subtotal" },
    { label: "Net Payable", token: "net_payable" },
    { label: "Paid Amount", token: "paid_amount" },
    { label: "Due Balance", token: "due_amount" },
    { label: "Patient ID Barcode", token: "patient_barcode" },
    { label: "Live Report Tracking QR", token: "report_tracking_qr" }
  ];

  return (
    <div className="space-y-4 w-full font-sans text-slate-800">
      
      {/* Top Action Bar */}
      <div className="bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 sticky top-16 z-40 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight">Enterprise Template & Hospital Branding Authority</h2>
            <p className="text-[10px] text-slate-400">Full HTML/CSS authority. PID positioned under barcode, QR code centered in footer.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Document Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab("report")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === "report" ? "bg-blue-600 text-white" : "text-slate-400"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> A4 Clinical Report
            </button>
            <button
              onClick={() => setActiveTab("receipt")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === "receipt" ? "bg-blue-600 text-white" : "text-slate-400"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> A5 Money Receipt
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === "report") {
                localStorage.removeItem("apex_report_template");
                setReportTemplate(DEFAULT_REPORT_TEMPLATE);
              } else {
                localStorage.removeItem("apex_receipt_template");
                setReceiptTemplate(DEFAULT_RECEIPT_TEMPLATE);
              }
            }}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs"
            title="Reset to Clean Default Template"
          >
            <RotateCcw className="w-4 h-4" /> Reset Layout
          </button>

          <button
            onClick={onSave}
            disabled={isLoading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition"
          >
            <Save className="w-3.5 h-3.5" /> {isLoading ? "Saving..." : "Save Template to Database"}
          </button>
        </div>
      </div>

      {/* Two-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        
        {/* Left Column: Token Inserter & Code Editor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-slate-900 uppercase text-[11px]">1-Click Insert Placeholders (Tokens)</span>
              <span className="text-[10px] text-blue-600">Appends to bottom</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(activeTab === "report" ? REPORT_TOKENS : RECEIPT_TOKENS).map((t) => (
                <button
                  key={t.token}
                  type="button"
                  onClick={() => insertToken(t.token)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-[11px] font-semibold transition border border-slate-200"
                >
                  + {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* HTML Source Code Editor */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 uppercase text-[11px]">Template Source HTML & CSS</span>
              <span className="text-[10px] text-slate-400">Full editing authority</span>
            </div>

            <textarea
              rows={18}
              value={currentTemplate}
              onChange={(e) => setCurrentTemplate(e.target.value)}
              className="w-full p-3 font-mono text-[11px] border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-950 text-emerald-400 leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Institution Identity Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-2">
            <label className="font-bold text-slate-700 uppercase block">Institution Identity</label>
            <input
              type="text"
              value={formData.labName}
              onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
              className="w-full p-2 border rounded-lg font-bold"
              placeholder="Hospital / Laboratory Name"
            />
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="Tagline (e.g. ISO 15189 Certified)"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-1/2 p-2 border rounded-lg"
                placeholder="Phone Number"
              />
              <label className="w-1/2 border-2 border-dashed rounded-lg p-2 text-center cursor-pointer text-blue-600 font-bold hover:bg-blue-50 flex items-center justify-center gap-1">
                <Upload className="w-3.5 h-3.5" /> Upload Logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live WYSIWYG Canvas Preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-start">
          <div className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-widest flex items-center gap-1">
            <span>{activeTab === "report" ? "📄 A4 Clinical Report Preview" : "💵 A5 Money Receipt Preview"}</span>
          </div>

          <div 
            className="bg-white shadow-2xl p-6 rounded-xl border border-slate-300 w-full overflow-x-auto"
            style={{ maxWidth: activeTab === "report" ? "620px" : "480px" }}
          >
            <div dangerouslySetInnerHTML={{ __html: getCompiledPreview() }} />
          </div>
        </div>

      </div>
    </div>
  );
}
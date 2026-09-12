import React from "react";
import { Printer, ShieldCheck, DollarSign, AlertCircle, CheckCircle2, MessageSquare } from "lucide-react";
import { 
  generateQrSvgLocal, 
  buildUnifiedResultsTable, 
  isImagingOrRadiologyInvestigation 
} from "../utils/printHelpers";

export default function ReportsPrint({ 
  activeOrder, 
  departmentGroupedReports, 
  handlePrintDepartmentA4Report,
  staffList = [],
  labSettings = {},
  onOpenVerificationModal,
  handleSettleDue,
  handleRemarksChange
}) {
  if (!activeOrder) {
    return <div className="p-8 text-center text-slate-400 font-sans">No active order selected for report printing.</div>;
  }

  const orderId = activeOrder.orderId || activeOrder.id || "";
  const qrUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(activeOrder.barcode || "")}`;
  const scannableQrSvg = generateQrSvgLocal(qrUrl, 56);

  const doctorName = 
    activeOrder.doctor || 
    activeOrder.patient?.doctor || 
    (activeOrder.patient?.address && activeOrder.patient.address.startsWith("Ref: ") ? activeOrder.patient.address.replace("Ref: ", "") : null) || 
    "Self";

  // Compile on-screen live preview
  const getCompiledReportPreview = (group) => {
    const isImaging = isImagingOrRadiologyInvestigation(null, group.dept?.id, group.dept?.name);

    const techUser = staffList.find(u => u.role === "technologist") || {
      full_name: "Md. Al-Amin",
      designation: isImaging ? "Senior Medical Radiographer / Imaging Technologist" : "BSc in Medical Technology - Senior Technologist",
      signature_data: ""
    };

    const verifierUser = staffList.find(u => 
      u.role === "verifier" || u.role === "biochemist" || u.role === "manager" || u.role === "admin"
    ) || {
      full_name: "Dr. S. Rahman",
      designation: isImaging ? "MBBS, MD / FCPS - Consultant Radiologist & Physician" : "MBBS, MD (Pathology) - Consultant Biochemist & Lab Incharge",
      signature_data: ""
    };

    // Clean, readable typography
    const renderSignatureHtml = (sigData, fallbackName) => {
      if (sigData && sigData.startsWith("data:image")) {
        return `<img src="${sigData}" style="height: 38px; max-width: 140px; object-fit: contain; margin: 0 auto 3px auto; display: block;" />`;
      }
      return `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; font-weight: 700; color: #0f172a; height: 34px; line-height: 34px; text-align: center; letter-spacing: 0.5px;">${sigData || fallbackName}</div>`;
    };

    const testsTableHtml = buildUnifiedResultsTable(group.tests || [], activeOrder.results || {}, group.dept?.id, group.dept?.name);

    const investigationNames = (group.tests || []).map(t => t.name).join(", ");
    const sixthSlotDemographics = isImaging
      ? `<div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Investigation:</span> <b style="color: #0f172a;">${investigationNames}</b></div>`
      : `<div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Barcode:</span> <b style="font-family: monospace;">${activeOrder.barcode || ""}</b></div>`;

    const remarksText = (activeOrder.verifierRemarks && activeOrder.verifierRemarks.trim())
      ? activeOrder.verifierRemarks
      : "Clinically correlated and verified with quality control standards.";

    // REMARKS: Clean inline text with NO box and NO background
    const remarksHtml = isImaging ? "" : `
      <div style="margin-top: 14px; font-size: 8.5pt; color: #1e293b; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">
        <span style="font-weight: 700; text-transform: uppercase; color: #0f172a;">Pathologist Remarks:</span> 
        <span style="margin-left: 6px; color: #334155;">${remarksText}</span>
      </div>
    `;

    // BORDERLESS SCREEN PREVIEW
    return `
      <div style="border: none; padding: 4px; min-height: 270mm; display: flex; flex-direction: column; justify-content: space-between; font-family: Arial, Helvetica, sans-serif; background: #ffffff;">
        <div>
          <!-- HEADER -->
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${labSettings?.logo_data ? `<img src="${labSettings.logo_data}" style="height: 44px; max-width: 120px; object-fit: contain;" />` : ""}
              <div>
                <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a; letter-spacing: 0.2px;">${(labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES").toUpperCase()}</h1>
                <p style="font-size: 8.5pt; font-weight: 700; color: #334155; margin: 2px 0;">DEPARTMENT OF ${(group.dept?.name || "Diagnostics").toUpperCase()} (${labSettings?.tagline || "ISO Certified"})</p>
                <p style="font-size: 7.5pt; color: #475569; margin: 0;">${labSettings?.address || "Dhanmondi, Dhaka"} • Phone: ${labSettings?.phone || "+880 9612-345678"}</p>
              </div>
            </div>
            <div style="text-align: right; width: 85px;">
              ${scannableQrSvg}
              <span style="font-size: 6pt; font-family: Arial, sans-serif; font-weight: bold; display: block; text-align: center; margin-top: 2px;">Scan to Verify</span>
            </div>
          </div>

          <!-- PATIENT DEMOGRAPHICS -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px; font-size: 8.5pt;">
            <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Patient:</span> <b>${activeOrder.patient?.name || "Patient"}</b></div>
            <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Age/Sex:</span> <b>${activeOrder.patient?.age || ""}Y / ${activeOrder.patient?.gender || ""}</b></div>
            <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Patient ID:</span> <b style="color: #1d4ed8;">${activeOrder.patient?.id || "N/A"}</b></div>
            <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Ref. By:</span> <b>${doctorName}</b></div>
            <div><span style="color: #64748b; font-size: 7.5pt; text-transform: uppercase;">Date:</span> <b>${activeOrder.date || new Date().toISOString().slice(0, 10)}</b></div>
            ${sixthSlotDemographics}
          </div>

          <!-- REPORT CONTENT -->
          ${testsTableHtml}
          ${remarksHtml}
        </div>

        <!-- READABLE STAFF NAMES (NO CURSIVE) -->
        <div>
          <div style="margin-top: 24px; padding-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
            <div style="text-align: center; width: 230px;">
              ${renderSignatureHtml(techUser.signature_data, techUser.full_name)}
              <div style="border-top: 1.5px solid #0f172a; padding-top: 4px;">
                <div style="font-family: Arial, Helvetica, sans-serif; font-weight: 800; font-size: 9pt; color: #0f172a;">${techUser.full_name}</div>
                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; font-weight: 500; color: #475569; margin-top: 2px;">${techUser.designation}</div>
              </div>
            </div>
            <div style="text-align: center; width: 230px;">
              ${renderSignatureHtml(verifierUser.signature_data, verifierUser.full_name)}
              <div style="border-top: 1.5px solid #0f172a; padding-top: 4px;">
                <div style="font-family: Arial, Helvetica, sans-serif; font-weight: 800; font-size: 9pt; color: #0f172a;">${verifierUser.full_name}</div>
                <div style="font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; font-weight: 500; color: #475569; margin-top: 2px;">${verifierUser.designation}</div>
              </div>
            </div>
          </div>
          <p style="text-align: center; font-size: 6.5pt; color: #94a3b8; margin: 12px 0 0 0; border-top: 0.5px dashed #cbd5e1; padding-top: 4px;">${labSettings?.report_footer || "This is a clinically verified electronic laboratory report."}</p>
        </div>
      </div>
    `;
  };

  const hasOutstandingDue = (activeOrder.billing?.due || 0) > 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      
      {/* Due Banner */}
      {hasOutstandingDue && (
        <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl font-mono font-black text-sm">
              DUE: ৳{activeOrder.billing?.due}
            </div>
            <div>
              <p className="font-black text-sm text-rose-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> Patient Has Outstanding Due Balance!
              </p>
              <p className="text-xs text-slate-600">
                Please collect <b>৳{activeOrder.billing?.due}</b> from <b>{activeOrder.patient?.name}</b> before report handover.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const due = activeOrder.billing?.due;
              if (window.confirm(`Confirm collection of full due amount ৳${due} from ${activeOrder.patient?.name}?`)) {
                handleSettleDue(activeOrder.orderId, due);
              }
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition whitespace-nowrap"
          >
            <DollarSign className="w-4 h-4" /> Collect ৳{activeOrder.billing?.due} & Mark Paid
          </button>
        </div>
      )}

      {/* Top Hub Bar */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Diagnostic Reports Hub</h2>
            {hasOutstandingDue ? (
              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-full">
                Due ৳{activeOrder.billing?.due}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Patient: <b>{activeOrder.patient?.name}</b> (ID: {activeOrder.patient?.id}) | Ref. Doctor: <b>{doctorName}</b>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenVerificationModal && (
            <button
              onClick={onOpenVerificationModal}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Digital Certificate
            </button>
          )}
          <button
            onClick={() => handlePrintDepartmentA4Report("ALL")}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
          >
            <Printer className="w-4 h-4" /> Print All Departments (A4)
          </button>
        </div>
      </div>

      {/* Remarks Editor */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 text-xs">
        <label className="font-bold text-slate-800 uppercase flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Doctor Remarks on This Report:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            disabled={activeOrder.isLocked}
            value={activeOrder.verifierRemarks || ""}
            onChange={(e) => handleRemarksChange && handleRemarksChange(e.target.value)}
            placeholder="Type custom interpretation to appear on printed report..."
            className="flex-1 p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-slate-50 disabled:bg-slate-100"
          />
        </div>
      </div>

      {/* Department Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Departmental Report Sheets
        </h3>

        {(departmentGroupedReports || []).map((group) => (
          <div key={group.dept.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{group.dept.icon || "🔬"}</span>
                <span className="font-black text-sm text-slate-900">Department of {group.dept.name}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px]">
                  {group.tests.length} Investigations
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-7">
                Includes: <b>{group.tests.map((t) => t.name).join(" • ")}</b>
              </p>
            </div>

            <button
              onClick={() => handlePrintDepartmentA4Report(group.dept.id)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition self-end md:self-auto"
            >
              <Printer className="w-3.5 h-3.5" /> Print {group.dept.name} A4 Sheet Only
            </button>
          </div>
        ))}
      </div>

      {/* Borderless Screen Preview */}
      <div className="space-y-6">
        {(departmentGroupedReports || []).map((group) => (
          <div 
            key={group.dept.id}
            className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-lg text-slate-900 w-full overflow-x-auto"
          >
            <div dangerouslySetInnerHTML={{ __html: getCompiledReportPreview(group) }} />
          </div>
        ))}
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { 
  Printer, ShieldCheck, DollarSign, AlertCircle, CheckCircle2, 
  MessageSquare, FileText, Layers, Lock 
} from "lucide-react";
import { 
  generateQrSvgLocal, 
  buildUnifiedResultsTable, 
  isImagingOrRadiologyInvestigation 
} from "../utils/printHelpers";

export default function ReportsPrint({ 
  activeOrder, 
  currentUser,
  departmentGroupedReports = [], 
  handlePrintDepartmentA4Report,
  staffList = [],
  labSettings = {},
  onOpenVerificationModal,
  handleSettleDue,
  handleRemarksChange
}) {
  // Pad Mode Memory (Remembers your choice)
  const [usePadMode, setUsePadMode] = useState(() => {
    return localStorage.getItem("apex_use_pad_mode") === "true";
  });

  const togglePadMode = (val) => {
    setUsePadMode(val);
    localStorage.setItem("apex_use_pad_mode", val ? "true" : "false");
  };

  if (!activeOrder) {
    return (
      <div className="p-12 text-center text-slate-400 font-sans bg-white rounded-2xl border border-dashed border-slate-200">
        <p className="font-semibold text-sm">No active order selected for report printing.</p>
        <p className="text-xs text-slate-400 mt-1">Please select an order from the Dashboard to view and print reports.</p>
      </div>
    );
  }

  const orderId = activeOrder.orderId || activeOrder.id || "";
  const qrUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(activeOrder.barcode || "")}`;
  const scannableQrSvg = generateQrSvgLocal(qrUrl, 52);

  const isVerified = activeOrder.qcStatus === "Verified" || activeOrder.isLocked === true;

  // RECEPTIONIST LOCK: Cannot print unverified reports
  const userRole = (currentUser?.role || "").toLowerCase();
  const isReceptionist = userRole === "receptionist";
  const canPrint = !isReceptionist || isVerified;

  const doctorName = 
    activeOrder.doctor || 
    activeOrder.patient?.doctor || 
    (activeOrder.patient?.address && activeOrder.patient.address.startsWith("Ref: ") ? activeOrder.patient.address.replace("Ref: ", "") : null) || 
    "Self";

  const labName = (labSettings?.lab_name || "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER").toUpperCase();
  const tagline = labSettings?.tagline || "With Al-Fattah on the Journey to Wellness";
  const address = labSettings?.address || "Solmaid Purbo Para, Panir pump, Vatara, Dhaka 1212";
  const phone = labSettings?.phone || "01723854472, 01624787444";

  // LIVE ON-SCREEN REPORT PREVIEW (EXACT MATCH TO FIGMA PAD & SIZED-UP FONTS)
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

    const renderSignatureHtml = (sigData, fallbackName) => {
      if (!isVerified) return `<div style="height: 38px;"></div>`;
      if (sigData && sigData.startsWith("data:image")) {
        return `<img src="${sigData}" style="height: 38px; max-width: 140px; object-fit: contain; margin: 0 auto 3px auto; display: block;" />`;
      }
      return `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11pt; font-weight: 700; color: #000000; height: 34px; line-height: 34px; text-align: center; letter-spacing: 0.5px;">${sigData || fallbackName}</div>`;
    };

    const testsTableHtml = buildUnifiedResultsTable(group.tests || [], activeOrder.results || {}, group.dept?.id, group.dept?.name);

    const remarksText = (activeOrder.verifierRemarks && activeOrder.verifierRemarks.trim())
      ? activeOrder.verifierRemarks
      : "Clinically correlated and verified with quality control standards.";

    const remarksHtml = isImaging ? "" : `
      <div style="margin-top: 14px; font-size: 9.5pt; color: #000000; line-height: 1.5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <span style="font-weight: 800; text-transform: uppercase; color: #000000; font-size: 9pt; letter-spacing: 0.5px;">Pathologist Remarks:</span> 
        <span style="margin-left: 6px; color: #000000;">${remarksText}</span>
      </div>
    `;

    const departmentBannerTitle = (group.dept?.name || "Clinical Pathology").toUpperCase();

    const sixthSlotDemographics = isImaging
      ? `<span style="font-weight: 700;">Modality:</span> <b style="font-weight: 800;">${group.dept?.name || "Radiology"}</b>`
      : `<span style="font-weight: 700;">Barcode:</span> <b style="font-family: 'Consolas', monospace; font-weight: 800;">${activeOrder.barcode || ""}</b>`;

    const figmaDigitalHeaderHtml = usePadMode ? `
      <div style="background: #221430; color: #ffffff; padding: 12px 18px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; border-bottom: 2px dashed #a855f7;">
        <div>
          <span style="font-size: 11pt; font-weight: 900; letter-spacing: 0.5px;">AL FATTAH DIAGNOSTIC & CONSULTATION CENTER</span>
          <p style="font-size: 7.5pt; margin: 2px 0 0 0; color: #e2e8f0;">[Pre-Printed Header Zone: 780px x 132px (38mm) — Skipped on Physical Pad]</p>
        </div>
        <span style="font-size: 8pt; font-weight: bold; background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 4px;">AL-FATTAH PAD MODE</span>
      </div>
    ` : `
      <div style="background: #221430; color: #ffffff; padding: 12px 18px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 2px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${labSettings?.logo_data ? `<img src="${labSettings.logo_data}" style="height: 48px; max-width: 120px; object-fit: contain;" />` : `
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #b91c1c; font-size: 14pt; border: 2px solid #16a34a;">
              AF
            </div>
          `}
          <div>
            <div style="font-size: 6.5pt; color: #e2e8f0; letter-spacing: 0.3px; margin-bottom: 1px;">With Al-Fattah on the Journey to Wellness</div>
          </div>
        </div>
        <div style="text-align: right;">
          <h1 style="font-size: 18pt; font-weight: 900; margin: 0; color: #ffffff; letter-spacing: 1.2px; line-height: 1;">AL FATTAH</h1>
          <div style="font-size: 8.5pt; font-weight: 600; color: #f8fafc; letter-spacing: 0.8px; margin-top: 2px;">DIAGNOSTIC & CONSULTATION CENTER</div>
        </div>
      </div>
    `;

    // TRANSPARENT BACKGROUND PATIENT CARD, SIZED-UP 9.5PT FONTS
    const demographicsHtml = `
      <div style="background: transparent; border: 1.5px solid #000000; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; font-size: 9.5pt; color: #000000;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <table style="width: 100%; border-collapse: collapse; color: #000000; font-size: 9.5pt;">
            <tr>
              <td style="padding: 3px 6px; width: 38%;"><span style="font-weight: 700;">Patient Name:</span> <b style="font-weight: 900; font-size: 10.5pt;">${activeOrder.patient?.name || "Patient"}</b></td>
              <td style="padding: 3px 6px; width: 30%;"><span style="font-weight: 700;">Age / Gender:</span> <b style="font-weight: 800;">${activeOrder.patient?.age || "—"} Y / ${activeOrder.patient?.gender || "—"}</b></td>
              <td style="padding: 3px 6px; width: 32%;"><span style="font-weight: 700;">Patient ID:</span> <b style="font-family: 'Consolas', monospace; font-weight: 900; font-size: 10pt;">${activeOrder.patient?.id || "N/A"}</b></td>
            </tr>
            <tr>
              <td style="padding: 3px 6px;"><span style="font-weight: 700;">Ref. Doctor:</span> <b style="font-weight: 800;">${doctorName}</b></td>
              <td style="padding: 3px 6px;"><span style="font-weight: 700;">Date:</span> <b style="font-weight: 800;">${activeOrder.date || new Date().toISOString().slice(0, 10)}</b></td>
              <td style="padding: 3px 6px;">${sixthSlotDemographics}</td>
            </tr>
          </table>
          ${usePadMode ? `
            <div style="width: 50px; text-align: center; margin-left: 8px; flex-shrink: 0;">
              ${generateQrSvgLocal(qrUrl, 46)}
              <span style="font-size: 5.5pt; font-weight: 800; display: block; text-align: center; text-transform: uppercase;">Verify</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;

    const figmaDigitalFooterHtml = usePadMode ? `
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #a855f7; text-align: center; color: #475569; font-size: 7.5pt;">
        [Pre-Printed Footer Zone: 780px x 72px (21mm) — Solmaid Purbo Para, Vatara, Dhaka • 01723854472]
      </div>
    ` : `
      <div style="border-top: 1.5px solid #000000; padding-top: 6px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; font-weight: 700; color: #000000;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #dc2626; font-size: 11pt;">📍</span>
          <span>Solmaid Purbo Para, Panir pump, Vatara, Dhaka 1212</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 11pt;">🎧</span>
          <span>01723854472, 01624787444</span>
        </div>
      </div>
    `;

    return `
      <div style="border: none; padding: 4px; min-height: ${usePadMode ? '220mm' : '265mm'}; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; color: #000000;">
        <div>
          ${figmaDigitalHeaderHtml}
          ${demographicsHtml}

          <!-- SIZED-UP DEPARTMENT TITLE -->
          <div style="text-align: center; margin: 10px 0 6px 0;">
            <span style="font-size: 11pt; font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase; color: #000000;">
              DEPARTMENT OF ${departmentBannerTitle}
            </span>
          </div>

          ${testsTableHtml}
          ${remarksHtml}
        </div>

        <div>
          ${isVerified ? `
            <div style="margin-top: 22px; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
              <div style="text-align: center; width: 240px;">
                ${renderSignatureHtml(techUser.signature_data, techUser.full_name)}
                <div style="border-top: 1.5px solid #000000; padding-top: 4px;">
                  <div style="font-weight: 900; font-size: 10pt; color: #000000;">${techUser.full_name}</div>
                  <div style="font-size: 8pt; font-weight: 700; color: #000000; margin-top: 1px;">${techUser.designation}</div>
                </div>
              </div>
              <div style="text-align: center; width: 240px;">
                ${renderSignatureHtml(verifierUser.signature_data, verifierUser.full_name)}
                <div style="border-top: 1.5px solid #000000; padding-top: 4px;">
                  <div style="font-weight: 900; font-size: 10pt; color: #000000;">${verifierUser.full_name}</div>
                  <div style="font-size: 8pt; font-weight: 700; color: #000000; margin-top: 1px;">${verifierUser.designation}</div>
                </div>
              </div>
            </div>
          ` : `
            <div style="height: 50px;"></div>
          `}
          ${figmaDigitalFooterHtml}
        </div>
      </div>
    `;
  };

  const hasOutstandingDue = (activeOrder.billing?.due || 0) > 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      
      {/* 1. DUE BALANCE BANNER */}
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

      {/* 2. TOP HUB BAR WITH PERMISSION LOCK & 1-CLICK PAD TOGGLE */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Diagnostic Reports Hub</h2>
            {isVerified ? (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified & Ready
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" /> Pending Verification
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Patient: <b>{activeOrder.patient?.name}</b> (ID: {activeOrder.patient?.id}) | Ref. Doctor: <b>{doctorName}</b>
          </p>
        </div>

        {/* CONTROLS: PAD MODE TOGGLE & CONDITIONAL PRINT */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* 1-CLICK PAD MODE SELECTOR */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 text-xs font-bold">
            <button
              type="button"
              onClick={() => togglePadMode(false)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                !usePadMode ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Plain White A4
            </button>
            <button
              type="button"
              onClick={() => togglePadMode(true)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                usePadMode ? "bg-indigo-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Al-Fattah Pad Paper
            </button>
          </div>

          {onOpenVerificationModal && (
            <button
              onClick={onOpenVerificationModal}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Certificate
            </button>
          )}

          {/* PRINT BUTTON: LOCKED FOR RECEPTIONIST BEFORE VERIFICATION */}
          {canPrint ? (
            <button
              onClick={() => handlePrintDepartmentA4Report("ALL", usePadMode)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
            >
              <Printer className="w-4 h-4" /> Print All (A4)
            </button>
          ) : (
            <div 
              className="px-3.5 py-2 bg-slate-100 border border-slate-300 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed shadow-inner"
              title="Receptionists can only print reports once verified by the Doctor/Pathologist."
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" /> Verification Required to Print
            </div>
          )}
        </div>
      </div>

      {/* 3. PATHOLOGIST REMARKS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 text-xs">
        <label className="font-bold text-slate-800 uppercase flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Doctor Remarks on This Report:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            disabled={activeOrder.isLocked || isReceptionist}
            value={activeOrder.verifierRemarks || ""}
            onChange={(e) => handleRemarksChange && handleRemarksChange(e.target.value)}
            placeholder="Type custom interpretation to appear on printed report..."
            className="flex-1 p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-slate-50 disabled:bg-slate-100"
          />
        </div>
      </div>

      {/* 4. DEPARTMENT REPORT CARDS */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Departmental Report Sheets ({usePadMode ? "Al-Fattah Pad Mode: Pre-printed header/footer skipped" : "Plain Paper Mode: Digital header/footer enabled"})
        </h3>

        {departmentGroupedReports.map((group) => (
          <div key={group.dept.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-200 transition">
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

            {canPrint ? (
              <button
                onClick={() => handlePrintDepartmentA4Report(group.dept.id, usePadMode)}
                className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition self-end md:self-auto"
              >
                <Printer className="w-3.5 h-3.5" /> Print {group.dept.name} Sheet
              </button>
            ) : (
              <span className="px-3.5 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-bold self-end md:self-auto flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-500" /> Verification Pending
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 5. LIVE ON-SCREEN PREVIEWS */}
      <div className="space-y-6">
        {departmentGroupedReports.map((group) => (
          <div 
            key={group.dept.id}
            className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-lg text-slate-900 w-full overflow-x-auto"
          >
            <div dangerouslySetInnerHTML={{ __html: getCompiledReportPreview(group) }} />
          </div>
        ))}
      </div>
    </div>
  );
}
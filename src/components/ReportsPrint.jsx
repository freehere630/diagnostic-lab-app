import React from "react";
import { Printer, ShieldCheck, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import { compileTemplate, generateQrSvgLocal, buildUnifiedResultsTable, getActiveTemplate } from "../utils/printHelpers";

export default function ReportsPrint({ 
  activeOrder, 
  departmentGroupedReports, 
  handlePrintDepartmentA4Report,
  staffList = [],
  labSettings = {},
  onOpenVerificationModal,
  handleSettleDue
}) {
  if (!activeOrder) {
    return <div className="p-8 text-center text-slate-400 font-sans">No active order selected for report printing.</div>;
  }

  const techUser = staffList.find(u => u.role === "technologist") || {
    full_name: "Md. Al-Amin",
    designation: "BSc in Medical Technology - Senior Technologist",
    signature_data: ""
  };

  const verifierUser = staffList.find(u => u.role === "verifier" || u.role === "admin") || {
    full_name: "Dr. S. Rahman",
    designation: "MBBS, MD (Pathology) - Consultant Biochemist & Lab Incharge",
    signature_data: ""
  };

  const renderSignatureHtml = (sigData, fallbackName) => {
    if (sigData && sigData.startsWith("data:image")) {
      return `<img src="${sigData}" style="height: 38px; max-width: 140px; object-fit: contain; margin: 0 auto 2px auto; display: block;" />`;
    }
    return `<div style="font-family: 'Brush Script MT', cursive; font-size: 18pt; color: #000; height: 34px; line-height: 34px;">${sigData || fallbackName}</div>`;
  };

  const qrUrl = `${window.location.origin}/?verify=${encodeURIComponent(activeOrder.orderId)}&bc=${encodeURIComponent(activeOrder.barcode)}`;
  const scannableQrSvg = generateQrSvgLocal(qrUrl, 56);

  // Compile on-screen live preview using the active template and unified single header
  const getCompiledReportPreview = (group) => {
    const testsTableHtml = buildUnifiedResultsTable(group.tests || [], activeOrder.results || {});

    const tokens = {
      hospital_name: (labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES").toUpperCase(),
      hospital_tagline: labSettings?.tagline || "ISO 15189 Certified Reference Lab",
      hospital_address: labSettings?.address || "Dhanmondi, Dhaka",
      hospital_phone: labSettings?.phone || "+880 9612-345678",
      hospital_logo: labSettings?.logo_data ? `<img src="${labSettings.logo_data}" style="height: 44px; max-width: 120px; object-fit: contain;" />` : "",
      department_name: (group.dept?.name || "General Diagnostics").toUpperCase(),
      patient_name: activeOrder.patient?.name || "Patient",
      age_gender: `${activeOrder.patient?.age || ""}Y / ${activeOrder.patient?.gender || ""}`,
      patient_id: activeOrder.patient?.id || "N/A",
      doctor: activeOrder.patient?.doctor || "Self",
      date: activeOrder.date || new Date().toISOString().slice(0, 10),
      barcode: activeOrder.barcode || "",
      qr_code: scannableQrSvg,
      results_table: testsTableHtml,
      remarks: activeOrder.verifierRemarks ? `<div style="background: #fafaf9; border: 1px solid #000; border-radius: 6px; padding: 6px 10px; margin-top: 8px; font-size: 8pt;"><b>Pathologist Remarks:</b> <i>${activeOrder.verifierRemarks}</i></div>` : "",
      tech_name: techUser.full_name,
      tech_designation: techUser.designation,
      tech_signature: renderSignatureHtml(techUser.signature_data, techUser.full_name),
      doctor_name: verifierUser.full_name,
      doctor_designation: verifierUser.designation,
      doctor_signature: renderSignatureHtml(verifierUser.signature_data, verifierUser.full_name),
      report_footer: labSettings?.report_footer || "This is a clinically verified electronic laboratory report."
    };

    let templateHtml = getActiveTemplate(labSettings, "report");
    return compileTemplate(templateHtml, tokens);
  };

  const hasOutstandingDue = (activeOrder.billing?.due || 0) > 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      
      {/* DUE MONEY WARNING BANNER ON REPORT DELIVERY */}
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
                Please collect the remaining <b>৳{activeOrder.billing?.due}</b> from <b>{activeOrder.patient?.name}</b> before report handover.
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
            Patient: <b>{activeOrder.patient?.name}</b> (ID: {activeOrder.patient?.id}) | Barcode: <b className="font-mono text-blue-700">{activeOrder.barcode}</b>
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

      {/* Department Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Departmental Report Sheets (One Master Header per Department)
        </h3>

        {(departmentGroupedReports || []).map((group) => (
          <div key={group.dept.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{group.dept.icon || "🔬"}</span>
                <span className="font-black text-sm text-slate-900">Department of {group.dept.name}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px]">
                  {group.tests.length} Profiles / Tests Combined
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-7">
                Profiles included: <b>{group.tests.map((t) => t.name).join(" • ")}</b>
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

      {/* Live Screen Preview */}
      <div className="space-y-6">
        {(departmentGroupedReports || []).map((group) => (
          <div 
            key={group.dept.id}
            className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-xl text-slate-900 w-full overflow-x-auto"
          >
            <div dangerouslySetInnerHTML={{ __html: getCompiledReportPreview(group) }} />
          </div>
        ))}
      </div>
    </div>
  );
}
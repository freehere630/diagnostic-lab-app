import React from "react";
import { Printer } from "lucide-react";
import { compileTemplate, generateSvgBarcodeHtml, generateQrSvgLocal } from "../utils/printHelpers";

export default function ReportsPrint({ 
  activeOrder, 
  departmentGroupedReports, 
  handlePrintDepartmentA4Report,
  staffList = [],
  labSettings = {},
  onOpenVerificationModal
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
      return `<img src="${sigData}" style="height: 36px; max-width: 140px; object-fit: contain; margin: 0 auto 2px auto; display: block;" />`;
    }
    return `<div style="font-family: 'Brush Script MT', cursive; font-size: 18pt; color: #000; height: 34px; line-height: 34px;">${sigData || fallbackName}</div>`;
  };

  const qrUrl = `${window.location.origin}/?verify=${activeOrder.orderId}&pid=${activeOrder.patient?.id || ''}&bc=${activeOrder.barcode}`;
  const scannableQrSvg = generateQrSvgLocal(qrUrl, 56);

  // Compile Live Screen Preview
  const getCompiledReportPreview = (group) => {
    const testsTableHtml = (group.tests || []).map((test) => {
      const params = test.test_parameters || test.parameters || [];
      const rows = params.map((p) => {
        const val = activeOrder.results?.[p.id]?.value || "—";
        const refRange = p.param_type === "numeric" && p.min_range ? `${p.min_range} – ${p.max_range}` : (p.param_type === "qualitative" ? "Negative" : "Normal");

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 10px; font-weight: 600;">${p.name}</td>
            <td style="padding: 6px 10px; font-family: monospace; font-weight: 700; font-size: 10pt;">${val}</td>
            <td style="padding: 6px 10px; color: #334155; font-family: monospace;">${p.unit || ""}</td>
            <td style="padding: 6px 10px; color: #334155; font-family: monospace;">${refRange}</td>
          </tr>`;
      }).join("");

      return `
        <div style="margin-bottom: 10px;">
          
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; text-align: left;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1.5px solid #000; font-size: 8pt; font-weight: 900; text-transform: uppercase;">
                <th style="padding: 4px 10px;">Test Parameter</th>
                <th style="padding: 4px 10px;">Observed Result</th>
                <th style="padding: 4px 10px;">Unit</th>
                <th style="padding: 4px 10px;">Reference Range</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join("");

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

    let templateHtml = labSettings?.report_design?.templateHtml || "";
    if (!templateHtml) {
      try {
        const cached = JSON.parse(localStorage.getItem("apex_lab_settings") || "{}");
        templateHtml = cached.report_design?.templateHtml || "";
      } catch (e) {}
    }

    if (!templateHtml) {
      templateHtml = `
        <div style="border: 2px solid #000; border-radius: 8px; padding: 14px 16px; min-height: 270mm; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
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
                <span style="font-size: 6pt; font-family: monospace; display: block; text-align: center;">Scan to Verify</span>
              </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px; font-size: 8.5pt;">
              <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Patient:</span> <b>{{patient_name}}</b></div>
              <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Age/Sex:</span> <b>{{age_gender}}</b></div>
              <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Patient ID:</span> <b style="font-family: monospace; color: #1d4ed8;">{{patient_id}}</b></div>
              <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Ref. By:</span> <b>{{doctor}}</b></div>
              <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Date:</span> <b>{{date}}</b></div>
              <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Barcode:</span> <b style="font-family: monospace;">{{barcode}}</b></div>
            </div>

            {{results_table}}
            {{remarks}}
          </div>

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
        </div>
      `;
    }

    return compileTemplate(templateHtml, tokens);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      
      {/* Top Hub Bar */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Diagnostic Reports Hub (Department-Wise)</h2>
          <p className="text-xs text-slate-500">Patient: <b>{activeOrder.patient?.name}</b> | Barcode: <b className="font-mono text-blue-700">{activeOrder.barcode}</b></p>
        </div>

        <button
          onClick={() => handlePrintDepartmentA4Report("ALL")}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
        >
          <Printer className="w-4 h-4" /> Print All Departments (Custom Template A4)
        </button>
      </div>

      {/* Department Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Departmental Report Sheets (Combined Tests per Department)
        </h3>

        {(departmentGroupedReports || []).map((group) => (
          <div key={group.dept.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{group.dept.icon || "🔬"}</span>
                <span className="font-black text-sm text-slate-900">Department of {group.dept.name}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px]">
                  {group.tests.length} Tests Combined
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-7">
                Contains: <b>{group.tests.map((t) => `${t.name} (${t.code})`).join(", ")}</b>
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

      {/* Screen Live Preview Rendering the Exact Customized Template */}
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
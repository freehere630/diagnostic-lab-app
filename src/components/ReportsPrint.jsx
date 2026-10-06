import React, { useState } from "react";
import {
  Printer, ShieldCheck, DollarSign, AlertCircle, CheckCircle2,
  MessageSquare, FileText, Layers, Lock, Eye, Check, ChevronRight,
  ShieldAlert, Clock
} from "lucide-react";
import { renderDepartmentReportHtml } from "../utils/printHelpers";

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
  const [usePadMode, setUsePadMode] = useState(() => {
    return localStorage.getItem("apex_use_pad_mode") === "true";
  });
  const [activeDeptSheet, setActiveDeptSheet] = useState("ALL");
  const [previewScale, setPreviewScale] = useState(0.85); // 85% default scale

  const togglePadMode = (val) => {
    setUsePadMode(val);
    localStorage.setItem("apex_use_pad_mode", val ? "true" : "false");
  };

  if (!activeOrder) {
    return (
      <div className="py-20 text-center text-slate-400 max-w-xl mx-auto bg-white rounded-2xl border border-dashed border-slate-200">
        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-xs text-slate-600">No active patient order selected for report printing</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Please select an order from the Dashboard to preview and print.</p>
      </div>
    );
  }

  const isVerified = activeOrder.qcStatus === "Verified" || activeOrder.isLocked === true;
  const userRole = (currentUser?.role || "").toLowerCase();
  const isReceptionist = userRole === "receptionist";
  const hasOutstandingDue = (activeOrder.billing?.due || 0) > 0;

  // RECEPTIONIST SECURITY LOCK:
  // Before verification AND clearing due, receptionist CANNOT see preview or print.
  const isReceptionistBlocked = isReceptionist && (!isVerified || hasOutstandingDue);
  const canPrint = !isReceptionist || (isVerified && !hasOutstandingDue);

  const doctorName =
    activeOrder.doctor ||
    activeOrder.patient?.doctor ||
    (activeOrder.patient?.address && activeOrder.patient.address.startsWith("Ref: ") ? activeOrder.patient.address.replace("Ref: ", "") : null) ||
    "Self";

  const displayedGroups = activeDeptSheet === "ALL"
    ? departmentGroupedReports
    : departmentGroupedReports.filter((g) => g.dept?.id === activeDeptSheet);

  return (
    <div className="max-w-[1920px] mx-auto text-slate-900 font-sans">
      <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-5rem)]">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: EXACTLY 40% OF PAGE WIDTH (ALL CONTROLS) */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[40%] flex flex-col gap-3 overflow-y-auto pr-1">
          
          {/* 1. Due Alert Strip */}
          {hasOutstandingDue && (
            <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-rose-600 text-white font-mono font-bold text-[11px]">
                  ৳{activeOrder.billing?.due} Due
                </span>
                <span className="text-[11px] font-semibold text-rose-800">
                  {isReceptionist ? "Collect balance to unlock preview & report." : "Payment required before handing over report."}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const due = activeOrder.billing?.due;
                  if (window.confirm(`Confirm collection of full due balance ৳${due} from ${activeOrder.patient?.name}?`)) {
                    handleSettleDue(activeOrder.orderId, due);
                  }
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-[11px] flex items-center gap-1 shadow-xs transition shrink-0 whitespace-nowrap"
              >
                <DollarSign className="w-3 h-3" /> Settle Due
              </button>
            </div>
          )}

          {/* 2. Patient Demographics & Print Actions Card */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-slate-900">{activeOrder.patient?.name}</h2>
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    {activeOrder.patient?.id}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ref: <b className="text-slate-700">{doctorName}</b> • Barcode: <span className="font-mono font-semibold">{activeOrder.barcode}</span>
                </p>
              </div>

              {isVerified ? (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0">
                  <Lock className="w-3 h-3 text-amber-600" /> Pending QC
                </span>
              )}
            </div>

            {/* Paper Format Selector */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">Printing Paper Format:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => togglePadMode(false)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
                    !usePadMode ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Plain White A4
                </button>
                <button
                  type="button"
                  onClick={() => togglePadMode(true)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
                    usePadMode ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Hospital Pad
                </button>
              </div>
            </div>

            {/* Main Print Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              {canPrint ? (
                <button
                  onClick={() => handlePrintDepartmentA4Report("ALL", usePadMode)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Printer className="w-4 h-4" /> Print Complete Report (A4)
                </button>
              ) : (
                <div className="flex-1 py-2 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  {!isVerified ? "Verification Required" : "Due Clearance Required"}
                </div>
              )}

              {onOpenVerificationModal && (
                <button
                  onClick={onOpenVerificationModal}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0"
                  title="View Digital Certificate"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Certificate
                </button>
              )}
            </div>
          </div>

          {/* 3. Pathologist Remarks Box */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1 shrink-0">
            <label className="font-bold text-slate-700 text-[11px] uppercase tracking-wide flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Doctor Clinical Remarks:
            </label>
            <input
              type="text"
              disabled={activeOrder.isLocked || isReceptionist}
              value={activeOrder.verifierRemarks || ""}
              onChange={(e) => handleRemarksChange && handleRemarksChange(e.target.value)}
              placeholder="Findings correlate with patient clinical history..."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium bg-slate-50 disabled:bg-slate-100 text-slate-800"
            />
          </div>

          {/* 4. Department Sheet Navigator */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2 flex-1">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="font-bold text-xs uppercase tracking-wide text-slate-800">
                Departmental Report Sheets
              </span>
              <span className="text-[10px] text-slate-400">Click to preview right ➔</span>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setActiveDeptSheet("ALL")}
                className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                  activeDeptSheet === "ALL"
                    ? "border-blue-600 bg-blue-50/70 text-blue-950 font-bold shadow-xs"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span className="text-xs">All Department Sheets Combined</span>
                </div>
                <span className="text-[10px] font-mono font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {departmentGroupedReports.length} Pages
                </span>
              </button>

              {departmentGroupedReports.map((group) => {
                const isSelected = activeDeptSheet === group.dept.id;
                return (
                  <div
                    key={group.dept.id}
                    className={`rounded-lg border transition flex items-center justify-between p-2 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveDeptSheet(group.dept.id)}
                      className="flex-1 text-left flex items-center gap-2 min-w-0 pr-2"
                    >
                      <span className="text-base shrink-0">{group.dept.icon || "🔬"}</span>
                      <div className="truncate">
                        <span className={`text-xs block truncate ${isSelected ? "font-bold text-blue-950" : "font-semibold text-slate-800"}`}>
                          {group.dept.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {group.tests.map(t => t.code || t.name).join(", ")}
                        </span>
                      </div>
                    </button>

                    {canPrint && (
                      <button
                        type="button"
                        onClick={() => handlePrintDepartmentA4Report(group.dept.id, usePadMode)}
                        className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white border border-slate-200 rounded text-[11px] font-semibold transition shrink-0 flex items-center gap-1 shadow-xs"
                        title={`Print ${group.dept.name} sheet`}
                      >
                        <Printer className="w-3 h-3" /> Print
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: EXACTLY 60% OF PAGE WIDTH (FIXED PREVIEW) */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[60%] h-full flex flex-col bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
          
          {/* Top Bar for Fixed Preview */}
          <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-xs text-slate-800">
                Live A4 Preview:
              </span>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {activeDeptSheet === "ALL" ? "All Pages" : displayedGroups[0]?.dept?.name || "Single Sheet"}
              </span>
            </div>

            {/* Scale Controls */}
            {!isReceptionistBlocked && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewScale(0.55)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    previewScale === 0.55 ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Fit Page
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(0.70)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    previewScale === 0.70 ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  70%
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(0.85)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    previewScale === 0.85 ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  85% (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(1.0)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    previewScale === 1.0 ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  100%
                </button>
              </div>
            )}
          </div>

          {/* Fixed Document Canvas or Receptionist Security Lock Screen */}
          <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-start">
            {isReceptionistBlocked ? (
              // --- RECEPTIONIST SECURITY LOCK SCREEN ---
              <div className="my-auto max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-100">
                  <Lock className="w-6 h-6" />
                </div>
                
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Report Preview & Printing Locked
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Front-desk receptionists are restricted from viewing or printing results until quality control and billing criteria are met.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                  {/* Criterion 1: Pathologist Verification */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      {!isVerified ? <Clock className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      Pathologist Verification:
                    </span>
                    <span className={`font-bold ${isVerified ? "text-emerald-700" : "text-amber-600"}`}>
                      {isVerified ? "Verified ✓" : "Pending Verification"}
                    </span>
                  </div>

                  {/* Criterion 2: Due Clearance */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      {hasOutstandingDue ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      Due Balance Settlement:
                    </span>
                    <span className={`font-bold font-mono ${hasOutstandingDue ? "text-rose-600" : "text-emerald-700"}`}>
                      {hasOutstandingDue ? `৳${activeOrder.billing?.due} Due` : "Paid in Full ✓"}
                    </span>
                  </div>
                </div>

                {hasOutstandingDue && (
                  <button
                    type="button"
                    onClick={() => {
                      const due = activeOrder.billing?.due;
                      if (window.confirm(`Confirm collection of full due balance ৳${due} from ${activeOrder.patient?.name}?`)) {
                        handleSettleDue(activeOrder.orderId, due);
                      }
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition flex items-center justify-center gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Collect ৳{activeOrder.billing?.due} to Unlock
                  </button>
                )}
              </div>
            ) : (
              // --- FULL A4 DOCUMENT PREVIEW ---
              <div
                className="space-y-6 transition-transform duration-150 origin-top flex flex-col items-center"
                style={{
                  transform: `scale(${previewScale})`,
                  marginBottom: `${-(1 - previewScale) * 297 * 3.78}px`
                }}
              >
                {displayedGroups.map((group) => (
                  <div
                    key={group.dept.id}
                    className="bg-white text-slate-900 rounded-none shadow-xl border border-slate-300 w-full"
                    style={{
                      width: "210mm",
                      minHeight: "297mm",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderDepartmentReportHtml({
                        group,
                        activeOrder,
                        staffList,
                        labSettings,
                        usePadMode,
                        isPreview: true
                      })
                    }}
                  />
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
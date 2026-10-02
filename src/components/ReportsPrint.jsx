import React, { useState } from "react";
import {
  Printer, ShieldCheck, DollarSign, AlertCircle, CheckCircle2,
  MessageSquare, FileText, Layers, Lock
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

  const isVerified = activeOrder.qcStatus === "Verified" || activeOrder.isLocked === true;
  const userRole = (currentUser?.role || "").toLowerCase();
  const isReceptionist = userRole === "receptionist";
  const canPrint = !isReceptionist || isVerified;
  const doctorName =
    activeOrder.doctor ||
    activeOrder.patient?.doctor ||
    (activeOrder.patient?.address && activeOrder.patient.address.startsWith("Ref: ") ? activeOrder.patient.address.replace("Ref: ", "") : null) ||
    "Self";

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

      {/* 2. CONTROLS HEADER */}
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

        <div className="flex flex-wrap items-center gap-2.5">
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

      {/* 3. PATHOLOGIST REMARKS INPUT */}
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

      {/* 4. DEPARTMENT ACTION BAR */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Departmental Report Sheets ({usePadMode ? "Pad Mode: 38mm top / 21mm bottom margin guides active" : "Plain Paper Mode: Full letterhead & footer active"})
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

      {/* 5. LINKED WYSIWYG REPORT PREVIEWS */}
      <div className="space-y-8">
        {departmentGroupedReports.map((group) => (
          <div
            key={group.dept.id}
            className="bg-slate-200/80 p-4 sm:p-8 rounded-2xl border border-slate-300 shadow-inner flex justify-center overflow-x-auto"
          >
            {/* Exactly simulated 210mm A4 page rendered with the identical print generator */}
            <div
              className="bg-white shadow-2xl rounded-none text-slate-900 w-full"
              style={{ maxWidth: "210mm", minHeight: "297mm" }}
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
          </div>
        ))}
      </div>
    </div>
  );
}
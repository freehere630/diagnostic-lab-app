import React from "react";
import {
  CheckCircle2, Clock, Printer, Download, Building2, Lock, Phone, ArrowLeft
} from "lucide-react";
import {
  printDepartmentA4Report,
  buildUnifiedResultsTable,
  isImagingOrRadiologyInvestigation
} from "../utils/printHelpers";

export default function PatientLivePortal({ order, labSettings, staffList = [] }) {
  if (!order) return null;

  const isReady = order.qcStatus === "Verified" || order.isLocked === true;
  const dueAmount = parseFloat(order.billing?.due || 0);
  const hasDue = dueAmount > 0;
  const isFullyPaid = !hasDue;

  // The patient can ONLY view quantitative results if verified and fully paid
  const canViewResults = isReady && isFullyPaid;

  const labName = labSettings?.lab_name || "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER";
  const tagline = labSettings?.tagline || "With Al-Fattah on the Journey to Wellness";
  const address = labSettings?.address || "Solmaid Purbo Para, Panir pump, Vatara, Dhaka 1212";
  const phone = labSettings?.phone || "01723854472, 01624787444";

  const isImagingOnly = (order.tests || []).length > 0 && (order.tests || []).every((t) =>
    isImagingOrRadiologyInvestigation(t, t.dept_id || t.deptId)
  );

  const doctorName =
    order.doctor ||
    order.patient?.doctor ||
    (order.patient?.address && order.patient.address.startsWith("Ref: ") ? order.patient.address.replace("Ref: ", "") : null) ||
    "Self";

  const departmentGroupedReports = React.useMemo(() => {
    if (!order.tests) return [];
    const grouped = {};
    order.tests.forEach((test) => {
      const deptId = test.dept_id || "DEP-GEN";
      if (!grouped[deptId]) {
        grouped[deptId] = {
          dept: { id: deptId, name: "General Diagnostics" },
          tests: []
        };
      }
      grouped[deptId].tests.push(test);
    });
    return Object.values(grouped);
  }, [order]);

  const handlePrintOrDownload = () => {
    if (!canViewResults) {
      alert("Report download is locked pending settlement of the due balance.");
      return;
    }
    printDepartmentA4Report("ALL", order, departmentGroupedReports, staffList, labSettings);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden text-slate-900 my-4">
      
      {/* 1. BRANDING BANNER (COMPACT) */}
      <div className="bg-slate-900 text-white p-5 text-center">
        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2 border border-white/15">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <h1 className="text-sm sm:text-base font-bold uppercase tracking-tight">{labName}</h1>
        <p className="text-[11px] text-slate-300 mt-0.5">{tagline}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{address} • 📞 {phone}</p>
      </div>

      <div className="p-4 sm:p-5 space-y-4 text-xs">
        
        {/* 2. DYNAMIC STATUS CARD */}
        {canViewResults ? (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-xs text-emerald-950 uppercase tracking-tight">
                  Report Ready & Verified
                </p>
                <p className="text-[11px] text-emerald-700">
                  Full payment cleared. Digitally signed by Pathologist.
                </p>
              </div>
            </div>

            <button
              onClick={handlePrintOrDownload}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        ) : isReady && hasDue ? (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-rose-600 text-white rounded-lg shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs text-rose-950 uppercase tracking-tight">
                  Report Verified — Numerical Results Locked
                </p>
                <p className="text-[11px] text-rose-800 mt-0.5">
                  Your report has been signed by the consultant, but quantitative results are locked until full payment is settled.
                </p>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-rose-200 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600">Pending Balance:</span>
              <span className="text-sm font-mono text-rose-600">৳{dueAmount} Due</span>
            </div>

            <p className="text-[10px] text-slate-500 bg-white/70 p-2 rounded-lg border border-rose-100 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Contact reception at <b>{phone}</b> to settle the balance and release your official certificate.</span>
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2.5 text-amber-900">
            <Clock className="w-6 h-6 text-amber-600 shrink-0 animate-spin" style={{ animationDuration: "6s" }} />
            <div>
              <p className="font-bold text-xs uppercase tracking-tight text-amber-950">
                Laboratory Examination In Progress
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Specimen is being processed. Please refresh this page shortly for findings.
              </p>
            </div>
          </div>
        )}

        {/* 3. PATIENT DEMOGRAPHICS TABLE */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <tbody className="divide-y divide-slate-200/60">
              <tr>
                <td className="py-1 text-slate-500 font-semibold">Patient Name:</td>
                <td className="py-1 font-bold text-slate-900 text-right">{order.patient?.name}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-semibold">Patient UHID:</td>
                <td className="py-1 font-mono font-bold text-blue-600 text-right">{order.patient?.id}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-semibold">Age / Sex:</td>
                <td className="py-1 font-medium text-slate-800 text-right">{order.patient?.age || "—"} Y / {order.patient?.gender || "—"}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-semibold">Ref. Doctor:</td>
                <td className="py-1 font-medium text-slate-800 text-right">{doctorName}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-semibold">{isImagingOnly ? "Investigation:" : "Barcode:"}</td>
                <td className="py-1 font-mono font-semibold text-slate-800 text-right">
                  {isImagingOnly ? (order.tests || []).map((t) => t.name).join(", ") : order.barcode}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. TESTS & FINDINGS */}
        {canViewResults ? (
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div
              className="bg-white"
              dangerouslySetInnerHTML={{
                __html: buildUnifiedResultsTable(order.tests || [], order.results || {})
              }}
            />
            <div className="pt-2 text-[11px] text-slate-700">
              <span className="font-bold uppercase text-slate-900">Pathologist Remarks:</span>
              <span className="italic ml-1">{order.verifierRemarks || "Clinically correlated and verified with quality control standards."}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wide block">
              Ordered Investigations:
            </span>
            <div className="flex flex-wrap gap-1">
              {(order.tests || []).map((t) => (
                <span key={t.id} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-semibold text-[11px] flex items-center gap-1 shadow-xs">
                  {canViewResults ? "✓" : "🔒"} {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* 5. FOOTER ACTION */}
      <div className="p-3 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between">
        

        {canViewResults ? (
          <button
            onClick={handlePrintOrDownload}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" /> Print Report (PDF)
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition"
          >
            Refresh Status
          </button>
        )}
      </div>

    </div>
  );
}
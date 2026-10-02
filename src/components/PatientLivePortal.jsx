import React from "react";
import {
  CheckCircle2, Clock, Printer, Download, Building2, Lock, AlertCircle, Phone
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

  // The patient can ONLY view results if the report is verified AND fully paid
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
      alert("Report cannot be downloaded. Full payment is required.");
      return;
    }
    printDepartmentA4Report("ALL", order, departmentGroupedReports, staffList, labSettings);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden font-sans text-slate-800 my-4 animate-fade-in">
      {/* 1. BRANDING HEADER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 p-6 text-white text-center">
        <div className="p-3 bg-white/10 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto mb-2 border border-white/20 shadow-inner">
          <Building2 className="w-7 h-7 text-blue-300" />
        </div>
        <h1 className="text-base sm:text-lg font-black uppercase tracking-wider">{labName}</h1>
        <p className="text-[11px] text-blue-200">{tagline}</p>
        <p className="text-[10px] text-slate-400 mt-1">{address} • {phone}</p>
      </div>

      <div className="p-6 space-y-5 text-xs">
        {/* 2. DYNAMIC STATUS CARD */}
        {canViewResults ? (
          // STATE A: VERIFIED & FULLY PAID -> UNLOCKED
          <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-black text-sm text-emerald-950 uppercase tracking-wide">
                  Report Ready & Verified
                </p>
                <p className="text-[11px] text-emerald-700">
                  Full payment cleared. Signed & verified by Consultant Pathologist.
                </p>
              </div>
            </div>
            <button
              onClick={handlePrintOrDownload}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Download Report
            </button>
          </div>
        ) : isReady && hasDue ? (
          // STATE B: VERIFIED BUT HAS DUE -> LOCKED
          <div className="bg-rose-50 border-2 border-rose-400 p-5 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl flex-shrink-0 shadow">
                <Lock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-black text-sm text-rose-950 uppercase tracking-wide">
                  Report Verified — Results Locked
                </p>
                <p className="text-[11px] text-rose-800 mt-0.5">
                  Your diagnostic report is complete and verified by the Consultant, but test results are locked until full payment is received.
                </p>
              </div>
            </div>

            {/* DUE SUMMARY PILL */}
            <div className="bg-white p-3.5 rounded-xl border border-rose-200 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600">Outstanding Balance:</span>
              <span className="text-base font-black font-mono text-rose-600">
                ৳ {dueAmount} Due
              </span>
            </div>

            <p className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl border border-rose-100 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Please visit our reception counter or call <b>{phone}</b> to clear the due balance and unlock your official report.</span>
            </p>
          </div>
        ) : (
          // STATE C: STILL IN PROGRESS
          <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-center gap-3 text-amber-900">
            <Clock className="w-8 h-8 text-amber-600 flex-shrink-0 animate-spin" style={{ animationDuration: "6s" }} />
            <div>
              <p className="font-black text-sm uppercase tracking-wide text-amber-950">
                Investigation In Progress
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Examination findings are being analyzed by the laboratory. Please check back shortly.
              </p>
            </div>
          </div>
        )}

        {/* 3. PATIENT DEMOGRAPHICS (ALWAYS VISIBLE) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-1.5"><span className="font-semibold text-slate-500">Patient Name:</span> <b className="font-extrabold text-slate-900">{order.patient?.name}</b></td>
                <td className="py-1.5"><span className="font-semibold text-slate-500">Patient ID:</span> <b className="font-mono text-blue-700">{order.patient?.id}</b></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5"><span className="font-semibold text-slate-500">Age / Gender:</span> <b>{order.patient?.age || "—"} Y / {order.patient?.gender || "—"}</b></td>
                <td className="py-1.5"><span className="font-semibold text-slate-500">Ref. Doctor:</span> <b>{doctorName}</b></td>
              </tr>
              <tr>
                <td className="py-1.5">
                  <span className="font-semibold text-slate-500">{isImagingOnly ? "Investigation:" : "Barcode:"}</span>{" "}
                  <b className="font-mono">{isImagingOnly ? (order.tests || []).map((t) => t.name).join(", ") : order.barcode}</b>
                </td>
                <td className="py-1.5">
                  <span className="font-semibold text-slate-500">Payment:</span>{" "}
                  {hasDue ? (
                    <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      Due ৳{dueAmount}
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      PAID IN FULL
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. TESTS LIST (NAMES ONLY IF LOCKED; FULL RESULTS IF UNLOCKED) */}
        {canViewResults ? (
          <div className="space-y-3 pt-2 border-t">
            <div
              className="bg-white"
              dangerouslySetInnerHTML={{
                __html: buildUnifiedResultsTable(order.tests || [], order.results || {})
              }}
            />
            <div className="pt-2 text-[11px] text-slate-800">
              <b className="uppercase">Pathologist Remarks:</b>
              <span className="italic ml-1">{order.verifierRemarks || "Clinically correlated and verified with quality control standards."}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
              Prescribed Diagnostic Investigations:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(order.tests || []).map((t) => (
                <span key={t.id} className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold text-[11px] flex items-center gap-1 shadow-sm">
                  {canViewResults ? "✓" : "🔒"} {t.name}
                </span>
              ))}
            </div>
            {hasDue && (
              <p className="text-[10px] text-slate-500 italic pt-1">
                * Quantitative numerical and microscopic values are hidden until full settlement.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 5. FOOTER BUTTON */}
      <div className="p-4 bg-slate-50 border-t flex items-center justify-center">
        {canViewResults ? (
          <button
            onClick={handlePrintOrDownload}
            className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF Report
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-8 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
          >
            Refresh Status
          </button>
        )}
      </div>
    </div>
  );
}
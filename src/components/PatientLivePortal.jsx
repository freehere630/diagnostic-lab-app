import React from "react";
import {
  CheckCircle2, Clock, Download, Building2, Lock, Phone
} from "lucide-react";
import {
  downloadDepartmentReportPdf,
  isImagingOrRadiologyInvestigation
} from "../utils/printHelpers";

// Canonical department names — used in the parameter list header
// when the DB row has been silently shortened (e.g. "IMM" instead
// of "Immunology & Endocrinology").
const DEPT_NAME_MAP = {
  "DEP-HEM":   "Hematology & Coagulation",
  "DEP-BIO":   "Clinical Biochemistry",
  "DEP-IMM":   "Immunology & Endocrinology",
  "DEP-RAD":   "Radiology & X-Ray",
  "DEP-USG":   "Ultrasonography (USG)",
  "DEP-CTMRI": "CT Scan & MRI Imaging",
  "DEP-CARD":  "Cardiology (ECG & Echo)",
  "DEP-MIC":   "Microbiology & Serology",
  "DEP-PAT":   "Clinical Pathology & Urine",
  "DEP-HISTO": "Histopathology & Cytology",
};

const DEPT_ICON_MAP = {
  "DEP-HEM":   "🩸",
  "DEP-BIO":   "🧪",
  "DEP-IMM":   "🧬",
  "DEP-RAD":   "🩻",
  "DEP-USG":   "📡",
  "DEP-CTMRI": "🧠",
  "DEP-CARD":  "💓",
  "DEP-MIC":   "🔬",
  "DEP-PAT":   "🧫",
  "DEP-HISTO": "🔬",
};

export default function PatientLivePortal({ order, labSettings, staffList = [] }) {
  const [downloadState, setDownloadState] = React.useState("idle");

  if (!order) return null;

  const isReady = order.qcStatus === "Verified" || order.isLocked === true;
  const dueAmount = parseFloat(order.billing?.due || 0);
  const hasDue = dueAmount > 0;
  const isFullyPaid = !hasDue;
  const canDownload = isReady && isFullyPaid;

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

  // Group tests by department, keeping a reference to the owning order
  // so the PDF renderer can pull the right results from the right row.
  const departmentGroupedReports = React.useMemo(() => {
    const tests = order.tests || [];
    if (tests.length === 0) return [];
    const grouped = {};
    tests.forEach((test) => {
      const deptId = test.dept_id || test.deptId || "DEP-GEN";
      if (!grouped[deptId]) {
        grouped[deptId] = {
          dept: {
            id: deptId,
            name: DEPT_NAME_MAP[deptId] || "General Diagnostics",
            icon: DEPT_ICON_MAP[deptId] || "🔬",
          },
          tests: [],
          ownerOrder: order,
          ownerLocked: isReady,
        };
      }
      grouped[deptId].tests.push(test);
    });
    return Object.values(grouped);
  }, [order, isReady]);

  const handleDownloadPdf = async () => {
    if (!canDownload) {
      alert("Report download is locked pending settlement of the due balance.");
      return;
    }
    if (downloadState !== "idle") return;

    try {
      setDownloadState("preparing");
      await downloadDepartmentReportPdf({
        targetDeptId: "ALL",
        activeOrder: order,
        departmentGroupedReports,
        staffList,
        labSettings,
        onProgress: (status) => {
          if (status === null) setDownloadState("idle");
          else if (status.includes("Preparing")) setDownloadState("preparing");
          else if (status.includes("Rendering")) setDownloadState("rendering");
        },
      });
      setDownloadState("done");
      setTimeout(() => setDownloadState("idle"), 1500);
    } catch (err) {
      console.error(err);
      alert("Could not generate the PDF. Please try again, or contact reception.");
      setDownloadState("idle");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden text-slate-900 my-4">

      {/* 1. BRANDING BANNER */}
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
        {canDownload ? (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-xs text-emerald-950 uppercase tracking-tight">
                  Report Ready & Verified
                </p>
                <p className="text-[11px] text-emerald-700">
                  Digitally signed. Click Download PDF dialog to keep a copy.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={downloadState !== "idle"}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-wait text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition shrink-0"
            >
              {downloadState === "preparing" ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Preparing…
                </>
              ) : downloadState === "rendering" ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Rendering…
                </>
              ) : downloadState === "done" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Downloaded
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </>
              )}
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
                  Report Verified — Download Locked
                </p>
                <p className="text-[11px] text-rose-800 mt-0.5">
                  Your report has been signed by the consultant. Please settle the pending balance at reception to unlock the PDF download.
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

        {/* 4. PARAMETER LIST — names only, values are only in the PDF. */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
              Ordered Investigations & Parameters
            </span>
            {canDownload ? (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ✓ Results in PDF
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                Result values hidden
              </span>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
            {departmentGroupedReports.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No investigations on this order.</p>
            ) : (
              departmentGroupedReports.map((group) => (
                <div key={group.dept.id} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200/70">
                    <span className="text-sm">{group.dept.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      {group.dept.name}
                    </span>
                  </div>
                  <ul className="space-y-1 ml-1">
                    {group.tests.map((t, tIdx) => {
                      const params = t.test_parameters || t.parameters || [];
                      const showParams = params.length > 1;
                      return (
                        <li key={t.id || tIdx} className="text-xs">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-slate-800">{t.name}</span>
                            {t.code && (
                              <span className="text-[10px] font-mono text-slate-400">
                                ({t.code})
                              </span>
                            )}
                          </div>
                          {showParams && (
                            <ul className="ml-4 mt-0.5 space-y-0.5">
                              {params.map((p, pIdx) => (
                                <li key={p.id || pIdx} className="text-[11px] text-slate-600 leading-snug">
                                  – {p.name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

          <p className="text-[10px] text-slate-500 bg-blue-50/60 border border-blue-100 rounded-lg p-2 flex items-start gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Result values are not shown on this page. Download the official PDF report
              {canDownload ? " using the button above" : " once the report is verified and the balance is settled"}.
            </span>
          </p>
        </div>
      </div>

      {/* 5. FOOTER ACTION */}
      <div className="p-3 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs transition"
        >
          Refresh Status
        </button>

        {canDownload ? (
          <button
            onClick={handleDownloadPdf}
            disabled={downloadState !== "idle"}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition"
          >
            {downloadState === "preparing" ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Preparing…
              </>
            ) : downloadState === "rendering" ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Rendering…
              </>
            ) : downloadState === "done" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Downloaded
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Download PDF
              </>
            )}
          </button>
        ) : (
          <button
            disabled
            className="px-4 py-1.5 bg-slate-200 text-slate-400 font-semibold rounded-lg text-xs cursor-not-allowed flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" /> PDF Locked
          </button>
        )}
      </div>
    </div>
  );
}
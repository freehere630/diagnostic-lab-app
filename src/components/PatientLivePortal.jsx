import React from "react";
import { 
  CheckCircle2, Clock, Printer, Download, Building2 
} from "lucide-react";
import { 
  printDepartmentA4Report, 
  buildUnifiedResultsTable, 
  isImagingOrRadiologyInvestigation 
} from "../utils/printHelpers";

export default function PatientLivePortal({ order, labSettings, staffList = [] }) {
  if (!order) return null;

  const isReady = order.qcStatus === "Verified" || order.isLocked === true;
  const labName = labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES";
  const tagline = labSettings?.tagline || "ISO 15189:2022 Certified Clinical Reference Laboratory";
  const address = labSettings?.address || "House 42, Road 11, Dhanmondi, Dhaka";
  const phone = labSettings?.phone || "+880 9612-345678";

  const isImagingOnly = (order.tests || []).length > 0 && (order.tests || []).every(t => 
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
    printDepartmentA4Report("ALL", order, departmentGroupedReports, staffList, labSettings);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden font-sans text-slate-800 my-4 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 p-6 text-white text-center">
        <div className="p-3 bg-white/10 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto mb-2 border border-white/20 shadow-inner">
          <Building2 className="w-7 h-7 text-blue-300" />
        </div>
        <h1 className="text-base sm:text-lg font-black uppercase tracking-wider">{labName}</h1>
        <p className="text-[11px] text-blue-200">{tagline}</p>
        <p className="text-[10px] text-slate-400 mt-1">{address} • {phone}</p>
      </div>

      <div className="p-6 space-y-5 text-xs">
        
        {/* Live Status Card */}
        {isReady ? (
          <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-black text-sm text-emerald-950 uppercase tracking-wide">
                  Report Ready & Verified
                </p>
                <p className="text-[11px] text-emerald-700">
                  Signed and verified by Consultant Physician / Radiologist.
                </p>
              </div>
            </div>

            <button
              onClick={handlePrintOrDownload}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Download / Print
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-center gap-3 text-amber-900">
            <Clock className="w-8 h-8 text-amber-600 flex-shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <p className="font-black text-sm uppercase tracking-wide text-amber-950">
                Investigation In Progress
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Examination findings are being finalized. Please refresh once complete.
              </p>
            </div>
          </div>
        )}

        {/* Inline Demographics Box (Pure Black, Key-Value pairs) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-black">
          <table className="w-full text-left border-collapse text-xs text-black">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-1.5"><span className="font-semibold text-black">Patient Name:</span> <b className="text-black font-extrabold">{order.patient?.name}</b></td>
                <td className="py-1.5"><span className="font-semibold text-black">Patient ID:</span> <b className="font-mono text-black">{order.patient?.id}</b></td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5"><span className="font-semibold text-black">Age / Gender:</span> <b className="text-black">{order.patient?.age || "—"} Y / {order.patient?.gender || "—"}</b></td>
                <td className="py-1.5"><span className="font-semibold text-black">Ref. Doctor:</span> <b className="text-black">{doctorName}</b></td>
              </tr>
              <tr>
                <td className="py-1.5">
                  <span className="font-semibold text-black">{isImagingOnly ? "Investigation:" : "Barcode:"}</span>{" "}
                  <b className="font-mono text-black">{isImagingOnly ? (order.tests || []).map(t => t.name).join(", ") : order.barcode}</b>
                </td>
                <td className="py-1.5">
                  <span className="font-semibold text-black">Status:</span>{" "}
                  <b className="font-mono text-black">{(order.billing?.due || 0) > 0 ? `Due: ৳${order.billing?.due}` : "PAID"}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Clinical Findings */}
        {isReady && (
          <div className="space-y-3 pt-2 border-t">
            <div 
              className="bg-white"
              dangerouslySetInnerHTML={{ 
                __html: buildUnifiedResultsTable(order.tests || [], order.results || {}) 
              }} 
            />

            {/* Pathologist Remarks */}
            <div className="pt-2 text-[11px] text-black">
              <b className="text-black uppercase">Pathologist Remarks:</b> 
              <span className="italic ml-1 text-black">{order.verifierRemarks || "Clinically correlated and verified with quality control standards."}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t flex items-center justify-center">
        {isReady ? (
          <button
            onClick={handlePrintOrDownload}
            className="w-full sm:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
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
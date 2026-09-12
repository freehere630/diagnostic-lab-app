import React from "react";
import { 
  CheckCircle2, Clock, Printer, Download, 
  FileText, Building2 
} from "lucide-react";
import { 
  printDepartmentA4Report, 
  buildUnifiedResultsTable, 
  isImagingOrRadiologyInvestigation 
} from "../utils/printHelpers";

export default function PatientLivePortal({ order, labSettings, staffList = [] }) {
  if (!order) return null;

  const isReady = order.qcStatus === "Verified" || order.isLocked === true;
  const labName = labSettings?.lab_name || "AL-FATTAH DIAGNOSTIC";
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

        {/* Demographics Box (No Barcode for Imaging) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Patient Name:</span>
            <span className="font-bold text-slate-900">{order.patient?.name}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Patient ID (UHID):</span>
            <span className="font-mono font-bold text-blue-700">{order.patient?.id}</span>
          </div>
          
          {!isImagingOnly && (
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-slate-500">Sample Barcode:</span>
              <span className="font-mono font-bold text-slate-800">{order.barcode}</span>
            </div>
          )}

          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Ref. Doctor:</span>
            <span className="font-bold text-slate-800">{doctorName}</span>
          </div>

          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Date:</span>
            <span className="font-bold text-slate-800 font-mono">{order.date}</span>
          </div>
          <div className="flex justify-between pt-0.5">
            <span className="text-slate-500">Billing Status:</span>
            <span className="font-bold font-mono">
              {(order.billing?.due || 0) > 0 ? (
                <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-black">
                  Due Balance: ৳{order.billing?.due}
                </span>
              ) : (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  Fully Paid
                </span>
              )}
            </span>
          </div>
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

            {/* Pathologist Remarks (Clean, no background, no box) */}
            <div className="pt-2 text-[11px] text-slate-700">
              <b className="text-slate-900 uppercase">Pathologist Remarks:</b> 
              <span className="italic ml-1">{order.verifierRemarks || "Clinically correlated and verified with quality control standards."}</span>
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
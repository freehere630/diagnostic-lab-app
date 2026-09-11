import React from "react";
import { 
  CheckCircle2, Clock, AlertTriangle, Printer, Download, 
  ShieldCheck, FileText, ArrowLeft, Building2 
} from "lucide-react";
import { printDepartmentA4Report, buildUnifiedResultsTable } from "../utils/printHelpers";

export default function PatientLivePortal({ order, labSettings, onClose }) {
  if (!order) return null;

  const isReady = order.qcStatus === "Verified" || order.isLocked === true;
  const labName = labSettings?.lab_name || "AL-FATTAH DIAGNOSTIC";
  const tagline = labSettings?.tagline || "ISO 15189:2022 Certified Clinical Reference Laboratory";
  const address = labSettings?.address || "House 42, Road 11, Dhanmondi, Dhaka";
  const phone = labSettings?.phone || "+880 9612-345678";

  // Reconstruct departmental report grouping for printing
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
    printDepartmentA4Report("ALL", order, departmentGroupedReports, [], labSettings);
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
        
        {/* LIVE STATUS CARD */}
        {isReady ? (
          <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-black text-sm text-emerald-950 uppercase tracking-wide">
                  Report is Ready & Verified!
                </p>
                <p className="text-[11px] text-emerald-700">
                  Quality check passed. Clinically signed by Consultant Pathologist.
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
                Report In Progress
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Your specimen is currently undergoing biochemical analysis & pathologist review. Please refresh this page or re-scan in 30–45 minutes.
              </p>
            </div>
          </div>
        )}

        {/* PATIENT & SPECIMEN DETAILS */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Patient Name:</span>
            <span className="font-bold text-slate-900">{order.patient?.name}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Patient ID (UHID):</span>
            <span className="font-mono font-bold text-blue-700">{order.patient?.id}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Sample Barcode:</span>
            <span className="font-mono font-bold text-slate-800">{order.barcode}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Receipt No:</span>
            <span className="font-mono font-bold text-slate-700">{order.receiptNo}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Date of Test:</span>
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

        {/* ORDERED TESTS LIST */}
        <div>
          <span className="font-bold text-slate-700 uppercase text-[10px] block mb-2">
            Prescribed Diagnostic Tests:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(order.tests || []).map((t, idx) => (
              <span 
                key={idx} 
                className="px-2.5 py-1 bg-blue-50 text-blue-800 font-bold rounded-lg border border-blue-200 text-[11px]"
              >
                {t.name} {t.code ? `(${t.code})` : ""}
              </span>
            ))}
          </div>
        </div>

        {/* CLINICAL RESULTS (ONLY SHOWN IF VERIFIED & READY) */}
        {isReady && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Observed Clinical Findings:
              </span>
            </div>

            <div 
              className="bg-white border rounded-xl p-2 overflow-x-auto"
              dangerouslySetInnerHTML={{ 
                __html: buildUnifiedResultsTable(order.tests || [], order.results || {}) 
              }} 
            />

            {order.verifierRemarks && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] mt-2">
                <b>Pathologist Remarks:</b> <i>{order.verifierRemarks}</i>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
        >
          ← Staff Login
        </button>

        {isReady ? (
          <button
            onClick={handlePrintOrDownload}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
          >
            Refresh Status
          </button>
        )}
      </div>

    </div>
  );
}
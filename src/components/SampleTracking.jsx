import React from "react";
import { Printer, Check, Circle, Barcode, FlaskConical } from "lucide-react";
import { BarcodeSVG } from "../utils/barcode";

export default function SampleTracking({
  activeOrder,
  departmentalVials = [],
  handlePrintSpecificVialBarcode,
  trackingStatus = {}
}) {
  if (!activeOrder) {
    return (
      <div className="py-20 text-center text-slate-400 max-w-xl mx-auto bg-white rounded-2xl border border-dashed border-slate-200">
        <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-xs text-slate-600">No active order selected for specimen tracking</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Please select an order from the Dashboard or Reception.</p>
      </div>
    );
  }

  const isBarcodePrinted = Boolean(trackingStatus[activeOrder.orderId]?.barcodePrinted);
  const isQcVerified = activeOrder.qcStatus === "Verified";
  const isReportPrinted = Boolean(trackingStatus[activeOrder.orderId]?.reportPrinted);

  const steps = [
    { label: "Registered", done: true },
    { label: "Barcode Labeled", done: isBarcodePrinted },
    { label: "QC Verified", done: isQcVerified },
    { label: "Report Dispatched", done: isReportPrinted },
  ];

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* 1. SLIM PROGRESSION STEPPER STRIP */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        
        {/* Patient Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Barcode className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900">{activeOrder.patient?.name}</span>
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                {activeOrder.patient?.id}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Order: <span className="font-mono text-slate-600">{activeOrder.orderId}</span> • Master Barcode: <span className="font-mono text-slate-600">{activeOrder.barcode}</span>
            </p>
          </div>
        </div>

        {/* Milestone Steps */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto py-1">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-1.5 shrink-0">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                step.done 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-slate-50 text-slate-400 border-slate-200"
              }`}>
                {step.done ? <Check className="w-3 h-3 text-emerald-600" /> : <Circle className="w-2.5 h-2.5 text-slate-300" />}
                <span>{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="w-3 h-px bg-slate-200 shrink-0"></div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* 2. SPECIMEN VIAL STICKER DIRECTORY */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
              Departmental Specimen Vials ({departmentalVials.length} Required)
            </h3>
            <p className="text-[10px] text-slate-400">
              Each physical tube is assigned a unique sequential barcode label (38mm × 25mm thermal print)
            </p>
          </div>
        </div>

        {departmentalVials.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            No specimen vials generated for this order.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {departmentalVials.map((vial, idx) => (
              <div 
                key={idx} 
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-2.5 hover:border-slate-300 transition"
              >
                {/* Simulated 38mm x 25mm Thermal Label Preview */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-300 shadow-xs space-y-1">
                  
                  {/* Label Header */}
                  <div className="flex justify-between items-baseline text-[10px] border-b border-slate-200 pb-1">
                    <span className="font-bold text-slate-900 truncate max-w-[120px]">{vial.patientName}</span>
                    <span className="font-mono text-blue-700 font-bold">{vial.patientId}</span>
                  </div>

                  {/* Clean Non-Dense Barcode */}
                  <div className="py-1 text-center">
                    <BarcodeSVG value={vial.testBarcode} height={26} />
                    <span className="font-mono text-[10px] font-black text-slate-900 tracking-wider block mt-0.5">
                      {vial.testBarcode}
                    </span>
                  </div>

                  {/* Label Footer */}
                  <div className="flex justify-between items-center text-[9px] border-t border-slate-200 pt-1 text-slate-600 font-semibold">
                    <span className="text-purple-700 font-bold uppercase truncate max-w-[90px]">
                      {vial.tubeColor?.split(" ")[0]}
                    </span>
                    <span className="font-mono truncate max-w-[110px] text-right">
                      {vial.testNames?.join(", ")}
                    </span>
                  </div>

                </div>

                {/* Print Trigger */}
                <button
                  type="button"
                  onClick={() => handlePrintSpecificVialBarcode(vial)}
                  className="w-full py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" /> Print {vial.deptCode} Label
                </button>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
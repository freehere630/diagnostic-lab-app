import React from "react";
import { Printer, CheckSquare, Square } from "lucide-react";
import { BarcodeSVG } from "../utils/barcode";

export default function SampleTracking({
  activeOrder,
  departmentalVials,
  handlePrintSpecificVialBarcode,
  trackingStatus
}) {
  if (!activeOrder) {
    return <div className="p-8 text-center text-slate-400">No active order selected for barcode tracking.</div>;
  }

  const isBarcodePrinted = trackingStatus[activeOrder.orderId]?.barcodePrinted;
  const isReportPrinted = trackingStatus[activeOrder.orderId]?.reportPrinted;

  return (
    <div className="space-y-6 w-full font-sans">
      {/* Progression Checkmarks Banner */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Sample Milestone Tracking</h3>
          <p className="text-xs text-slate-500">
            Patient: <b>{activeOrder.patient?.name}</b> (Patient ID: {activeOrder.patient?.id})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckSquare className="w-4 h-4" /> Order Created
          </div>
          <div className={`flex items-center gap-1.5 ${isBarcodePrinted ? "text-emerald-600" : "text-slate-400"}`}>
            {isBarcodePrinted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            Barcode Printed
          </div>
          <div className={`flex items-center gap-1.5 ${activeOrder.qcStatus === "Verified" ? "text-emerald-600" : "text-slate-400"}`}>
            {activeOrder.qcStatus === "Verified" ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            QC Verified
          </div>
          <div className={`flex items-center gap-1.5 ${isReportPrinted ? "text-emerald-600" : "text-slate-400"}`}>
            {isReportPrinted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            Report Printed
          </div>
        </div>
      </div>

      {/* Department-Specific Sample Barcodes */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Departmental Specimen Vials & Barcodes</h3>
            <p className="text-xs text-slate-400">Each vial is encoded with its specific Department Test ID and Patient ID.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departmentalVials.map((vial, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border-2 border-slate-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="bg-white p-3 border rounded-xl text-slate-900 font-mono shadow-sm">
                <div className="flex justify-between items-baseline border-b border-slate-300 pb-1 text-[11px]">
                  <span className="font-bold truncate max-w-[140px]">{vial.patientName}</span>
                  <span className="text-blue-700 font-bold">{vial.patientId}</span>
                </div>

                <div className="my-1 text-center">
                  <BarcodeSVG value={vial.testBarcode} height={28} />
                  <p className="font-mono text-[10px] font-black tracking-wider text-slate-800">{vial.testBarcode}</p>
                </div>

                <div className="flex justify-between items-center text-[9px] border-t border-slate-300 pt-1 font-bold">
                  <span className="text-purple-800">{vial.tubeColor.split(" ")[0]}</span>
                  <span className="truncate max-w-[120px] uppercase text-slate-600">{vial.testNames.join(", ")}</span>
                </div>
              </div>

              <button
                onClick={() => handlePrintSpecificVialBarcode(vial)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print {vial.deptCode} Barcode Label
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
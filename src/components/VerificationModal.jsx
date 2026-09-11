import React from "react";
import { CheckCircle2, ShieldCheck, AlertTriangle, Calendar, User, FileText, Building2, Lock } from "lucide-react";

export default function VerificationModal({ order, labSettings, errorMessage, onClose }) {
  const labName = labSettings?.lab_name || "AL-FATTAH DIAGNOSTIC";
  const tagline = labSettings?.tagline || "ISO 15189:2022 Certified Clinical Reference Laboratory";
  const address = labSettings?.address || "House 42, Road 11, Dhanmondi, Dhaka";
  const phone = labSettings?.phone || "+880 9612-345678";

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden font-sans text-slate-800 my-4 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 p-6 text-white text-center relative">
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white/20 shadow-inner">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-base sm:text-lg font-black uppercase tracking-wider">{labName}</h1>
        <p className="text-[11px] text-blue-200">{tagline}</p>
        <p className="text-[10px] text-slate-400 mt-1">{address} • {phone}</p>
      </div>

      {/* Body Content */}
      <div className="p-6 space-y-4 text-xs">
        {errorMessage ? (
          <div className="bg-rose-50 border border-rose-300 p-4 rounded-2xl flex items-start gap-3 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Verification Failed</p>
              <p className="text-xs mt-0.5">{errorMessage}</p>
            </div>
          </div>
        ) : !order ? (
          <div className="text-center py-8 text-slate-400 italic">
            No report selected for verification.
          </div>
        ) : (
          <>
            {/* Status Badge */}
            <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-black text-emerald-900 text-xs sm:text-sm uppercase tracking-wide">
                  Official Verified Clinical Report
                </p>
                <p className="text-[11px] text-emerald-700">
                  Digitally authenticated & tamper-proof record in central LIMS.
                </p>
              </div>
            </div>

            {/* Patient & Specimen Demographics */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Patient Name:
                </span>
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
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date of Test:
                </span>
                <span className="font-bold text-slate-800 font-mono">{order.date}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-500">Quality Control (QC):</span>
                <span className="font-bold text-emerald-700 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" /> Verified by Pathologist
                </span>
              </div>
            </div>

            {/* Verified Test List */}
            <div>
              <span className="font-bold text-slate-600 uppercase text-[10px] block mb-1.5">
                Authenticated Tests on This Report:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(order.tests || []).map((t) => (
                  <span 
                    key={t.id} 
                    className="px-2.5 py-1 bg-blue-50 text-blue-800 font-bold rounded-lg border border-blue-200 text-[11px]"
                  >
                    ✓ {t.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Pathologist Verification Remarks */}
            {order.verifierRemarks && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <b>Pathologist Remarks:</b> <i>{order.verifierRemarks}</i>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
        >
          ← Staff Login
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
        >
          Close Certificate
        </button>
      </div>

    </div>
  );
}
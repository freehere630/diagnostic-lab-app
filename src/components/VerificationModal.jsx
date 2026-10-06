import React from "react";
import { CheckCircle2, ShieldCheck, AlertTriangle, Calendar, User, Building2, Lock, ArrowLeft } from "lucide-react";

export default function VerificationModal({ order, labSettings, errorMessage, onClose }) {
  const labName = labSettings?.lab_name || "AL-FATTAH DIAGNOSTIC";
  const tagline = labSettings?.tagline || "ISO 15189:2022 Certified Clinical Reference Laboratory";
  const address = labSettings?.address || "House 42, Road 11, Dhanmondi, Dhaka";
  const phone = labSettings?.phone || "+880 9612-345678";

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden text-slate-900 my-4 animate-in fade-in duration-150">
      
      {/* 1. COMPACT CERTIFICATE HEADER */}
      <div className="bg-slate-900 text-white p-5 text-center">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2 border border-white/15">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-sm sm:text-base font-bold uppercase tracking-tight">{labName}</h1>
        <p className="text-[11px] text-slate-300 mt-0.5">{tagline}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{address} • {phone}</p>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="p-4 sm:p-5 space-y-3.5 text-xs">
        {errorMessage ? (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2.5 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Verification Check Failed</p>
              <p className="text-[11px] mt-0.5">{errorMessage}</p>
            </div>
          </div>
        ) : !order ? (
          <div className="text-center py-8 text-slate-400 italic">
            No diagnostic order selected for authentication check.
          </div>
        ) : (
          <>
            {/* Authenticated Status Badge */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-950 text-xs uppercase tracking-tight">
                  Authentic Verified Clinical Record
                </p>
                <p className="text-[11px] text-emerald-700">
                  Digitally correlated and verified with quality control standards.
                </p>
              </div>
            </div>

            {/* Specimen Demographics Strip */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" /> Patient:
                </span>
                <span className="font-bold text-slate-900">{order.patient?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold">Patient UHID:</span>
                <span className="font-mono font-bold text-blue-600">{order.patient?.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold">Specimen Barcode:</span>
                <span className="font-mono font-bold text-slate-800">{order.barcode}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Date:
                </span>
                <span className="font-bold text-slate-800 font-mono">{order.date}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-500 font-semibold">Quality Control:</span>
                <span className="font-bold text-emerald-700 uppercase flex items-center gap-1 text-[11px]">
                  <Lock className="w-3 h-3 text-emerald-600" /> Pathologist Verified
                </span>
              </div>
            </div>

            {/* Authenticated Investigations List */}
            <div>
              <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider block mb-1">
                Verified Investigations:
              </span>
              <div className="flex flex-wrap gap-1">
                {(order.tests || []).map((t) => (
                  <span 
                    key={t.id} 
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md border border-blue-200 text-[10px]"
                  >
                    ✓ {t.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Remarks */}
            {order.verifierRemarks && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[11px]">
                <b className="text-slate-900">Remarks:</b> <i>{order.verifierRemarks}</i>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. FOOTER NAVIGATION */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition"
        >
          Close Certificate
        </button>
      </div>

    </div>
  );
}
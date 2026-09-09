import React from "react";
import { CheckCircle2, ShieldCheck, QrCode, X, Calendar, User, FileText } from "lucide-react";

export default function VerificationModal({ order, labSettings, onClose }) {
  if (!order) return null;

  const labName = labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES";
  const tagline = labSettings?.tagline || "ISO 15189:2022 Certified Reference Lab";

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans text-slate-800 animate-fade-in">
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative">
        
        {/* Certificate Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 bg-white/20 hover:bg-white/30 rounded-full text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white/20">
            <ShieldCheck className="w-8 h-8 text-emerald-300" />
          </div>
          <h2 className="text-base font-black uppercase tracking-wider">Official Report Verification</h2>
          <p className="text-[11px] text-blue-200 font-medium">{labName}</p>
        </div>

        {/* Verification Status Badge */}
        <div className="p-6 space-y-4 text-xs">
          <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-black text-emerald-900 text-sm">AUTHENTIC CLINICAL REPORT</p>
              <p className="text-[11px] text-emerald-700">This document is digitally verified in the central LIMS database.</p>
            </div>
          </div>

          {/* Patient Details */}
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
              <span className="font-mono text-slate-700">{order.receiptNo}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-slate-500">Date of Test:</span>
              <span className="font-bold text-slate-800">{order.date}</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-500">QC Status:</span>
              <span className="font-bold text-emerald-700 uppercase">{order.qcStatus} by Consultant Pathologist</span>
            </div>
          </div>

          {/* Tests List */}
          <div>
            <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1.5">Verified Test List</span>
            <div className="flex flex-wrap gap-1.5">
              {order.tests.map((t) => (
                <span key={t.id} className="px-2.5 py-1 bg-blue-50 text-blue-800 font-bold rounded-lg border border-blue-200 text-[11px]">
                  ✓ {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
          >
            Close Certificate
          </button>
        </div>

      </div>
    </div>
  );
}
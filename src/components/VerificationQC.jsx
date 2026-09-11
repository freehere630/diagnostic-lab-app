import React from "react";
import { ShieldCheck, CloudUpload, Lock, MessageSquare, Sparkles } from "lucide-react";

export default function VerificationQC({ 
  activeOrder, 
  handleResultInput, 
  handleRemarksChange,
  handleVerifyInDb, 
  isLoading, 
  saveStatus,
  currentUser 
}) {
  if (!activeOrder) {
    return <div className="p-8 text-center text-slate-400">No active order selected for verification.</div>;
  }

  const userRole = (currentUser?.role || "").toLowerCase();
  const canVerifyReport = ["developer", "manager", "admin", "verifier", "biochemist"].includes(userRole);

  const CLINICAL_PRESETS = [
    "Test findings are within biological reference limits.",
    "Mild transaminase elevation noted. Clinical correlation recommended.",
    "Findings correlate with patient history. Advised repeat test in 7 days.",
    "Clinically verified with internal quality control standards.",
    "Specimen slightly hemolyzed/lipemic; findings correlated."
  ];

  const evaluateParam = (param, val) => {
    if (!val || String(val).trim() === "") return { status: "PENDING", color: "bg-slate-100 text-slate-600" };

    if (param.param_type === "qualitative") {
      const isPositive = String(val).toLowerCase() === "positive" || String(val).toLowerCase() === "reactive";
      if (isPositive) return { status: "REACTIVE / POSITIVE", color: "bg-rose-600 text-white font-bold" };
      return { status: "NEGATIVE (NORMAL)", color: "bg-emerald-100 text-emerald-800 font-bold" };
    }

    if (param.param_type === "numeric") {
      const num = parseFloat(val);
      if (isNaN(num)) return { status: "INVALID", color: "bg-slate-100 text-slate-600" };
      if (param.min_range !== null && param.min_range !== undefined && num < param.min_range) {
        return { status: "↓ LOW", color: "bg-amber-100 text-amber-800 font-bold" };
      }
      if (param.max_range !== null && param.max_range !== undefined && num > param.max_range) {
        return { status: "↑ HIGH", color: "bg-rose-100 text-rose-800 font-bold" };
      }
      return { status: "NORMAL", color: "bg-emerald-100 text-emerald-800" };
    }

    return { status: "REPORTED", color: "bg-blue-100 text-blue-800" };
  };

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full shadow-sm">
        <div>
          <h2 className="font-bold text-base text-slate-900">{activeOrder.patient?.name} (ID: {activeOrder.patient?.id})</h2>
          <p className="text-xs text-slate-500">
            Barcode: <b className="font-mono text-blue-600">{activeOrder.barcode}</b> | QC: <b>{activeOrder.qcStatus}</b>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {saveStatus?.state === "saving" && (
            <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
              <CloudUpload className="w-3.5 h-3.5 animate-bounce" /> Syncing...
            </span>
          )}

          {canVerifyReport ? (
            <button
              onClick={handleVerifyInDb}
              disabled={activeOrder.isLocked || isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <ShieldCheck className="w-4 h-4" />
              {activeOrder.isLocked ? "Verified & Locked" : "Verify & Lock in Supabase"}
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Result Entry Only (Verifier Auth Required)
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-500 font-bold">
              <th className="py-3 px-4">Parameter</th>
              <th className="py-3 px-4 w-52">Observed Result</th>
              <th className="py-3 px-4">Status Flag</th>
              <th className="py-3 px-4">Unit</th>
              <th className="py-3 px-4">Reference Range</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(activeOrder.tests || []).map((test) => {
              const rawParams = test.test_parameters || test.parameters || [];
              const params = rawParams.length > 0 ? rawParams : [{
                id: test.id,
                test_id: test.id,
                name: test.name,
                param_type: test.param_type || "numeric",
                unit: test.unit || "",
                min_range: test.min_range || null,
                max_range: test.max_range || null
              }];

              return (
                <React.Fragment key={test.id}>
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <td colSpan={5} className="py-2 px-4 uppercase">{test.name} ({test.code})</td>
                  </tr>
                  {params.map((p) => {
                    const val = activeOrder.results?.[p.id]?.value !== undefined 
                      ? activeOrder.results[p.id].value 
                      : (activeOrder.results?.[test.id]?.value || "");

                    const flag = evaluateParam(p, val);
                    const isQual = p.param_type === "qualitative";

                    return (
                      <tr key={p.id} className="border-b hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 font-medium">{p.name || test.name}</td>
                        
                        <td className="py-2.5 px-4">
                          {isQual ? (
                            <select
                              disabled={activeOrder.isLocked}
                              value={val}
                              onChange={(e) => handleResultInput(p.id, e.target.value)}
                              className="w-full p-2 border rounded-lg font-bold text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Select Result --</option>
                              <option value="Negative">Negative (Normal)</option>
                              <option value="Positive">Positive (Reactive / Positive)</option>
                              <option value="Non-Reactive">Non-Reactive</option>
                              <option value="Reactive">Reactive</option>
                              <option value="Equivocal">Equivocal (Borderline)</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              disabled={activeOrder.isLocked}
                              value={val}
                              onChange={(e) => handleResultInput(p.id, e.target.value)}
                              placeholder="Type value"
                              className="w-full p-2 border rounded-lg font-mono text-center text-xs outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded text-xs border ${flag.color}`}>
                            {flag.status}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 text-slate-500 font-mono">{p.unit || test.unit || "—"}</td>
                        <td className="py-2.5 px-4 text-slate-600 font-mono">
                          {isQual ? "Negative / Positive" : (p.min_range !== null && p.max_range !== null ? `${p.min_range} - ${p.max_range}` : "Normal")}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PATHOLOGIST CLINICAL REMARKS & INTERPRETATION SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Pathologist Clinical Remarks & Interpretation (Printed on Report)
          </label>
          <span className="text-[11px] text-slate-400">
            {activeOrder.isLocked ? "Report Locked" : "Click presets or type custom interpretation"}
          </span>
        </div>

        {/* Quick Presets */}
        {!activeOrder.isLocked && (
          <div className="flex flex-wrap gap-1.5">
            {CLINICAL_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRemarksChange && handleRemarksChange(preset)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-[11px] font-semibold transition border border-slate-200 flex items-center gap-1 text-slate-600"
              >
                <Sparkles className="w-3 h-3 text-blue-500" /> {preset}
              </button>
            ))}
          </div>
        )}

        <textarea
          rows={3}
          disabled={activeOrder.isLocked}
          value={activeOrder.verifierRemarks || ""}
          onChange={(e) => handleRemarksChange && handleRemarksChange(e.target.value)}
          placeholder="e.g. Findings are consistent with mild viral hepatitis. Clinical correlation and follow-up LFT advised in 2 weeks."
          className="w-full p-3 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-slate-50 disabled:bg-slate-100"
        />
      </div>

    </div>
  );
}
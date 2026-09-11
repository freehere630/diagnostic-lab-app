import React from "react";
import { ShieldCheck, CloudUpload, Lock } from "lucide-react";

export default function VerificationQC({ 
  activeOrder, 
  handleResultInput, 
  handleVerifyInDb, 
  isLoading, 
  saveStatus,
  currentUser 
}) {
  if (!activeOrder) {
    return <div className="p-8 text-center text-slate-400">No active order selected for verification.</div>;
  }

  // Permission: Technologists cannot verify; only Developer, Manager, and Biochemist/Verifier can
  const userRole = (currentUser?.role || "").toLowerCase();
  const canVerifyReport = ["developer", "manager", "admin", "verifier", "biochemist"].includes(userRole);

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

          {/* Verification Authority Check */}
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
            {(activeOrder.tests || []).map((test) => (
              <React.Fragment key={test.id}>
                <tr className="bg-slate-100 font-bold text-slate-700">
                  <td colSpan={5} className="py-2 px-4 uppercase">{test.name} ({test.code})</td>
                </tr>
                {(test.test_parameters || test.parameters || []).map((p) => {
                  const val = activeOrder.results?.[p.id]?.value || "";
                  const flag = evaluateParam(p, val);
                  const isQual = p.param_type === "qualitative";

                  return (
                    <tr key={p.id} className="border-b hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-medium">{p.name}</td>
                      
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

                      <td className="py-2.5 px-4 text-slate-500 font-mono">{p.unit || "—"}</td>
                      <td className="py-2.5 px-4 text-slate-600 font-mono">
                        {isQual ? "Negative / Positive" : (p.min_range !== null && p.max_range !== null ? `${p.min_range} - ${p.max_range}` : "Normal")}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
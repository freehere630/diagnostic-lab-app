import React from "react";
import { ShieldCheck, CloudUpload, Lock, MessageSquare, Sparkles, FileText } from "lucide-react";

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

  const RADIOLOGY_NORMAL_PRESETS = [
    {
      label: "X-Ray Chest Normal",
      text: "CLINICAL INDICATION: Routine health screening / Respiratory evaluation.\n\nFINDINGS:\n- Lungs are clear. No focal consolidation, pneumothorax, or effusion.\n- Cardiothoracic ratio is normal.\n- Both costophrenic angles are clear.\n- Visualized bony thorax appears intact.\n\nIMPRESSION: NORMAL CHEST RADIOGRAPH (P/A VIEW)."
    },
    {
      label: "USG Abdomen Normal",
      text: "INDICATION: Abdominal discomfort.\n\nFINDINGS:\n- Liver is normal in size and parenchymal echotexture. No focal lesion.\n- Gallbladder is thin-walled, calculus-free.\n- Pancreas and Spleen are unremarkable.\n- Both Kidneys are normal in size, shape, and cortical thickness.\n- Urinary Bladder has smooth outline.\n\nIMPRESSION: NORMAL ULTRASONOGRAM OF WHOLE ABDOMEN."
    },
    {
      label: "Brain CT Normal",
      text: "INDICATION: Headache / Evaluation.\n\nOBSERVATIONS:\n- No evidence of acute intracranial hemorrhage or territorial infarction.\n- Ventricles, cisterns, and sulci are within normal limits for age.\n- Midline structures are central with no mass effect.\n- Skull bones intact.\n\nIMPRESSION: NO ACUTE INTRACRANIAL ABNORMALITY DETECTED."
    }
  ];

  const CLINICAL_PRESETS = [
    "Test findings are within biological reference limits.",
    "Mild transaminase elevation noted. Clinical correlation recommended.",
    "Findings correlate with patient history. Advised repeat test in 7 days.",
    "Clinically verified with internal quality control standards."
  ];

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full shadow-sm">
        <div>
          <h2 className="font-bold text-base text-slate-900">{activeOrder.patient?.name} (ID: {activeOrder.patient?.id})</h2>
          <p className="text-xs text-slate-500">
            Barcode: <b className="font-mono text-blue-600">{activeOrder.barcode}</b> | Ref. Doctor: <b className="text-slate-700">{activeOrder.patient?.doctor || "Self"}</b>
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
              {activeOrder.isLocked ? "Verified & Locked" : "Verify & Lock Report"}
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Result Entry Only (Verifier Auth Required)
            </div>
          )}
        </div>
      </div>

      {/* Tests Findings Editor */}
      <div className="space-y-4">
        {(activeOrder.tests || []).map((test) => {
          const dept = (test.dept_id || test.deptId || "").toUpperCase();
          const isRadiology = dept.includes("RAD") || dept.includes("USG") || dept.includes("CT") || dept.includes("MRI") || dept.includes("CARD");
          const rawParams = test.test_parameters || test.parameters || [];
          const paramId = rawParams[0]?.id || test.id;
          const currentVal = activeOrder.results?.[paramId]?.value || activeOrder.results?.[test.id]?.value || "";

          if (isRadiology) {
            return (
              <div key={test.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> {test.name} ({test.code}) — Radiology Report
                  </span>
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-full uppercase">
                    Imaging / Radiology Protocol
                  </span>
                </div>

                {!activeOrder.isLocked && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-400">1-Click Findings:</span>
                    {RADIOLOGY_NORMAL_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleResultInput(paramId, p.text)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-[10px] font-semibold transition border border-slate-200 text-slate-700"
                      >
                        + {p.label}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  rows={6}
                  disabled={activeOrder.isLocked}
                  value={currentVal}
                  onChange={(e) => handleResultInput(paramId, e.target.value)}
                  placeholder="Type Clinical Findings, Indication, Observations, and Impression here..."
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 leading-relaxed disabled:bg-slate-100"
                />
              </div>
            );
          }

          // Regular Numeric/Qualitative Table
          return (
            <div key={test.id} className="bg-white rounded-2xl border overflow-hidden shadow-sm">
              <div className="bg-slate-100 px-4 py-2.5 font-black text-xs uppercase text-slate-800 border-b">
                {test.name} ({test.code})
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-500 font-bold">
                    <th className="py-2.5 px-4">Parameter</th>
                    <th className="py-2.5 px-4 w-56">Observed Result</th>
                    <th className="py-2.5 px-4">Unit</th>
                    <th className="py-2.5 px-4">Reference Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawParams.map((p) => {
                    const val = activeOrder.results?.[p.id]?.value !== undefined ? activeOrder.results[p.id].value : (activeOrder.results?.[test.id]?.value || "");
                    const isQual = p.param_type === "qualitative";

                    return (
                      <tr key={p.id}>
                        <td className="py-2.5 px-4 font-semibold">{p.name}</td>
                        <td className="py-2.5 px-4">
                          {isQual ? (
                            <select
                              disabled={activeOrder.isLocked}
                              value={val}
                              onChange={(e) => handleResultInput(p.id, e.target.value)}
                              className="w-full p-1.5 border rounded-lg font-bold text-xs bg-white outline-none"
                            >
                              <option value="">-- Select --</option>
                              <option value="Negative">Negative (Normal)</option>
                              <option value="Positive">Positive (Reactive)</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              disabled={activeOrder.isLocked}
                              value={val}
                              onChange={(e) => handleResultInput(p.id, e.target.value)}
                              placeholder="Type value"
                              className="w-full p-1.5 border rounded-lg font-mono font-bold text-xs outline-none text-center"
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono">{p.unit || "—"}</td>
                        <td className="py-2.5 px-4 text-slate-600 font-mono">{p.min_range ? `${p.min_range} - ${p.max_range}` : "Normal"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Pathologist Remarks */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Doctor Remarks & Interpretation (Printed on Report)
        </label>
        {!activeOrder.isLocked && (
          <div className="flex flex-wrap gap-1.5">
            {CLINICAL_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRemarksChange && handleRemarksChange(preset)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-[11px] font-semibold transition border border-slate-200 text-slate-600"
              >
                <Sparkles className="w-3 h-3 text-blue-500 inline mr-1" /> {preset}
              </button>
            ))}
          </div>
        )}
        <textarea
          rows={2}
          disabled={activeOrder.isLocked}
          value={activeOrder.verifierRemarks || ""}
          onChange={(e) => handleRemarksChange && handleRemarksChange(e.target.value)}
          placeholder="e.g. Findings correlate with patient clinical history."
          className="w-full p-3 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-slate-50 disabled:bg-slate-100"
        />
      </div>

    </div>
  );
}
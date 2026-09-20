import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, CloudUpload, Lock, MessageSquare, 
  Sparkles, FileText, AlertOctagon, Zap, Calculator 
} from "lucide-react";
import { requestSampleRecollection } from "../services/api";
import { sendReportReadyWhatsApp, sendRecollectionWhatsApp } from "../utils/whatsappHelper";
import { getDepartmentVialBarcode } from "../utils/printHelpers";
export default function VerificationQC({ 
  activeOrder, 
  handleResultInput, 
  handleRemarksChange, 
  handleVerifyInDb, 
  isLoading, 
  saveStatus, 
  currentUser 
}) {
  // Machine box state
  const [machineInputs, setMachineInputs] = useState({ wbc: "", gran: "", lymph: "", mid: "" });

  if (!activeOrder) {
    return (
      <div className="p-12 text-center text-slate-400 font-sans bg-white rounded-2xl border border-dashed border-slate-200">
        <p className="font-semibold text-sm">No active order selected for verification.</p>
        <p className="text-xs text-slate-400 mt-1">Select an order from the Dashboard or Worklists to enter and review results.</p>
      </div>
    );
  }

  const userRole = (currentUser?.role || "").toLowerCase();
  const canVerifyReport = ["developer", "manager", "admin", "verifier", "biochemist"].includes(userRole);

  // 1. AUTOMATIC REAL-TIME MATHEMATICAL CALCULATION ENGINE
  // Triggers automatically whenever WBC, Gran%, Lymph%, or Mid% changes
  const runLiveAutoCalculation = (test, updatedInputs) => {
    const rawParams = test.test_parameters || test.parameters || [];
    
    const getParam = (keywords) => {
      const keys = Array.isArray(keywords) ? keywords : [keywords];
      return rawParams.find(p => keys.some(k => (p.name || "").toLowerCase().includes(k.toLowerCase())));
    };

    const numWbc = parseFloat(updatedInputs.wbc) || 7.5;
    const numGran = parseFloat(updatedInputs.gran);
    const numLymph = parseFloat(updatedInputs.lymph);
    const numMid = parseFloat(updatedInputs.mid);

    // 1. Calculate Neutrophils & ANC
    if (!isNaN(numGran) && numGran >= 0) {
      const neutParam = getParam(["neutrophils", "neutrophil"]);
      const ancParam = getParam(["absolute neutrophil", "anc"]);
      const neutVal = numGran.toFixed(1);
      const ancVal = ((numWbc * numGran) / 100).toFixed(2);

      if (neutParam) handleResultInput(neutParam.id, neutVal);
      if (ancParam) handleResultInput(ancParam.id, ancVal);
    }

    // 2. Calculate Lymphocytes & ALC
    if (!isNaN(numLymph) && numLymph >= 0) {
      const lymphParam = getParam(["lymphocytes", "lymphocyte"]);
      const alcParam = getParam(["absolute lymphocyte", "alc"]);
      const lymphVal = numLymph.toFixed(1);
      const alcVal = ((numWbc * numLymph) / 100).toFixed(2);

      if (lymphParam) handleResultInput(lymphParam.id, lymphVal);
      if (alcParam) handleResultInput(alcParam.id, alcVal);
    }

    // 3. Calculate Monocytes, Eosinophils, Basophils, AMC, AEC, ABC, & Total Circulating Eos
    if (!isNaN(numMid) && numMid >= 0) {
      const monoVal = (numMid * 0.70).toFixed(1); // 12.6 * 0.70 = 8.8%
      const eosVal = (numMid * 0.25).toFixed(1);  // 12.6 * 0.25 = 3.2%
      const basoVal = Math.max(0, (numMid - parseFloat(monoVal) - parseFloat(eosVal))).toFixed(1); // 0.6%

      const amcVal = ((numWbc * parseFloat(monoVal)) / 100).toFixed(2);
      const aecVal = ((numWbc * parseFloat(eosVal)) / 100).toFixed(2);
      const abcVal = ((numWbc * parseFloat(basoVal)) / 100).toFixed(2);
      const cirEosVal = Math.round(((numWbc < 100 ? numWbc * 1000 : numWbc) * parseFloat(eosVal)) / 100);

      const monoParam = getParam(["monocyte", "monocytes"]);
      const eosParam  = getParam(["eosinophil", "eosinophils"]);
      const basoParam = getParam(["basophil", "basophils"]);
      const amcParam  = getParam(["absolute monocyte", "amc"]);
      const aecParam  = getParam(["absolute eosinophil count (aec)", "absolute eosinophil"]);
      const abcParam  = getParam(["absolute basophil", "abc"]);
      const cirEosParam = getParam(["total cir. eosionophil", "circulating eosinophil"]);

      if (monoParam) handleResultInput(monoParam.id, monoVal);
      if (eosParam)  handleResultInput(eosParam.id, eosVal);
      if (basoParam) handleResultInput(basoParam.id, basoVal);
      if (amcParam)  handleResultInput(amcParam.id, amcVal);
      if (aecParam)  handleResultInput(aecParam.id, aecVal);
      if (abcParam)  handleResultInput(abcParam.id, abcVal);
      if (cirEosParam) handleResultInput(cirEosParam.id, String(cirEosVal));
    }
  };

  // Handlers for individual machine box typing
  const onGranChange = (test, val) => {
    const updated = { ...machineInputs, gran: val };
    setMachineInputs(updated);
    runLiveAutoCalculation(test, updated);
  };

  const onLymphChange = (test, val) => {
    const updated = { ...machineInputs, lymph: val };
    setMachineInputs(updated);
    runLiveAutoCalculation(test, updated);
  };

  const onMidChange = (test, val) => {
    const updated = { ...machineInputs, mid: val };
    setMachineInputs(updated);
    runLiveAutoCalculation(test, updated);
  };

  // 2. SMART VERIFICATION CHECK
  const validateAllResultsEntered = () => {
    const missing = [];

    (activeOrder.tests || []).forEach((test) => {
      const isCbc = (test.code || "").toUpperCase().includes("CBC") || (test.name || "").toLowerCase().includes("blood count");
      const rawParams = test.test_parameters || test.parameters || [];
      
      if (isCbc) {
        // For CBC: Require primary machine parameters
        const primaryCbcKeys = ["WBC", "Hemoglobin", "RBC", "Platelet", "MCV", "Neutrophil", "Lymphocyte"];
        
        primaryCbcKeys.forEach((key) => {
          const p = rawParams.find(pr => (pr.name || "").toLowerCase().includes(key.toLowerCase()));
          if (p) {
            const val = activeOrder.results?.[p.id]?.value ?? activeOrder.results?.[test.id]?.value ?? "";
            if (val === undefined || val === null || String(val).trim() === "") {
              missing.push(`CBC → ${p.name}`);
            }
          }
        });
      } else {
        if (rawParams.length > 0) {
          rawParams.forEach((p) => {
            const val = activeOrder.results?.[p.id]?.value !== undefined 
              ? activeOrder.results[p.id].value 
              : (activeOrder.results?.[test.id]?.value ?? "");

            if (val === undefined || val === null || String(val).trim() === "") {
              missing.push(`${test.name} → ${p.name}`);
            }
          });
        } else {
          const val = activeOrder.results?.[test.id]?.value ?? "";
          if (val === undefined || val === null || String(val).trim() === "") {
            missing.push(test.name);
          }
        }
      }
    });

    return missing;
  };

  // 3. 1-CLICK INSTANT REJECT & WHATSAPP
  const handleRejectHemolyzedInstant = async () => {
    sendRecollectionWhatsApp(activeOrder, "Hemolyzed Specimen");

    try {
      await requestSampleRecollection(activeOrder.orderId, "Hemolyzed Specimen");
      activeOrder.sample_status = "Repeat Collection Required";
      activeOrder.verifierRemarks = "[RECOLLECTION REQUIRED: Hemolyzed Specimen]";
    } catch (e) {
      console.error("Background DB update notice:", e);
    }
  };

  // 4. 1-CLICK VERIFY & WHATSAPP REPORT DISPATCH
  const onVerifyClickInstant = async () => {
    const missingResults = validateAllResultsEntered();

    if (missingResults.length > 0) {
      alert(
        `⛔ CANNOT COMPLETE VERIFICATION!\n\n` +
        `Required parameters must have a result before verification can be completed.\n` +
        `Missing results for (${missingResults.length} parameter(s)):\n\n` +
        missingResults.slice(0, 6).map((m) => `• ${m}`).join("\n") +
        (missingResults.length > 6 ? `\n...and ${missingResults.length - 6} more` : "")
      );
      return;
    }

    sendReportReadyWhatsApp(activeOrder);

    try {
      await handleVerifyInDb();
    } catch (e) {
      console.error("Verification notice:", e);
    }
  };

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
          <h2 className="font-bold text-base text-slate-900">{activeOrder.patient?.name || "Patient"} (ID: {activeOrder.patient?.id || "N/A"})</h2>
          
          {/* DISPLAY ALL SPECIFIC VIAL BARCODES ASSIGNED TO THIS PATIENT */}
          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600">Vial Barcodes:</span>
            {(activeOrder.tests || []).reduce((acc, t) => {
              const code = getDepartmentVialBarcode(activeOrder, t.dept_id || t.deptId);
              const tube = (t.tube_color || "Vial").split(" ")[0];
              if (!acc.some(x => x.code === code)) acc.push({ code, tube });
              return acc;
            }, []).map((v, i) => (
              <span key={i} className="font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                {v.tube}: {v.code}
              </span>
            ))}
            <span className="text-slate-400">|</span>
            <span>Ref. Doctor: <b className="text-slate-700">{activeOrder.patient?.doctor || activeOrder.doctor || "Self"}</b></span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {saveStatus?.state === "saving" && (
            <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 mr-2">
              <CloudUpload className="w-3.5 h-3.5 animate-bounce" /> Syncing...
            </span>
          )}

          {/* 1-CLICK REJECT & WHATSAPP */}
          {!activeOrder.isLocked && (
            <button
              onClick={handleRejectHemolyzedInstant}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
              title="1-Click: Flags sample as Hemolyzed and opens WhatsApp recall notice"
            >
              <AlertOctagon className="w-4 h-4" /> Reject (Hemolyzed) & WhatsApp
            </button>
          )}

          {/* 1-CLICK VERIFY & WHATSAPP */}
          {canVerifyReport ? (
            <button
              onClick={onVerifyClickInstant}
              disabled={activeOrder.isLocked || isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              {activeOrder.isLocked ? "Verified & Locked" : "Verify & Send WhatsApp"}
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
          const isCbc = test.code?.toUpperCase().includes("CBC") || test.name?.toLowerCase().includes("blood count");
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

          // Pathology / Biochemistry / Hematology Table
          return (
            <div key={test.id} className="bg-white rounded-2xl border overflow-hidden shadow-sm p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-black text-sm uppercase text-slate-800">{test.name} {test.code ? `(${test.code})` : ""}</span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {rawParams.length} Parameters
                </span>
              </div>

              {/* ========================================================================= */}
              {/* LIVE 3-PART KT-44 AUTO-CALCULATION BAR                                    */}
              {/* ========================================================================= */}
              {isCbc && !activeOrder.isLocked && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs text-amber-950 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-amber-600 animate-pulse" />
                      3-Part KT-44 Machine Screen Input (Auto-Calculates 5-Part Differential Live on Screen)
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                      Live Auto-Calculation Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* 1. Gran% Input */}
                    <div>
                      <label className="font-extrabold text-[11px] text-slate-700 block mb-1">
                        1. Granulocytes (Gran%)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 52.3"
                        value={machineInputs.gran}
                        onChange={(e) => onGranChange(test, e.target.value)}
                        className="w-full p-2 border-2 border-amber-300 focus:border-amber-500 rounded-xl font-mono font-bold text-center bg-white outline-none text-sm text-slate-900"
                      />
                      <span className="text-[9px] text-slate-500 block text-center mt-0.5">→ Auto-fills Neutrophils & ANC</span>
                    </div>

                    {/* 2. Lymph% Input */}
                    <div>
                      <label className="font-extrabold text-[11px] text-slate-700 block mb-1">
                        2. Lymphocytes (Lymph%)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 35.6"
                        value={machineInputs.lymph}
                        onChange={(e) => onLymphChange(test, e.target.value)}
                        className="w-full p-2 border-2 border-amber-300 focus:border-amber-500 rounded-xl font-mono font-bold text-center bg-white outline-none text-sm text-slate-900"
                      />
                      <span className="text-[9px] text-slate-500 block text-center mt-0.5">→ Auto-fills Lymphocytes & ALC</span>
                    </div>

                    {/* 3. Mid% Input */}
                    <div>
                      <label className="font-black text-[11px] text-rose-900 block mb-1 flex justify-between">
                        <span>3. Mid-cells (Mid%) *</span>
                        <span className="text-rose-600 font-bold">Auto-splits</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 12.6"
                        value={machineInputs.mid}
                        onChange={(e) => onMidChange(test, e.target.value)}
                        className="w-full p-2 border-2 border-rose-500 focus:ring-2 focus:ring-rose-400 rounded-xl font-mono font-black text-center bg-white outline-none text-sm text-rose-900 shadow-sm"
                      />
                      <span className="text-[9px] text-rose-600 font-bold block text-center mt-0.5">
                        → Auto-splits into Mono (8.8%), Eos (3.2%), Baso (0.6%) & AEC
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Parameter Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-600 font-bold">
                      <th className="py-2.5 px-4 w-1/3">Parameter</th>
                      <th className="py-2.5 px-4 w-48">Observed Result</th>
                      <th className="py-2.5 px-4 w-28">Unit</th>
                      <th className="py-2.5 px-4">Clinical Reference Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawParams.map((p) => {
                      const val = activeOrder.results?.[p.id]?.value !== undefined 
                        ? activeOrder.results[p.id].value 
                        : (activeOrder.results?.[test.id]?.value || "");
                      const isQual = p.param_type === "qualitative";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-4 font-semibold text-slate-800 align-top">{p.name}</td>
                          <td className="py-2.5 px-4 align-top">
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
                                onChange={(e) => {
                                  handleResultInput(p.id, e.target.value);
                                  // If typing into WBC, update auto-calculation live
                                  if ((p.name || "").toLowerCase().includes("wbc")) {
                                    runLiveAutoCalculation(test, { ...machineInputs, wbc: e.target.value });
                                  }
                                }}
                                placeholder="Enter value"
                                className="w-full p-1.5 border border-slate-300 rounded-lg font-mono font-bold text-xs outline-none text-center focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono align-top">{p.unit || "—"}</td>
                          
                          {/* MULTI-RANGE / GENDER / AGE REFERENCE RANGE */}
                          <td className="py-2.5 px-4 text-slate-700 font-mono text-xs leading-relaxed align-top">
                            {p.reference_text || p.ref_text ? (
                              <div className="whitespace-pre-line text-blue-700 font-semibold bg-blue-50/50 p-1.5 rounded-lg border border-blue-100">
                                {p.reference_text || p.ref_text}
                              </div>
                            ) : p.min_range !== null && p.max_range !== null && p.min_range !== undefined && p.min_range !== "" ? (
                              <span className="font-semibold">{p.min_range} - {p.max_range}</span>
                            ) : (
                              <span className="text-slate-400">Normal</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-[10px] font-semibold transition border border-slate-200 text-slate-600"
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
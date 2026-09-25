import React, { useState } from "react";
import { 
  ShieldCheck, CloudUpload, Lock, MessageSquare, 
  Sparkles, FileText, AlertOctagon, Calculator, 
  CheckCircle2, AlertTriangle, RotateCcw, FlaskConical 
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
  // 3-Part Analyzer Machine Inputs State (CBC)
  const [machineInputs, setMachineInputs] = useState({ wbc: "", gran: "", lymph: "", mid: "" });

  if (!activeOrder) {
    return (
      <div className="p-12 text-center text-slate-400 font-sans bg-white rounded-2xl border border-dashed border-slate-200">
        <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-sm">No active order selected for verification.</p>
        <p className="text-xs text-slate-400 mt-1">Select an order from the Dashboard or Worklists to enter and review results.</p>
      </div>
    );
  }

  const userRole = (currentUser?.role || "").toLowerCase();
  const canVerifyReport = ["developer", "manager", "admin", "verifier", "biochemist"].includes(userRole);

  // =========================================================================
  // 1. CBC LIVE 3-PART TO 5-PART AUTO-CALCULATION ENGINE
  // =========================================================================
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

    // Neutrophils & ANC
    if (!isNaN(numGran) && numGran >= 0) {
      const neutParam = getParam(["neutrophils", "neutrophil"]);
      const ancParam = getParam(["absolute neutrophil", "anc"]);
      const neutVal = numGran.toFixed(1);
      const ancVal = ((numWbc * numGran) / 100).toFixed(2);

      if (neutParam) handleResultInput(neutParam.id, neutVal);
      if (ancParam) handleResultInput(ancParam.id, ancVal);
    }

    // Lymphocytes & ALC
    if (!isNaN(numLymph) && numLymph >= 0) {
      const lymphParam = getParam(["lymphocytes", "lymphocyte"]);
      const alcParam = getParam(["absolute lymphocyte", "alc"]);
      const lymphVal = numLymph.toFixed(1);
      const alcVal = ((numWbc * numLymph) / 100).toFixed(2);

      if (lymphParam) handleResultInput(lymphParam.id, lymphVal);
      if (alcParam) handleResultInput(alcParam.id, alcVal);
    }

    // Monocytes, Eosinophils, Basophils, AEC & AMC from Mid%
    if (!isNaN(numMid) && numMid >= 0) {
      const monoVal = (numMid * 0.70).toFixed(1); // Standard 70% share of Mid
      const eosVal = (numMid * 0.25).toFixed(1);  // Standard 25% share of Mid
      const basoVal = Math.max(0, (numMid - parseFloat(monoVal) - parseFloat(eosVal))).toFixed(1);

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

  // =========================================================================
  // 2. URINE R/M/E CLINICAL PRESETS ENGINE
  // =========================================================================
  const handleApplyUrinePreset = (presetType) => {
    const urineTest = (activeOrder.tests || []).find((t) => {
      const c = (t.code || "").toUpperCase();
      const n = (t.name || "").toLowerCase();
      return c.includes("URINE") || n.includes("urine");
    });
    if (!urineTest) return;

    const rawParams = urineTest.test_parameters || urineTest.parameters || [];
    const setVal = (keywords, val) => {
      const keys = Array.isArray(keywords) ? keywords : [keywords];
      const p = rawParams.find((param) => keys.some((k) => (param.name || "").toLowerCase().includes(k.toLowerCase())));
      if (p) handleResultInput(p.id, val);
    };

    if (presetType === "NORMAL") {
      setVal(["Color"], "Straw");
      setVal(["Appearance", "Clarity"], "Clear");
      setVal(["Specific Gravity", "Sp. Gravity"], "1.015");
      setVal(["Reaction", "pH"], "Acidic (6.0)");
      setVal(["Sediment"], "Nil");
      setVal(["Albumin", "Protein"], "Nil");
      setVal(["Sugar", "Glucose"], "Nil");
      setVal(["Ketone"], "Negative");
      setVal(["Bilirubin"], "Negative");
      setVal(["Urobilinogen"], "Normal");
      setVal(["Nitrite"], "Negative");
      setVal(["Leukocyte Esterase"], "Negative");
      setVal(["Bile Salt"], "Negative");
      setVal(["Bile Pigment"], "Negative");
      setVal(["Pus Cells", "Pus"], "0 - 2 /HPF");
      setVal(["Epithelial"], "1 - 3 /HPF");
      setVal(["Red Blood Cells", "RBC"], "Nil");
      setVal(["Casts"], "Nil");
      setVal(["Crystals"], "Nil");
      setVal(["Calcium Oxalate"], "Nil");
      setVal(["Amorphous"], "Nil");
      setVal(["Bacteria"], "Nil");
      setVal(["Yeast"], "Nil");
      setVal(["Trichomonas"], "Nil");
      if (handleRemarksChange) handleRemarksChange("Urine physical, chemical and microscopic findings are within normal limits.");
    } else if (presetType === "UTI") {
      setVal(["Color"], "Dark Amber / Turbid");
      setVal(["Appearance", "Clarity"], "Turbid");
      setVal(["Specific Gravity", "Sp. Gravity"], "1.025");
      setVal(["Reaction", "pH"], "Alkaline (7.5)");
      setVal(["Sediment"], "Present");
      setVal(["Albumin", "Protein"], "++");
      setVal(["Sugar", "Glucose"], "Nil");
      setVal(["Ketone"], "Negative");
      setVal(["Bilirubin"], "Negative");
      setVal(["Urobilinogen"], "Normal");
      setVal(["Nitrite"], "Positive");
      setVal(["Leukocyte Esterase"], "Positive");
      setVal(["Pus Cells", "Pus"], "25 - 30 /HPF");
      setVal(["Epithelial"], "5 - 8 /HPF");
      setVal(["Red Blood Cells", "RBC"], "2 - 4 /HPF");
      setVal(["Casts"], "Nil");
      setVal(["Crystals"], "Nil");
      setVal(["Bacteria"], "Present (++)");
      if (handleRemarksChange) handleRemarksChange("Microscopic pyuria with bacteriuria noted. Features suggestive of Urinary Tract Infection (UTI). Clinical correlation and Urine Culture & Sensitivity advised.");
    } else if (presetType === "PROTEIN") {
      setVal(["Color"], "Pale Yellow");
      setVal(["Appearance", "Clarity"], "Slightly Hazy");
      setVal(["Specific Gravity", "Sp. Gravity"], "1.020");
      setVal(["Reaction", "pH"], "Acidic (6.0)");
      setVal(["Sediment"], "Slight");
      setVal(["Albumin", "Protein"], "+++");
      setVal(["Sugar", "Glucose"], "Nil");
      setVal(["Nitrite"], "Negative");
      setVal(["Pus Cells", "Pus"], "1 - 3 /HPF");
      setVal(["Epithelial"], "2 - 4 /HPF");
      setVal(["Red Blood Cells", "RBC"], "Nil");
      setVal(["Casts"], "Hyaline Casts (1 - 2 /LPF)");
      setVal(["Bacteria"], "Nil");
      if (handleRemarksChange) handleRemarksChange("Significant proteinuria detected with hyaline casts. Advised 24-hour urinary total protein and Renal Function Test (KFT).");
    } else if (presetType === "HEMATURIA") {
      setVal(["Color"], "Reddish / Smoky");
      setVal(["Appearance", "Clarity"], "Turbid");
      setVal(["Specific Gravity", "Sp. Gravity"], "1.020");
      setVal(["Reaction", "pH"], "Acidic (5.5)");
      setVal(["Sediment"], "Present");
      setVal(["Albumin", "Protein"], "+");
      setVal(["Sugar", "Glucose"], "Nil");
      setVal(["Pus Cells", "Pus"], "2 - 4 /HPF");
      setVal(["Epithelial"], "1 - 3 /HPF");
      setVal(["Red Blood Cells", "RBC"], "15 - 20 /HPF");
      setVal(["Calcium Oxalate"], "Many (+++)");
      setVal(["Crystals"], "Calcium Oxalate crystals present");
      if (handleRemarksChange) handleRemarksChange("Microscopic hematuria with abundant Calcium Oxalate crystalluria noted. Clinical correlation and USG of KUB advised.");
    }
  };

  // =========================================================================
  // 3. VALIDATION BEFORE VERIFICATION
  // =========================================================================
  const validateAllResultsEntered = () => {
    const missing = [];

    (activeOrder.tests || []).forEach((test) => {
      const isCbc = (test.code || "").toUpperCase().includes("CBC") || (test.name || "").toLowerCase().includes("blood count");
      const isUrine = (test.code || "").toUpperCase().includes("URINE") || (test.name || "").toLowerCase().includes("urine");
      const rawParams = test.test_parameters || test.parameters || [];
      
      if (isCbc) {
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
      } else if (isUrine) {
        const keyUrineParams = ["Color", "Appearance", "Albumin", "Sugar", "Pus Cells", "Epithelial"];
        keyUrineParams.forEach((key) => {
          const p = rawParams.find(pr => (pr.name || "").toLowerCase().includes(key.toLowerCase()));
          if (p) {
            const val = activeOrder.results?.[p.id]?.value ?? activeOrder.results?.[test.id]?.value ?? "";
            if (val === undefined || val === null || String(val).trim() === "") {
              missing.push(`Urine R/M/E → ${p.name}`);
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

  // 1-Click Reject Hemolyzed
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

  // 1-Click Verify and WhatsApp Delivery
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

  // Helper chip pills for Qualitative & Semi-quantitative fields
  const renderQuickPills = (paramName, currentVal, onSelect) => {
    const pName = (paramName || "").toLowerCase();
    
    // Protein / Albumin / Sugar pills
    if (pName.includes("protein") || pName.includes("albumin") || pName.includes("sugar") || pName.includes("glucose")) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {["Nil", "Trace", "+", "++", "+++"].map((badge) => (
            <button
              key={badge}
              type="button"
              onClick={() => onSelect(badge)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                currentVal === badge 
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
              }`}
            >
              {badge}
            </button>
          ))}
        </div>
      );
    }

    // Reaction / pH pills
    if (pName.includes("reaction") || pName.includes("ph")) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {["Acidic (6.0)", "Acidic (5.5)", "Neutral (7.0)", "Alkaline (7.5)"].map((badge) => (
            <button
              key={badge}
              type="button"
              onClick={() => onSelect(badge)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${
                currentVal === badge 
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm" 
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
              }`}
            >
              {badge}
            </button>
          ))}
        </div>
      );
    }

    // Pus Cells pills
    if (pName.includes("pus") || (pName.includes("wbc") && !pName.includes("total"))) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {["0 - 2 /HPF", "2 - 4 /HPF", "5 - 10 /HPF", "15 - 20 /HPF", "25 - 30 /HPF", "Plenty"].map((badge) => (
            <button
              key={badge}
              type="button"
              onClick={() => onSelect(badge)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${
                currentVal === badge 
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm" 
                  : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
              }`}
            >
              {badge}
            </button>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full shadow-sm">
        <div>
          <h2 className="font-bold text-base text-slate-900">
            {activeOrder.patient?.name || "Patient"} (ID: {activeOrder.patient?.id || "N/A"})
          </h2>
          
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

          {/* 1-Click Reject Hemolyzed */}
          {!activeOrder.isLocked && (
            <button
              onClick={handleRejectHemolyzedInstant}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
              title="Flags sample as Hemolyzed and opens WhatsApp recall notice"
            >
              <AlertOctagon className="w-4 h-4" /> Reject (Hemolyzed)
            </button>
          )}

          {/* 1-Click Verify and WhatsApp Delivery */}
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
          const isUrine = test.code?.toUpperCase().includes("URINE") || test.name?.toLowerCase().includes("urine");
          
          const rawParams = test.test_parameters || test.parameters || [];
          const paramId = rawParams[0]?.id || test.id;
          const currentVal = activeOrder.results?.[paramId]?.value || activeOrder.results?.[test.id]?.value || "";

          // 1. RADIOLOGY / IMAGING NARRATIVE REPORT
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

          // 2. PATHOLOGY / BIOCHEMISTRY / HEMATOLOGY / URINE WORKSPACE
          return (
            <div key={test.id} className="bg-white rounded-2xl border overflow-hidden shadow-sm p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-black text-sm uppercase text-slate-800">
                  {test.name} {test.code ? `(${test.code})` : ""}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {rawParams.length} Parameters
                </span>
              </div>

              {/* CBC 3-PART KT-44 AUTO-CALCULATION BAR */}
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

                    <div>
                      <label className="font-black text-[11px] text-rose-900 mb-1 flex justify-between">
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

              {/* URINE R/M/E RAPID PRESET ASSISTANT TOOLBAR */}
              {isUrine && !activeOrder.isLocked && (
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-300 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="font-black text-xs text-teal-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-teal-600" /> Urine R/M/E Rapid Preset Assistant
                      </span>
                      <p className="text-[10px] text-teal-800">
                        1-Click fill all 20 parameters, then tweak individual fields as needed.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyUrinePreset("NORMAL")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition"
                      >
                        ✨ Normal Urine (Clear / Nil)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyUrinePreset("UTI")}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition"
                      >
                        🚨 Active UTI (Pus Cells 25-30)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyUrinePreset("PROTEIN")}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition"
                      >
                        ⚠️ Proteinuria (Protein +++)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyUrinePreset("HEMATURIA")}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition"
                      >
                        💎 Hematuria & Crystals
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Parameter Entry Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-600 font-bold">
                      <th className="py-2.5 px-4 w-1/3">Parameter</th>
                      <th className="py-2.5 px-4 w-56">Observed Result</th>
                      <th className="py-2.5 px-4 w-24">Unit</th>
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
                          <td className="py-2.5 px-4 font-semibold text-slate-800 align-top">
                            <div>{p.name}</div>
                            {/* Render quick select pills for qualitative fields */}
                            {!activeOrder.isLocked && renderQuickPills(p.name, val, (chosen) => handleResultInput(p.id, chosen))}
                          </td>
                          
                          <td className="py-2.5 px-4 align-top">
                            {isQual ? (
                              <div className="space-y-1">
                                <select
                                  disabled={activeOrder.isLocked}
                                  value={val}
                                  onChange={(e) => handleResultInput(p.id, e.target.value)}
                                  className="w-full p-1.5 border border-slate-300 rounded-lg font-bold text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Select Result --</option>
                                  <option value="Nil">Nil</option>
                                  <option value="Negative">Negative</option>
                                  <option value="Trace">Trace</option>
                                  <option value="+">+ (1+)</option>
                                  <option value="++">++ (2+)</option>
                                  <option value="+++">+++ (3+)</option>
                                  <option value="++++">++++ (4+)</option>
                                  <option value="Positive">Positive (Reactive)</option>
                                </select>
                              </div>
                            ) : (
                              <input
                                type="text"
                                disabled={activeOrder.isLocked}
                                value={val}
                                onChange={(e) => {
                                  handleResultInput(p.id, e.target.value);
                                  // Update CBC engine dynamically if editing WBC
                                  if ((p.name || "").toLowerCase().includes("wbc")) {
                                    runLiveAutoCalculation(test, { ...machineInputs, wbc: e.target.value });
                                  }
                                }}
                                placeholder="Enter result"
                                className="w-full p-1.5 border border-slate-300 rounded-lg font-mono font-bold text-xs outline-none text-center focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            )}
                          </td>

                          <td className="py-2.5 px-4 text-slate-500 font-mono align-top">
                            {p.unit || "—"}
                          </td>
                          
                          {/* Clinical Reference Limit */}
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
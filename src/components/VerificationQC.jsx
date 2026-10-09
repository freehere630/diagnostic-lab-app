import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck, CloudUpload, Lock, MessageSquare,
  AlertOctagon, CheckCircle2, AlertTriangle, RotateCcw, FlaskConical,
  Barcode, Check, Layers, Calculator, Sparkles, FileText,
  AlignLeft, Droplets, Microscope, FileCode
} from "lucide-react";
import { requestSampleRecollection, markSampleRecollected } from "../services/api";
import { sendReportReadyWhatsApp, sendRecollectionWhatsApp } from "../utils/whatsappHelper";
import { getDepartmentVialBarcode, checkAbnormalStatus, isDescriptiveInvestigation } from "../utils/printHelpers";

export default function VerificationQC({
  activeOrder,
  handleResultInput,
  handleRemarksChange,
  handleVerifyInDb,
  handleMarkRecollected,
  handleRejectSample,
  isLoading,
  saveStatus,
  currentUser,
  labSettings
}) {
  const [selectedDeptId, setSelectedDeptId] = useState("ALL");
  const [localStatus, setLocalStatus] = useState(null);
  const [localRemarks, setLocalRemarks] = useState(null);

  // CBC 3-Part Machine Quick Inputs
  const [cbcMachine, setCbcMachine] = useState({ wbc: "", gran: "", lymph: "", mid: "" });

  useEffect(() => {
    setLocalStatus(null);
    setLocalRemarks(null);
    setSelectedDeptId("ALL");
    setCbcMachine({ wbc: "", gran: "", lymph: "", mid: "" });
  }, [activeOrder?.orderId, activeOrder?.id]);

  if (!activeOrder) {
    return (
      <div className="py-20 text-center text-slate-400 max-w-xl mx-auto bg-white rounded-2xl border border-dashed border-slate-200">
        <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-xs text-slate-600">No active specimen selected for examination</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Select a patient order from the Dashboard or Worklists to begin result entry.</p>
      </div>
    );
  }

  const userRole = (currentUser?.role || "").toLowerCase();
  const canVerifyReport = ["developer", "manager", "admin", "verifier", "biochemist"].includes(userRole);

  const isVerified = activeOrder.isLocked === true || activeOrder.qcStatus === "Verified";
  const currentStatus = (localStatus || activeOrder.sample_status || activeOrder.sampleStatus || "").toLowerCase();
  const currentRemarks = (localRemarks !== null ? localRemarks : (activeOrder.verifierRemarks || "")).toUpperCase();

  const isAwaitingRecollection = !isVerified && (
    (currentStatus.includes("repeat") && !currentStatus.includes("recollected")) ||
    (currentRemarks.includes("RECOLLECTION REQUIRED") && !currentStatus.includes("recollected"))
  );

  const isLockedOrAwaiting = isVerified || isAwaitingRecollection;

  // Department grouping
  const departmentGroups = useMemo(() => {
    const rawTests = activeOrder.tests || [];
    const map = {};

    rawTests.forEach((t) => {
      const code = (t.code || "").toUpperCase();
      const name = (t.name || "").toUpperCase();
      let deptId = (t.dept_id || t.deptId || "DEP-BIO").toUpperCase();
      let deptName = "Clinical Biochemistry";
      let icon = "🧪";

      if (code.includes("CBC") || name.includes("BLOOD COUNT") || deptId.includes("HEM")) {
        deptId = "DEP-HEM";
        deptName = "Hematology";
        icon = "🩸";
      } else if (code.includes("URINE") || name.includes("URINE") || code.includes("STOOL") || name.includes("STOOL") || deptId.includes("PAT")) {
        deptId = "DEP-PAT";
        deptName = "Clinical Pathology";
        icon = "🧫";
      } else if (code.includes("WIDAL") || deptId.includes("MIC")) {
        deptId = "DEP-MIC";
        deptName = "Microbiology & Serology";
        icon = "🔬";
      } else if (code.includes("HISTO") || code.includes("FNAC") || code.includes("BX") || deptId.includes("HISTO")) {
        deptId = "DEP-HISTO";
        deptName = "Histopathology & Cytology";
        icon = "🔬";
      } else if (code.includes("XRAY") || deptId.includes("RAD") || code.includes("USG") || deptId.includes("USG") || code.includes("CT") || deptId.includes("CT") || code.includes("ECG") || deptId.includes("CARD")) {
        deptId = "DEP-RAD";
        deptName = "Radiology & Imaging";
        icon = "🩻";
      }

      if (!map[deptId]) {
        map[deptId] = {
          id: deptId,
          name: deptName,
          icon: icon,
          tests: []
        };
      }
      map[deptId].tests.push(t);
    });

    return Object.values(map).map((dept) => {
      let totalParams = 0;
      let filledParams = 0;

      dept.tests.forEach((test) => {
        const rawParams = test.test_parameters || test.parameters || [];
        const params = rawParams.length > 0 ? rawParams : [{ id: test.id, name: test.name }];
        totalParams += params.length;

        params.forEach((p) => {
          const val = activeOrder.results?.[p.id]?.value ?? activeOrder.results?.[test.id]?.value ?? "";
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            filledParams++;
          }
        });
      });

      return {
        ...dept,
        totalParams,
        filledParams,
        isComplete: totalParams > 0 && filledParams >= totalParams
      };
    });
  }, [activeOrder]);

  const activeDeptTests = useMemo(() => {
    if (selectedDeptId === "ALL") return activeOrder.tests || [];
    const targetDept = departmentGroups.find((d) => d.id === selectedDeptId);
    return targetDept ? targetDept.tests : [];
  }, [selectedDeptId, activeOrder, departmentGroups]);

  const findParam = (test, keywords) => {
    const keys = Array.isArray(keywords) ? keywords : [keywords];
    const params = test?.test_parameters || test?.parameters || [];
    return params.find((p) => {
      const pName = (p.name || "").toLowerCase();
      return keys.some((k) => pName === k.toLowerCase() || pName.includes(k.toLowerCase()));
    });
  };

  const getParamCurrentVal = (test, paramId) => {
    return activeOrder.results?.[paramId]?.value ?? activeOrder.results?.[test.id]?.value ?? "";
  };

  // Automated Calculators
  const handleCbcMachineCalculate = (field, val) => {
    const updated = { ...cbcMachine, [field]: val };
    setCbcMachine(updated);

    const wbc = parseFloat(updated.wbc) || 0;
    const gran = parseFloat(updated.gran) || 0;
    const lymph = parseFloat(updated.lymph) || 0;
    const mid = parseFloat(updated.mid) || 0;

    const cbcTest = (activeOrder.tests || []).find(t => (t.code || "").toUpperCase().includes("CBC") || (t.name || "").toLowerCase().includes("blood count"));
    if (!cbcTest) return;

    const setValByKey = (keywords, value) => {
      const p = findParam(cbcTest, keywords);
      if (p && value !== undefined && value !== null && value !== "") {
        handleResultInput(p.id, String(value));
      }
    };

    if (wbc > 0) setValByKey(["Total Leucocyte Count (WBC)", "WBC"], updated.wbc);

    if (gran > 0 || lymph > 0 || mid > 0) {
      if (gran > 0) setValByKey(["Granulocytes (Machine Gran%)"], updated.gran);
      if (lymph > 0) setValByKey(["Lymphocytes (Machine Lymph%)"], updated.lymph);
      if (mid > 0) setValByKey(["Mid-cells (Machine Mid%)"], updated.mid);

      let neutVal = Math.round(gran);
      let lymphVal = Math.round(lymph);
      let monoVal = Math.round(mid * 0.70);
      let eosVal = Math.max(1, Math.round(mid * 0.25));
      let basoVal = 0;

      const currentSum = neutVal + lymphVal + monoVal + eosVal + basoVal;
      if (currentSum !== 100 && currentSum > 0) {
        neutVal += (100 - currentSum);
      }

      setValByKey(["Neutrophils"], neutVal);
      setValByKey(["Lymphocytes"], lymphVal);
      setValByKey(["Monocytes"], monoVal);
      setValByKey(["Eosinophils"], eosVal);
      setValByKey(["Basophils"], basoVal);

      if (wbc > 0) {
        const aecVal = Math.round((wbc * eosVal) / 100);
        setValByKey(["Total Circulating Eosinophils (AEC)", "Circulating Eosinophils", "AEC"], aecVal);
      }
    }
  };

  const handleCalculateRbcIndices = () => {
    const cbcTest = (activeOrder.tests || []).find(t => (t.code || "").toUpperCase().includes("CBC") || (t.name || "").toLowerCase().includes("blood count"));
    if (!cbcTest) return;

    const getNum = (keys) => {
      const p = findParam(cbcTest, keys);
      if (!p) return 0;
      const v = getParamCurrentVal(cbcTest, p.id);
      return parseFloat(String(v).replace(/,/g, "")) || 0;
    };

    const setVal = (keys, val) => {
      const p = findParam(cbcTest, keys);
      if (p) handleResultInput(p.id, String(val));
    };

    const hb = getNum(["Hemoglobin (Hb)", "Haemoglobin", "Hb"]);
    const rbc = getNum(["Total Red Blood Cell Count (RBC)", "Total RBC", "RBC"]);
    let pcv = getNum(["Packed Cell Volume (PCV / Hematocrit)", "PCV", "HCT"]);

    if (pcv === 0 && hb > 0) {
      pcv = parseFloat((hb * 3).toFixed(1));
      setVal(["Packed Cell Volume (PCV / Hematocrit)", "PCV"], pcv);
    }

    if (rbc > 0 && pcv > 0) {
      setVal(["Mean Corpuscular Volume (MCV)", "MCV"], ((pcv * 10) / rbc).toFixed(1));
    }
    if (rbc > 0 && hb > 0) {
      setVal(["Mean Corpuscular Hemoglobin (MCH)", "MCH"], ((hb * 10) / rbc).toFixed(1));
    }
    if (pcv > 0 && hb > 0) {
      setVal(["Mean Corpuscular Hb Concentration (MCHC)", "MCHC"], ((hb * 100) / pcv).toFixed(1));
    }
  };

  const handleCalculateLipidProfile = (lipidTest) => {
    if (!lipidTest) return;
    const getNum = (keys) => {
      const p = findParam(lipidTest, keys);
      if (!p) return 0;
      const v = getParamCurrentVal(lipidTest, p.id);
      return parseFloat(String(v).replace(/,/g, "")) || 0;
    };
    const setVal = (keys, val) => {
      const p = findParam(lipidTest, keys);
      if (p) handleResultInput(p.id, String(val));
    };

    const tc = getNum(["Total Cholesterol", "Cholesterol"]);
    const tg = getNum(["Triglycerides"]);
    const hdl = getNum(["HDL Cholesterol", "HDL"]);

    if (tg > 0) {
      const vldl = Math.round(tg / 5);
      setVal(["VLDL Cholesterol (Calculated)", "VLDL"], vldl);
      if (tc > 0 && hdl > 0) {
        setVal(["LDL Cholesterol (Calculated)", "LDL"], Math.round(tc - hdl - vldl));
      }
    }

    if (tc > 0 && hdl > 0) {
      setVal(["Total Chol / HDL Ratio", "Ratio"], (tc / hdl).toFixed(1));
    }
  };

  const handleCalculateLFT = (lftTest) => {
    if (!lftTest) return;
    const getNum = (keys) => {
      const p = findParam(lftTest, keys);
      if (!p) return 0;
      const v = getParamCurrentVal(lftTest, p.id);
      return parseFloat(String(v).replace(/,/g, "")) || 0;
    };
    const setVal = (keys, val) => {
      const p = findParam(lftTest, keys);
      if (p) handleResultInput(p.id, String(val));
    };

    const tbil = getNum(["Total Bilirubin"]);
    const dbil = getNum(["Direct (Conjugated) Bilirubin", "Direct Bilirubin"]);
    if (tbil > 0 && dbil >= 0) {
      setVal(["Indirect (Unconjugated) Bilirubin", "Indirect Bilirubin"], Math.max(0, tbil - dbil).toFixed(2));
    }

    const tp = getNum(["Total Protein"]);
    const alb = getNum(["Serum Albumin", "Albumin"]);
    if (tp > 0 && alb > 0) {
      const glob = Math.max(0, tp - alb).toFixed(2);
      setVal(["Serum Globulin", "Globulin"], glob);
      if (parseFloat(glob) > 0) {
        setVal(["A / G Ratio", "A/G Ratio"], (alb / parseFloat(glob)).toFixed(2));
      }
    }
  };

  const handleFillNormalUrine = (test) => {
    if (!test || isLockedOrAwaiting) return;
    const normalMap = {
      "Color": "Straw", "Appearance": "Clear", "Specific Gravity": "1.015",
      "Reaction": "Acidic (6.0)", "Sediment": "Nil", "Albumin": "Nil", "Sugar": "Nil",
      "Ketone": "Negative", "Bilirubin": "Negative", "Urobilinogen": "Normal",
      "Nitrite": "Negative", "Bile Salt": "Negative", "Bile Pigment": "Negative",
      "Leukocyte Esterase": "Negative", "Pus Cells": "0 - 2 /HPF", "Epithelial": "1 - 2 /HPF",
      "Red Blood": "Nil", "Casts": "Nil", "Crystals": "Nil", "Calcium Oxalate": "Nil",
      "Amorphous": "Nil", "Bacteria": "Nil / Not Found", "Yeast": "Nil", "Trichomonas": "Nil"
    };

    const params = test.test_parameters || test.parameters || [];
    params.forEach((p) => {
      const pName = p.name || "";
      for (const [key, val] of Object.entries(normalMap)) {
        if (pName.toLowerCase().includes(key.toLowerCase())) {
          handleResultInput(p.id, val);
          break;
        }
      }
    });
  };

  const handleFillNormalStool = (test) => {
    if (!test || isLockedOrAwaiting) return;
    const normalMap = {
      "Color": "Yellowish Brown", "Consistency": "Soft / Formed", "Mucus": "Nil",
      "Blood": "Nil", "Reaction": "Neutral", "Occult Blood": "Negative",
      "Reducing Substance": "Negative", "Pus Cells": "0 - 2 /HPF", "Red Blood": "Nil",
      "Protozoa": "Not Found / Nil", "Ova": "Not Found / Nil", "Yeast": "Nil", "Macrophages": "Nil"
    };

    const params = test.test_parameters || test.parameters || [];
    params.forEach((p) => {
      const pName = p.name || "";
      for (const [key, val] of Object.entries(normalMap)) {
        if (pName.toLowerCase().includes(key.toLowerCase())) {
          handleResultInput(p.id, val);
          break;
        }
      }
    });
  };

  const onVerifyClick = async () => {
    if (activeOrder.isLocked) return;
    try {
      await handleVerifyInDb();
    } catch (e) {
      alert("Verification error: " + (e.message || e));
      return;
    }

    try {
      if (activeOrder.patient?.phone && activeOrder.patient.phone !== "N/A") {
        sendReportReadyWhatsApp(activeOrder, labSettings);
      }
    } catch (waErr) {}
  };

  const handleUnlockRecollected = async () => {
    const targetId = activeOrder?.orderId || activeOrder?.id;
    if (!targetId) return;
    const cleanRemarks = "New sample recollected. Clinically correlated and verified with quality control standards.";
    setLocalStatus("Sample Recollected");
    setLocalRemarks(cleanRemarks);
    if (handleRemarksChange) handleRemarksChange(cleanRemarks);
    try {
      await handleMarkRecollected(targetId);
    } catch (e) {}
  };

  const handleRejectInstant = async () => {
    if (!window.confirm("Reject this specimen as Hemolyzed and request repeat collection?")) return;
    const targetId = activeOrder?.orderId || activeOrder?.id;
    if (!targetId) return;
    const fullRemarks = "[RECOLLECTION REQUIRED: Hemolyzed Specimen]";
    setLocalStatus("Repeat Collection Required");
    setLocalRemarks(fullRemarks);
    if (handleRemarksChange) handleRemarksChange(fullRemarks);
    try {
      await handleRejectSample(targetId, "Hemolyzed Specimen");
    } catch (e) {}
  };

  const hasCbcTest = useMemo(() => {
    return (activeOrder.tests || []).some(t => (t.code || "").toUpperCase().includes("CBC") || (t.name || "").toLowerCase().includes("blood count"));
  }, [activeOrder]);

  return (
    <div className="space-y-3.5 max-w-[1720px] mx-auto text-slate-900 font-sans">
      
      {/* 1. RECOLLECTION WARNING BANNER */}
      {isAwaitingRecollection && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-xs text-rose-950 uppercase tracking-tight">
                Specimen Rejected (Hemolyzed) — Awaiting Repeat Collection
              </p>
              <p className="text-[11px] text-rose-700">
                Inputs are locked until the fresh clinical sample is delivered.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUnlockRecollected}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Mark Recollected (Unlock)
          </button>
        </div>
      )}

      {/* 2. COMPACT PATIENT & VIAL HEADER */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">{activeOrder.patient?.name || "Patient"}</span>
            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
              {activeOrder.patient?.id || "N/A"}
            </span>
            <span className="text-[11px] text-slate-500">
              {activeOrder.patient?.age || "?"}Y / {activeOrder.patient?.gender || "?"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5 text-slate-400" />
              {(activeOrder.tests || []).reduce((acc, t) => {
                const code = getDepartmentVialBarcode(activeOrder, t.dept_id || t.deptId);
                const tube = (t.tube_color || "Vial").split(" ")[0];
                if (!acc.some((x) => x.code === code)) acc.push({ code, tube });
                return acc;
              }, []).map((v, i) => (
                <span key={i} className="font-mono font-semibold bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded border border-slate-200 text-[10px] mr-1">
                  {v.tube}: {v.code}
                </span>
              ))}
            </span>
            <span className="text-slate-300">•</span>
            <span>Ref: <b className="text-slate-700">{activeOrder.patient?.doctor || activeOrder.doctor || "Self"}</b></span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {saveStatus?.state === "saving" && (
            <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
              <CloudUpload className="w-3.5 h-3.5 animate-pulse" /> Syncing...
            </span>
          )}

          {!activeOrder.isLocked && !isAwaitingRecollection && (
            <button
              type="button"
              onClick={handleRejectInstant}
              className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> Reject (Hemolyzed)
            </button>
          )}

          {canVerifyReport ? (
            <button
              type="button"
              onClick={onVerifyClick}
              disabled={isLockedOrAwaiting || isLoading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {activeOrder.isLocked ? "Report Verified & Signed" : "Verify & Complete Report"}
            </button>
          ) : (
            <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-xs font-semibold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Technologist Mode
            </div>
          )}
        </div>
      </div>

      {/* 3. DEPARTMENT TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setSelectedDeptId("ALL")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
            selectedDeptId === "ALL"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Tests</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-200">
            {activeOrder.tests?.length || 0}
          </span>
        </button>

        {departmentGroups.map((dept) => {
          const isActive = selectedDeptId === dept.id;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => setSelectedDeptId(dept.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 border ${
                isActive
                  ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>{dept.icon}</span>
              <span>{dept.name}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold ${
                isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {dept.filledParams}/{dept.totalParams}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. CBC 3-PART & 5-PART AUTO-CALCULATOR BENCH */}
      {hasCbcTest && (selectedDeptId === "ALL" || selectedDeptId === "DEP-HEM") && !isLockedOrAwaiting && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-3.5 rounded-xl shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs tracking-tight">
                3-Part Cell Counter Auto-Differential & RBC Indices Bench
              </span>
            </div>
            <button
              type="button"
              onClick={handleCalculateRbcIndices}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs transition"
            >
              <Sparkles className="w-3 h-3" /> Auto-Calculate RBC Indices (MCV, MCH, MCHC)
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-300 block mb-0.5">Total WBC (/cumm)</label>
              <input
                type="text"
                placeholder="e.g. 11780"
                value={cbcMachine.wbc}
                onChange={(e) => handleCbcMachineCalculate("wbc", e.target.value)}
                className="w-full px-2 py-1 bg-white text-slate-900 rounded font-bold font-mono outline-none text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-300 block mb-0.5">Granulocytes (Gran%)</label>
              <input
                type="text"
                placeholder="e.g. 51"
                value={cbcMachine.gran}
                onChange={(e) => handleCbcMachineCalculate("gran", e.target.value)}
                className="w-full px-2 py-1 bg-white text-slate-900 rounded font-bold font-mono outline-none text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-300 block mb-0.5">Lymphocytes (Lymph%)</label>
              <input
                type="text"
                placeholder="e.g. 43"
                value={cbcMachine.lymph}
                onChange={(e) => handleCbcMachineCalculate("lymph", e.target.value)}
                className="w-full px-2 py-1 bg-white text-slate-900 rounded font-bold font-mono outline-none text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-300 block mb-0.5">Mid-cells (Mid%)</label>
              <input
                type="text"
                placeholder="e.g. 6"
                value={cbcMachine.mid}
                onChange={(e) => handleCbcMachineCalculate("mid", e.target.value)}
                className="w-full px-2 py-1 bg-white text-slate-900 rounded font-bold font-mono outline-none text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. STRUCTURED TEST PARAMETERS LIST */}
      <div className="space-y-3">
        {activeDeptTests.map((test) => {
          const testNameLow = (test.name || "").toLowerCase();
          const testCodeUp = (test.code || "").toUpperCase();
          const rawParams = test.test_parameters || test.parameters || [];

          const isUrine = testCodeUp.includes("URINE") || testNameLow.includes("urine");
          const isStool = testCodeUp.includes("STOOL") || testNameLow.includes("stool");
          const isWidal = testCodeUp.includes("WIDAL") || testNameLow.includes("widal");
          const isLipid = testCodeUp.includes("LIPID") || testNameLow.includes("lipid");
          const isLFT = testCodeUp.includes("LFT") || testNameLow.includes("liver function");
          const isBloodGroup = testCodeUp.includes("ABO") || testCodeUp.includes("GROUP") || testNameLow.includes("blood group");

          // Universal Descriptive / Narrative Check
          const isDescriptiveTest = isDescriptiveInvestigation(test, test.dept_id || test.deptId, "");

          // =========================================================
          // A. DESCRIPTIVE STUDY WORKBENCH (WITH CATALOG TEMPLATE)
          // =========================================================
          if (isDescriptiveTest) {
            const param = rawParams[0] || { id: test.id, name: test.name };
            const paramId = param.id;
            const currentVal = getParamCurrentVal(test, paramId);
            const catalogTemplate = param.reference_text || param.ref_text || param.default_template || "";

            return (
              <div key={test.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs uppercase text-slate-900">
                      {test.name} {test.code ? `(${test.code})` : ""}
                    </span>
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[9px] font-bold">
                      Descriptive Study
                    </span>
                  </div>

                  {!isLockedOrAwaiting && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {catalogTemplate && (
                        <button
                          type="button"
                          onClick={() => handleResultInput(paramId, catalogTemplate)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs transition"
                          title="Insert pre-configured template from Test Catalogue"
                        >
                          <FileCode className="w-3 h-3" /> ⚡ Load Catalogue Template
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleResultInput(paramId, "CLINICAL INDICATION: Routine clinical evaluation.\nTECHNIQUE: Standard clinical protocol.\n\nFINDINGS:\nNo significant pathological abnormality detected. Normal study.\n\nIMPRESSION:\nNormal examination findings.")}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> Normal Study
                      </button>

                      {currentVal && (
                        <button
                          type="button"
                          onClick={() => handleResultInput(paramId, "")}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-semibold transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={8}
                    disabled={isLockedOrAwaiting}
                    value={currentVal}
                    onChange={(e) => handleResultInput(paramId, e.target.value)}
                    placeholder="Type or load your clinical study findings here (e.g. CLINICAL INDICATION, FINDINGS, IMPRESSION)..."
                    className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 disabled:bg-slate-100 leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-1">
                    <span>Formats automatically on official report with Indication, Observations & Impression.</span>
                    <span>{currentVal.length} chars</span>
                  </div>
                </div>
              </div>
            );
          }

          // =========================================================
          // B. QUANTITATIVE / TABULAR WORKBENCH
          // =========================================================
          return (
            <div key={test.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 uppercase">
                    {test.name} {test.code ? `(${test.code})` : ""}
                  </span>
                  {rawParams.length > 1 && (
                    <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase">
                      Profile Panel
                    </span>
                  )}
                </div>

                {/* 1-Click Profile Helper Actions */}
                <div className="flex items-center gap-1.5">
                  {isUrine && !isLockedOrAwaiting && (
                    <button
                      type="button"
                      onClick={() => handleFillNormalUrine(test)}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs transition"
                    >
                      <Droplets className="w-3 h-3" /> Fill Routine Normal Urine
                    </button>
                  )}

                  {isStool && !isLockedOrAwaiting && (
                    <button
                      type="button"
                      onClick={() => handleFillNormalStool(test)}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs transition"
                    >
                      <Microscope className="w-3 h-3" /> Fill Routine Normal Stool
                    </button>
                  )}

                  {isLipid && !isLockedOrAwaiting && (
                    <button
                      type="button"
                      onClick={() => handleCalculateLipidProfile(test)}
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs transition"
                    >
                      <Calculator className="w-3 h-3" /> Auto-Calculate LDL & VLDL
                    </button>
                  )}

                  {isLFT && !isLockedOrAwaiting && (
                    <button
                      type="button"
                      onClick={() => handleCalculateLFT(test)}
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs transition"
                    >
                      <Calculator className="w-3 h-3" /> Auto-Calculate Indirect Bilirubin & A/G
                    </button>
                  )}

                  <span className="text-[10px] text-slate-400 font-mono">
                    {rawParams.length} Parameters
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-semibold uppercase bg-white">
                      <th className="py-2 px-3 w-1/3">Investigation Parameter</th>
                      <th className="py-2 px-3 w-64">Observed Finding / Result</th>
                      <th className="py-2 px-3 w-20">Unit</th>
                      <th className="py-2 px-3">Biological Reference Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawParams.map((p) => {
                      const val = getParamCurrentVal(test, p.id);
                      const pName = (p.name || "").toLowerCase();
                      const isQual = p.param_type === "qualitative";

                      const { isAbnormal, flag } = checkAbnormalStatus(val, p.min_range, p.max_range, p.param_type);

                      const isUrineDipstick = isUrine && (
                        pName.includes("albumin") || pName.includes("protein") ||
                        pName.includes("sugar") || pName.includes("glucose") ||
                        pName.includes("ketone") || pName.includes("bilirubin") ||
                        pName.includes("nitrite") || pName.includes("blood")
                      );
                      const isUrineAppearance = isUrine && (pName.includes("appearance") || pName.includes("clarity"));
                      const isUrineColor = isUrine && pName.includes("color");
                      const isWidalTiter = isWidal && pName.includes("titer");

                      return (
                        <tr key={p.id} className={`hover:bg-slate-50/60 transition ${isAbnormal ? "bg-rose-50/30" : ""}`}>
                          <td className="py-2 px-3 font-medium text-slate-800 align-top">
                            <div className="flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {isAbnormal && (
                                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[9px] font-bold rounded">
                                  {flag}
                                </span>
                              )}
                            </div>

                            {!isLockedOrAwaiting && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {isUrineDipstick && ["Nil", "Trace", "+", "++", "+++"].map((pill) => (
                                  <button
                                    key={pill}
                                    type="button"
                                    onClick={() => handleResultInput(p.id, pill)}
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                      val === pill ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    {pill}
                                  </button>
                                ))}

                                {isUrineColor && ["Straw", "Pale Yellow", "Amber", "Reddish"].map((pill) => (
                                  <button
                                    key={pill}
                                    type="button"
                                    onClick={() => handleResultInput(p.id, pill)}
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                      val === pill ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    {pill}
                                  </button>
                                ))}

                                {isUrineAppearance && ["Clear", "Slightly Hazy", "Turbid"].map((pill) => (
                                  <button
                                    key={pill}
                                    type="button"
                                    onClick={() => handleResultInput(p.id, pill)}
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                      val === pill ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    {pill}
                                  </button>
                                ))}

                                {isBloodGroup && ["A (+ve)", "B (+ve)", "O (+ve)", "AB (+ve)", "A (-ve)", "B (-ve)", "O (-ve)", "AB (-ve)"].map((pill) => (
                                  <button
                                    key={pill}
                                    type="button"
                                    onClick={() => handleResultInput(p.id, pill)}
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                      val === pill ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    {pill}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="py-2 px-3 align-top">
                            {isWidalTiter ? (
                              <select
                                disabled={isLockedOrAwaiting}
                                value={val}
                                onChange={(e) => handleResultInput(p.id, e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded font-semibold text-xs bg-white outline-none focus:border-blue-500 disabled:bg-slate-100"
                              >
                                <option value="">-- Select Titer --</option>
                                <option value="< 1:20">&lt; 1:20</option>
                                <option value="1:20">1:20</option>
                                <option value="1:40">1:40</option>
                                <option value="1:80">1:80</option>
                                <option value="1:160">1:160</option>
                                <option value="1:320">1:320</option>
                              </select>
                            ) : isQual ? (
                              <select
                                disabled={isLockedOrAwaiting}
                                value={val}
                                onChange={(e) => handleResultInput(p.id, e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded font-semibold text-xs bg-white outline-none focus:border-blue-500 disabled:bg-slate-100"
                              >
                                <option value="">-- Select --</option>
                                <option value="Nil">Nil</option>
                                <option value="Negative">Negative (Non-Reactive)</option>
                                <option value="Positive">Positive (Reactive)</option>
                                <option value="Trace">Trace</option>
                                <option value="+">+ (1+)</option>
                                <option value="++">++ (2+)</option>
                                <option value="+++">+++ (3+)</option>
                                <option value="++++">++++ (4+)</option>
                              </select>
                            ) : (
                              <div className="relative">
                                <input
                                  type="text"
                                  disabled={isLockedOrAwaiting}
                                  value={val}
                                  onChange={(e) => handleResultInput(p.id, e.target.value)}
                                  placeholder="Result"
                                  className={`w-full px-2 py-1 border rounded font-mono font-bold text-xs outline-none bg-white disabled:bg-slate-100 transition ${
                                    isAbnormal 
                                      ? "border-rose-400 text-rose-950 focus:border-rose-500 bg-rose-50/40" 
                                      : "border-slate-200 text-slate-900 focus:border-blue-500"
                                  }`}
                                />
                              </div>
                            )}
                          </td>

                          <td className="py-2 px-3 font-mono text-slate-500 text-[11px] align-top">
                            {p.unit || "—"}
                          </td>

                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px] align-top whitespace-pre-line leading-relaxed">
                            {p.reference_text || (p.min_range !== null && p.max_range !== null ? `${p.min_range} - ${p.max_range}` : "Normal")}
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

      {/* 6. PATHOLOGIST REMARKS BOX */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5 text-xs">
        <label className="font-bold text-slate-700 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Pathologist Clinical Remarks & Interpretation:
        </label>
        <textarea
          rows={2}
          disabled={isLockedOrAwaiting}
          value={localRemarks !== null ? localRemarks : (activeOrder.verifierRemarks || "")}
          onChange={(e) => {
            setLocalRemarks(e.target.value);
            if (handleRemarksChange) handleRemarksChange(e.target.value);
          }}
          placeholder="e.g. Microscopic findings correlate with acute infection. Clinical correlation advised."
          className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium bg-slate-50 disabled:bg-slate-100 text-slate-800"
        />
      </div>

    </div>
  );
}
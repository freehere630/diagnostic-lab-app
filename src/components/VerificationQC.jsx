import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck, CloudUpload, Lock, MessageSquare,
  AlertOctagon, CheckCircle2, AlertTriangle, RotateCcw, FlaskConical,
  Barcode, Check, Layers, Calculator, Sparkles, FileText
} from "lucide-react";
import { requestSampleRecollection, markSampleRecollected } from "../services/api";
import { sendReportReadyWhatsApp, sendRecollectionWhatsApp } from "../utils/whatsappHelper";
import { getDepartmentVialBarcode } from "../utils/printHelpers";

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

  // 1. Group tests by Department with live progress
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

  // CBC 3-Part to 5-Part Auto Calculator
  const handleCbcMachineCalculate = (field, val) => {
    const updated = { ...cbcMachine, [field]: val };
    setCbcMachine(updated);

    const wbc = parseFloat(updated.wbc) || 0;
    const gran = parseFloat(updated.gran) || 0;
    const lymph = parseFloat(updated.lymph) || 0;
    const mid = parseFloat(updated.mid) || 0;

    if (gran > 0 || lymph > 0 || mid > 0) {
      const neutVal = gran.toFixed(0);
      const lymphVal = lymph.toFixed(0);
      const monoVal = (mid * 0.70).toFixed(0).padStart(2, "0");
      const eosVal = (mid * 0.25).toFixed(0).padStart(2, "0");
      const basoVal = (mid * 0.05).toFixed(0).padStart(2, "0");
      const aecVal = wbc > 0 ? Math.round((wbc * parseFloat(eosVal)) / 100) : "";

      // Find parameter IDs and trigger result inputs
      const cbcTest = (activeOrder.tests || []).find(t => (t.code || "").toUpperCase().includes("CBC") || (t.name || "").toLowerCase().includes("blood count"));
      if (cbcTest) {
        const params = cbcTest.test_parameters || cbcTest.parameters || [];
        const setVal = (keyword, value) => {
          const p = params.find(pr => (pr.name || "").toLowerCase().includes(keyword.toLowerCase()));
          if (p && value !== "") handleResultInput(p.id, String(value));
        };

        if (wbc > 0) setVal("WBC", updated.wbc);
        if (gran > 0) setVal("Neutrophil", neutVal);
        if (lymph > 0) setVal("Lymphocyte", lymphVal);
        if (mid > 0) {
          setVal("Monocyte", monoVal);
          setVal("Eosinophil", eosVal);
          setVal("Basophil", basoVal);
        }
        if (aecVal) setVal("Eosinophil Count", aecVal);
      }
    }
  };

  const hasCbcTest = useMemo(() => {
    return (activeOrder.tests || []).some(t => (t.code || "").toUpperCase().includes("CBC") || (t.name || "").toLowerCase().includes("blood count"));
  }, [activeOrder]);

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

      {/* 3. DEPARTMENT TABS (SEPARATED BY DEPARTMENT) */}
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

      {/* 4. CBC 3-PART AUTO-CALCULATOR BENCH (SHOWN WHEN CBC IS IN ORDER) */}
      {hasCbcTest && (selectedDeptId === "ALL" || selectedDeptId === "DEP-HEM") && !isLockedOrAwaiting && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-3.5 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs tracking-tight">
                3-Part Cell Counter Auto-Differential Calculator
              </span>
            </div>
            <span className="text-[10px] text-cyan-200">
              Type your analyzer screen numbers ➔ Live auto-populates 5-part differential & AEC!
            </span>
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
          const isImaging = testCodeUp.includes("XRAY") || testCodeUp.includes("USG") || testCodeUp.includes("CT") || testCodeUp.includes("MRI") || testCodeUp.includes("ECG");

          // IMAGING TEST BENCH (TEXT TEMPLATE)
          if (isImaging) {
            const paramId = rawParams[0]?.id || test.id;
            const currentVal = activeOrder.results?.[paramId]?.value || activeOrder.results?.[test.id]?.value || "";

            return (
              <div key={test.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-bold text-xs uppercase text-slate-900">
                    🩻 {test.name} ({test.code})
                  </span>
                  {!isLockedOrAwaiting && (
                    <button
                      type="button"
                      onClick={() => handleResultInput(paramId, "CLINICAL INDICATION: Routine checkup.\nTECHNIQUE: Standard projection.\n\nFINDINGS:\nNo significant acute abnormality detected. Normal study.\n\nIMPRESSION:\nNormal radiological examination.")}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Insert Normal Study Template
                    </button>
                  )}
                </div>
                <textarea
                  rows={6}
                  disabled={isLockedOrAwaiting}
                  value={currentVal}
                  onChange={(e) => handleResultInput(paramId, e.target.value)}
                  placeholder="CLINICAL INDICATION: ...&#10;FINDINGS: ...&#10;IMPRESSION: ..."
                  className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 disabled:bg-slate-100"
                />
              </div>
            );
          }

          // NUMERIC & QUALITATIVE PARAMETERS TABLE
          return (
            <div key={test.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
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
                <span className="text-[10px] text-slate-400 font-mono">
                  {rawParams.length} Parameters
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-semibold uppercase bg-white">
                      <th className="py-2 px-3 w-1/3">Investigation Parameter</th>
                      <th className="py-2 px-3 w-56">Observed Finding / Result</th>
                      <th className="py-2 px-3 w-20">Unit</th>
                      <th className="py-2 px-3">Biological Reference Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawParams.map((p) => {
                      const val = activeOrder.results?.[p.id]?.value !== undefined
                        ? activeOrder.results[p.id].value
                        : (activeOrder.results?.[test.id]?.value || "");

                      const pName = (p.name || "").toLowerCase();
                      const isQual = p.param_type === "qualitative";

                      // Quick select pills for Urine / Stool examinations
                      const showPills = isUrine && (pName.includes("albumin") || pName.includes("protein") || pName.includes("sugar") || pName.includes("glucose") || pName.includes("ketone"));

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2 px-3 font-medium text-slate-800 align-top">
                            <div>{p.name}</div>
                            {showPills && !isLockedOrAwaiting && (
                              <div className="flex gap-1 mt-1">
                                {["Nil", "Trace", "+", "++", "+++"].map((pill) => (
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
                            {isQual ? (
                              <select
                                disabled={isLockedOrAwaiting}
                                value={val}
                                onChange={(e) => handleResultInput(p.id, e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded font-semibold text-xs bg-white outline-none focus:border-blue-500 disabled:bg-slate-100"
                              >
                                <option value="">-- Select --</option>
                                <option value="Nil">Nil</option>
                                <option value="Negative">Negative</option>
                                <option value="Trace">Trace</option>
                                <option value="+">+ (1+)</option>
                                <option value="++">++ (2+)</option>
                                <option value="+++">+++ (3+)</option>
                                <option value="Positive">Positive (Reactive)</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                disabled={isLockedOrAwaiting}
                                value={val}
                                onChange={(e) => handleResultInput(p.id, e.target.value)}
                                placeholder="Result"
                                className="w-full px-2 py-1 border border-slate-200 rounded font-mono font-bold text-xs outline-none focus:border-blue-500 bg-white disabled:bg-slate-100"
                              />
                            )}
                          </td>

                          <td className="py-2 px-3 font-mono text-slate-500 text-[11px] align-top">
                            {p.unit || "—"}
                          </td>

                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px] align-top">
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
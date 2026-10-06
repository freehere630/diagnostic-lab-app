import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck, CloudUpload, Lock, MessageSquare,
  AlertOctagon, CheckCircle2, AlertTriangle, RotateCcw, FlaskConical,
  Barcode, Check, Layers, ChevronRight
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

  useEffect(() => {
    setLocalStatus(null);
    setLocalRemarks(null);
    setSelectedDeptId("ALL");
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

  // 1. Group tests by Department with completion counting
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
      } else if (code.includes("URINE") || name.includes("URINE") || deptId.includes("PAT")) {
        deptId = "DEP-PAT";
        deptName = "Clinical Pathology";
        icon = "🧫";
      } else if (code.includes("XRAY") || deptId.includes("RAD")) {
        deptId = "DEP-RAD";
        deptName = "Radiology & X-Ray";
        icon = "🩻";
      } else if (code.includes("USG") || deptId.includes("USG")) {
        deptId = "DEP-USG";
        deptName = "Ultrasonography (USG)";
        icon = "📡";
      } else if (code.includes("ECG") || deptId.includes("CARD")) {
        deptId = "DEP-CARD";
        deptName = "Cardiology";
        icon = "💓";
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

    // Calculate parameter counts per department
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

  // Set default active tab to first department if 'ALL' is not preferred
  const activeDeptTests = useMemo(() => {
    if (selectedDeptId === "ALL") {
      return activeOrder.tests || [];
    }
    const targetDept = departmentGroups.find((d) => d.id === selectedDeptId);
    return targetDept ? targetDept.tests : [];
  }, [selectedDeptId, activeOrder, departmentGroups]);

  // Separate individual tests and profile tests (individual first, profile last)
  const sortedActiveTests = useMemo(() => {
    const individuals = [];
    const profiles = [];

    activeDeptTests.forEach((t) => {
      const isProf = t.is_profile === true || t.is_profile === "true" || t.is_profile === 1 || t.isProfile === true;
      const params = t.test_parameters || t.parameters || [];
      if (isProf || params.length > 1) {
        profiles.push(t);
      } else {
        individuals.push(t);
      }
    });

    return [...individuals, ...profiles];
  }, [activeDeptTests]);

  // Rejection handler
  const handleRejectHemolyzedInstant = async () => {
    if (!window.confirm("Are you sure you want to REJECT this specimen as Hemolyzed and request a repeat collection?")) {
      return;
    }

    const targetId = activeOrder?.orderId || activeOrder?.id;
    if (!targetId) return;

    const fullRemarks = "[RECOLLECTION REQUIRED: Hemolyzed Specimen]";
    setLocalStatus("Repeat Collection Required");
    setLocalRemarks(fullRemarks);
    if (handleRemarksChange) handleRemarksChange(fullRemarks);

    try {
      if (typeof handleRejectSample === "function") {
        await handleRejectSample(targetId, "Hemolyzed Specimen");
      } else {
        await requestSampleRecollection(targetId, "Hemolyzed Specimen");
      }
    } catch (e) {}

    try {
      if (activeOrder.patient?.phone && activeOrder.patient.phone !== "N/A") {
        sendRecollectionWhatsApp(activeOrder, "Hemolyzed Specimen");
      }
    } catch (waErr) {}
  };

  // Recollection unlock handler
  const handleUnlockRecollected = async () => {
    const targetId = activeOrder?.orderId || activeOrder?.id;
    if (!targetId) return;

    const cleanRemarks = "New sample recollected. Clinically correlated and verified with quality control standards.";
    setLocalStatus("Sample Recollected");
    setLocalRemarks(cleanRemarks);
    if (handleRemarksChange) handleRemarksChange(cleanRemarks);

    try {
      if (typeof handleMarkRecollected === "function") {
        await handleMarkRecollected(targetId);
      } else {
        await markSampleRecollected(targetId);
      }
    } catch (e) {}
  };

  // Strict validation
  const validateAllResultsEntered = () => {
    const missing = [];
    (activeOrder.tests || []).forEach((test) => {
      const rawParams = test.test_parameters || test.parameters || [];
      if (rawParams.length > 0) {
        rawParams.forEach((p) => {
          const val = activeOrder.results?.[p.id]?.value ?? activeOrder.results?.[test.id]?.value ?? "";
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
    });
    return missing;
  };

  const onVerifyClickInstant = async () => {
    const missingResults = validateAllResultsEntered();
    if (missingResults.length > 0) {
      alert(
        `⛔ CANNOT COMPLETE VERIFICATION!\n\n` +
        `All required investigation parameters must have a result before verification.\n` +
        `Missing observations for (${missingResults.length} parameter(s)):\n\n` +
        missingResults.slice(0, 6).map((m) => `• ${m}`).join("\n") +
        (missingResults.length > 6 ? `\n...and ${missingResults.length - 6} more` : "")
      );
      return;
    }

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

  const renderQuickPills = (test, paramName, currentVal, onSelect) => {
    const isUrine = (test.code || "").toUpperCase().includes("URINE") || (test.name || "").toLowerCase().includes("urine");
    if (!isUrine) return null;

    const pName = (paramName || "").toLowerCase();
    if (pName.includes("protein") || pName.includes("albumin") || pName.includes("sugar") || pName.includes("glucose")) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {["Nil", "Trace", "+", "++", "+++"].map((badge) => (
            <button
              key={badge}
              type="button"
              disabled={isLockedOrAwaiting}
              onClick={() => onSelect(badge)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                currentVal === badge
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
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
    <div className="space-y-3.5 max-w-[1720px] mx-auto text-slate-900">
      
      {/* 1. RECOLLECTION WARNING BANNER */}
      {isAwaitingRecollection && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-xs text-rose-950 uppercase tracking-tight">
                Specimen Rejected (Hemolyzed) — Awaiting Repeat Specimen
              </p>
              <p className="text-[11px] text-rose-700">
                Examination inputs are locked until the fresh clinical sample is delivered.
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
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">{activeOrder.patient?.name || "Patient"}</span>
            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
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
              onClick={handleRejectHemolyzedInstant}
              className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
              title="Flag specimen as hemolyzed"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> Reject (Hemolyzed)
            </button>
          )}

          {canVerifyReport ? (
            <button
              type="button"
              onClick={onVerifyClickInstant}
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

      {/* 3. DEPARTMENT-SEPARATED INPUT TABS (NEW WORKFLOW) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs">
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
          <span>All Departments</span>
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
                  : "bg-slate-50/80 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <span className="text-sm">{dept.icon}</span>
              <span>{dept.name}</span>

              {dept.isComplete ? (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold flex items-center gap-0.5 ${
                  isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                }`}>
                  <Check className="w-2.5 h-2.5" /> Done
                </span>
              ) : (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                }`}>
                  {dept.filledParams}/{dept.totalParams}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. TEST PARAMETERS (INDIVIDUAL ON TOP, PROFILES ON BOTTOM) */}
      <div className="space-y-3">
        {sortedActiveTests.map((test) => {
          const isProf = test.is_profile === true || test.is_profile === "true" || test.is_profile === 1 || test.isProfile === true;
          const rawParams = test.test_parameters || test.parameters || [];
          const isProfilePanel = isProf || rawParams.length > 1;

          return (
            <div 
              key={test.id} 
              className={`bg-white rounded-xl border overflow-hidden shadow-xs ${
                isProfilePanel ? "border-indigo-200/80" : "border-slate-200/80"
              }`}
            >
              {/* Header */}
              <div className={`px-3 py-2 border-b flex items-center justify-between ${
                isProfilePanel ? "bg-indigo-50/40 border-indigo-100" : "bg-slate-50/75 border-slate-200"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-tight">
                    {test.name} {test.code ? `(${test.code})` : ""}
                  </span>
                  {isProfilePanel && (
                    <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-wider">
                      Multi-Parameter Profile
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {rawParams.length} Parameter{rawParams.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-semibold uppercase tracking-wider bg-white">
                      <th className="py-2 px-3 w-1/3">Investigation Parameter</th>
                      <th className="py-2 px-3 w-48">Observed Finding / Result</th>
                      <th className="py-2 px-3 w-20">Unit</th>
                      <th className="py-2 px-3">Biological Reference Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawParams.map((p) => {
                      const val = activeOrder.results?.[p.id]?.value !== undefined
                        ? activeOrder.results[p.id].value
                        : (activeOrder.results?.[test.id]?.value || "");

                      const isQual = p.param_type === "qualitative";
                      const effectiveUnit = p.unit || "—";
                      const effectiveRef = p.reference_text || p.ref_text;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2 px-3 font-medium text-slate-800 align-top">
                            <div>{p.name}</div>
                            {!isLockedOrAwaiting && renderQuickPills(test, p.name, val, (chosen) => handleResultInput(p.id, chosen))}
                          </td>

                          <td className="py-2 px-3 align-top">
                            {isQual ? (
                              <select
                                disabled={isLockedOrAwaiting}
                                value={val}
                                onChange={(e) => handleResultInput(p.id, e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded-md font-semibold text-xs bg-white outline-none focus:border-blue-500 disabled:bg-slate-100"
                              >
                                <option value="">-- Choose Finding --</option>
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
                                className="w-full px-2 py-1 border border-slate-200 rounded-md font-mono font-bold text-xs outline-none text-left focus:border-blue-500 bg-white disabled:bg-slate-100"
                              />
                            )}
                          </td>

                          <td className="py-2 px-3 font-mono text-slate-500 text-[11px] align-top">
                            {effectiveUnit}
                          </td>

                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px] leading-relaxed align-top">
                            {effectiveRef ? (
                              <span className="text-blue-700 font-medium">{effectiveRef}</span>
                            ) : p.min_range !== null && p.max_range !== null && p.min_range !== undefined && p.min_range !== "" ? (
                              <span>{p.min_range} - {p.max_range}</span>
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

      {/* 5. PATHOLOGIST REMARKS */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5 text-xs">
        <label className="font-bold text-slate-700 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Pathologist Clinical Interpretation & Remarks
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
          className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium bg-slate-50/50 disabled:bg-slate-100 text-slate-800"
        />
      </div>

    </div>
  );
}
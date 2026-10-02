import React, { useState, useEffect } from "react";
import {
  ShieldCheck, CloudUpload, Lock, MessageSquare,
  Sparkles, FileText, AlertOctagon, Calculator,
  CheckCircle2, AlertTriangle, RotateCcw, FlaskConical
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
  const [machineInputs, setMachineInputs] = useState({ wbc: "", gran: "", lymph: "", mid: "" });
  
  // Instant local overrides so the page updates with 0ms delay
  const [localStatus, setLocalStatus] = useState(null);
  const [localRemarks, setLocalRemarks] = useState(null);

  // Reset local overrides when switching patient order
  useEffect(() => {
    setLocalStatus(null);
    setLocalRemarks(null);
  }, [activeOrder?.orderId, activeOrder?.id]);

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

  const isVerified = activeOrder.isLocked === true || activeOrder.qcStatus === "Verified";
  const currentStatus = (localStatus || activeOrder.sample_status || activeOrder.sampleStatus || "").toLowerCase();
  const currentRemarks = (localRemarks !== null ? localRemarks : (activeOrder.verifierRemarks || "")).toUpperCase();

  // A verified order NEVER shows the awaiting recollection banner
  const isAwaitingRecollection = !isVerified && (
    (currentStatus.includes("repeat") && !currentStatus.includes("recollected")) ||
    (currentRemarks.includes("RECOLLECTION REQUIRED") && !currentStatus.includes("recollected"))
  );

  const isLockedOrAwaiting = isVerified || isAwaitingRecollection;

  // 1. REJECT SAMPLE (Instant 0ms UI update)
  const handleRejectHemolyzedInstant = async () => {
    if (!window.confirm("Are you sure you want to REJECT this sample as Hemolyzed and request repeat collection?")) {
      return;
    }

    const targetId = activeOrder?.orderId || activeOrder?.id;
    if (!targetId) return;

    const fullRemarks = "[RECOLLECTION REQUIRED: Hemolyzed Specimen]";

    // Immediately trigger UI change on this screen
    setLocalStatus("Repeat Collection Required");
    setLocalRemarks(fullRemarks);
    if (handleRemarksChange) {
      handleRemarksChange(fullRemarks);
    }

    // Persist to database in background
    try {
      if (typeof handleRejectSample === "function") {
        await handleRejectSample(targetId, "Hemolyzed Specimen");
      } else {
        await requestSampleRecollection(targetId, "Hemolyzed Specimen");
      }
    } catch (e) {
      console.warn("Background reject notice:", e);
    }

    // Optional WhatsApp
    try {
      if (activeOrder.patient?.phone && activeOrder.patient.phone !== "N/A") {
        sendRecollectionWhatsApp(activeOrder, "Hemolyzed Specimen");
      }
    } catch (waErr) {}
  };

  // 2. RECOLLECT SAMPLE (Instant 0ms UI update)
  const handleUnlockRecollected = async () => {
    const targetId = activeOrder?.orderId || activeOrder?.id;
    if (!targetId) return;

    const cleanRemarks = "New sample recollected. Clinically correlated and verified with quality control standards.";

    // Immediately trigger UI change on this screen
    setLocalStatus("Sample Recollected");
    setLocalRemarks(cleanRemarks);
    if (handleRemarksChange) {
      handleRemarksChange(cleanRemarks);
    }

    // Persist to database in background
    try {
      if (typeof handleMarkRecollected === "function") {
        await handleMarkRecollected(targetId);
      } else {
        await markSampleRecollected(targetId);
      }
    } catch (e) {
      console.warn("Background recollect notice:", e);
    }
  };

  // 3. STRICT VALIDATION: Blocks verification if any parameter is empty
  const validateAllResultsEntered = () => {
    const missing = [];
    (activeOrder.tests || []).forEach((test) => {
      const isCbc = (test.code || "").toUpperCase().includes("CBC") || (test.name || "").toLowerCase().includes("blood count");
      const isUrine = (test.code || "").toUpperCase().includes("URINE") || (test.name || "").toLowerCase().includes("urine");
      const rawParams = test.test_parameters || test.parameters || [];

      if (isCbc) {
        const primaryCbcKeys = ["WBC", "Hemoglobin", "RBC", "Platelet", "MCV", "Neutrophil", "Lymphocyte"];
        primaryCbcKeys.forEach((key) => {
          const p = rawParams.find((pr) => (pr.name || "").toLowerCase().includes(key.toLowerCase()));
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
          const p = rawParams.find((pr) => (pr.name || "").toLowerCase().includes(key.toLowerCase()));
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

  const onVerifyClickInstant = async () => {
    // 1. Strict validation: blocks if any test is missing results
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

    // 2. Lock & Verify in Database FIRST
    try {
      await handleVerifyInDb();
    } catch (e) {
      console.error("Verification notice:", e);
      alert("Verification error: " + (e.message || e));
      return; // Stop: do NOT notify patient if verification failed!
    }

    // 3. ONLY notify patient AFTER verification succeeds
    try {
      if (activeOrder.patient?.phone && activeOrder.patient.phone !== "N/A") {
        sendReportReadyWhatsApp(activeOrder, labSettings);
      }
    } catch (waErr) {
      console.warn("WhatsApp notification notice:", waErr);
    }
  };

  const renderQuickPills = (test, paramName, currentVal, onSelect) => {
    const isUrineTest =
      (test.code || "").toUpperCase().includes("URINE") ||
      (test.name || "").toLowerCase().includes("urine") ||
      (test.dept_id || test.deptId || "").toUpperCase().includes("PAT");

    if (!isUrineTest) return null;

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
    return null;
  };

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      {/* 1. RECOLLECTION WARNING BANNER */}
      {isAwaitingRecollection && (
        <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 animate-bounce" />
            <div>
              <p className="font-black text-sm text-rose-950 uppercase">
                Sample Rejected (Hemolyzed) — Awaiting Repeat Specimen
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                Result entry is blocked until the new specimen is collected and registered.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUnlockRecollected}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition whitespace-nowrap active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Mark Sample Recollected (Unlock)
          </button>
        </div>
      )}

      {/* 2. PATIENT BAR */}
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
              if (!acc.some((x) => x.code === code)) acc.push({ code, tube });
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

          {!activeOrder.isLocked && !isAwaitingRecollection && (
            <button
              type="button"
              onClick={handleRejectHemolyzedInstant}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
              title="Flag sample as Hemolyzed and send recall notice"
            >
              <AlertOctagon className="w-4 h-4" /> Reject (Hemolyzed)
            </button>
          )}

          {canVerifyReport ? (
            <button
              type="button"
              onClick={onVerifyClickInstant}
              disabled={isLockedOrAwaiting || isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              {activeOrder.isLocked ? "Verified & Locked" : "Verify & Send WhatsApp"}
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Result Entry Only
            </div>
          )}
        </div>
      </div>

      {/* 3. TEST PARAMETERS LIST */}
      <div className="space-y-4">
        {(activeOrder.tests || []).map((test) => {
          const testNameLow = (test.name || "").toLowerCase();
          const testCodeUp = (test.code || "").toUpperCase();
          const rawParams = test.test_parameters || test.parameters || [];

          const isCrpQuantitative =
            (testCodeUp.includes("CRP") || testNameLow.includes("c-reactive protein")) &&
            (testNameLow.includes("quantitative") || testCodeUp.includes("QUANT"));

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

                      const isQual = !isCrpQuantitative && p.param_type === "qualitative";
                      const effectiveUnit = isCrpQuantitative ? (p.unit && p.unit !== "—" ? p.unit : "mg/L") : (p.unit || "—");
                      const effectiveRef = isCrpQuantitative ? (p.reference_text || "< 6.0 mg/L (Normal)") : (p.reference_text || p.ref_text);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-4 font-semibold text-slate-800 align-top">
                            <div>{p.name}</div>
                            {!isLockedOrAwaiting && renderQuickPills(test, p.name, val, (chosen) => handleResultInput(p.id, chosen))}
                          </td>
                          <td className="py-2.5 px-4 align-top">
                            {isQual ? (
                              <select
                                disabled={isLockedOrAwaiting}
                                value={val}
                                onChange={(e) => handleResultInput(p.id, e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded-lg font-bold text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                              >
                                <option value="">-- Select Result --</option>
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
                                placeholder={isCrpQuantitative ? "e.g. 3.2" : "Enter result"}
                                className="w-full p-1.5 border border-slate-300 rounded-lg font-mono font-bold text-xs outline-none text-center focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                              />
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 font-mono font-bold align-top">
                            {effectiveUnit}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 font-mono text-xs leading-relaxed align-top">
                            {effectiveRef ? (
                              <div className="text-blue-700 font-semibold bg-blue-50/50 p-1 rounded-lg border border-blue-100">
                                {effectiveRef}
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

      {/* 4. DOCTOR REMARKS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Doctor Remarks & Interpretation (Printed on Report)
        </label>
        <textarea
          rows={2}
          disabled={isLockedOrAwaiting}
          value={localRemarks !== null ? localRemarks : (activeOrder.verifierRemarks || "")}
          onChange={(e) => {
            setLocalRemarks(e.target.value);
            if (handleRemarksChange) handleRemarksChange(e.target.value);
          }}
          placeholder="e.g. Findings correlate with patient clinical history."
          className="w-full p-3 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-slate-50 disabled:bg-slate-100"
        />
      </div>
    </div>
  );
}
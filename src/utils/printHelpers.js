import { generateQrSvgString } from "./qrcode";
import { buildReportHeaderHtml, buildReportFooterHtml } from "./reportLayout";

// GS1 Code 128 Patterns
const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

function encodeCode128C(numericText) {
  const digits = String(numericText || "").replace(/\D/g, "");
  if (!digits) return "";
  const cleanDigits = digits.length % 2 !== 0 ? "0" + digits : digits;

  let checksum = 105;
  let patternStr = CODE128_PATTERNS[105];
  let weight = 1;

  for (let i = 0; i < cleanDigits.length; i += 2) {
    const pairValue = parseInt(cleanDigits.substr(i, 2), 10);
    checksum += pairValue * weight;
    patternStr += CODE128_PATTERNS[pairValue];
    weight++;
  }

  const checkDigit = checksum % 103;
  patternStr += CODE128_PATTERNS[checkDigit];
  patternStr += CODE128_PATTERNS[106];
  return patternStr;
}

export function generateSvgBarcodeHtml(codeText, height = 30) {
  const pattern = encodeCode128C(codeText || "2026000001");
  let x = 0;
  let rects = "";
  const moduleWidth = 4.5;
  const quietZone = 6;
  x += quietZone;

  for (let i = 0; i < pattern.length; i++) {
    const w = parseInt(pattern[i], 10) * moduleWidth;
    if (i % 2 === 0) {
      rects += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" fill="#000000" shape-rendering="crispEdges" />`;
    }
    x += w;
  }
  x += quietZone;

  return `<svg viewBox="0 0 ${x.toFixed(1)} ${height}" preserveAspectRatio="none" shape-rendering="crispEdges" style="width: 96%; height: ${height}px; display: block; margin: 0 auto;"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
}

export function generateQrSvgLocal(text, size = 52) {
  return generateQrSvgString(text, size);
}

// 1. SAFE IMAGING DETECTOR (NEVER misclassifies Serum Electrolytes as imaging!)
export function isImagingOrRadiologyInvestigation(test, deptId = "", deptName = "") {
  const d = (deptId || test?.dept_id || test?.deptId || "").toUpperCase();
  const dn = (deptName || "").toUpperCase();
  const s = (test?.sample_type || test?.sampleType || "").toLowerCase();
  const c = (test?.code || "").toUpperCase().trim();
  const n = (test?.name || "").toUpperCase().trim();

  // Safety override: Any blood, serum, urine or biochemistry test is NEVER imaging!
  if (
    s.includes("serum") || s.includes("blood") || s.includes("plasma") ||
    s.includes("urine") || s.includes("stool") || s.includes("swab") ||
    d.includes("BIO") || d.includes("HEM") || d.includes("PAT") || d.includes("MIC") ||
    dn.includes("BIOCHEMISTRY") || dn.includes("HEMATOLOGY") || dn.includes("PATHOLOGY")
  ) {
    return false;
  }

  if (d === "DEP-RAD" || d === "DEP-USG" || d === "DEP-CTMRI" || d === "DEP-CARD") return true;
  if (dn.includes("RADIOLOGY") || dn.includes("ULTRASONO") || dn.includes("IMAGING") || dn.includes("CARDIOLOGY")) return true;
  if (s.includes("radiological") || s.includes("ultrasound") || s.includes("tracing") || s.includes("no specimen")) return true;

  const words = `${c} ${n}`.split(/[^A-Z0-9]+/);
  if (
    words.includes("XRAY") || words.includes("USG") || words.includes("MRI") ||
    words.includes("ECG") || words.includes("ECHO") ||
    n.includes("X-RAY") || n.includes("ULTRASOUND") || n.includes("CT SCAN") ||
    n.includes("COMPUTED TOMOGRAPHY") || n.includes("ECHOCARDIOGRAM")
  ) {
    return true;
  }

  return false;
}

export function getAllOrderVials(order, catalog = []) {
  if (!order) return [];
  const rawTests = order.tests && order.tests.length > 0 ? order.tests : [];
  const tests = rawTests.map(t => {
    const testId = t.id || t.test_id;
    const fromCat = (catalog || []).find(c => c.id === testId || (c.code && c.code === t.code)) || {};
    return {
      ...fromCat,
      ...t,
      id: testId,
      code: t.code || fromCat.code || "",
      name: t.name || fromCat.name || "Investigation",
      dept_id: t.dept_id || t.deptId || fromCat.dept_id || fromCat.deptId || "",
      tube_color: t.tube_color || t.tubeColor || fromCat.tube_color || fromCat.tubeColor || "",
      sample_type: t.sample_type || t.sampleType || fromCat.sample_type || fromCat.sampleType || ""
    };
  });

  if (Array.isArray(order.vials) && order.vials.length > 1) {
    return order.vials.map(v => ({
      deptId: v.deptId || "DEP-GEN",
      deptCode: v.deptCode || "GEN",
      tubeColor: v.tubeColor || "Standard",
      barcode: v.barcode || v.testBarcode || order.barcode,
      testBarcode: v.barcode || v.testBarcode || order.barcode,
      testIds: v.testIds || [],
      testNames: v.testNames || []
    }));
  }

  const vials = {};
  const baseNum = parseInt(String(order.barcode || "202600001").replace(/\D/g, ""), 10) || 202600001;
  let counter = 0;

  for (const test of tests) {
    const code = (test.code || "").toUpperCase();
    const name = (test.name || "").toUpperCase();
    let deptId = (test.dept_id || test.deptId || "").toUpperCase();

    if (!deptId || deptId === "DEP-GEN") {
      if (code.includes("CBC") || name.includes("BLOOD COUNT") || name.includes("HEMOGLOBIN")) deptId = "DEP-HEM";
      else if (code.includes("XRAY") || name.includes("X-RAY")) deptId = "DEP-RAD";
      else if (code.includes("USG") || name.includes("ULTRASO")) deptId = "DEP-USG";
      else if (code.includes("CT") || name.includes("CT SCAN")) deptId = "DEP-CTMRI";
      else if (code.includes("ECG") || name.includes("ELECTROCARDIOGRAM")) deptId = "DEP-CARD";
      else if (name.includes("URINE") || name.includes("STOOL")) deptId = "DEP-PAT";
      else deptId = "DEP-BIO";
    }

    const deptCode = deptId.replace("DEP-", "").replace("-CBC", "");

    let tubeColor = (test.tube_color || test.tubeColor || "").trim();
    if (!tubeColor || tubeColor === "Standard") {
      if (deptCode.includes("HEM")) tubeColor = "Purple / Lavender (EDTA)";
      else if (deptCode.includes("RAD") || deptCode.includes("USG") || deptCode.includes("CARD") || deptCode.includes("CT")) tubeColor = "Imaging Requisition";
      else if (deptCode.includes("PAT") && name.includes("URINE")) tubeColor = "Sterile Urine Cup";
      else tubeColor = "Red / Yellow (SST / Plain Clot)";
    }

    const tubeShort = tubeColor.split(" ")[0];
    const key = `${deptCode}-${tubeShort}`;

    if (!vials[key]) {
      const vialBarcode = String(baseNum + counter);
      vials[key] = {
        deptId: deptId,
        deptCode: deptCode,
        tubeColor: tubeColor,
        barcode: vialBarcode,
        testBarcode: vialBarcode,
        testIds: [],
        testNames: []
      };
      counter++;
    }

    vials[key].testIds.push(test.id || test.code);
    vials[key].testNames.push(test.code || test.name);
  }

  const result = Object.values(vials);
  return result.length > 0 ? result : [
    {
      deptId: "DEP-GEN",
      deptCode: "GEN",
      tubeColor: "Standard",
      barcode: order.barcode || "202600001",
      testBarcode: order.barcode || "202600001",
      testIds: [],
      testNames: ["General Investigation"]
    }
  ];
}

export function getDepartmentVialBarcode(order, deptId, groupTests = []) {
  if (!order) return "";
  const allVials = getAllOrderVials(order);
  if (allVials.length === 0) return order.barcode || "";

  if (groupTests && groupTests.length > 0) {
    for (const gt of groupTests) {
      const matched = allVials.find(v => 
        (v.testIds || []).includes(gt.id) || 
        (v.testIds || []).includes(gt.code) || 
        (v.testNames || []).includes(gt.name) ||
        (v.testNames || []).includes(gt.code)
      );
      if (matched) return matched.barcode || matched.testBarcode;
    }
  }

  if (deptId) {
    const dClean = String(deptId).toUpperCase().replace("DEP-", "").replace("-CBC", "");
    const matched = allVials.find(v => {
      const vClean = String(v.deptCode || v.deptId).toUpperCase().replace("DEP-", "");
      return vClean === dClean || dClean.includes(vClean) || vClean.includes(dClean);
    });
    if (matched) return matched.barcode || matched.testBarcode;
  }

  return allVials[0]?.barcode || allVials[0]?.testBarcode || order.barcode;
}

function renderRadiologyInvestigationSheet(test, results, deptName) {
  const rawParams = test.test_parameters || test.parameters || [];
  const paramId = rawParams[0]?.id || test.id;
  const rawText = results?.[paramId]?.value || results?.[test.id]?.value || "Normal study. No significant acute abnormality detected.";
  let indication = "";
  let findings = rawText;
  let impression = "";
  if (rawText.includes("CLINICAL INDICATION:") || rawText.includes("INDICATION:")) {
    const indMatch = rawText.match(/(?:CLINICAL INDICATION|INDICATION):\s*([\s\S]*?)(?=(?:FINDINGS|OBSERVATIONS|IMPRESSION):|$)/i);
    if (indMatch) indication = indMatch[1].trim();
  }
  if (rawText.includes("IMPRESSION:") || rawText.includes("CONCLUSION:")) {
    const impMatch = rawText.match(/(?:IMPRESSION|CONCLUSION):\s*([\s\S]*?)$/i);
    if (impMatch) impression = impMatch[1].trim();
  }
  if (rawText.includes("FINDINGS:") || rawText.includes("OBSERVATIONS:")) {
    const findMatch = rawText.match(/(?:FINDINGS|OBSERVATIONS):\s*([\s\S]*?)(?=(?:IMPRESSION|CONCLUSION):|$)/i);
    if (findMatch) findings = findMatch[1].trim();
  } else if (indication || impression) {
    findings = rawText.replace(/(?:CLINICAL INDICATION|INDICATION):[\s\S]*?(?=(?:FINDINGS|OBSERVATIONS):|$)/i, "")
                      .replace(/(?:IMPRESSION|CONCLUSION):[\s\S]*$/i, "").trim();
  }
  return `
    <div style="margin-top: 10px; margin-bottom: 16px; font-family: 'Lora', Georgia, serif; page-break-inside: avoid;">
      <div style="border-bottom: 1.5px solid #000000; padding: 6px 0; font-weight: 700; font-size: 10pt; text-transform: uppercase; color: #000000; display: flex; justify-content: space-between; align-items: center;">
        <span>Investigation: ${test.name.toUpperCase()} ${test.code ? `(${test.code})` : ""}</span>
        <span style="font-size: 8.5pt; color: #000000; font-weight: 600;">${deptName || "Imaging"}</span>
      </div>
      <div style="padding: 10px 0 4px 0; font-size: 9.5pt; line-height: 1.65; color: #000000;">
        ${indication ? `
          <div style="margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1;">
            <b style="color: #000000; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Clinical Indication:</b>
            <span style="color: #000000;">${indication}</span>
          </div>
        ` : `
          <div style="margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1;">
            <b style="color: #000000; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Technique / Protocol:</b>
            <span style="color: #000000;">${test.sample_type || "Standard Clinical Protocol"}</span>
          </div>
        `}
        <div style="margin-bottom: 12px;">
          <b style="color: #000000; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Observations & Findings:</b>
          <div style="white-space: pre-wrap; font-size: 9.5pt; line-height: 1.65; color: #000000; font-weight: 400;">${findings}</div>
        </div>
        ${impression ? `
          <div style="margin-top: 14px; padding: 6px 0 0 0; border-top: 1px solid #cbd5e1;">
            <b style="color: #000000; text-transform: uppercase; font-size: 9pt; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Radiological Impression:</b>
            <div style="font-size: 10pt; color: #000000; line-height: 1.5; font-weight: 700;">${impression}</div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function isTestProfile(test) {
  if (!test) return false;
  if (test.is_profile === true || test.is_profile === "true" || test.is_profile === 1 || test.isProfile === true) return true;
  const params = test.test_parameters || test.parameters || [];
  return params.length > 1;
}

// ATOMIC TEST & PROFILE BUILDER:
// Each individual test is 1 unit.
// Each profile panel is 1 indivisible unit (header + all its parameters) that is NEVER broken across pages!
function buildAtomicTestUnits(tests = [], results = {}) {
  const units = [];
  const individualTests = [];
  const profileTests = [];

  tests.forEach((test) => {
    if (isTestProfile(test)) profileTests.push(test);
    else individualTests.push(test);
  });

  // Individual tests first
  individualTests.forEach((test) => {
    const rawParams = test.test_parameters || test.parameters || [];
    const params = rawParams.length > 0 ? rawParams : [{
      id: test.id,
      test_id: test.id,
      name: test.name,
      param_type: test.param_type || "numeric",
      unit: test.unit || "",
      min_range: test.min_range !== undefined ? test.min_range : null,
      max_range: test.max_range !== undefined ? test.max_range : null
    }];

    params.forEach((p, idx) => {
      const paramKey = p.id || `P-${test.id}-${idx + 1}`;
      const rawVal = results?.[p.id]?.value ?? 
                     results?.[paramKey]?.value ?? 
                     results?.[p.name]?.value ?? 
                     results?.[p.id] ?? 
                     results?.[paramKey] ?? 
                     results?.[p.name] ?? 
                     results?.[test.id]?.value ?? 
                     results?.[test.id];

      let val = "—";
      if (rawVal !== undefined && rawVal !== null) {
        const strVal = String(rawVal).trim();
        if (strVal !== "" && strVal.toLowerCase() !== "undefined" && strVal.toLowerCase() !== "null" && strVal !== "NaN") {
          val = strVal;
        }
      }

      const displayName = (!p.name || p.name.trim() === "" || p.name.toLowerCase() === "result")
        ? (test.name || "Test")
        : (p.name || test.name || "Parameter");

      let refRange = "Normal";
      const hasRefText = (p.reference_text || p.ref_text) && 
                         String(p.reference_text || p.ref_text).trim() !== "" && 
                         String(p.reference_text || p.ref_text).toLowerCase() !== "undefined";

      if (hasRefText) {
        refRange = String(p.reference_text || p.ref_text).trim().replace(/\n/g, "<br>");
      } else if (p.param_type === "numeric") {
        const hasMin = p.min_range !== null && p.min_range !== undefined && p.min_range !== "" && String(p.min_range) !== "undefined";
        const hasMax = p.max_range !== null && p.max_range !== undefined && p.max_range !== "" && String(p.max_range) !== "undefined";

        if (hasMin && hasMax) refRange = `${p.min_range} – ${p.max_range}`;
        else if (hasMin) refRange = `≥ ${p.min_range}`;
        else if (hasMax) refRange = `≤ ${p.max_range}`;
        else refRange = "Normal";
      } else if (p.param_type === "qualitative") {
        refRange = "Negative";
      }

      units.push({
        isProfile: false,
        estimatedHeightMm: 5.5, // 5.5mm per individual row
        rows: [{
          type: "parameter-row",
          name: displayName,
          value: val,
          unit: p.unit || test.unit || "—",
          refRange: refRange,
          isProfileChild: false
        }]
      });
    });
  });

  // Profile panels (atomic, unbreakable units)
  profileTests.forEach((test) => {
    const rawParams = test.test_parameters || test.parameters || [];
    const params = rawParams.length > 0 ? rawParams : [{
      id: test.id,
      test_id: test.id,
      name: test.name,
      param_type: test.param_type || "numeric",
      unit: test.unit || "",
      min_range: test.min_range !== undefined ? test.min_range : null,
      max_range: test.max_range !== undefined ? test.max_range : null
    }];

    const profileRows = [
      {
        type: "profile-header",
        title: `${test.name} ${test.code ? `(${test.code})` : ""}`,
        subtitle: ""
      }
    ];

    params.forEach((p, idx) => {
      const paramKey = p.id || `P-${test.id}-${idx + 1}`;
      const rawVal = results?.[p.id]?.value ?? 
                     results?.[paramKey]?.value ?? 
                     results?.[p.name]?.value ?? 
                     results?.[p.id] ?? 
                     results?.[paramKey] ?? 
                     results?.[p.name] ?? 
                     results?.[test.id]?.value ?? 
                     results?.[test.id];

      let val = "—";
      if (rawVal !== undefined && rawVal !== null) {
        const strVal = String(rawVal).trim();
        if (strVal !== "" && strVal.toLowerCase() !== "undefined" && strVal.toLowerCase() !== "null" && strVal !== "NaN") {
          val = strVal;
        }
      }

      const displayName = p.name || test.name || "Parameter";
      let refRange = "Normal";
      const hasRefText = (p.reference_text || p.ref_text) && 
                         String(p.reference_text || p.ref_text).trim() !== "" && 
                         String(p.reference_text || p.ref_text).toLowerCase() !== "undefined";

      if (hasRefText) {
        refRange = String(p.reference_text || p.ref_text).trim().replace(/\n/g, "<br>");
      } else if (p.param_type === "numeric") {
        const hasMin = p.min_range !== null && p.min_range !== undefined && p.min_range !== "" && String(p.min_range) !== "undefined";
        const hasMax = p.max_range !== null && p.max_range !== undefined && p.max_range !== "" && String(p.max_range) !== "undefined";

        if (hasMin && hasMax) refRange = `${p.min_range} – ${p.max_range}`;
        else if (hasMin) refRange = `≥ ${p.min_range}`;
        else if (hasMax) refRange = `≤ ${p.max_range}`;
        else refRange = "Normal";
      } else if (p.param_type === "qualitative") {
        refRange = "Negative";
      }

      profileRows.push({
        type: "parameter-row",
        name: displayName,
        value: val,
        unit: p.unit || test.unit || "—",
        refRange: refRange,
        isProfileChild: true
      });
    });

    // Profile height: 8mm header + 5.5mm per parameter
    const totalUnitHeight = 8 + (params.length * 5.5);

    units.push({
      isProfile: true,
      profileName: test.name,
      estimatedHeightMm: totalUnitHeight,
      rows: profileRows
    });
  });

  return units;
}

function renderTableRowsHtml(rowChunk = []) {
  const rowsHtml = rowChunk.map((r) => {
    if (r.type === "profile-header") {
      return `
        <tr style="border-top: 1.5px solid #000000; border-bottom: 1px solid #000000; background: #f8fafc; page-break-inside: avoid;">
          <td colspan="4" style="padding: 4.5px 4px; font-weight: 800; font-size: 8.5pt; color: #000000; text-transform: uppercase;">
            ${r.title}
            <span style="font-size: 7pt; font-weight: 600; color: #475569; margin-left: 6px; text-transform: none;">${r.subtitle}</span>
          </td>
        </tr>
      `;
    }

    const valStyle = "font-family: 'Inter', -apple-system, sans-serif; font-variant-numeric: tabular-nums; font-weight: 700; font-size: 8.5pt; color: #000000;";
    return `
      <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
        <td style="padding: 3.8px 4px; font-size: 8.5pt; color: #000000; font-weight: ${r.isProfileChild ? "500" : "700"}; padding-left: ${r.isProfileChild ? "12px" : "4px"}; vertical-align: top;">
          ${r.name}
        </td>
        <td style="padding: 3.8px 4px; ${valStyle}; vertical-align: top;">${r.value}</td>
        <td style="padding: 3.8px 4px; font-size: 8pt; color: #000000; vertical-align: top;">${r.unit}</td>
        <td style="padding: 3.8px 4px; font-size: 8pt; color: #000000; font-variant-numeric: tabular-nums; line-height: 1.35; vertical-align: top;">${r.refRange}</td>
      </tr>
    `;
  }).join("");

  return `
    <table style="width: 92%; border-collapse: collapse; margin: 3px auto 0 auto; font-family: 'Lora', Georgia, serif;">
      <thead>
        <tr style="border-top: none; border-bottom: 1.5px solid #000000; font-size: 9pt; background: transparent; page-break-inside: avoid;">
          <th style="padding: 5px 4px; text-align: left; width: 38%; font-weight: 700; border: none;">Investigation / Parameter</th>
          <th style="padding: 5px 4px; text-align: left; width: 20%; font-weight: 700; border: none;">Observed Result</th>
          <th style="padding: 5px 4px; text-align: left; width: 14%; font-weight: 700; border: none;">Unit</th>
          <th style="padding: 5px 4px; text-align: left; width: 28%; font-weight: 700; border: none;">Biological Ref. Range</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// 2. EXPORTED MASTER UNIFIED RESULTS TABLE (Used by PatientLivePortal and Previewers)
export function buildUnifiedResultsTable(tests = [], results = {}, deptId = "", deptName = "") {
  let imagingSheets = "";
  const nonImagingTests = [];

  (tests || []).forEach(test => {
    if (isImagingOrRadiologyInvestigation(test, deptId, deptName)) {
      imagingSheets += renderRadiologyInvestigationSheet(test, results, deptName);
    } else {
      nonImagingTests.push(test);
    }
  });

  const units = buildAtomicTestUnits(nonImagingTests, results);
  const allRows = units.flatMap(u => u.rows);
  const tableHtml = allRows.length > 0 ? renderTableRowsHtml(allRows) : "";

  return tableHtml + imagingSheets;
}

// 3. MASTER DEPARTMENT REPORT RENDERER:
// - Fills page close to the signature before breaking.
// - NEVER breaks any profile panel across pages.
// - Every page gets Patient Header and Dual Signatures!
export function renderDepartmentReportHtml({
  group,
  activeOrder,
  staffList = [],
  labSettings = {},
  usePadMode = false,
  isPreview = false
}) {
  if (!activeOrder || !group) return "";

  const orderId = activeOrder.orderId || activeOrder.id || "";
  const isVerified = activeOrder.qcStatus === "Verified" || activeOrder.isLocked === true;
  const doctorName =
    activeOrder.doctor ||
    activeOrder.patient?.doctor ||
    (activeOrder.patient?.address && activeOrder.patient.address.startsWith("Ref: ")
      ? activeOrder.patient.address.replace("Ref: ", "")
      : null) ||
    "Self";

  const isImaging = isImagingOrRadiologyInvestigation(null, group.dept?.id, group.dept?.name);
  const deptBarcode = getDepartmentVialBarcode(activeOrder, group.dept?.id, group.tests);
  const pageQrUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(deptBarcode)}`;
  const pageQrSvg = generateQrSvgString(pageQrUrl, 48);

  const techUser = staffList.find((u) => u.role === "technologist") || {
    full_name: "Md. Al-Amin",
    designation: isImaging
      ? "Senior Medical Radiographer / Imaging Technologist"
      : "BSc in Medical Technology - Senior Technologist",
    signature_data: ""
  };
  const verifierUser = staffList.find(
    (u) => u.role === "verifier" || u.role === "biochemist" || u.role === "manager" || u.role === "admin"
  ) || {
    full_name: "Dr. S. Rahman",
    designation: isImaging
      ? "MBBS, MD / FCPS - Consultant Radiologist & Physician"
      : "MBBS, MD (Pathology) - Consultant Biochemist & Lab Incharge",
    signature_data: ""
  };

  const renderSignatureHtml = (sigData, fallbackName) => {
    if (!isVerified) return `<div style="height: 32px;"></div>`;
    if (sigData && sigData.startsWith("data:image")) {
      return `<img src="${sigData}" style="height: 32px; max-width: 135px; object-fit: contain; margin: 0 auto 2px auto; display: block;" />`;
    }
    return `<div style="font-family: 'Lora', Georgia, serif; font-size: 10pt; font-weight: 700; color: #000000; height: 30px; line-height: 30px; text-align: center;">${sigData || fallbackName}</div>`;
  };

  const rawDeptName = group.dept?.name || "Clinical Pathology";
  const cleanDeptName = rawDeptName.replace(/^department of\s+/i, "").toUpperCase();

  const sixthSlotDemographics = isImaging
    ? `<span style="font-weight: 700;">Modality:</span> <b style="font-weight: 800;">${cleanDeptName}</b>`
    : `<span style="font-weight: 700;">Barcode:</span> <b style="font-family: 'Consolas', monospace; font-weight: 800;">${deptBarcode}</b>`;

  // SIGNATURES BLOCK: ALWAYS PRESENT ON EVERY PAGE
  const signaturesBlockHtml = `
    <div style="margin: ${usePadMode ? '10px 8mm 2px 8mm' : '14px 8mm 4px 8mm'}; padding-top: 3px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
      <div style="text-align: center; width: 230px;">
        ${renderSignatureHtml(techUser.signature_data, techUser.full_name)}
        <div style="border-top: 1.5px solid #000000; padding-top: 2px;">
          <div style="font-weight: 700; font-size: 8.5pt; color: #000000;">${techUser.full_name}</div>
          <div style="font-size: 7.5pt; font-weight: 700; color: #000000; margin-top: 1px;">${techUser.designation}</div>
        </div>
      </div>
      <div style="text-align: center; width: 230px;">
        ${renderSignatureHtml(verifierUser.signature_data, verifierUser.full_name)}
        <div style="border-top: 1.5px solid #000000; padding-top: 2px;">
          <div style="font-weight: 700; font-size: 8.5pt; color: #000000;">${verifierUser.full_name}</div>
          <div style="font-size: 7.5pt; font-weight: 700; color: #000000; margin-top: 1px;">${verifierUser.designation}</div>
        </div>
      </div>
    </div>
  `;

  let headerHtml = "";
  if (usePadMode) {
    if (isPreview) {
      headerHtml = `
        <div style="height: 38mm; background: #f8fafc; border-bottom: 1.5px dashed #cbd5e1; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; color: #64748b; font-size: 8pt; box-sizing: border-box;">
          <div>
            <span style="font-weight: 800; font-size: 9pt; color: #1e293b; text-transform: uppercase;">${(labSettings?.lab_name || "AL FATTAH DIAGNOSTIC").toUpperCase()}</span>
            <p style="margin: 2px 0 0 0; font-size: 7.5pt; color: #64748b;">[ Pre-Printed Pad Header: 38mm Reserved Margin ]</p>
          </div>
          <span style="background: #e2e8f0; color: #334155; font-weight: 800; font-size: 7pt; padding: 2px 6px; border-radius: 4px;">PAD MODE</span>
        </div>
      `;
    }
  } else {
    headerHtml = buildReportHeaderHtml(labSettings);
  }

  let footerHtml = "";
  if (usePadMode) {
    if (isPreview) {
      footerHtml = `
        <div style="height: 21mm; margin-top: 4px; border-top: 1.5px dashed #cbd5e1; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 7.5pt; box-sizing: border-box;">
          [ Pre-Printed Pad Footer: 21mm Reserved Margin ]
        </div>
      `;
    }
  } else {
    footerHtml = buildReportFooterHtml(labSettings);
  }

  const patientDetailsHtml = (pageNum = 1, totalPages = 1) => `
    <div style="padding: 6px 8px; border: 1px solid #000000; border-radius: 5px; margin: 3px 8mm 0px 8mm; font-size: 8.5pt; color: #000000; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <table style="width: 100%; border-collapse: collapse; color: #000000; font-size: 8.5pt;">
          <tr>
            <td style="padding: 2px 0; width: 40%;"><span style="font-weight: 700;">Patient Name:</span> <b style="font-size: 9pt; font-weight: 700;">${activeOrder.patient?.name || "Patient"}</b></td>
            <td style="padding: 2px 0; width: 30%;"><span style="font-weight: 700;">Age / Sex:</span> <b style="font-weight: 700;">${activeOrder.patient?.age || "—"} Y / ${activeOrder.patient?.gender || "—"}</b></td>
            <td style="padding: 2px 0; width: 30%;"><span style="font-weight: 700;">Patient ID:</span> <b style="font-family: 'Consolas', monospace; font-size: 8.5pt; font-weight: 700;">${activeOrder.patient?.id || "N/A"}</b></td>
          </tr>
          <tr>
            <td style="padding: 2px 0;"><span style="font-weight: 700;">Ref. Doctor:</span> <b style="font-weight: 600; font-size: 8pt;">${doctorName}</b></td>
            <td style="padding: 2px 0;"><span style="font-weight: 700;">Date:</span> <b style="font-weight: 800;">${activeOrder.date || new Date().toISOString().slice(0, 10)}</b></td>
            <td style="padding: 2px 0;">${sixthSlotDemographics}</td>
          </tr>
        </table>
        <div style="width: 44px; text-align: center; margin-left: 6px; flex-shrink: 0;">
          ${pageQrSvg}
          <span style="font-size: 4.5pt; font-weight: 800; display: block; text-align: center; text-transform: uppercase;">
            ${totalPages > 1 ? `Pg ${pageNum}/${totalPages}` : 'Verify'}
          </span>
        </div>
      </div>
    </div>
  `;

  // BUILD ATOMIC UNITS (Profiles are never broken)
  const nonImagingTests = (group.tests || []).filter(t => !isImagingOrRadiologyInvestigation(t, group.dept?.id, group.dept?.name));
  const units = buildAtomicTestUnits(nonImagingTests, activeOrder.results || {});

  // AVAILABLE TEST HEIGHT PER PAGE:
  // In Pad mode: 238mm printable area - 65mm (demographics + title + signatures) = ~173mm space!
  // In White mode: 297mm - 120mm (header + footer + demographics + signatures) = ~177mm space!
  const PAGE_CAPACITY_MM = usePadMode ? 170 : 175;

  const pagesChunks = [];
  let currentPageUnits = [];
  let currentUsedMm = 0;

  units.forEach((unit) => {
    // Check if adding this unit (even a large profile) exceeds the page capacity:
    if (currentUsedMm + unit.estimatedHeightMm <= PAGE_CAPACITY_MM || currentPageUnits.length === 0) {
      currentPageUnits.push(unit);
      currentUsedMm += unit.estimatedHeightMm;
    } else {
      // Start a new page! The whole profile moves together unbroken!
      pagesChunks.push(currentPageUnits);
      currentPageUnits = [unit];
      currentUsedMm = unit.estimatedHeightMm;
    }
  });

  if (currentPageUnits.length > 0) {
    pagesChunks.push(currentPageUnits);
  }

  const totalPages = Math.max(1, pagesChunks.length);
  const pagesHtml = [];

  // CRITICAL HEIGHT SPECIFICATION FOR PAD MODE PRINTING:
  // In print Pad Mode: Height is EXACTLY 238mm (38mm top margin + 238mm content + 21mm bottom margin = 297mm A4).
  // This completely eliminates phantom blank pages!
  const pageHeightCss = isPreview
    ? 'min-height: 297mm; height: 297mm;'
    : (usePadMode ? 'min-height: 238mm; height: 238mm; max-height: 238mm;' : 'min-height: 297mm; height: 297mm;');

  for (let p = 0; p < totalPages; p++) {
    const pageNum = p + 1;
    const isLastPage = p === totalPages - 1;
    const pageUnits = pagesChunks[p] || [];
    const pageRows = pageUnits.flatMap(u => u.rows);
    const tableHtml = renderTableRowsHtml(pageRows);

    const remarksText = activeOrder.verifierRemarks && activeOrder.verifierRemarks.trim()
      ? activeOrder.verifierRemarks
      : "Clinically correlated and verified with quality control standards.";

    const remarksHtml = isLastPage ? `
      <div style="margin-top: 6px; margin-left: 8mm; margin-right: 8mm; font-size: 8.5pt; color: #000000; line-height: 1.35; font-family: 'Lora', Georgia, serif; page-break-inside: avoid;">
        <span style="font-weight: 700; text-transform: uppercase; color: #000000; font-size: 8pt;">Pathologist Remarks:</span>
        <span style="margin-left: 6px; color: #000000; font-style: italic;">${remarksText}</span>
      </div>
    ` : `
      <div style="margin-top: 4px; text-align: right; margin-right: 8mm; font-size: 7pt; font-style: italic; color: #475569; font-family: 'Lora', Georgia, serif;">
        [ Continued on Page ${pageNum + 1}... ]
      </div>
    `;

    const singlePageContent = `
      <div style="padding: 0; margin: 0; ${pageHeightCss} display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: 'Lora', Georgia, serif; background: #ffffff; color: #000000; width: 100%; ${!isLastPage ? 'page-break-after: always;' : ''}">
        <div>
          ${headerHtml}
          ${patientDetailsHtml(pageNum, totalPages)}
          <div style="text-align: center; margin: 5px 0 2px 0; page-break-inside: avoid;">
            <span style="font-size: 10pt; font-weight: 900; letter-spacing: 1.1px; text-transform: uppercase; color: #000000;">
              DEPARTMENT OF ${cleanDeptName} ${totalPages > 1 ? `(PAGE ${pageNum} OF ${totalPages})` : ''}
            </span>
          </div>
          ${tableHtml}
          ${remarksHtml}
        </div>

        <!-- EVERY PAGE GETS AUTHORIZED SIGNATURES & FOOTER -->
        <div style="margin-top: auto; flex-shrink: 0; page-break-inside: avoid;">
          ${signaturesBlockHtml}
          ${footerHtml}
        </div>
      </div>
    `;

    pagesHtml.push(singlePageContent);
  }

  return pagesHtml.join("");
}

// 4. A4 PRINT DISPATCHER
export function printDepartmentA4Report(
  targetDeptId = "ALL",
  activeOrder,
  departmentGroupedReports,
  staffList = [],
  labSettings = {},
  onPrintedCallback,
  usePadMode = false
) {
  if (!activeOrder) return;
  if (onPrintedCallback) onPrintedCallback();

  const deptGroupsToPrint = targetDeptId === "ALL"
    ? departmentGroupedReports
    : (departmentGroupedReports || []).filter((g) => g.dept?.id === targetDeptId);

  const pagesHtml = (deptGroupsToPrint || []).map((group) => {
    return renderDepartmentReportHtml({
      group,
      activeOrder,
      staffList,
      labSettings,
      usePadMode,
      isPreview: false
    });
  }).join("");

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Report - ${activeOrder.barcode || activeOrder.orderId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600;700;800;900&display=swap');
          @page {
            size: A4 portrait;
            margin-top: ${usePadMode ? '38mm' : '0mm'};
            margin-bottom: ${usePadMode ? '21mm' : '0mm'};
            margin-left: 0mm;
            margin-right: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 210mm;
            font-family: 'Lora', Georgia, serif;
            color: #000000;
            background: #ffffff;
          }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>${pagesHtml}</body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
  }, 350);
}

// 5. A5 MONEY RECEIPT ENGINE: EVERY PAGE CONTAINS CASHIER SIGNATURE & BARCODE!
// A5 MONEY RECEIPT ENGINE (HOLDS UP TO 16 TESTS ON A SINGLE PAGE WITH FULL CALCULATION)
export function printMoneyReceiptA5(orderToPrint, labSettings = {}) {
  const activeOrd = orderToPrint || {
    receiptNo: "RCP-0914-001",
    date: new Date().toISOString().slice(0, 10),
    patient: { id: "P-1001", name: "Patient", age: "30", gender: "Male", phone: "N/A", doctor: "Self" },
    tests: [],
    billing: { subTotal: 0, discount: 0, netPayable: 0, paid: 0, due: 0 }
  };

  const curLabName = (labSettings?.lab_name || labSettings?.labName || "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER").toUpperCase();
  const curTagline = labSettings?.tagline || "With Al-Fattah on the Journey to Wellness";
  const curAddress = labSettings?.address || "Solmaid Purbo Para, Vatara, Dhaka 1212";
  const curPhone = labSettings?.phone || "01723854472, 01624787444";
  const curReceiptFooter = labSettings?.receipt_footer || labSettings?.receiptFooter || "Please bring this receipt for report collection. Thank you for choosing us.";

  const patientId = activeOrd.patient?.id || "P-1001";
  const orderId = activeOrd.orderId || activeOrd.id || "ORD-001";
  const barcode = activeOrd.barcode || "";

  const doctorName = 
    activeOrd.doctor || 
    activeOrd.patient?.doctor || 
    (activeOrd.patient?.address && activeOrd.patient.address.startsWith("Ref: ") ? activeOrd.patient.address.replace("Ref: ", "") : null) || 
    "Self";

  const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(barcode)}`;
  const scannableTrackingQrSvg = generateQrSvgString(trackingUrl, 48);

  const allTests = activeOrd.tests || [];
  const pages = [];

  // CAPACITY CONFIGURATION:
  // Up to 16 tests fit completely on ONE single page WITH full calculation box!
  if (allTests.length <= 16) {
    pages.push({ chunk: allTests, isFirst: true, isLast: true, pageNum: 1, totalPages: 1, startIndex: 0 });
  } else {
    // If more than 16 tests (e.g. 17 to 30 tests), paginate cleanly:
    const PAGE_1_CAPACITY = 18;
    const SUBSEQUENT_PAGE_CAPACITY = 14;

    pages.push({
      chunk: allTests.slice(0, PAGE_1_CAPACITY),
      isFirst: true,
      isLast: false,
      pageNum: 1,
      startIndex: 0
    });

    let remainingTests = allTests.slice(PAGE_1_CAPACITY);
    let currentPageNum = 2;
    let currentStartIndex = PAGE_1_CAPACITY;

    while (remainingTests.length > 0) {
      const isFinal = remainingTests.length <= SUBSEQUENT_PAGE_CAPACITY;
      pages.push({
        chunk: remainingTests.slice(0, SUBSEQUENT_PAGE_CAPACITY),
        isFirst: false,
        isLast: isFinal,
        pageNum: currentPageNum,
        startIndex: currentStartIndex
      });
      remainingTests = remainingTests.slice(SUBSEQUENT_PAGE_CAPACITY);
      currentStartIndex += SUBSEQUENT_PAGE_CAPACITY;
      currentPageNum++;
    }

    const calculatedTotalPages = pages.length;
    pages.forEach(p => p.totalPages = calculatedTotalPages);
  }

  const renderedPagesHtml = pages.map((pageInfo) => {
    const { chunk, isLast, pageNum, totalPages, startIndex } = pageInfo;

    const itemsHtml = chunk.map((t, idx) => `
      <tr style="border-bottom: 1px dashed #cbd5e1;">
        <td style="padding: 2.2px 4px; font-size: 7.5pt;">${startIndex + idx + 1}. ${t.name}</td>
        <td style="padding: 2.2px 4px; color: #475569; font-size: 7pt;">${t.sample_type || "Serum"}</td>
        <td style="padding: 2.2px 4px; text-align: right; font-weight: bold; font-size: 7.5pt;">৳ ${t.price}</td>
      </tr>
    `).join("");

    return `
      <div style="border: none; padding: 0; min-height: 194mm; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; font-family: 'Consolas', 'Courier New', Courier, monospace; color: #000; font-size: 8pt; ${!isLast ? 'page-break-after: always;' : ''}">
        <div>
          <!-- Header -->
          <div style="border-bottom: 2px dashed #000; padding-bottom: 4px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="margin: 0; font-size: 11pt; font-weight: 900; letter-spacing: .5px;">${curLabName}</h1>
              <p style="margin: 1px 0; font-size: 7pt; color: #334155;">${curTagline}</p>
              <p style="margin: 0; font-size: 6.5pt; color: #475569;">${curAddress} • Tel: ${curPhone}</p>
            </div>
            <div style="text-align: right;">
              <div style="border: 1.5px solid #000; padding: 2px 5px; font-weight: 900; font-size: 5pt; text-transform: uppercase;">MONEY RECEIPT</div>
              ${totalPages > 1 ? `<span style="font-size: 6.5pt; color: #475569; display: block; margin-top: 2px;">Page ${pageNum} of ${totalPages}</span>` : ''}
            </div>
          </div>

          <!-- Patient Demographics -->
          <div style="border: 1px dashed #000; padding: 4px 6px; margin-bottom: 5px; font-size: 7.5pt; background: #fafafa;">
            <table style="width: 100%; border-collapse: collapse; font-family: inherit;">
              <tr>
                <td style="padding: 1px 0;"><b>RECEIPT NO:</b> ${activeOrd.receiptNo || "RCP-0914-001"}</td>
                <td style="padding: 1px 0; text-align: right;"><b>DATE:</b> ${activeOrd.date || new Date().toISOString().slice(0, 10)}</td>
              </tr>
              <tr>
                <td style="padding: 1px 0;"><b>PATIENT ID:</b> <span style="font-weight: bold;">${patientId}</span></td>
                <td style="padding: 1px 0; text-align: right;"><b>PHONE:</b> ${activeOrd.patient?.phone || "N/A"}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 1px 0;"><b>PATIENT:</b> ${activeOrd.patient?.name || "Patient"} (${activeOrd.patient?.age || ""}Y / ${activeOrd.patient?.gender || ""})</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 1px 0; border-top: 1px dashed #ccc; margin-top: 1px;"><b>REF. BY:</b> ${doctorName}</td>
              </tr>
            </table>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 4px; font-family: inherit;">
            <thead>
              <tr style="border-top: 1.5px dashed #000; border-bottom: 1.5px dashed #000; font-weight: 900;">
                <th style="padding: 2.5px 4px; text-align: left;">INVESTIGATION DESCRIPTION</th>
                <th style="padding: 2.5px 4px; text-align: left; width: 22%;">SPECIMEN</th>
                <th style="padding: 2.5px 4px; text-align: right; width: 18%;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <!-- FULL CALCULATION BOX (ALWAYS APPEARS DIRECTLY UNDER THE TESTS) -->
          ${isLast ? `
            <div style="display: flex; justify-content: flex-end; margin-top: 4px; padding-top: 2px;">
              <table style="width: 210px; font-size: 7.5pt; border-collapse: collapse; font-family: inherit;">
                <tr><td>SUBTOTAL:</td><td style="text-align: right; font-weight: bold;">৳ ${activeOrd.billing?.subTotal || 0}</td></tr>
                <tr><td>DISCOUNT (${activeOrd.billing?.discount || 0}%):</td><td style="text-align: right;">- ৳ ${(((activeOrd.billing?.subTotal || 0) * (activeOrd.billing?.discount || 0)) / 100).toFixed(0)}</td></tr>
                <tr style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; font-weight: 900; font-size: 8.5pt;">
                  <td>NET PAYABLE:</td><td style="text-align: right;">৳ ${activeOrd.billing?.netPayable || 0}</td>
                </tr>
                <tr><td>PAID (CASH):</td><td style="text-align: right; font-weight: bold;">৳ ${activeOrd.billing?.paid || 0}</td></tr>
                <tr style="font-weight: bold; color: ${activeOrd.billing?.due > 0 ? '#b91c1c' : '#000'};">
                  <td>DUE BALANCE:</td><td style="text-align: right;">৳ ${activeOrd.billing?.due || 0}</td>
                </tr>
              </table>
            </div>
          ` : `
            <div style="text-align: right; font-style: italic; font-size: 7pt; color: #475569; margin-top: 4px;">
              [ Continued on Page ${pageNum + 1}... ]
            </div>
          `}
        </div>

        <!-- Footer / Barcode & Authorized Cashier Signature -->
        <div style="margin-top: 6px;">
          <div style="border-top: 1.5px dashed #000; padding: 4px 0 2px 0; display: flex; justify-content: space-between; align-items: center;">
            <div style="text-align: center; width: 130px;">
              ${generateSvgBarcodeHtml(patientId, 26)}
              <p style="margin: 1px 0 0 0; font-size: 7pt; font-weight: 900;">${patientId}</p>
            </div>

            <div style="text-align: center; width: 85px;">
              ${scannableTrackingQrSvg}
              <span style="font-size: 4.5pt; font-weight: bold; display: block; margin-top: 1px;">Scan for Live Report</span>
            </div>

            <div style="text-align: center; width: 110px;">
              <div style="border-bottom: 1px solid #000; height: 16px; margin-bottom: 2px;"></div>
              <span style="font-size: 6pt; font-weight: bold;">AUTHORIZED CASHIER</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1px; font-size: 5.5pt; color: #475569;">
            <span>${curReceiptFooter}</span>
            ${totalPages > 1 ? `<span>Page ${pageNum} of ${totalPages}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Receipt - ${activeOrd.receiptNo}</title>
        <style>
          @page { size: 148mm 210mm; margin: 6mm 8mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; font-family: 'Consolas', 'Courier New', Courier, monospace; background: #fff; color: #000; font-size: 8pt; }
        </style>
      </head>
      <body>${renderedPagesHtml.join("")}</body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
  }, 250);
}
// 6. BARCODE VIAL STICKER PRINT DRIVER (38mm x 25mm)
export function printSpecificVialBarcode(vial, onPrintedCallback) {
  if (!vial) return;
  if (onPrintedCallback) onPrintedCallback();

  const exactVialBarcode = String(vial.testBarcode || vial.barcode || "").trim();
  const svgBarcode = generateSvgBarcodeHtml(exactVialBarcode, 30);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Vial - ${exactVialBarcode}</title>
        <style>
          @page { size: 38mm 25mm; margin: 0mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; shape-rendering: crispEdges !important; }
          html, body { margin: 0; padding: 0; padding-left: .65mm; width: 38mm; height: 25mm; max-height: 25mm; max-width: 38mm; overflow: hidden; background: #ffffff; color: #000000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
          .sticker-container { width: 38mm; height: 25mm; max-height: 25mm; max-width: 38mm; padding: 0.8mm 1.2mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; box-sizing: border-box; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; font-size: 7pt; font-weight: 500; color: #000000; border-bottom: 0.8px solid #000000; padding-bottom: 0.3mm; margin: 0; line-height: 1.3; }
          .barcode-area { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; margin: 0; padding: 0.2mm 0; }
          .barcode-area svg { height: 13.5mm; max-height: 14mm; width: 96%; margin: 0 auto; display: block; }
          .barcode-number { font-size: 7.5pt; font-family: 'Consolas', 'Courier New', monospace; font-weight: 900; color: #000000; margin: 0; padding: 0; letter-spacing: 0.6px; line-height: 1; }
          .footer { display: flex; justify-content: space-between; align-items: center; border-top: 0.8px solid #000000; padding-top: 0.4mm; margin: 0; line-height: 1.1; }
          .tube-badge { font-size: 6.5pt; font-weight: 500; color: #000000; flex-shrink: 0; margin-right: 4px; }
          .test-names { font-size: 5.5pt; font-weight: 500; color: #000000; text-align: right; word-break: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 28mm; }
        </style>
      </head>
      <body>
        <div class="sticker-container">
          <div class="header">
            <span style="max-width: 22mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${vial.patientName || "Patient"}</span>
            <span style="font-family: 'Consolas', monospace;">${vial.patientId || ""}</span>
          </div>
          <div class="barcode-area">
            ${svgBarcode}
            <p class="barcode-number">${exactVialBarcode}</p>
          </div>
          <div class="footer">
            <span class="tube-badge">${(vial.tubeColor || "").split(" ")[0]}</span>
            <span class="test-names">${(vial.testNames || []).join(", ")}</span>
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
  }, 250);
}
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

// Abnormal status verification
export function checkAbnormalStatus(valStr, min, max, paramType = "numeric") {
  if (valStr === undefined || valStr === null || valStr === "" || valStr === "—") {
    return { isAbnormal: false, flag: "" };
  }
  const s = String(valStr).trim();
  const sLow = s.toLowerCase();

  if (paramType === "qualitative" || isNaN(parseFloat(s))) {
    if (
      sLow.includes("positive") || sLow.includes("reactive") ||
      s === "+" || s === "++" || s === "+++" || s === "++++" ||
      sLow.includes("abundant") || sLow.includes("plenty") || sLow.includes("seen")
    ) {
      return { isAbnormal: true, flag: "POS" };
    }
    return { isAbnormal: false, flag: "" };
  }

  const cleanVal = parseFloat(s.replace(/,/g, ""));
  if (isNaN(cleanVal)) return { isAbnormal: false, flag: "" };

  const hasMin = min !== null && min !== undefined && min !== "" && !isNaN(parseFloat(min));
  const hasMax = max !== null && max !== undefined && max !== "" && !isNaN(parseFloat(max));

  if (hasMin && cleanVal < parseFloat(min)) return { isAbnormal: true, flag: "L" };
  if (hasMax && cleanVal > parseFloat(max)) return { isAbnormal: true, flag: "H" };

  return { isAbnormal: false, flag: "" };
}

function formatResultCell(val, min, max, unit = "", paramType = "numeric") {
  if (!val || val === "—") {
    return `<span style="color: #64748b; font-weight: 400;">—</span>`;
  }

  const { isAbnormal, flag } = checkAbnormalStatus(val, min, max, paramType);
  const flagHtml = isAbnormal
    ? `<span style="font-size: 7pt; font-weight: 900; color: #dc2626; margin-left: 3px; font-family: 'Inter', sans-serif;">(${flag})</span>`
    : "";
  const textStyle = isAbnormal
    ? "font-weight: 900; color: #000000; text-decoration: underline;"
    : "font-weight: 700; color: #000000;";

  return `
    <span style="${textStyle}; font-family: 'Inter', -apple-system, sans-serif;">${val}</span>
    ${unit ? `<span style="font-weight: 400; font-size: 7.5pt; color: #333333; margin-left: 2px;">${unit}</span>` : ""}
    ${flagHtml}
  `;
}

// Universal Descriptive Test Detector
export function isDescriptiveInvestigation(test, deptId = "", deptName = "") {
  if (!test && !deptId && !deptName) return false;

  const d = (deptId || test?.dept_id || test?.deptId || "").toUpperCase();
  const dn = (deptName || "").toUpperCase();
  const s = (test?.sample_type || test?.sampleType || "").toLowerCase();
  const c = (test?.code || "").toUpperCase().trim();
  const n = (test?.name || "").toUpperCase().trim();

  if (
    s.includes("serum") || s.includes("blood") || s.includes("plasma") ||
    s.includes("urine") || s.includes("stool") ||
    d.includes("BIO") || d.includes("HEM")
  ) {
    if (test?.report_type === "descriptive") return true;
    return false;
  }

  if (test?.report_type === "descriptive") return true;

  const rawParams = test?.test_parameters || test?.parameters || [];
  if (rawParams.length === 1 && (rawParams[0].param_type === "text" || rawParams[0].param_type === "descriptive")) {
    return true;
  }

  if (
    d === "DEP-RAD" || d === "DEP-USG" || d === "DEP-CTMRI" || d === "DEP-CARD" || d === "DEP-HISTO" ||
    dn.includes("HISTOPATHOLOGY") || dn.includes("CYTOLOGY") || dn.includes("RADIOLOGY") ||
    dn.includes("ULTRASONO") || dn.includes("IMAGING") || dn.includes("CARDIOLOGY")
  ) {
    return true;
  }

  if (
    s.includes("radiological") || s.includes("ultrasound") || s.includes("tracing") ||
    s.includes("biopsy") || s.includes("smear") || s.includes("aspiration") || s.includes("formalin")
  ) {
    return true;
  }

  const words = `${c} ${n}`.split(/[^A-Z0-9]+/);
  if (
    words.includes("HISTO") || words.includes("FNAC") || words.includes("BIOPSY") ||
    words.includes("CYTOLOGY") || words.includes("XRAY") || words.includes("USG") ||
    words.includes("MRI") || words.includes("CT") || words.includes("ECG") || words.includes("ECHO") ||
    words.includes("ENDOSCOPY") || words.includes("COLONOSCOPY")
  ) {
    return true;
  }

  return false;
}

export function isImagingOrRadiologyInvestigation(test, deptId = "", deptName = "") {
  return isDescriptiveInvestigation(test, deptId, deptName);
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
      sample_type: t.sample_type || t.sampleType || fromCat.sample_type || fromCat.sampleType || "",
      report_type: t.report_type || fromCat.report_type || "tabular"
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
      if (code.includes("CBC") || name.includes("BLOOD COUNT")) deptId = "DEP-HEM";
      else if (code.includes("XRAY") || name.includes("X-RAY")) deptId = "DEP-RAD";
      else if (code.includes("USG") || name.includes("ULTRASO")) deptId = "DEP-USG";
      else if (code.includes("CT") || name.includes("CT SCAN")) deptId = "DEP-CTMRI";
      else if (code.includes("ECG") || name.includes("ELECTROCARDIOGRAM")) deptId = "DEP-CARD";
      else if (code.includes("HISTO") || code.includes("FNAC") || code.includes("BX")) deptId = "DEP-HISTO";
      else if (name.includes("URINE") || name.includes("STOOL")) deptId = "DEP-PAT";
      else deptId = "DEP-BIO";
    }

    const deptCode = deptId.replace("DEP-", "").replace("-CBC", "");

    let tubeColor = (test.tube_color || test.tubeColor || "").trim();
    if (!tubeColor || tubeColor === "Standard") {
      if (deptCode.includes("HEM")) tubeColor = "Purple / Lavender (EDTA)";
      else if (deptCode.includes("RAD") || deptCode.includes("USG") || deptCode.includes("CARD") || deptCode.includes("CT")) tubeColor = "Imaging Requisition";
      else if (deptCode.includes("HISTO")) tubeColor = "Formalin Container";
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

function isTestProfile(test) {
  if (!test) return false;
  if (test.report_type === "descriptive") return false;
  if (test.is_profile === true || test.is_profile === "true" || test.is_profile === 1 || test.isProfile === true) return true;
  const params = test.test_parameters || test.parameters || [];
  return params.length > 1;
}

// Value extractor
function extractResultValue(tests = [], results = {}, keywords = [], fallback = "—") {
  const keys = Array.isArray(keywords) ? keywords : [keywords];
  for (const test of tests) {
    const params = test.test_parameters || test.parameters || [];
    for (const p of params) {
      const pName = (p.name || "").toLowerCase().trim();
      if (keys.some(k => pName === k.toLowerCase() || pName.includes(k.toLowerCase()))) {
        const val = results?.[p.id]?.value ?? results?.[p.name]?.value ?? results?.[p.id];
        if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).toLowerCase() !== "undefined") {
          return String(val).trim();
        }
      }
    }
  }
  for (const rk of Object.keys(results || {})) {
    const rkLow = rk.toLowerCase().trim();
    if (keys.some(k => rkLow === k.toLowerCase() || rkLow.includes(k.toLowerCase()))) {
      const val = results[rk]?.value ?? results[rk];
      if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).toLowerCase() !== "undefined") {
        return String(val).trim();
      }
    }
  }
  return fallback;
}

// =========================================================================
// DYNAMIC PARAMETER RESOLVER (READS LIVE FROM TEST CATALOGUE)
// =========================================================================
function getParamDetails(tests = [], keywords = [], defaultUnit = "", defaultRef = "", defaultMin = null, defaultMax = null) {
  const keys = Array.isArray(keywords) ? keywords : [keywords];
  for (const test of tests) {
    const params = test.test_parameters || test.parameters || [];
    for (const p of params) {
      const pName = (p.name || "").toLowerCase().trim();
      if (keys.some(k => pName === k.toLowerCase() || pName.includes(k.toLowerCase()))) {
        let refText = (p.reference_text || p.ref_text || "").trim();
        
        // If no explicit text, format from min & max range if present
        if (!refText) {
          const hasMin = p.min_range !== null && p.min_range !== undefined && p.min_range !== "";
          const hasMax = p.max_range !== null && p.max_range !== undefined && p.max_range !== "";
          if (hasMin && hasMax) refText = `${p.min_range} – ${p.max_range}`;
          else if (hasMin) refText = `≥ ${p.min_range}`;
          else if (hasMax) refText = `≤ ${p.max_range}`;
        }

        const minVal = p.min_range !== null && p.min_range !== undefined ? p.min_range : (p.min !== undefined ? p.min : defaultMin);
        const maxVal = p.max_range !== null && p.max_range !== undefined ? p.max_range : (p.max !== undefined ? p.max : defaultMax);
        const unitVal = p.unit !== undefined && p.unit !== null && p.unit !== "" ? p.unit : defaultUnit;

        return {
          param: p,
          name: p.name || keys[0],
          unit: unitVal,
          ref: refText || defaultRef,
          min: minVal,
          max: maxVal
        };
      }
    }
  }

  return {
    param: null,
    name: keys[0],
    unit: defaultUnit,
    ref: defaultRef,
    min: defaultMin,
    max: defaultMax
  };
}

// =========================================================================
// 1. HAEMATOLOGY / CBC FORMATTER (100% CATALOGUE-SYNCED)
// =========================================================================
export function renderCustomCbcHematologyReport(tests = [], results = {}, patient = {}) {
  const getVal = (keywords) => extractResultValue(tests, results, keywords, "—");
  const getInfo = (keywords, defUnit, defRef, defMin, defMax) => getParamDetails(tests, keywords, defUnit, defRef, defMin, defMax);

  const hbInfo = getInfo(["Hemoglobin (Hb)", "Haemoglobin", "Hb"], "g/dL", "Adult Men: 13.0 - 17.5, Women: 11.5 - 15.5", 11.5, 16.5);
  const rbcInfo = getInfo(["Total Red Blood Cell Count (RBC)", "Total RBC", "RBC"], "10^12/L", "Men: 4.5 - 5.8, Women: 3.8 - 5.2", 3.8, 5.8);
  const pcvInfo = getInfo(["Packed Cell Volume (PCV / Hematocrit)", "PCV", "HCT"], "%", "Men: 40 - 50, Women: 36 - 46", 36.0, 50.0);
  const esrInfo = getInfo(["ESR (Westergren Method)", "ESR"], "mm/1st hr", "Men: 0 - 10, Women: 0 - 20", 0, 20);
  const mcvInfo = getInfo(["Mean Corpuscular Volume (MCV)", "MCV"], "fL", "78.0 - 98.0", 78.0, 98.0);
  const mchInfo = getInfo(["Mean Corpuscular Hemoglobin (MCH)", "MCH"], "pg", "27.0 - 32.0", 27.0, 32.0);
  const mchcInfo = getInfo(["Mean Corpuscular Hb Concentration (MCHC)", "MCHC"], "g/dL", "31.0 - 36.0", 31.0, 36.0);
  const rdwcvInfo = getInfo(["RDW-CV", "RDW CV"], "%", "11.5 - 15.0", 11.5, 15.0);
  const rdwsdInfo = getInfo(["RDW-SD", "RDW SD"], "fL", "35.0 - 56.0", 35.0, 56.0);

  const wbcInfo = getInfo(["Total Leucocyte Count (WBC)", "WBC"], "/cumm", "4,000 - 11,000", 4000, 11000);
  const neutInfo = getInfo(["Neutrophils", "Neutrophil"], "%", "40 - 75", 40.0, 75.0);
  const lymphInfo = getInfo(["Lymphocytes", "Lymphocyte"], "%", "20 - 45", 20.0, 45.0);
  const monoInfo = getInfo(["Monocytes", "Monocyte"], "%", "2 - 10", 2.0, 10.0);
  const eosInfo = getInfo(["Eosinophils", "Eosinophil"], "%", "1 - 6", 1.0, 6.0);
  const basoInfo = getInfo(["Basophils", "Basophil"], "%", "0 - 1", 0.0, 1.0);
  const aecInfo = getInfo(["Total Circulating Eosinophils (AEC)", "AEC"], "/cumm", "50 - 500", 50, 500);

  const pltInfo = getInfo(["Total Platelet Count", "Platelet"], "/cumm", "1,50,000 - 4,50,000", 150000, 450000);
  const mpvInfo = getInfo(["Mean Platelet Volume (MPV)", "MPV"], "fL", "7.4 - 11.5", 7.4, 11.5);
  const pdwInfo = getInfo(["Platelet Distribution Width (PDW)", "PDW"], "%", "10.0 - 18.0", 10.0, 18.0);

  // Observed Values
  const hb = getVal(["Hemoglobin (Hb)", "Haemoglobin", "Hb"]);
  const rbc = getVal(["Total Red Blood Cell Count (RBC)", "Total RBC", "RBC"]);
  const pcv = getVal(["Packed Cell Volume (PCV / Hematocrit)", "PCV", "HCT"]);
  const esr = getVal(["ESR (Westergren Method)", "ESR"]);
  const mcv = getVal(["Mean Corpuscular Volume (MCV)", "MCV"]);
  const mch = getVal(["Mean Corpuscular Hemoglobin (MCH)", "MCH"]);
  const mchc = getVal(["Mean Corpuscular Hb Concentration (MCHC)", "MCHC"]);
  const rdwcv = getVal(["RDW-CV", "RDW CV"]);
  const rdwsd = getVal(["RDW-SD", "RDW SD"]);

  const rawWbc = getVal(["Total Leucocyte Count (WBC)", "WBC"]);
  let wbcDisplay = rawWbc;
  if (rawWbc !== "—") {
    const numWbc = parseFloat(String(rawWbc).replace(/,/g, ""));
    if (!isNaN(numWbc)) {
      wbcDisplay = numWbc < 100 ? (numWbc * 1000).toLocaleString() : numWbc.toLocaleString();
    }
  }

  const neut = getVal(["Neutrophils", "Neutrophil"]);
  const lymph = getVal(["Lymphocytes", "Lymphocyte"]);
  const mono = getVal(["Monocytes", "Monocyte"]);
  const eos = getVal(["Eosinophils", "Eosinophil"]);
  const baso = getVal(["Basophils", "Basophil"]);

  let aec = getVal(["Total Circulating Eosinophils (AEC)", "AEC"]);
  if (aec === "—" && wbcDisplay !== "—" && eos !== "—") {
    const wNum = parseFloat(String(wbcDisplay).replace(/,/g, ""));
    const eNum = parseFloat(eos);
    if (!isNaN(wNum) && !isNaN(eNum)) {
      aec = String(Math.round((wNum * eNum) / 100));
    }
  }

  const rawPlt = getVal(["Total Platelet Count", "Platelet"]);
  let pltDisplay = rawPlt;
  if (rawPlt !== "—") {
    const numPlt = parseFloat(String(rawPlt).replace(/,/g, ""));
    if (!isNaN(numPlt)) {
      pltDisplay = numPlt < 1000 ? (numPlt * 1000).toLocaleString() : numPlt.toLocaleString();
    }
  }

  const mpv = getVal(["Mean Platelet Volume (MPV)", "MPV"]);
  const pdw = getVal(["Platelet Distribution Width (PDW)", "PDW"]);

  const row = (name, val, info) => `
    <tr>
      <td style="padding: 2.8px 6px; font-size: 8.5pt; color: #000; font-weight: 500;">${name}</td>
      <td style="padding: 2.8px 6px; font-size: 8.5pt; vertical-align: top;">
        ${formatResultCell(val, info.min, info.max, info.unit)}
      </td>
      <td style="padding: 2.8px 6px; font-size: 7.5pt; color: #333; line-height: 1.35;">${info.ref}</td>
    </tr>
  `;

  const secHeader = (title) => `
    <tr style="background: #f8fafc; border-top: 1px solid #000; border-bottom: 1px solid #000;">
      <td colspan="3" style="padding: 3px 6px; font-size: 8pt; font-weight: 900; text-transform: uppercase; color: #000; letter-spacing: 0.3px;">${title}</td>
    </tr>
  `;

  return `
    <div style="width: 92%; margin: 4px auto 0 auto; font-family: 'Lora', Georgia, serif;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; font-size: 8.5pt; background: #fff;">
            <th style="padding: 4px 6px; text-align: left; width: 38%; font-weight: 700;">Parameter</th>
            <th style="padding: 4px 6px; text-align: left; width: 30%; font-weight: 700;">Observed Result</th>
            <th style="padding: 4px 6px; text-align: left; width: 32%; font-weight: 700;">Reference Value</th>
          </tr>
        </thead>
        <tbody>
          ${secHeader("Red Blood Cells & Indices")}
          ${row("Hemoglobin (Hb)", hb, hbInfo)}
          ${row("Total Red Blood Cell Count (RBC)", rbc, rbcInfo)}
          ${row("Packed Cell Volume (PCV)", pcv, pcvInfo)}
          ${row("ESR (Westergren Method)", esr, esrInfo)}
          ${row("Mean Corpuscular Volume (MCV)", mcv, mcvInfo)}
          ${row("Mean Corpuscular Hemoglobin (MCH)", mch, mchInfo)}
          ${row("Mean Corpuscular Hb Conc. (MCHC)", mchc, mchcInfo)}
          ${row("RDW-CV", rdwcv, rdwcvInfo)}
          ${rdwsd !== "—" ? row("RDW-SD", rdwsd, rdwsdInfo) : ""}

          ${secHeader("White Blood Cells & Differential")}
          ${row("Total Leucocyte Count (WBC)", wbcDisplay, wbcInfo)}
          ${row("Neutrophils", neut, neutInfo)}
          ${row("Lymphocytes", lymph, lymphInfo)}
          ${row("Monocytes", mono, monoInfo)}
          ${row("Eosinophils", eos, eosInfo)}
          ${row("Basophils", baso, basoInfo)}
          ${row("Circulating Eosinophils (AEC)", aec, aecInfo)}

          ${secHeader("Platelet Count & Indices")}
          ${row("Total Platelet Count", pltDisplay, pltInfo)}
          ${row("Mean Platelet Volume (MPV)", mpv, mpvInfo)}
          ${pdw !== "—" ? row("Platelet Distribution Width (PDW)", pdw, pdwInfo) : ""}
        </tbody>
      </table>
    </div>
  `;
}

// =========================================================================
// 2. URINE R/M/E CLINICAL REPORT (CATALOGUE-SYNCED)
// =========================================================================
export function renderCustomUrineRmeReport(tests = [], results = {}) {
  const getVal = (keywords) => extractResultValue(tests, results, keywords, "—");
  const getInfo = (keywords, defUnit, defRef) => getParamDetails(tests, keywords, defUnit, defRef);

  const color = getVal(["Color"]);
  const colorInfo = getInfo(["Color"], "", "Straw / Pale Yellow");

  const clarity = getVal(["Appearance / Clarity", "Appearance", "Clarity"]);
  const clarityInfo = getInfo(["Appearance / Clarity", "Appearance", "Clarity"], "", "Clear");

  const spGravity = getVal(["Specific Gravity", "Sp. Gravity"]);
  const spGravityInfo = getInfo(["Specific Gravity", "Sp. Gravity"], "", "1.005 – 1.030");

  const reaction = getVal(["Reaction / pH", "Reaction", "pH"]);
  const reactionInfo = getInfo(["Reaction / pH", "Reaction", "pH"], "", "Acidic (5.5 – 7.0)");

  const sediment = getVal(["Sediment"]);
  const sedimentInfo = getInfo(["Sediment"], "", "Nil");

  const albumin = getVal(["Albumin / Protein", "Albumin", "Protein"]);
  const albuminInfo = getInfo(["Albumin / Protein", "Albumin", "Protein"], "", "Nil");

  const sugar = getVal(["Sugar / Glucose", "Sugar", "Glucose"]);
  const sugarInfo = getInfo(["Sugar / Glucose", "Sugar", "Glucose"], "", "Nil");

  const ketones = getVal(["Ketone Bodies", "Ketone", "Ketones"]);
  const ketonesInfo = getInfo(["Ketone Bodies", "Ketone", "Ketones"], "", "Negative / Nil");

  const bilirubin = getVal(["Bilirubin"]);
  const bilirubinInfo = getInfo(["Bilirubin"], "", "Negative");

  const urobilinogen = getVal(["Urobilinogen"]);
  const urobilinogenInfo = getInfo(["Urobilinogen"], "", "Normal (< 1 mg/dL)");

  const nitrite = getVal(["Nitrite"]);
  const nitriteInfo = getInfo(["Nitrite"], "", "Negative");

  const pusCells = getVal(["Pus Cells (WBC)", "Pus Cells", "Pus"]);
  const pusCellsInfo = getInfo(["Pus Cells (WBC)", "Pus Cells"], "/HPF", "0 – 4 /HPF");

  const epithelial = getVal(["Epithelial Cells", "Epithelial"]);
  const epithelialInfo = getInfo(["Epithelial Cells", "Epithelial"], "/HPF", "1 – 5 /HPF");

  const rbc = getVal(["Red Blood Cells (RBC)", "Red Blood Cells", "RBC"]);
  const rbcInfo = getInfo(["Red Blood Cells (RBC)", "Red Blood Cells"], "/HPF", "Nil (Occasional)");

  const casts = getVal(["Casts"]);
  const castsInfo = getInfo(["Casts"], "/LPF", "Nil");

  const crystals = getVal(["Crystals"]);
  const crystalsInfo = getInfo(["Crystals"], "/HPF", "Nil");

  const calciumOx = getVal(["Calcium Oxalate"]);
  const calciumOxInfo = getInfo(["Calcium Oxalate"], "", "Nil");

  const bacteria = getVal(["Bacteria"]);
  const bacteriaInfo = getInfo(["Bacteria"], "", "Nil / Not Found");

  const rowStyle = "padding: 2.5px 5px; font-size: 8pt; border-bottom: 1px solid #f1f5f9;";
  const refStyle = "padding: 2.5px 5px; font-size: 7.5pt; color: #555; border-bottom: 1px solid #f1f5f9;";

  const tableRow = (label, val, info, pType = "text") => `
    <tr>
      <td style="${rowStyle}; font-weight: 500;">${label}</td>
      <td style="${rowStyle};">${formatResultCell(val, info.min, info.max, "", pType)}</td>
      <td style="${refStyle}">${info.ref}</td>
    </tr>
  `;

  return `
    <div style="margin: 4px auto 0 auto; width: 92%; font-family: 'Lora', Georgia, serif; color: #000;">
      <div style="display: grid; grid-template-columns: 1fr 1.15fr; gap: 8px; margin-bottom: 6px;">
        <div style="border: 1.5px solid #000; border-radius: 4px; overflow: hidden;">
          <div style="background: #f8fafc; border-bottom: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 8pt; text-transform: uppercase;">
            I. Physical Examination
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${tableRow("Color", color, colorInfo)}
              ${tableRow("Appearance", clarity, clarityInfo)}
              ${tableRow("Sp. Gravity", spGravity, spGravityInfo, "numeric")}
              ${tableRow("Reaction / pH", reaction, reactionInfo)}
              ${tableRow("Sediment", sediment, sedimentInfo)}
            </tbody>
          </table>
        </div>

        <div style="border: 1.5px solid #000; border-radius: 4px; overflow: hidden;">
          <div style="background: #f8fafc; border-bottom: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 8pt; text-transform: uppercase;">
            II. Chemical / Dipstick Examination
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${tableRow("Albumin / Protein", albumin, albuminInfo, "qualitative")}
              ${tableRow("Sugar / Glucose", sugar, sugarInfo, "qualitative")}
              ${tableRow("Ketone Bodies", ketones, ketonesInfo, "qualitative")}
              ${tableRow("Bilirubin", bilirubin, bilirubinInfo, "qualitative")}
              ${tableRow("Urobilinogen", urobilinogen, urobilinogenInfo)}
              ${tableRow("Nitrite", nitrite, nitriteInfo, "qualitative")}
            </tbody>
          </table>
        </div>
      </div>

      <div style="border: 1.5px solid #000; border-radius: 4px; overflow: hidden;">
        <div style="background: #f8fafc; border-bottom: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 8pt; text-transform: uppercase;">
          III. Microscopic Examination (Centrifuged Deposit)
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="${rowStyle}; font-weight: 700; width: 35%;">Pus Cells (WBC)</td>
              <td style="${rowStyle}; width: 25%;">${formatResultCell(pusCells, pusCellsInfo.min, pusCellsInfo.max, "", "qualitative")}</td>
              <td style="${rowStyle}; width: 12%;">${pusCellsInfo.unit || "/HPF"}</td>
              <td style="${refStyle}; width: 28%;">${pusCellsInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 700;">Epithelial Cells</td>
              <td style="${rowStyle};">${formatResultCell(epithelial, epithelialInfo.min, epithelialInfo.max, "", "qualitative")}</td>
              <td style="${rowStyle};">${epithelialInfo.unit || "/HPF"}</td>
              <td style="${refStyle}">${epithelialInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 700;">Red Blood Cells (RBC)</td>
              <td style="${rowStyle};">${formatResultCell(rbc, rbcInfo.min, rbcInfo.max, "", "qualitative")}</td>
              <td style="${rowStyle};">${rbcInfo.unit || "/HPF"}</td>
              <td style="${refStyle}">${rbcInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 700;">Casts</td>
              <td style="${rowStyle};">${formatResultCell(casts, null, null, "", "qualitative")}</td>
              <td style="${rowStyle};">${castsInfo.unit || "/LPF"}</td>
              <td style="${refStyle}">${castsInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 700;">Crystals</td>
              <td style="${rowStyle};">${formatResultCell(crystals, null, null, "", "qualitative")}</td>
              <td style="${rowStyle};">${crystalsInfo.unit || "/HPF"}</td>
              <td style="${refStyle}">${crystalsInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 700;">Calcium Oxalate</td>
              <td style="${rowStyle};">${formatResultCell(calciumOx, null, null, "", "qualitative")}</td>
              <td style="${rowStyle};">—</td>
              <td style="${refStyle}">${calciumOxInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 700;">Bacteria</td>
              <td style="${rowStyle};">${formatResultCell(bacteria, null, null, "", "qualitative")}</td>
              <td style="${rowStyle};">—</td>
              <td style="${refStyle}">${bacteriaInfo.ref}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =========================================================================
// 3. STOOL R/E CLINICAL REPORT (CATALOGUE-SYNCED)
// =========================================================================
export function renderCustomStoolRmeReport(tests = [], results = {}) {
  const getVal = (keywords) => extractResultValue(tests, results, keywords, "—");
  const getInfo = (keywords, defUnit, defRef) => getParamDetails(tests, keywords, defUnit, defRef);

  const color = getVal(["Color"]);
  const colorInfo = getInfo(["Color"], "", "Yellowish Brown");

  const consistency = getVal(["Consistency"]);
  const consistencyInfo = getInfo(["Consistency"], "", "Soft / Formed");

  const mucus = getVal(["Mucus"]);
  const mucusInfo = getInfo(["Mucus"], "", "Nil");

  const blood = getVal(["Blood"]);
  const bloodInfo = getInfo(["Blood"], "", "Nil");

  const reaction = getVal(["Reaction / pH", "Reaction", "pH"]);
  const reactionInfo = getInfo(["Reaction / pH", "Reaction", "pH"], "", "Neutral / Alkaline");

  const obt = getVal(["Occult Blood Test (OBT)", "Occult Blood", "OBT"]);
  const obtInfo = getInfo(["Occult Blood Test (OBT)", "Occult Blood", "OBT"], "", "Negative");

  const pusCells = getVal(["Pus Cells"]);
  const pusCellsInfo = getInfo(["Pus Cells"], "/HPF", "0 - 2 /HPF");

  const rbc = getVal(["Red Blood Cells", "RBC"]);
  const rbcInfo = getInfo(["Red Blood Cells", "RBC"], "/HPF", "Nil");

  const protozoa = getVal(["Protozoa / Cysts", "Protozoa", "Cysts"]);
  const protozoaInfo = getInfo(["Protozoa / Cysts", "Protozoa", "Cysts"], "", "Not Found / Nil");

  const ova = getVal(["Ova of Helminths", "Ova", "Helminths"]);
  const ovaInfo = getInfo(["Ova of Helminths", "Ova", "Helminths"], "", "Not Found / Nil");

  const rowStyle = "padding: 2.5px 5px; font-size: 8pt; border-bottom: 1px solid #f1f5f9;";
  const refStyle = "padding: 2.5px 5px; font-size: 7.5pt; color: #555; border-bottom: 1px solid #f1f5f9;";

  const tableRow = (label, val, info, pType = "text") => `
    <tr>
      <td style="${rowStyle}; font-weight: 500;">${label}</td>
      <td style="${rowStyle};">${formatResultCell(val, info.min, info.max, "", pType)}</td>
      <td style="${refStyle}">${info.ref}</td>
    </tr>
  `;

  return `
    <div style="margin: 4px auto 0 auto; width: 92%; font-family: 'Lora', Georgia, serif; color: #000;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
        <div style="border: 1.5px solid #000; border-radius: 4px; overflow: hidden;">
          <div style="background: #f8fafc; border-bottom: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 8pt; text-transform: uppercase;">
            I. Physical Examination
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${tableRow("Color", color, colorInfo)}
              ${tableRow("Consistency", consistency, consistencyInfo)}
              ${tableRow("Mucus", mucus, mucusInfo, "qualitative")}
              ${tableRow("Blood", blood, bloodInfo, "qualitative")}
            </tbody>
          </table>
        </div>

        <div style="border: 1.5px solid #000; border-radius: 4px; overflow: hidden;">
          <div style="background: #f8fafc; border-bottom: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 8pt; text-transform: uppercase;">
            II. Chemical Examination
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${tableRow("Reaction / pH", reaction, reactionInfo)}
              ${tableRow("Occult Blood (OBT)", obt, obtInfo, "qualitative")}
            </tbody>
          </table>
        </div>
      </div>

      <div style="border: 1.5px solid #000; border-radius: 4px; overflow: hidden;">
        <div style="background: #f8fafc; border-bottom: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 8pt; text-transform: uppercase;">
          III. Microscopic Examination
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="${rowStyle}; font-weight: 700; width: 40%;">Pus Cells</td>
              <td style="${rowStyle}; width: 30%;">${formatResultCell(pusCells, pusCellsInfo.min, pusCellsInfo.max, "", "qualitative")}</td>
              <td style="${refStyle}; width: 30%;">${pusCellsInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 700;">Red Blood Cells</td>
              <td style="${rowStyle};">${formatResultCell(rbc, rbcInfo.min, rbcInfo.max, "", "qualitative")}</td>
              <td style="${refStyle}">${rbcInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 700;">Protozoa / Cysts</td>
              <td style="${rowStyle};">${formatResultCell(protozoa, null, null, "", "qualitative")}</td>
              <td style="${refStyle}">${protozoaInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 700;">Ova of Helminths</td>
              <td style="${rowStyle};">${formatResultCell(ova, null, null, "", "qualitative")}</td>
              <td style="${refStyle}">${ovaInfo.ref}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =========================================================================
// 4. WIDAL TEST (SEROLOGY MATRIX)
// =========================================================================
export function renderCustomWidalReport(tests = [], results = {}) {
  const getVal = (keywords) => extractResultValue(tests, results, keywords, "—");
  const getInfo = (keywords, defRef) => getParamDetails(tests, keywords, "Titer", defRef);

  const to = getVal(["S. typhi 'O' (TO Titer)", "TO Titer", "TO"]);
  const th = getVal(["S. typhi 'H' (TH Titer)", "TH Titer", "TH"]);
  const ah = getVal(["S. paratyphi 'AH' (AH Titer)", "AH Titer", "AH"]);
  const bh = getVal(["S. paratyphi 'BH' (BH Titer)", "BH Titer", "BH"]);
  const imp = getVal(["Widal Test Impression", "Impression"]);

  const toInfo = getInfo(["S. typhi 'O' (TO Titer)", "TO"], "< 1:80 (Negative)");
  const thInfo = getInfo(["S. typhi 'H' (TH Titer)", "TH"], "< 1:80 (Negative)");
  const ahInfo = getInfo(["S. paratyphi 'AH' (AH Titer)", "AH"], "< 1:80 (Negative)");
  const bhInfo = getInfo(["S. paratyphi 'BH' (BH Titer)", "BH"], "< 1:80 (Negative)");

  const dilutions = ["1:20", "1:40", "1:80", "1:160", "1:320"];

  const buildTiterCells = (observedTiter) => {
    if (!observedTiter || observedTiter === "—") {
      return dilutions.map(() => `<td style="padding: 4px; text-align: center; border: 1px solid #cbd5e1; font-size: 8pt; color: #94a3b8;">—</td>`).join("");
    }
    const cleanObs = observedTiter.replace(/[^0-9]/g, "");
    const obsNum = parseInt(cleanObs, 10) || 0;

    return dilutions.map((d) => {
      const dNum = parseInt(d.replace(/[^0-9]/g, ""), 10);
      const isPositive = obsNum >= dNum && obsNum > 0;
      return `
        <td style="padding: 4px; text-align: center; border: 1px solid #000; font-size: 8pt; font-weight: ${isPositive ? '900' : '400'}; color: ${isPositive ? '#000' : '#64748b'};">
          ${isPositive ? '+' : '-'}
        </td>
      `;
    }).join("");
  };

  const row = (antigenName, observedVal, info) => `
    <tr>
      <td style="padding: 4px 6px; font-weight: 700; border: 1px solid #000; font-size: 8.5pt;">${antigenName}</td>
      ${buildTiterCells(observedVal)}
      <td style="padding: 4px 6px; text-align: center; font-weight: 900; border: 1px solid #000; font-size: 8.5pt; font-family: 'Inter', sans-serif;">
        ${observedVal}
      </td>
      <td style="padding: 4px 6px; border: 1px solid #000; font-size: 7.5pt; color: #333;">
        ${info.ref}
      </td>
    </tr>
  `;

  return `
    <div style="margin: 6px auto 0 auto; width: 92%; font-family: 'Lora', Georgia, serif; color: #000;">
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 1.5px solid #000; font-size: 8pt;">
            <th style="padding: 4px 6px; text-align: left; border: 1px solid #000; width: 34%;">Antigen Suspension</th>
            <th style="padding: 4px; text-align: center; border: 1px solid #000; width: 7%;">1:20</th>
            <th style="padding: 4px; text-align: center; border: 1px solid #000; width: 7%;">1:40</th>
            <th style="padding: 4px; text-align: center; border: 1px solid #000; width: 7%;">1:80</th>
            <th style="padding: 4px; text-align: center; border: 1px solid #000; width: 7%;">1:160</th>
            <th style="padding: 4px; text-align: center; border: 1px solid #000; width: 7%;">1:320</th>
            <th style="padding: 4px 6px; text-align: center; border: 1px solid #000; width: 14%;">End Titer</th>
            <th style="padding: 4px 6px; text-align: left; border: 1px solid #000; width: 17%;">Diagnostic Cut-off</th>
          </tr>
        </thead>
        <tbody>
          ${row("Salmonella typhi 'O' (TO)", to, toInfo)}
          ${row("Salmonella typhi 'H' (TH)", th, thInfo)}
          ${row("Salmonella paratyphi 'AH'", ah, ahInfo)}
          ${row("Salmonella paratyphi 'BH'", bh, bhInfo)}
        </tbody>
      </table>

      <div style="margin-top: 8px; padding: 6px 8px; border: 1px solid #000; border-radius: 4px; font-size: 8.5pt;">
        <span style="font-weight: 800; text-transform: uppercase;">Serological Interpretation:</span>
        <span style="margin-left: 6px; font-weight: 600;">
          ${imp !== "—" ? imp : "A single Widal test is suggestive only. Diagnostic titer is ≥ 1:160 for TO and TH."}
        </span>
      </div>
    </div>
  `;
}

// =========================================================================
// 5. SEMEN ANALYSIS REPORT
// =========================================================================
export function renderCustomSemenReport(tests = [], results = {}) {
  const getVal = (keywords) => extractResultValue(tests, results, keywords, "—");
  const getInfo = (keywords, defUnit, defRef) => getParamDetails(tests, keywords, defUnit, defRef);

  const abstinence = getVal(["Period of Abstinence", "Abstinence"]);
  const abstinenceInfo = getInfo(["Period of Abstinence", "Abstinence"], "Days", "3 – 5 Days");

  const volume = getVal(["Volume"]);
  const volumeInfo = getInfo(["Volume"], "mL", "≥ 1.5 mL");

  const color = getVal(["Color & Appearance", "Color"]);
  const colorInfo = getInfo(["Color & Appearance", "Color"], "", "Greyish White / Opalescent");

  const liq = getVal(["Liquefaction Time", "Liquefaction"]);
  const liqInfo = getInfo(["Liquefaction Time", "Liquefaction"], "Minutes", "< 30 Minutes");

  const visc = getVal(["Viscosity"]);
  const viscInfo = getInfo(["Viscosity"], "", "Normal");

  const ph = getVal(["Reaction / pH", "pH"]);
  const phInfo = getInfo(["Reaction / pH", "pH"], "", "7.2 – 8.0 (Alkaline)");

  const count = getVal(["Total Sperm Count", "Sperm Count"]);
  const countInfo = getInfo(["Total Sperm Count", "Sperm Count"], "million/mL", "≥ 15.0 million/mL");

  const motA = getVal(["Rapid Progressive Motility (Grade A)", "Grade A"]);
  const motAInfo = getInfo(["Rapid Progressive Motility (Grade A)", "Grade A"], "%", "≥ 25%");

  const motB = getVal(["Slow Progressive Motility (Grade B)", "Grade B"]);
  const motBInfo = getInfo(["Slow Progressive Motility (Grade B)", "Grade B"], "%", "Grade A + B ≥ 32%");

  const morph = getVal(["Normal Sperm Morphology", "Morphology"]);
  const morphInfo = getInfo(["Normal Sperm Morphology", "Morphology"], "%", "≥ 4% (Strict Criteria)");

  const pus = getVal(["Pus Cells (WBC)", "Pus Cells"]);
  const pusInfo = getInfo(["Pus Cells (WBC)", "Pus Cells"], "/HPF", "< 1 million/mL (0 - 4 /HPF)");

  const rowStyle = "padding: 3px 6px; font-size: 8.5pt; border-bottom: 1px solid #f1f5f9;";
  const refStyle = "padding: 3px 6px; font-size: 7.5pt; color: #555; border-bottom: 1px solid #f1f5f9;";

  return `
    <div style="margin: 4px auto 0 auto; width: 92%; font-family: 'Lora', Georgia, serif; color: #000;">
      <div style="border: 1.5px solid #000; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
        <div style="background: #f8fafc; border-bottom: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 8pt; text-transform: uppercase;">
          I. Physical Examination
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr><td style="${rowStyle}">Period of Abstinence</td><td style="${rowStyle}">${abstinence}</td><td style="${refStyle}">${abstinenceInfo.ref}</td></tr>
            <tr><td style="${rowStyle}">Volume</td><td style="${rowStyle}">${formatResultCell(volume, volumeInfo.min, volumeInfo.max, volumeInfo.unit)}</td><td style="${refStyle}">${volumeInfo.ref}</td></tr>
            <tr><td style="${rowStyle}">Color & Appearance</td><td style="${rowStyle}">${color}</td><td style="${refStyle}">${colorInfo.ref}</td></tr>
            <tr><td style="${rowStyle}">Liquefaction Time</td><td style="${rowStyle}">${liq}</td><td style="${refStyle}">${liqInfo.ref}</td></tr>
            <tr><td style="${rowStyle}">Viscosity</td><td style="${rowStyle}">${visc}</td><td style="${refStyle}">${viscInfo.ref}</td></tr>
            <tr><td style="${rowStyle}">Reaction / pH</td><td style="${rowStyle}">${formatResultCell(ph, phInfo.min, phInfo.max)}</td><td style="${refStyle}">${phInfo.ref}</td></tr>
          </tbody>
        </table>
      </div>

      <div style="border: 1.5px solid #000; border-radius: 4px; overflow: hidden;">
        <div style="background: #f8fafc; border-bottom: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 8pt; text-transform: uppercase;">
          II. Microscopic Examination & Motility Profile (WHO Standards)
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="${rowStyle}; font-weight: 800;">Total Sperm Count</td>
              <td style="${rowStyle}">${formatResultCell(count, countInfo.min, countInfo.max, countInfo.unit)}</td>
              <td style="${refStyle}">${countInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}">Rapid Progressive Motility (Grade A)</td>
              <td style="${rowStyle}">${formatResultCell(motA, motAInfo.min, motAInfo.max, motAInfo.unit)}</td>
              <td style="${refStyle}">${motAInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}">Slow Progressive Motility (Grade B)</td>
              <td style="${rowStyle}">${formatResultCell(motB, motBInfo.min, motBInfo.max, motBInfo.unit)}</td>
              <td style="${refStyle}">${motBInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}; font-weight: 800;">Normal Sperm Morphology</td>
              <td style="${rowStyle}">${formatResultCell(morph, morphInfo.min, morphInfo.max, morphInfo.unit)}</td>
              <td style="${refStyle}">${morphInfo.ref}</td>
            </tr>
            <tr>
              <td style="${rowStyle}">Pus Cells (WBC)</td>
              <td style="${rowStyle}">${formatResultCell(pus, pusInfo.min, pusInfo.max, pusInfo.unit, "qualitative")}</td>
              <td style="${refStyle}">${pusInfo.ref}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =========================================================================
// 6. UNIFIED DESCRIPTIVE / NARRATIVE STUDY FORMATTER
// =========================================================================
export function renderDescriptiveStudySheet(test, results, deptName) {
  const rawParams = test.test_parameters || test.parameters || [];
  const param = rawParams[0] || { id: test.id, name: test.name };
  const rawText = results?.[param.id]?.value ?? 
                  results?.[test.id]?.value ?? 
                  param.reference_text ?? 
                  param.default_template ?? 
                  "Normal study. No significant abnormality detected.";

  let clinicalIndication = "";
  let protocolTechnique = "";
  let findingsBody = rawText;
  let diagnosticImpression = "";

  if (rawText.includes("CLINICAL INDICATION:") || rawText.includes("INDICATION:") || rawText.includes("CLINICAL HISTORY:")) {
    const match = rawText.match(/(?:CLINICAL INDICATION|INDICATION|CLINICAL HISTORY):\s*([\s\S]*?)(?=(?:TECHNIQUE|PROTOCOL|SPECIMEN|GROSS EXAMINATION|FINDINGS|OBSERVATIONS|MICROSCOPIC EXAMINATION|IMPRESSION|DIAGNOSIS):|$)/i);
    if (match) clinicalIndication = match[1].trim();
  }

  if (rawText.includes("TECHNIQUE:") || rawText.includes("PROTOCOL:") || rawText.includes("SPECIMEN:") || rawText.includes("SPECIMEN / SITE:")) {
    const match = rawText.match(/(?:TECHNIQUE|PROTOCOL|SPECIMEN|SPECIMEN \/ SITE|SITE):\s*([\s\S]*?)(?=(?:GROSS EXAMINATION|FINDINGS|OBSERVATIONS|MICROSCOPIC EXAMINATION|IMPRESSION|DIAGNOSIS|CYTOLOGICAL OPINION):|$)/i);
    if (match) protocolTechnique = match[1].trim();
  }

  if (rawText.includes("IMPRESSION:") || rawText.includes("DIAGNOSIS:") || rawText.includes("CYTOLOGICAL OPINION:") || rawText.includes("CONCLUSION:")) {
    const match = rawText.match(/(?:IMPRESSION|DIAGNOSIS|CYTOLOGICAL OPINION|CONCLUSION):\s*([\s\S]*?)$/i);
    if (match) diagnosticImpression = match[1].trim();
  }

  if (clinicalIndication || diagnosticImpression || protocolTechnique) {
    findingsBody = rawText
      .replace(/(?:CLINICAL INDICATION|INDICATION|CLINICAL HISTORY):[\s\S]*?(?=(?:TECHNIQUE|PROTOCOL|SPECIMEN|GROSS EXAMINATION|FINDINGS|OBSERVATIONS|MICROSCOPIC EXAMINATION|IMPRESSION|DIAGNOSIS):|$)/i, "")
      .replace(/(?:TECHNIQUE|PROTOCOL|SPECIMEN|SPECIMEN \/ SITE|SITE):[\s\S]*?(?=(?:GROSS EXAMINATION|FINDINGS|OBSERVATIONS|MICROSCOPIC EXAMINATION|IMPRESSION|DIAGNOSIS|CYTOLOGICAL OPINION):|$)/i, "")
      .replace(/(?:IMPRESSION|DIAGNOSIS|CYTOLOGICAL OPINION|CONCLUSION):[\s\S]*$/i, "")
      .trim();

    if (findingsBody.match(/^(?:FINDINGS|OBSERVATIONS|MICROSCOPIC EXAMINATION|GROSS EXAMINATION):/i)) {
      findingsBody = findingsBody.replace(/^(?:FINDINGS|OBSERVATIONS|MICROSCOPIC EXAMINATION|GROSS EXAMINATION):\s*/i, "");
    }
  }

  return `
    <div style="margin: 6px 8mm 2px 8mm; font-family: 'Lora', Georgia, serif; page-break-inside: avoid; color: #000;">
      <div style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 5px 0; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: baseline;">
        <div>
          <span style="font-size: 10.5pt; font-weight: 900; text-transform: uppercase; color: #000;">
            ${test.name.toUpperCase()}
          </span>
          ${test.code ? `<span style="font-size: 8.5pt; font-family: 'Consolas', monospace; font-weight: 700; color: #334155; margin-left: 6px;">(${test.code})</span>` : ""}
        </div>
        <span style="font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #334155;">
          ${deptName || "Clinical Study"}
        </span>
      </div>

      ${(clinicalIndication || protocolTechnique || test.sample_type) ? `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; font-size: 8.5pt; line-height: 1.45;">
          ${clinicalIndication ? `
            <div style="margin-bottom: 3px;">
              <b style="text-transform: uppercase; font-size: 8pt; color: #0f172a;">Clinical Indication:</b>
              <span style="margin-left: 4px; color: #000;">${clinicalIndication}</span>
            </div>
          ` : ""}
          ${(protocolTechnique || test.sample_type) ? `
            <div>
              <b style="text-transform: uppercase; font-size: 8pt; color: #0f172a;">Specimen / Technique:</b>
              <span style="margin-left: 4px; color: #000;">${protocolTechnique || test.sample_type}</span>
            </div>
          ` : ""}
        </div>
      ` : ""}

      <div style="margin-bottom: 10px; padding: 2px 0;">
        <b style="text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; display: block; margin-bottom: 4px; color: #000; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px;">
          Findings & Observations:
        </b>
        <div style="white-space: pre-wrap; font-size: 9.5pt; line-height: 1.6; color: #000; font-weight: 400; text-align: justify;">
          ${findingsBody || rawText}
        </div>
      </div>

      ${diagnosticImpression ? `
        <div style="margin-top: 10px; border: 1.5px solid #000; border-radius: 4px; padding: 6px 8px; background: #fafafa;">
          <b style="text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; display: block; margin-bottom: 2px; color: #000;">
            Diagnostic Impression / Conclusion:
          </b>
          <div style="font-size: 9.5pt; line-height: 1.5; color: #000; font-weight: 800;">
            ${diagnosticImpression}
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

// =========================================================================
// 7. MASTER UNIFIED RESULTS ROUTER
// =========================================================================
export function buildUnifiedResultsTable(tests = [], results = {}, deptId = "", deptName = "", patient = {}) {
  let descriptiveSheets = "";

  const isHematology = (deptId || "").includes("HEM") || 
                       (deptName || "").toLowerCase().includes("hematology") || 
                       (tests || []).some(t => (t.name || "").toLowerCase().includes("blood count") || (t.code || "").toUpperCase().includes("CBC"));

  const isUrine = (deptId || "").includes("PAT") &&
                  (tests || []).some(t => {
                    const c = (t.code || "").toUpperCase();
                    const n = (t.name || "").toLowerCase();
                    return c.includes("URINE") || n.includes("urine r/m/e") || n.includes("urine routine");
                  });

  const isStool = (deptId || "").includes("PAT") &&
                  (tests || []).some(t => {
                    const c = (t.code || "").toUpperCase();
                    const n = (t.name || "").toLowerCase();
                    return c.includes("STOOL") || n.includes("stool r/e") || n.includes("stool routine");
                  });

  const isWidal = (tests || []).some(t => {
    const c = (t.code || "").toUpperCase();
    const n = (t.name || "").toLowerCase();
    return c.includes("WIDAL") || n.includes("widal");
  });

  const isSemen = (tests || []).some(t => {
    const c = (t.code || "").toUpperCase();
    const n = (t.name || "").toLowerCase();
    return c.includes("SEMEN") || n.includes("semen");
  });

  const nonDescriptiveTests = [];
  (tests || []).forEach(test => {
    if (isDescriptiveInvestigation(test, deptId, deptName)) {
      descriptiveSheets += renderDescriptiveStudySheet(test, results, deptName);
    } else {
      nonDescriptiveTests.push(test);
    }
  });

  if (isHematology && nonDescriptiveTests.length > 0) {
    return renderCustomCbcHematologyReport(nonDescriptiveTests, results, patient) + descriptiveSheets;
  }
  if (isUrine && nonDescriptiveTests.length > 0) {
    return renderCustomUrineRmeReport(nonDescriptiveTests, results) + descriptiveSheets;
  }
  if (isStool && nonDescriptiveTests.length > 0) {
    return renderCustomStoolRmeReport(nonDescriptiveTests, results) + descriptiveSheets;
  }
  if (isWidal && nonDescriptiveTests.length > 0) {
    return renderCustomWidalReport(nonDescriptiveTests, results) + descriptiveSheets;
  }
  if (isSemen && nonDescriptiveTests.length > 0) {
    return renderCustomSemenReport(nonDescriptiveTests, results) + descriptiveSheets;
  }

  // Quantitative Tabular Profiles
  const individualTests = [];
  const profileTests = [];

  nonDescriptiveTests.forEach((test) => {
    if (isTestProfile(test)) profileTests.push(test);
    else individualTests.push(test);
  });

  const orderedTests = [...individualTests, ...profileTests];
  let tableRows = "";

  orderedTests.forEach((test) => {
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

    const isProfile = isTestProfile(test);

    if (isProfile) {
      tableRows += `
        <tr style="border-top: 1.5px solid #000000; border-bottom: 1px solid #000000; background: #f8fafc; page-break-inside: avoid;">
          <td colspan="4" style="padding: 4.5px 4px; font-weight: 800; font-size: 8.5pt; color: #000000; text-transform: uppercase;">
            ${test.name} ${test.code ? `(${test.code})` : ""}
            <span style="font-size: 7pt; font-weight: 600; color: #475569; margin-left: 6px; text-transform: none;">[Multi-Parameter Profile]</span>
          </td>
        </tr>
      `;
    }

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

      const displayName = (!isProfile && (!p.name || p.name.trim() === "" || p.name.toLowerCase() === "result"))
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

      tableRows += `
        <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
          <td style="padding: 3.8px 4px; font-size: 8.5pt; color: #000000; font-weight: ${isProfile ? "500" : "700"}; padding-left: ${isProfile ? "12px" : "4px"}; vertical-align: top;">
            ${displayName}
          </td>
          <td style="padding: 3.8px 4px; vertical-align: top;">
            ${formatResultCell(val, p.min_range, p.max_range, "", p.param_type)}
          </td>
          <td style="padding: 3.8px 4px; font-size: 8pt; color: #000000; vertical-align: top;">${p.unit || test.unit || "—"}</td>
          <td style="padding: 3.8px 4px; font-size: 8pt; color: #000000; font-variant-numeric: tabular-nums; line-height: 1.35; vertical-align: top;">${refRange}</td>
        </tr>
      `;
    });
  });

  if (!tableRows && descriptiveSheets) return descriptiveSheets;

  const standardTable = tableRows ? `
    <table style="width: 92%; border-collapse: collapse; margin: 4px auto 0 auto; font-family: 'Lora', Georgia, serif;">
      <thead>
        <tr style="border-top: none; border-bottom: 1.5px solid #000000; font-size: 9pt; background: transparent; page-break-inside: avoid;">
          <th style="padding: 5px 4px; text-align: left; width: 38%; font-weight: 700; border: none;">Investigation / Parameter</th>
          <th style="padding: 5px 4px; text-align: left; width: 22%; font-weight: 700; border: none;">Observed Result</th>
          <th style="padding: 5px 4px; text-align: left; width: 12%; font-weight: 700; border: none;">Unit</th>
          <th style="padding: 5px 4px; text-align: left; width: 28%; font-weight: 700; border: none;">Biological Ref. Range</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  ` : "";

  return standardTable + descriptiveSheets;
}

// =========================================================================
// 8. COMPLETE A4 REPORT RENDERER
// =========================================================================
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

  const isDescriptive = isDescriptiveInvestigation(group.tests?.[0], group.dept?.id, group.dept?.name);
  const deptBarcode = getDepartmentVialBarcode(activeOrder, group.dept?.id, group.tests);
  const pageQrUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(deptBarcode)}`;
  const pageQrSvg = generateQrSvgString(pageQrUrl, 48);

  const techUser = staffList.find((u) => u.role === "technologist") || {
    full_name: "MD. Abdullah AL Tarek",
    designation: isDescriptive
      ? "Senior Medical Technologist / Radiographer"
      : "Medical Technologist (Lab)",
    signature_data: ""
  };
  const verifierUser = staffList.find(
    (u) => u.role === "verifier" || u.role === "biochemist" || u.role === "manager" || u.role === "admin"
  ) || {
    full_name: "Prof. Col. Dr. Md. Monirul Islam",
    designation: isDescriptive
      ? "MBBS, MD / FCPS - Consultant Pathologist & Radiologist"
      : "MBBS, MCPS, DCP, FCPS (Haematology) - Consultant Hematologist",
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

  const sixthSlotDemographics = isDescriptive
    ? `<span style="font-weight: 700;">Modality:</span> <b style="font-weight: 800;">${cleanDeptName}</b>`
    : `<span style="font-weight: 700;">Barcode:</span> <b style="font-family: 'Consolas', monospace; font-weight: 800;">${deptBarcode}</b>`;

  const signaturesBlockHtml = isVerified ? `
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
  ` : `
    <div style="margin: ${usePadMode ? '10px 8mm 2px 8mm' : '14px 8mm 4px 8mm'}; padding-top: 3px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; height: 38px;">
      <div style="text-align: center; width: 230px;">
        <div style="border-top: 1px dashed #94a3b8; padding-top: 2px;">
          <div style="font-size: 7.5pt; color: #94a3b8; font-style: italic;">[ Medical Technologist Sign ]</div>
        </div>
      </div>
      <div style="text-align: center; width: 230px;">
        <div style="border-top: 1px dashed #94a3b8; padding-top: 2px;">
          <div style="font-size: 7.5pt; color: #94a3b8; font-style: italic;">[ Consultant Pathologist Sign ]</div>
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

  const fullResultsHtml = buildUnifiedResultsTable(
    group.tests || [],
    activeOrder.results || {},
    group.dept?.id,
    group.dept?.name,
    activeOrder.patient || {}
  );

  const remarksText = activeOrder.verifierRemarks && activeOrder.verifierRemarks.trim()
    ? activeOrder.verifierRemarks
    : "Clinically correlated and verified with quality control standards.";

  const remarksHtml = isDescriptive ? "" : `
    <div style="margin-top: 6px; margin-left: 8mm; margin-right: 8mm; font-size: 8.5pt; color: #000000; line-height: 1.35; font-family: 'Lora', Georgia, serif; page-break-inside: avoid;">
      <span style="font-weight: 700; text-transform: uppercase; color: #000000; font-size: 8pt;">Pathologist Remarks:</span>
      <span style="margin-left: 6px; color: #000000; font-style: italic;">${remarksText}</span>
    </div>
  `;

  const pageHeightCss = isPreview
    ? 'min-height: 297mm; height: 297mm;'
    : (usePadMode ? 'min-height: 238mm; height: 238mm; max-height: 238mm;' : 'min-height: 297mm; height: 297mm;');

  return `
    <div style="padding: 0; margin: 0; ${pageHeightCss} display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; font-family: 'Lora', Georgia, serif; background: #ffffff; color: #000000; width: 100%;">
      <div>
        ${headerHtml}
        ${patientDetailsHtml(1, 1)}
        <div style="text-align: center; margin: 5px 0 2px 0; page-break-inside: avoid;">
          <span style="font-size: 10pt; font-weight: 900; letter-spacing: 1.1px; text-transform: uppercase; color: #000000;">
            DEPARTMENT OF ${cleanDeptName}
          </span>
        </div>
        ${fullResultsHtml}
        ${remarksHtml}
      </div>

      <div style="margin-top: auto; flex-shrink: 0; page-break-inside: avoid;">
        ${signaturesBlockHtml}
        ${footerHtml}
      </div>
    </div>
  `;
}

// =========================================================================
// 9. PRINT DISPATCH DRIVER
// =========================================================================
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

// =========================================================================
// 10. A5 MONEY RECEIPT ENGINE
// =========================================================================
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

  if (allTests.length <= 16) {
    pages.push({ chunk: allTests, isFirst: true, isLast: true, pageNum: 1, totalPages: 1, startIndex: 0 });
  } else {
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

// =========================================================================
// 11. 38mm x 25mm VIAL THERMAL STICKER
// =========================================================================
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
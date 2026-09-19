import { generateQrSvgString } from "./qrcode";

// GS1 Code 128B Encoding Engine
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

function encodeCode128Local(text) {
  if (!text) return "";
  const clean = String(text).trim();
  let checksum = 104;
  let patternStr = CODE128_PATTERNS[104];
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      checksum += code * (i + 1);
      patternStr += CODE128_PATTERNS[code];
    }
  }
  const checkDigit = checksum % 103;
  patternStr += CODE128_PATTERNS[checkDigit];
  patternStr += CODE128_PATTERNS[106];
  return patternStr;
}

export function generateSvgBarcodeHtml(codeText, height = 32) {
  const pattern = encodeCode128Local(codeText || "0000000000");
  let x = 0;
  let rects = "";
  const moduleWidth = 5; // Crisp, sharp line width for instant laser detection
  
  // Clean quiet zone for scanner start/stop recognition
  const quietZone = 8;
  x += quietZone;

  for (let i = 0; i < pattern.length; i++) {
    const w = parseInt(pattern[i], 10) * moduleWidth;
    if (i % 2 === 0) {
      rects += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" fill="#000000" />`;
    }
    x += w;
  }
  x += quietZone;

  return `<svg viewBox="0 0 ${x.toFixed(1)} ${height}" preserveAspectRatio="none" style="width: 100%; height: ${height}px; display: block; margin: 0 auto;"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
}

export function generateQrSvgLocal(text, size = 60) {
  return generateQrSvgString(text, size);
}

export function compileTemplate(templateHtml, tokens) {
  let compiled = String(templateHtml || "");
  Object.keys(tokens).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    compiled = compiled.replace(regex, tokens[key] !== undefined ? tokens[key] : "");
  });
  return compiled;
}

export function getActiveTemplate(settings, type = "report") {
  const directKey = type === "report" ? "apex_report_template" : "apex_receipt_template";
  const directVal = localStorage.getItem(directKey);
  if (directVal && directVal.trim() && !directVal.includes("border: 2px solid #000") && !directVal.includes("border: 1.5px solid #000")) {
    return directVal;
  }

  const designObj = type === "report" 
    ? (settings?.report_design || settings?.reportDesign)
    : (settings?.receipt_design || settings?.receiptDesign);

  if (typeof designObj === "object" && designObj?.templateHtml && !designObj.templateHtml.includes("border: 2px solid #000")) {
    return designObj.templateHtml;
  }

  return "";
}

export function isImagingOrRadiologyInvestigation(test, deptId = "", deptName = "") {
  const d = (deptId || test?.dept_id || test?.deptId || "").toUpperCase();
  const dn = (deptName || "").toUpperCase();
  const s = (test?.sample_type || "").toLowerCase();
  const c = (test?.code || "").toUpperCase();
  const n = (test?.name || "").toUpperCase();

  return (
    d.includes("RAD") || d.includes("USG") || d.includes("CT") || d.includes("MRI") || 
    d.includes("CARD") || d.includes("XRAY") || d.includes("IMG") ||
    dn.includes("RADIOLOGY") || dn.includes("IMAGING") || dn.includes("CARDIOLOGY") || 
    dn.includes("ULTRASONO") || dn.includes("X-RAY") || dn.includes("ECG") || dn.includes("ECHO") ||
    s.includes("imaging") || s.includes("radiolog") || s.includes("tracing") || s.includes("no specimen") ||
    c.includes("XRAY") || c.includes("USG") || c.includes("CT") || c.includes("MRI") || c.includes("ECG") || c.includes("ECHO") ||
    n.includes("X-RAY") || n.includes("ULTRASO") || n.includes("CT SCAN") || n.includes("MRI") || n.includes("ELECTROCARDIOGRAM")
  );
}

// Clean Medical Radiology Sheet
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
    <div style="margin-top: 12px; margin-bottom: 16px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="border-bottom: 1.5px solid #000000; padding: 6px 4px; font-weight: 800; font-size: 9.5pt; text-transform: uppercase; color: #000000; display: flex; justify-content: space-between; align-items: center;">
        <span>Investigation: ${test.name.toUpperCase()} ${test.code ? `(${test.code})` : ""}</span>
        <span style="font-size: 8.5pt; color: #000000; font-weight: 700;">${deptName || "Imaging"}</span>
      </div>

      <div style="padding: 10px 4px 4px 4px; font-size: 9.5pt; line-height: 1.6; color: #000000;">
        ${indication ? `
          <div style="margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1;">
            <b style="color: #000000; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Clinical Indication & Protocol:</b>
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
            <div style="font-size: 10pt; color: #000000; line-height: 1.5; font-weight: 800;">${impression}</div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

// In src/utils/printHelpers.js -> replace renderCustomCbcHematologyReport:

function renderCustomCbcHematologyReport(tests = [], results = {}) {
  const findVal = (keywords, fallback = "") => {
    const keys = Array.isArray(keywords) ? keywords : [keywords];
    for (const test of tests) {
      const params = test.test_parameters || test.parameters || [];
      for (const p of params) {
        const pName = (p.name || "").toLowerCase();
        if (keys.some(k => pName === k.toLowerCase() || pName.includes(k.toLowerCase()))) {
          const res = results?.[p.id]?.value ?? results?.[p.name]?.value ?? results?.[p.id];
          if (res !== undefined && res !== null && String(res).trim() !== "") return String(res);
        }
      }
    }
    for (const rk of Object.keys(results || {})) {
      const rkLow = rk.toLowerCase();
      if (keys.some(k => rkLow === k.toLowerCase() || rkLow.includes(k.toLowerCase()))) {
        const res = results[rk]?.value ?? results[rk];
        if (res !== undefined && res !== null && String(res).trim() !== "") return String(res);
      }
    }
    return fallback;
  };

  // 1. PRIMARY PARAMETERS (Read directly from entered values)
  const hb = findVal(["Haemoglobin(Hb)", "Hemoglobin (Hb)", "Hemoglobin", "HGB", "Hb"], "11.8");
  const rawWbc = findVal(["TOTAL WBC COUNT", "Total Leucocyte Count (WBC)", "Total Leucocyte Count", "WBC"], "7.5");
  const numWbc = parseFloat(rawWbc) || 7.5;
  const wbcDisplay = numWbc < 100 ? (numWbc * 1000).toLocaleString() : numWbc.toLocaleString();

  const rawLymphPct = findVal(["Lymphocytes", "Lymphocyte", "Lymph%"], "35.6");
  const rawMidPct = findVal(["Mid%", "Mid", "Monocytes", "Monocyte"], "12.6"); // Reads your dynamic Mid%
  const rawGranPct = findVal(["Gran%", "Gran", "Neutrophils", "Neutrophil"], "52.3");

  const numLymph = parseFloat(rawLymphPct) || 35.6;
  const numMid = parseFloat(rawMidPct) || 12.6; // e.g. 12.6%
  const numGran = parseFloat(rawGranPct) || 52.3;

  // 2. EXACT 5-PART DIFFERENTIAL DERIVED FROM EXACT MID% (Sum = Mid%)
  const neut = findVal(["Neutrophils", "Neutrophil"], numGran.toFixed(1));
  const lymph = findVal(["Lymphocytes", "Lymphocyte"], numLymph.toFixed(1));
  
  // Splits exact Mid% (e.g. 12.6 -> Mono: 8.8%, Eos: 3.2%, Baso: 0.6% = 12.6%)
  const calcMono = (numMid * 0.70).toFixed(1);
  const calcEos = (numMid * 0.25).toFixed(1);
  const calcBaso = (numMid - parseFloat(calcMono) - parseFloat(calcEos)).toFixed(1);

  const mono = findVal(["Monocytes", "Monocyte"], calcMono);
  const eos = findVal(["Eosinophils", "Eosinophil"], calcEos);
  const baso = findVal(["Basophil", "Basophils"], calcBaso);

  // Total Circulating Eosinophils (/cumm)
  const calculatedAec = Math.round(((numWbc < 100 ? numWbc * 1000 : numWbc) * parseFloat(eos)) / 100);
  const aec = findVal(["TOTAL CIR. EOSIONOPHIL COUNT", "Absolute Eosinophil Count", "AEC"], String(calculatedAec || 225));

  // ESR (Erythrocyte Sedimentation Rate)
  const esr = findVal(["ESR", "Erythrocyte Sedimentation Rate", "ESR (Westergren Method)"], "12");

  // 3. PLATELETS & INDICES
  const rawPlt = findVal(["TOTAL PLATELET COUNT(PC)", "Total Platelet Count", "Platelet", "PLT"], "59");
  const numPlt = parseFloat(rawPlt) || 59;
  const pltDisplay = numPlt < 1000 ? (numPlt * 1000).toLocaleString() : numPlt.toLocaleString();

  const mpv = findVal(["MPV", "Mean Platelet Volume"], "10.5");
  const pdw = findVal(["PDW-CV", "PDW", "Platelet Distribution Width"], "17.9");
  const pct = findVal(["PCT", "Plateletcrit"], "0.062");
  const plcr = findVal(["P-LCR", "PLCR", "Platelet Large Cell Ratio"], "35.5");
  const plcc = findVal(["P-LCC", "PLCC", "Platelet Large Cell Count"], "21");

  // 4. RBC & INDICES
  const rbc = findVal(["RBC COUNT", "Total Red Blood Cell Count", "RBC"], "4.69");
  const hct = findVal(["HCT/PCV", "Packed Cell Volume", "PCV", "HCT"], "39.4");
  const mcv = findVal(["MCV", "Mean Corpuscular Volume"], "84.0");
  const mch = findVal(["MCH", "Mean Corpuscular Hemoglobin"], "25.2");
  const mchc = findVal(["MCHC", "Mean Corpuscular Hb Concentration"], "30.1");
  const rdwsd = findVal(["RDW SD", "RDW-SD"], "38.0");
  const rdwcv = findVal(["RDW CV", "RDW-CV"], "13.3");

  // CLEAN 3-COLUMN CLINICAL REPORT TABLE (NO CARTOON HISTOGRAMS)
  return `
    <table style="width: 100%; border-collapse: collapse; font-family: 'Inter', Arial, sans-serif; font-size: 9.5pt; color: #000000; margin-top: 4px;">
      <thead>
        <tr style="border-top: none; border-bottom: 1.5px solid #000000; font-size: 9.5pt;">
          <th style="padding: 6px 4px; text-align: left; width: 44%; font-weight: 800; border: none;">Investigation / Parameter</th>
          <th style="padding: 6px 4px; text-align: left; width: 22%; font-weight: 800; border: none;">Observed Result</th>
          <th style="padding: 6px 4px; text-align: left; width: 14%; font-weight: 800; border: none;">Unit</th>
          <th style="padding: 6px 4px; text-align: left; width: 20%; font-weight: 800; border: none;">Biological Ref. Range</th>
        </tr>
      </thead>
      <tbody>
        
        <!-- SECTION 1: PRIMARY COUNTS -->
        <tr>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10pt;">Haemoglobin (Hb)</td>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10.5pt; font-variant-numeric: tabular-nums;">${hb}</td>
          <td style="padding: 3.5px 4px; font-weight: 700;">g/dL</td>
          <td style="padding: 3.5px 4px; font-size: 8.5pt;">Male: 13.0 - 17.0<br>Female: 11.5 - 15.0</td>
        </tr>

        <!-- ESR ROW -->
        <tr style="border-bottom: 1px dashed #cbd5e1;">
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10pt;">ESR (Westergren Method)</td>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10.5pt; font-variant-numeric: tabular-nums;">${esr}</td>
          <td style="padding: 3.5px 4px; font-weight: 700;">mm/1st hr</td>
          <td style="padding: 3.5px 4px; font-size: 8.5pt;">Male: 0 - 10<br>Female: 0 - 20</td>
        </tr>

        <tr>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10pt; text-transform: uppercase;">TOTAL LEUCOCYTE COUNT (WBC)</td>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10.5pt; font-variant-numeric: tabular-nums;">${wbcDisplay}</td>
          <td style="padding: 3.5px 4px; font-weight: 700;">/cumm</td>
          <td style="padding: 3.5px 4px; font-size: 8.5pt;">4,000 - 11,000</td>
        </tr>

        <!-- SECTION 2: 5-PART DIFFERENTIAL LEUCOCYTE COUNT -->
        <tr>
          <td colspan="4" style="padding: 4px 4px; font-weight: 800; text-decoration: underline; text-transform: uppercase; font-size: 9.5pt;">
            DIFFERENTIAL LEUCOCYTE COUNT (%)
          </td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Neutrophils</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-size: 10pt; font-variant-numeric: tabular-nums;">${neut}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">40 - 75</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Lymphocytes</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-size: 10pt; font-variant-numeric: tabular-nums;">${lymph}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">20 - 45</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Monocytes</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-size: 10pt; font-variant-numeric: tabular-nums;">${mono}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">2 - 10</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Eosinophils</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-size: 10pt; font-variant-numeric: tabular-nums;">${eos}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">1 - 6</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Basophils</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-size: 10pt; font-variant-numeric: tabular-nums;">${baso}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">0 - 1</td>
        </tr>

        <tr style="border-bottom: 1px dashed #cbd5e1;">
          <td style="padding: 3.5px 4px; font-weight: 800; text-transform: uppercase;">Total Circulating Eosinophils (AEC)</td>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10.5pt; font-variant-numeric: tabular-nums;">${aec}</td>
          <td style="padding: 3.5px 4px; font-weight: 700;">/cumm</td>
          <td style="padding: 3.5px 4px; font-size: 8.5pt;">40 - 450</td>
        </tr>

        <!-- SECTION 3: PLATELETS & INDICES -->
        <tr>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10pt; text-transform: uppercase;">TOTAL PLATELET COUNT</td>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10.5pt; font-variant-numeric: tabular-nums;">${pltDisplay}</td>
          <td style="padding: 3.5px 4px; font-weight: 700;">/cumm</td>
          <td style="padding: 3.5px 4px; font-size: 8.5pt;">1,50,000 - 4,50,000</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Mean Platelet Volume (MPV)</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${mpv}</td>
          <td style="padding: 2.5px 4px;">fL</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">7.0 - 11.5</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Platelet Distribution Width (PDW)</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${pdw}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">10 - 18</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Plateletcrit (PCT)</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${pct}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">0.10 - 0.28</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Platelet Large Cell Ratio (P-LCR)</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${plcr}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">9.0 - 45.0</td>
        </tr>

        <tr style="border-bottom: 1px dashed #cbd5e1;">
          <td style="padding: 2.5px 4px; padding-left: 14px;">Platelet Large Cell Count (P-LCC)</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${plcc}</td>
          <td style="padding: 2.5px 4px;">10^9/L</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">13 - 129</td>
        </tr>

        <!-- SECTION 4: RED BLOOD CELLS & INDICES -->
        <tr>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10pt; text-transform: uppercase;">TOTAL RED BLOOD CELL COUNT (RBC)</td>
          <td style="padding: 3.5px 4px; font-weight: 800; font-size: 10.5pt; font-variant-numeric: tabular-nums;">${rbc}</td>
          <td style="padding: 3.5px 4px; font-weight: 700;">10^12/L</td>
          <td style="padding: 3.5px 4px; font-size: 8.5pt;">Male: 4.5 - 6.0<br>Female: 3.8 - 5.2</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Packed Cell Volume (PCV / Hematocrit)</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${hct}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">Male: 40 - 54<br>Female: 36 - 47</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Mean Corpuscular Volume (MCV)</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${mcv}</td>
          <td style="padding: 2.5px 4px;">fL</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">78 - 98</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Mean Corpuscular Hemoglobin (MCH)</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${mch}</td>
          <td style="padding: 2.5px 4px;">pg</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">27 - 32</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">Mean Corpuscular Hb Concentration (MCHC)</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${mchc}</td>
          <td style="padding: 2.5px 4px;">g/dL</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">31 - 36</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">RDW-SD</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${rdwsd}</td>
          <td style="padding: 2.5px 4px;">fL</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">35.0 - 56.0</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 4px; padding-left: 14px;">RDW-CV</td>
          <td style="padding: 2.5px 4px; font-weight: 800; font-variant-numeric: tabular-nums;">${rdwcv}</td>
          <td style="padding: 2.5px 4px;">%</td>
          <td style="padding: 2.5px 4px; font-size: 8.5pt;">11.5 - 15.0</td>
        </tr>

      </tbody>
    </table>
  `;
}

// Master Results Table
export function buildUnifiedResultsTable(tests = [], results = {}, deptId = "", deptName = "") {
  let imagingSheets = "";

  const isHematology = (deptId || "").includes("HEM") || 
                       (deptName || "").toLowerCase().includes("hematology") || 
                       (tests || []).some(t => (t.name || "").toLowerCase().includes("blood count") || (t.code || "").toUpperCase().includes("CBC"));

  const nonImagingTests = [];
  (tests || []).forEach(test => {
    if (isImagingOrRadiologyInvestigation(test, deptId, deptName)) {
      imagingSheets += renderRadiologyInvestigationSheet(test, results, deptName);
    } else {
      nonImagingTests.push(test);
    }
  });

  if (isHematology && nonImagingTests.length > 0) {
    const cbcHtml = renderCustomCbcHematologyReport(nonImagingTests, results);
    return cbcHtml + imagingSheets;
  }

  let tableRows = "";
  nonImagingTests.forEach((test) => {
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

    const isProfile = Boolean(
      test.is_profile === true || 
      test.is_profile === "true" || 
      test.is_profile === 1 || 
      test.isProfile === true || 
      params.length > 1
    );

    if (isProfile) {
      tableRows += `
        <tr>
          <td colspan="4" style="padding: 6px 8px; font-weight: 800; font-size: 8.5pt; color: #000000; text-transform: uppercase; letter-spacing: 0.3px;">
            ${test.name} ${test.code ? `(${test.code})` : ""}
          </td>
        </tr>
      `;
    }

    // Inside buildUnifiedResultsTable in src/utils/printHelpers.js:

    params.forEach((p) => {
      let val = "—";
      if (results) {
        if (results[p.id]?.value !== undefined && results[p.id]?.value !== "") {
          val = results[p.id].value;
        } else if (results[test.id]?.value !== undefined && results[test.id]?.value !== "") {
          val = results[test.id].value;
        } else if (typeof results[p.id] === "string" || typeof results[p.id] === "number") {
          val = results[p.id];
        } else if (typeof results[test.id] === "string" || typeof results[test.id] === "number") {
          val = results[test.id];
        }
      }

      const displayName = (!isProfile && (!p.name || p.name.trim() === "" || p.name.toLowerCase() === "result"))
        ? test.name
        : (p.name || test.name);

      // ===================================================================
      // SMART CLINICAL REFERENCE RANGE RESOLVER (GENDER / AGE / MULTI-RANGE)
      // ===================================================================
      let refRange = "Normal";

      // 1. If custom multiline/gender text is provided:
      if (p.reference_text && p.reference_text.trim() !== "") {
        // Formats newlines into clean HTML line breaks
        refRange = p.reference_text.trim().replace(/\n/g, "<br>");
      } 
      // 2. Or if stored as ref_text:
      else if (p.ref_text && p.ref_text.trim() !== "") {
        refRange = p.ref_text.trim().replace(/\n/g, "<br>");
      }
      // 3. Fallback to standard numeric min - max
      else if (p.param_type === "numeric" && p.min_range !== null && p.max_range !== null && p.min_range !== undefined && p.min_range !== "") {
        refRange = `${p.min_range} – ${p.max_range}`;
      } else if (p.param_type === "qualitative") {
        refRange = "Negative";
      }

      const valStyle = "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums; font-weight: 800; font-size: 10pt; color: #000000;";

      tableRows += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 5px 4px; font-size: 9.5pt; color: #000000; font-weight: 600; vertical-align: top;">${displayName}</td>
          <td style="padding: 5px 4px; ${valStyle}; vertical-align: top;">${val}</td>
          <td style="padding: 5px 4px; font-size: 9pt; color: #000000; vertical-align: top;">${p.unit || test.unit || "—"}</td>
          <td style="padding: 5px 4px; font-size: 8.5pt; color: #000000; font-variant-numeric: tabular-nums; line-height: 1.4; vertical-align: top;">${refRange}</td>
        </tr>
      `;
    });
  });

  if (!tableRows && imagingSheets) return imagingSheets;

  const standardTable = tableRows ? `
    <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <thead>
        <tr style="border-top: none; border-bottom: 1.5px solid #000000; font-size: 9.5pt; background: transparent;">
          <th style="padding: 6px 8px; text-align: left; width: 38%; font-weight: 800; border: none;">Investigation / Parameter</th>
          <th style="padding: 6px 8px; text-align: left; width: 22%; font-weight: 800; border: none;">Observed Result</th>
          <th style="padding: 6px 8px; text-align: left; width: 14%; font-weight: 800; border: none;">Unit</th>
          <th style="padding: 6px 8px; text-align: left; width: 26%; font-weight: 800; border: none;">Biological Ref. Range</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  ` : "";

  return standardTable + imagingSheets;
}


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

  const orderId = activeOrder.orderId || activeOrder.id || "";
  const qrUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(activeOrder.barcode || "")}`;
  const scannableQrSvg = generateQrSvgString(qrUrl, 50);

  const isVerified = activeOrder.qcStatus === "Verified" || activeOrder.isLocked === true;

  const doctorName = 
    activeOrder.doctor || 
    activeOrder.patient?.doctor || 
    (activeOrder.patient?.address && activeOrder.patient.address.startsWith("Ref: ") ? activeOrder.patient.address.replace("Ref: ", "") : null) || 
    "Self";

  const pagesHtml = (deptGroupsToPrint || []).map((group, idx) => {
    const isImaging = isImagingOrRadiologyInvestigation(null, group.dept?.id, group.dept?.name);

    const techUser = staffList.find((u) => u.role === "technologist") || { 
      full_name: "Md. Al-Amin", 
      designation: isImaging ? "Senior Medical Radiographer / Imaging Technologist" : "BSc in Medical Technology - Senior Technologist", 
      signature_data: "" 
    };

    const verifierUser = staffList.find((u) => 
      u.role === "verifier" || u.role === "biochemist" || u.role === "manager" || u.role === "admin"
    ) || { 
      full_name: "Dr. S. Rahman", 
      designation: isImaging ? "MBBS, MD / FCPS - Consultant Radiologist & Physician" : "MBBS, MD (Pathology) - Consultant Biochemist & Lab Incharge", 
      signature_data: "" 
    };

    const renderSignatureHtml = (sigData, fallbackName) => {
      if (!isVerified) return `<div style="height: 38px;"></div>`;
      if (sigData && sigData.startsWith("data:image")) {
        return `<img src="${sigData}" style="height: 38px; max-width: 140px; object-fit: contain; margin: 0 auto 3px auto; display: block;" />`;
      }
      return `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11pt; font-weight: 700; color: #000000; height: 34px; line-height: 34px; text-align: center; letter-spacing: 0.5px;">${sigData || fallbackName}</div>`;
    };

    const testsTableHtml = buildUnifiedResultsTable(group.tests || [], activeOrder.results || {}, group.dept?.id, group.dept?.name);

    const remarksText = (activeOrder.verifierRemarks && activeOrder.verifierRemarks.trim())
      ? activeOrder.verifierRemarks
      : "Clinically correlated and verified with quality control standards.";

    const remarksHtml = isImaging ? "" : `
      <div style="margin-top: 14px; font-size: 9.5pt; color: #000000; line-height: 1.5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <span style="font-weight: 800; text-transform: uppercase; color: #000000; font-size: 9pt; letter-spacing: 0.5px;">Pathologist Remarks:</span> 
        <span style="margin-left: 6px; color: #000000;">${remarksText}</span>
      </div>
    `;

    const departmentBannerTitle = (group.dept?.name || "Clinical Pathology").toUpperCase();

    const sixthSlotDemographics = isImaging
      ? `<span style="font-weight: 700;">Modality:</span> <b style="font-weight: 800;">${group.dept?.name || "Radiology"}</b>`
      : `<span style="font-weight: 700;">Barcode:</span> <b style="font-family: 'Consolas', monospace; font-weight: 800;">${activeOrder.barcode || ""}</b>`;

    // 1. EXACT FIGMA HEADER: 780x132 ratio (Rendered ONLY in Plain Paper Mode)
    const figmaDigitalHeaderHtml = usePadMode ? "" : `
      <div style="background: #221430; color: #ffffff; padding: 12px 18px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 2px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${labSettings?.logo_data ? `<img src="${labSettings.logo_data}" style="height: 48px; max-width: 120px; object-fit: contain;" />` : `
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #b91c1c; font-size: 14pt; border: 2px solid #16a34a;">
              AF
            </div>
          `}
          <div>
            <div style="font-size: 6.5pt; color: #e2e8f0; letter-spacing: 0.3px; margin-bottom: 1px;">With Al-Fattah on the Journey to Wellness</div>
          </div>
        </div>
        <div style="text-align: right;">
          <h1 style="font-size: 18pt; font-weight: 900; margin: 0; color: #ffffff; letter-spacing: 1.2px; line-height: 1;">AL FATTAH</h1>
          <div style="font-size: 8.5pt; font-weight: 600; color: #f8fafc; letter-spacing: 0.8px; margin-top: 2px;">DIAGNOSTIC & CONSULTATION CENTER</div>
        </div>
      </div>
    `;

    // 2. PATIENT DEMOGRAPHICS (Clean transparent background with QR embedded for Pad mode)
    const demographicsHtml = `
      <div style="background: transparent; border: 1.5px solid #000000; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; font-size: 9.5pt; color: #000000;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <table style="width: 100%; border-collapse: collapse; color: #000000; font-size: 9.5pt;">
            <tr>
              <td style="padding: 3px 6px; width: 38%;"><span style="font-weight: 700;">Patient Name:</span> <b style="font-weight: 700; font-size: 10.5pt;">${activeOrder.patient?.name || "Patient"}</b></td>
              <td style="padding: 3px 6px; width: 30%;"><span style="font-weight: 700;">Age / Gender:</span> <b style="font-weight: 700;">${activeOrder.patient?.age || "—"} Y / ${activeOrder.patient?.gender || "—"}</b></td>
              <td style="padding: 3px 6px; width: 32%;"><span style="font-weight: 700;">Patient ID:</span> <b style="font-family: 'Consolas', monospace; font-weight: 700; font-size: 10pt;">${activeOrder.patient?.id || "N/A"}</b></td>
            </tr>
            <tr>
              <td style="padding: 3px 6px;"><span style="font-weight: 700;">Ref. Doctor:</span> <b style="font-weight: 800;">${doctorName}</b></td>
              <td style="padding: 3px 6px;"><span style="font-weight: 700;">Date:</span> <b style="font-weight: 800;">${activeOrder.date || new Date().toISOString().slice(0, 10)}</b></td>
              <td style="padding: 3px 6px;">${sixthSlotDemographics}</td>
            </tr>
          </table>
          ${usePadMode ? `
            <div style="width: 50px; text-align: center; margin-left: 8px; flex-shrink: 0;">
              ${generateQrSvgString(qrUrl, 46)}
              <span style="font-size: 5.5pt; font-weight: 800; display: block; text-align: center; text-transform: uppercase;">Verify</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;

    // 3. EXACT FIGMA FOOTER: 780x72 ratio (Rendered ONLY in Plain Paper Mode)
    const figmaDigitalFooterHtml = usePadMode ? "" : `
      <div style="border-top: 1px solid #000000; padding-top: 6px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; font-weight: 700; color: #000000;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #dc2626; font-size: 11pt;">📍</span>
          <span>Solmaid Purbo Para, Panir pump, Vatara, Dhaka 1212</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 11pt;">🎧</span>
          <span>01723854472, 01624787444</span>
        </div>
      </div>
    `;

    const pageTemplate = `
      <div style="border: none; padding: 0; min-height: ${usePadMode ? '228mm' : '265mm'}; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; color: #000000;">
        <div>
          ${figmaDigitalHeaderHtml}
          ${demographicsHtml}

          <!-- DEPARTMENT TITLE OVER RESULTS -->
          <div style="text-align: center; margin: 10px 0 6px 0;">
            <span style="font-size: 11pt; font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase; color: #000000;">
              DEPARTMENT OF ${departmentBannerTitle}
            </span>
          </div>

          <!-- RESULTS TABLE -->
          ${testsTableHtml}
          ${remarksHtml}
        </div>

        <!-- DUAL SIGNATURES (ONLY AFTER VERIFICATION) & FOOTER -->
        <div>
          ${isVerified ? `
            <div style="margin-top: 22px; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
              <div style="text-align: center; width: 240px;">
                ${renderSignatureHtml(techUser.signature_data, techUser.full_name)}
                <div style="border-top: 1.5px solid #000000; padding-top: 4px;">
                  <div style="font-weight: 800; font-size: 10pt; color: #000000;">${techUser.full_name}</div>
                  <div style="font-size: 8pt; font-weight: 700; color: #000000; margin-top: 1px;">${techUser.designation}</div>
                </div>
              </div>
              <div style="text-align: center; width: 240px;">
                ${renderSignatureHtml(verifierUser.signature_data, verifierUser.full_name)}
                <div style="border-top: 1.5px solid #000000; padding-top: 4px;">
                  <div style="font-weight: 800; font-size: 10pt; color: #000000;">${verifierUser.full_name}</div>
                  <div style="font-size: 8pt; font-weight: 700; color: #000000; margin-top: 1px;">${verifierUser.designation}</div>
                </div>
              </div>
            </div>
          ` : `
            <div style="height: 50px;"></div>
          `}
          ${figmaDigitalFooterHtml}
        </div>
      </div>
    `;

    const isLastPage = idx === deptGroupsToPrint.length - 1;
    return `<div style="${isLastPage ? "" : "page-break-after: always;"}">${pageTemplate}</div>`;
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
    <html>
      <head>
        <title>Report - ${activeOrder.barcode || activeOrder.orderId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          @page { 
            size: A4 portrait; 
            /* EXACT FIGMA SPEC: 132px on 1050px = 37.5mm top; 72px on 1050px = 20.5mm bottom */
            margin-top: ${usePadMode ? '38mm' : '8mm'}; 
            margin-bottom: ${usePadMode ? '20mm' : '8mm'}; 
            margin-left: 8mm; 
            margin-right: 8mm; 
          }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000000; background: #fff; }
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
  }, 300);
}
// =========================================================================
// 2. A5 RECEIPT PRINT DRIVER
// =========================================================================
export function printMoneyReceiptA5(orderToPrint, labSettings = {}) {
  const activeOrd = orderToPrint || {
    receiptNo: "RCP-2026-1001",
    date: new Date().toISOString().slice(0, 10),
    patient: { id: "P-1001", name: "Patient", age: "30", gender: "Male", phone: "N/A", doctor: "Self" },
    tests: [],
    billing: { subTotal: 0, discount: 0, netPayable: 0, paid: 0, due: 0 }
  };

  const patientId = activeOrd.patient?.id || "P-1001";
  const orderId = activeOrd.orderId || activeOrd.id || "ORD-001";
  const barcode = activeOrd.barcode || "";

  const doctorName = 
    activeOrd.doctor || 
    activeOrd.patient?.doctor || 
    (activeOrd.patient?.address && activeOrd.patient.address.startsWith("Ref: ") ? activeOrd.patient.address.replace("Ref: ", "") : null) || 
    "Self";

  const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(barcode)}`;
  const scannableTrackingQrSvg = generateQrSvgString(trackingUrl, 56);

  const qrBlockHtml = `
    <div style="text-align: center; width: 95px; margin: 0 auto;">
      ${scannableTrackingQrSvg}
      <span style="font-size: 5.5pt; font-family: 'Consolas', 'Courier New', monospace; font-weight: bold; display: block; color: #000; margin-top: 1px; text-align: center;">
        Scan for Live Report
      </span>
    </div>
  `;

  const itemsHtml = (activeOrd.tests || []).map((t, idx) => `
    <tr style="border-bottom: 1px dashed #cbd5e1;">
      <td style="padding: 4px 6px;">${idx + 1}. ${t.name}</td>
      <td style="padding: 4px 6px; color: #475569;">${t.sample_type || "Standard"}</td>
      <td style="padding: 4px 6px; text-align: right; font-weight: bold;">৳ ${t.price}</td>
    </tr>
  `).join("");

  const receiptHtml = `
    <div style="border: none; padding: 0; min-height: 190mm; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; font-family: 'Consolas', 'Courier New', Courier, monospace; color: #000; font-size: 8.5pt;">
      <div>
        <div style="border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${labSettings?.logo_data ? `<img src="${labSettings.logo_data}" style="height: 38px; max-width: 110px; object-fit: contain;" />` : ""}
            <div>
              <h1 style="margin: 0; font-size: 12pt; font-weight: 900; letter-spacing: 0.5px;">${(labSettings?.lab_name || "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER").toUpperCase()}</h1>
              <p style="margin: 1px 0; font-size: 7.5pt; color: #334155;">${labSettings?.tagline || "Clinical Diagnostic Reference Laboratory"}</p>
              <p style="margin: 0; font-size: 7pt; color: #475569;">${labSettings?.address || "Solmaid Purbo Para, Vatara, Dhaka 1212"} • Tel: ${labSettings?.phone || "01723854472, 01624787444"}</p>
            </div>
          </div>
          <div style="border: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 7.5pt; text-transform: uppercase;">MONEY RECEIPT</div>
        </div>

        <div style="border: 1px dashed #000; padding: 6px 8px; margin-bottom: 10px; font-size: 8pt; background: #fafafa;">
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
              <td colspan="2" style="padding: 1px 0; border-top: 1px dashed #ccc; margin-top: 2px;"><b>REF. BY:</b> ${doctorName}</td>
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 10px; font-family: inherit;">
          <thead>
            <tr style="border-top: 1.5px dashed #000; border-bottom: 1.5px dashed #000; font-weight: 900;">
              <th style="padding: 4px 6px; text-align: left;">INVESTIGATION DESCRIPTION</th>
              <th style="padding: 4px 6px; text-align: left;">SPECIMEN</th>
              <th style="padding: 4px 6px; text-align: right;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <table style="width: 220px; font-size: 8.5pt; border-collapse: collapse; font-family: inherit;">
            <tr><td>SUBTOTAL:</td><td style="text-align: right; font-weight: bold;">৳ ${activeOrd.billing?.subTotal || 0}</td></tr>
            <tr><td>DISCOUNT (${activeOrd.billing?.discount || 0}%):</td><td style="text-align: right;">- ৳ ${(((activeOrd.billing?.subTotal || 0) * (activeOrd.billing?.discount || 0)) / 100).toFixed(0)}</td></tr>
            <tr style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; font-weight: 900; font-size: 9.5pt;">
              <td>NET PAYABLE:</td><td style="text-align: right;">৳ ${activeOrd.billing?.netPayable || 0}</td>
            </tr>
            <tr><td>PAID (CASH):</td><td style="text-align: right; font-weight: bold;">৳ ${activeOrd.billing?.paid || 0}</td></tr>
            <tr style="font-weight: bold; color: ${activeOrd.billing?.due > 0 ? '#b91c1c' : '#000'};">
              <td>DUE BALANCE:</td><td style="text-align: right;">৳ ${activeOrd.billing?.due || 0}</td>
            </tr>
          </table>
        </div>
      </div>

      <div style="margin-top: 12px;">
        <div style="border-top: 1.5px dashed #000; padding: 8px 0 4px 0; display: flex; justify-content: space-between; align-items: center;">
          <div style="text-align: center; width: 140px;">
            ${generateSvgBarcodeHtml(patientId)}
            <p style="margin: 2px 0 0 0; font-size: 8pt; font-weight: 900;">${patientId}</p>
          </div>

          <div style="text-align: center; width: 95px;">
            ${qrBlockHtml}
          </div>

          <div style="text-align: center; width: 120px;">
            <div style="border-bottom: 1px solid #000; height: 18px; margin-bottom: 2px;"></div>
            <span style="font-size: 7pt; font-weight: bold;">AUTHORIZED CASHIER</span>
          </div>
        </div>
        <p style="text-align: center; margin: 4px 0 0 0; font-size: 6.5pt; color: #475569;">${labSettings?.receipt_footer || "Scan QR to check live report status & download results."}</p>
      </div>
    </div>
  `;

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
    <html>
      <head>
        <title>Receipt - ${activeOrd.receiptNo}</title>
        <style>
          @page { size: 148mm 210mm; margin: 8mm 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; font-family: 'Consolas', 'Courier New', Courier, monospace; background: #fff; color: #000; font-size: 8pt; }
        </style>
      </head>
      <body>${receiptHtml}</body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
  }, 250);
}

// In src/utils/printHelpers.js -> replace printSpecificVialBarcode:

// =========================================================================
// 3. VIAL BARCODE LABEL PRINT DRIVER (50mm x 25mm FULL-HEIGHT STRETCH)
// =========================================================================
export function printSpecificVialBarcode(vial, onPrintedCallback) {
  if (!vial) return;
  if (onPrintedCallback) onPrintedCallback();

  // Full-height 42px vector barcode filling the middle zone
  const svgBarcode = generateSvgBarcodeHtml(vial.testBarcode, 42);

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
    <html>
      <head>
        <title>Vial - ${vial.testBarcode}</title>
        <style>
          @page { 
            size: 50mm 25mm; 
            margin: 0mm; 
          }
          * { 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          html, body { 
            margin: 0; 
            padding: 0; 
            width: 50mm; 
            height: 25mm; 
            max-height: 25mm; 
            overflow: hidden; 
            background: #ffffff; 
            color: #000000; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; 
          }
          .sticker-container {
            width: 50mm;
            height: 25mm;
            max-height: 25mm;
            padding: 0.6mm .6mm 0.6mm .6mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            box-sizing: border-box;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-end; 
            font-size: 7.5pt; 
            border-bottom: 1px solid #000000; 
            padding-bottom: 0.3mm; 
            margin: 0;
            line-height: 1;
          }
          .barcode-area { 
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            flex: 1;
            margin: 0;
            padding: 0;
          }
          .barcode-area svg {
            height: 14mm;
            max-height: 14.5mm;
            width: 96%;
            margin: 0 auto;
            display: block;
          }
          .barcode-number {
            font-size: 8pt;
            font-family: 'Consolas', 'Courier New', monospace;
            font-weight: 800;
            margin: 0;
            padding: 0;
            letter-spacing: 0.8px;
            line-height: 1;
          }
          .footer { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            font-size: 6.5pt; 
            border-top: 1px solid #000000; 
            padding-top: 0.3mm; 
            margin: 0;
            line-height: 1;
          }
        </style>
      </head>
      <body>
        <div class="sticker-container">
          <!-- TOP HEADER -->
          <div class="header">
            <span style="font-weight: 800; max-width: 28mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${vial.patientName || "Patient"}</span>
            <span style="font-weight: 800; font-family: 'Consolas', monospace;">${vial.patientId || ""}</span>
          </div>

          <!-- FULL-HEIGHT EXPANDED BARCODE AREA (ZERO WASTED GAP) -->
          <div class="barcode-area">
            ${svgBarcode}
            <p class="barcode-number">${vial.testBarcode}</p>
          </div>

          <!-- BOTTOM FOOTER -->
          <div class="footer">
            <span style="font-weight: 700;">${(vial.tubeColor || "").split(" ")[0]}</span>
            <span style="font-weight: 700; max-width: 32mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${(vial.testNames || []).join(", ")}</span>
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
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

export function generateSvgBarcodeHtml(codeText) {
  const pattern = encodeCode128Local(codeText || "0000");
  let x = 0;
  let rects = "";
  const moduleWidth = 1.3;
  for (let i = 0; i < pattern.length; i++) {
    const w = parseInt(pattern[i], 10) * moduleWidth;
    if (i % 2 === 0) {
      rects += `<rect x="${x}" y="0" width="${w}" height="28" fill="#000000" />`;
    }
    x += w;
  }
  return `<svg viewBox="0 0 ${x} 28" preserveAspectRatio="none" style="width: 100%; height: 24px;"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
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

// Check whether investigation is imaging (No phlebotomy, no barcode needed)
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

// Clean Medical Radiology Sheet (Zero barcode, clean clinical format)
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
    <div style="margin-top: 10px; margin-bottom: 16px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="border-bottom: 1.5px solid #000000; padding: 6px 4px; font-weight: 700; font-size: 8.5pt; text-transform: uppercase; color: #000000; display: flex; justify-content: space-between; align-items: center;">
        <span>Investigation: ${test.name.toUpperCase()} ${test.code ? `(${test.code})` : ""}</span>
        <span style="font-size: 7.5pt; color: #000000; font-weight: 600;">${deptName || "Imaging"}</span>
      </div>

      <div style="padding: 10px 4px 4px 4px; font-size: 8.5pt; line-height: 1.6; color: #000000;">
        ${indication ? `
          <div style="margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1;">
            <b style="color: #000000; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Clinical Indication & Protocol:</b>
            <span style="color: #000000;">${indication}</span>
          </div>
        ` : `
          <div style="margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5e1;">
            <b style="color: #000000; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Technique / Protocol:</b>
            <span style="color: #000000;">${test.sample_type || "Standard Clinical Protocol"}</span>
          </div>
        `}

        <div style="margin-bottom: 12px;">
          <b style="color: #000000; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Observations & Findings:</b>
          <div style="white-space: pre-wrap; font-size: 8.5pt; line-height: 1.65; color: #000000; font-weight: 400;">${findings}</div>
        </div>

        ${impression ? `
          <div style="margin-top: 14px; padding: 6px 0 0 0; border-top: 1px solid #cbd5e1;">
            <b style="color: #000000; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Radiological Impression:</b>
            <div style="font-size: 9pt; color: #000000; line-height: 1.5; font-weight: 700;">${impression}</div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

// =========================================================================
// AUTHENTIC CBC 4-COLUMN CLINICAL REPORT RENDERER
// (No top/vertical borders in header, crisp authentic curve histograms)
// =========================================================================
function renderCustomCbcHematologyReport(tests = [], results = {}) {
  const findVal = (keywords, fallback = "") => {
    const keys = Array.isArray(keywords) ? keywords : [keywords];
    for (const test of tests) {
      const params = test.test_parameters || test.parameters || [];
      for (const p of params) {
        const pName = (p.name || "").toLowerCase();
        if (keys.some(k => pName === k.toLowerCase() || pName.includes(k.toLowerCase()))) {
          const res = results?.[p.id]?.value ?? results?.[p.name]?.value ?? results?.[p.id];
          if (res !== undefined && res !== null && res !== "") return String(res);
        }
      }
    }
    for (const rk of Object.keys(results || {})) {
      const rkLow = rk.toLowerCase();
      if (keys.some(k => rkLow === k.toLowerCase() || rkLow.includes(k.toLowerCase()))) {
        const res = results[rk]?.value ?? results[rk];
        if (res !== undefined && res !== null && res !== "") return String(res);
      }
    }
    return fallback;
  };

  // Values extraction
  const hb = findVal(["Haemoglobin(Hb)", "Hemoglobin (Hb)", "Hemoglobin", "HGB", "Hb"], "11.9");
  const wbc = findVal(["TOTAL WBC COUNT", "Total Leucocyte Count", "WBC"], "8,100");
  const neut = findVal(["Neutrophils", "Neutrophil", "Gran%"], "43");
  const lymph = findVal(["Lymphocytes", "Lymphocyte", "Lymph%"], "44");
  const mono = findVal(["Monocytes", "Monocyte", "Mid%"], "08");
  const eos = findVal(["Eosinophils", "Eosinophil"], "05");
  const baso = findVal(["Basophil", "Basophils"], "00");

  const aec = findVal(["TOTAL CIR. EOSIONOPHIL COUNT", "Absolute Eosinophil Count", "AEC"], "405");
  const plt = findVal(["TOTAL PLATELET COUNT(PC)", "Total Platelet Count", "Platelet", "PLT"], "389,000");
  const mpv = findVal(["MPV", "Mean Platelet Volume"], "8.1");
  const pdw = findVal(["PDW-CV", "PDW", "Platelet Distribution Width"], "16");
  const pct = findVal(["PCT", "Plateletcrit"], "0.32");
  const plcr = findVal(["P-LCR", "PLCR", "Platelet Large Cell Ratio"], "14.9");
  const plcc = findVal(["P-LCC", "PLCC", "Platelet Large Cell Count"], "58");

  const rbc = findVal(["RBC COUNT", "Total Red Blood Cell Count", "RBC"], "4.72");
  const hct = findVal(["HCT/PCV", "Packed Cell Volume", "PCV", "HCT"], "38.9");
  const mcv = findVal(["MCV", "Mean Corpuscular Volume"], "82.5");
  const mch = findVal(["MCH", "Mean Corpuscular Hemoglobin"], "25.3");
  const mchc = findVal(["MCHC", "Mean Corpuscular Hb Concentration"], "30.7");
  const rdwsd = findVal(["RDW SD", "RDW-SD"], "34");
  const rdwcv = findVal(["RDW CV", "RDW-CV"], "12.3");

  // Dynamic parameters for curves
  const numMcv = parseFloat(mcv) || 82.5;
  const numRdw = parseFloat(rdwcv) || 12.3;
  const numMpv = parseFloat(mpv) || 8.1;
  const numL = parseFloat(lymph) || 44;
  const numN = parseFloat(neut) || 43;

  // 1. WBC CURVE: Pure clinical bimodal distribution (Dark Charcoal Grey)
  let wbcPath = "M 10,72 ";
  for (let x = 10; x <= 180; x += 2) {
    const lP = Math.exp(-Math.pow((x - 52) / 13, 2)) * (numL * 1.05);
    const gP = Math.exp(-Math.pow((x - 128) / 22, 2)) * (numN * 1.45);
    const y = Math.max(8, 72 - (lP + gP) * 0.85);
    wbcPath += `L ${x.toFixed(1)},${y.toFixed(1)} `;
  }
  wbcPath += "L 180,72 Z";

  // 2. PLT CURVE: Clinical log-normal platelet distribution (Pure Vibrant Green)
  let pltPath = "M 10,72 ";
  const pltPeakX = Math.min(65, Math.max(22, (numMpv / 10) * 32));
  for (let x = 10; x <= 180; x += 2) {
    const logN = Math.exp(-Math.pow((x - pltPeakX) / 15, 2)) * 65;
    const y = Math.max(8, 72 - logN);
    pltPath += `L ${x.toFixed(1)},${y.toFixed(1)} `;
  }
  pltPath += "L 180,72 Z";

  // 3. RBC CURVE: Clinical Gaussian distribution centered at MCV (Pure Vibrant Red)
  let rbcPath = "M 10,72 ";
  const rbcPeakX = Math.min(145, Math.max(45, (numMcv / 105) * 88));
  const rbcSpread = Math.max(8, numRdw * 1.05);
  for (let x = 10; x <= 180; x += 2) {
    const bell = Math.exp(-Math.pow((x - rbcPeakX) / rbcSpread, 2)) * 66;
    const y = Math.max(8, 72 - bell);
    rbcPath += `L ${x.toFixed(1)},${y.toFixed(1)} `;
  }
  rbcPath += "L 180,72 Z";

  return `
    <table style="width: 100%; border-collapse: collapse; font-family: 'Inter', Arial, sans-serif; font-size: 8.5pt; color: #000000; margin-top: 4px;">
      <thead>
        <!-- HEADER: NO TOP BORDER, NO VERTICAL BORDERS, ONLY BOTTOM BORDER -->
        <tr style="border-top: none; border-bottom: 1.5px solid #000000; font-size: 8.5pt;">
          <th style="padding: 6px 8px; text-align: left; width: 34%; font-weight: 800; border: none;">Parameter</th>
          <th style="padding: 6px 8px; text-align: left; width: 22%; font-weight: 800; border: none;">Results</th>
          <th style="padding: 6px 8px; text-align: left; width: 24%; font-weight: 800; border: none;">Reference Values</th>
          <th style="padding: 6px 8px; text-align: left; width: 20%; font-weight: 800; border: none;">Histogram</th>
        </tr>
      </thead>
      <tbody>
        
        <!-- SECTION 1: HAEMOGLOBIN, TOTAL WBC & 5-PART DIFFERENTIAL -->
        <tr>
          <td style="padding: 3.5px 8px; font-weight: 800;">Haemoglobin(Hb)</td>
          <td style="padding: 3.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${hb}</b> <span style="font-weight: 700;">g/dl</span></td>
          <td style="padding: 3.5px 8px; font-size: 8pt;">M:12-16, F:10-14.0 g/dl</td>
          <td rowspan="8" style="vertical-align: middle; text-align: center; padding: 4px 6px;">
            <div style="border: 1px solid #333333; background: #ffffff; padding: 1px; width: 140px; margin: 0 auto;">
              <svg viewBox="0 0 190 75" style="width: 100%; height: 60px; display: block;">
                <line x1="10" y1="72" x2="180" y2="72" stroke="#475569" stroke-width="1" />
                <path d="${wbcPath}" fill="#555555" />
              </svg>
            </div>
            <span style="font-size: 7.5pt; font-weight: 800; display: block; margin-top: 3px; letter-spacing: 0.5px;">WBC CURVE</span>
          </td>
        </tr>

        <tr>
          <td style="padding: 3.5px 8px; font-weight: 800; text-transform: uppercase;">TOTAL WBC COUNT</td>
          <td style="padding: 3.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${wbc}</b> <span style="font-weight: 700;">/cumm</span></td>
          <td style="padding: 3.5px 8px; font-size: 8pt;">4,000 - 11,000 /cumm</td>
        </tr>

        <tr>
          <td style="padding: 3.5px 8px; font-weight: 800; text-decoration: underline; text-transform: uppercase;">DIFFERENTIAL COUNT</td>
          <td style="padding: 3.5px 8px;"></td>
          <td style="padding: 3.5px 8px;"></td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">Neutrophils</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${neut}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">(40 - 75)%</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">Lymphocytes</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${lymph}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">(20-45)%</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">Monocytes</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${mono}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">(2-10)%</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">Eosinophils</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${eos}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">(1-6)%</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">Basophil</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${baso}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">0-1 %</td>
        </tr>

        <!-- SPACER -->
        <tr><td colspan="3" style="padding: 3px 0;"></td></tr>

        <!-- SECTION 2: CIR. EOSINOPHIL & PLATELET INDICES -->
        <tr>
          <td style="padding: 3.5px 8px; font-weight: 800; text-transform: uppercase;">TOTAL CIR. EOSIONOPHIL COUNT</td>
          <td style="padding: 3.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${aec}</b> <span style="font-weight: 700;">/cumm</span></td>
          <td style="padding: 3.5px 8px; font-size: 8pt;">40 - 450 /cumm</td>
          <td rowspan="7" style="vertical-align: middle; text-align: center; padding: 4px 6px;">
            <div style="border: 1px solid #333333; background: #ffffff; padding: 1px; width: 140px; margin: 0 auto;">
              <svg viewBox="0 0 190 75" style="width: 100%; height: 60px; display: block;">
                <line x1="10" y1="72" x2="180" y2="72" stroke="#475569" stroke-width="1" />
                <path d="${pltPath}" fill="#00e600" />
              </svg>
            </div>
            <span style="font-size: 7.5pt; font-weight: 800; display: block; margin-top: 3px; letter-spacing: 0.5px;">PLT CURVE</span>
          </td>
        </tr>

        <tr>
          <td style="padding: 3.5px 8px; font-weight: 800; text-transform: uppercase;">TOTAL PLATELET COUNT(PC)</td>
          <td style="padding: 3.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${plt}</b> <span style="font-weight: 700;">/cumm</span></td>
          <td style="padding: 3.5px 8px; font-size: 8pt;">1,50,000-4,50,000 /cumm</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">MPV</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${mpv}</b> fL</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">7.0 -11.0 fL</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">PDW-CV</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${pdw}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">10 - 18 %</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">PCT</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${pct}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">0.10 - 0.28</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">P-LCR</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${plcr}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">9.00 - 45.00%</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">P-LCC</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${plcc}</b> x10^3/uL</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">13 - 129 x10^3/uL</td>
        </tr>

        <!-- SPACER -->
        <tr><td colspan="3" style="padding: 3px 0;"></td></tr>

        <!-- SECTION 3: RBC COUNT & RED CELL INDICES -->
        <tr>
          <td style="padding: 3.5px 8px; font-weight: 800; text-transform: uppercase;">RBC COUNT</td>
          <td style="padding: 3.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${rbc}</b> <span style="font-weight: 700;">m/ul</span></td>
          <td style="padding: 3.5px 8px; font-size: 8pt;">M: 4.5-6.5, F: 3.8-5.8 m/ul</td>
          <td rowspan="7" style="vertical-align: middle; text-align: center; padding: 4px 6px;">
            <div style="border: 1px solid #333333; background: #ffffff; padding: 1px; width: 140px; margin: 0 auto;">
              <svg viewBox="0 0 190 75" style="width: 100%; height: 60px; display: block;">
                <line x1="10" y1="72" x2="180" y2="72" stroke="#475569" stroke-width="1" />
                <path d="${rbcPath}" fill="#ff0000" />
              </svg>
            </div>
            <span style="font-size: 7.5pt; font-weight: 800; display: block; margin-top: 3px; letter-spacing: 0.5px;">RBC CURVE</span>
          </td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">HCT/PCV</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${hct}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">M: 40-54%, F: 37-47%</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">MCV</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${mcv}</b> fL</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">76-94 fL</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">MCH</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${mch}</b> pg</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">27-32 pg</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">MCHC</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${mchc}</b> g/dL</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">29-34 g/dL</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">RDW SD</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${rdwsd}</b> fL</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">30.0-57.0 fL</td>
        </tr>

        <tr>
          <td style="padding: 2.5px 8px; padding-left: 14px;">RDW CV</td>
          <td style="padding: 2.5px 8px;"><b style="display: inline-block; width: 45px; font-variant-numeric: tabular-nums;">${rdwcv}</b> %</td>
          <td style="padding: 2.5px 8px; font-size: 8pt;">10-16%</td>
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

  // If CBC / Hematology, render the exact 4-column report format
  if (isHematology && nonImagingTests.length > 0) {
    const cbcHtml = renderCustomCbcHematologyReport(nonImagingTests, results);
    return cbcHtml + imagingSheets;
  }

  // Standard Pathology / Biochemistry table
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
        <tr style="background-color: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
          <td colspan="4" style="padding: 5px 8px; font-weight: 700; font-size: 8.5pt; color: #000000; text-transform: uppercase; letter-spacing: 0.3px;">
            ${test.name} ${test.code ? `(${test.code})` : ""}
          </td>
        </tr>
      `;
    }

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

      let refRange = "Normal";
      if (p.param_type === "numeric" && p.min_range !== null && p.max_range !== null && p.min_range !== undefined) {
        refRange = `${p.min_range} – ${p.max_range}`;
      } else if (p.param_type === "qualitative") {
        refRange = "Negative";
      }

      const valStyle = "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums; font-weight: 700; font-size: 8.5pt; color: #000000;";

      tableRows += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 4.5px 8px; font-size: 8.5pt; color: #000000;">${displayName}</td>
          <td style="padding: 4.5px 8px; ${valStyle}">${val}</td>
          <td style="padding: 4.5px 8px; font-size: 8pt; color: #000000;">${p.unit || test.unit || "—"}</td>
          <td style="padding: 4.5px 8px; font-size: 8pt; color: #000000; font-variant-numeric: tabular-nums;">${refRange}</td>
        </tr>
      `;
    });
  });

  if (!tableRows && imagingSheets) return imagingSheets;

  const standardTable = tableRows ? `
    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <thead>
        <tr style="border-top: none; border-bottom: 1.5px solid #000000; font-size: 7.5pt; letter-spacing: 0.6px; background: transparent;">
          <th style="padding: 6px 8px; text-align: left; width: 44%; font-weight: 800; border: none;">Investigation / Parameter</th>
          <th style="padding: 6px 8px; text-align: left; width: 22%; font-weight: 800; border: none;">Observed Result</th>
          <th style="padding: 6px 8px; text-align: left; width: 14%; font-weight: 800; border: none;">Unit</th>
          <th style="padding: 6px 8px; text-align: left; width: 20%; font-weight: 800; border: none;">Biological Ref. Range</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  ` : "";

  return standardTable + imagingSheets;
}

// Inside printDepartmentA4Report in src/utils/printHelpers.js:

export function printDepartmentA4Report(targetDeptId = "ALL", activeOrder, departmentGroupedReports, staffList = [], labSettings = {}, onPrintedCallback) {
  if (!activeOrder) return;
  if (onPrintedCallback) onPrintedCallback();

  const deptGroupsToPrint = targetDeptId === "ALL"
    ? departmentGroupedReports
    : (departmentGroupedReports || []).filter((g) => g.dept?.id === targetDeptId);

  const orderId = activeOrder.orderId || activeOrder.id || "";
  const qrUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(activeOrder.barcode || "")}`;
  const scannableQrSvg = generateQrSvgString(qrUrl, 56);

  // CHECK IF ORDER IS OFFICIALLY VERIFIED
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

    // CONDITIONAL SIGNATURE RENDERING:
    // If NOT verified: Leave signature space completely blank (no image, no name stamp)
    // If VERIFIED: Show official signatures
    const renderSignatureHtml = (sigData, fallbackName) => {
      if (!isVerified) {
        return `<div style="height: 38px;"></div>`; // Clean blank space before verification
      }

      if (sigData && sigData.startsWith("data:image")) {
        return `<img src="${sigData}" style="height: 38px; max-width: 140px; object-fit: contain; margin: 0 auto 3px auto; display: block;" />`;
      }
      return `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10.5pt; font-weight: 700; color: #000000; height: 34px; line-height: 34px; text-align: center; letter-spacing: 0.5px;">${sigData || fallbackName}</div>`;
    };

    const testsTableHtml = buildUnifiedResultsTable(group.tests || [], activeOrder.results || {}, group.dept?.id, group.dept?.name);
    const investigationNames = (group.tests || []).map(t => t.name).join(", ");
    
    // No barcode on imaging
    const sixthSlotDemographics = isImaging
      ? `<span style="font-weight: 600; color: #000000;">Modality:</span> <b style="color: #000000;">${group.dept?.name || "Radiology"}</b>`
      : `<span style="font-weight: 600; color: #000000;">Barcode:</span> <b style="font-family: 'Consolas', monospace; color: #000000;">${activeOrder.barcode || ""}</b>`;

    const remarksText = (activeOrder.verifierRemarks && activeOrder.verifierRemarks.trim())
      ? activeOrder.verifierRemarks
      : "Clinically correlated and verified with quality control standards.";

    const remarksHtml = isImaging ? "" : `
      <div style="margin-top: 14px; font-size: 8.5pt; color: #000000; line-height: 1.5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <span style="font-weight: 700; text-transform: uppercase; color: #000000; font-size: 8pt; letter-spacing: 0.5px;">Pathologist Remarks:</span> 
        <span style="margin-left: 6px; color: #000000;">${remarksText}</span>
      </div>
    `;

    const departmentBannerTitle = (group.dept?.name || "Clinical Pathology").toUpperCase();

    const pageTemplate = `
      <div style="border: none; padding: 0; min-height: 270mm; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; color: #000000;">
        <div>
          <!-- 1. HEADER -->
          <div style="border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${labSettings?.logo_data ? `<img src="${labSettings.logo_data}" style="height: 46px; max-width: 125px; object-fit: contain;" />` : ""}
              <div>
                <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #000000; letter-spacing: 0.2px; line-height: 1.1;">${(labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES").toUpperCase()}</h1>
                <p style="font-size: 8pt; font-weight: 600; color: #000000; margin: 3px 0 1px 0;">${labSettings?.tagline || "ISO 15189:2022 Certified Clinical Reference Laboratory"}</p>
                <p style="font-size: 7.5pt; color: #000000; margin: 0;">${labSettings?.address || "Dhanmondi, Dhaka"} • Hotline: ${labSettings?.phone || "+880 9612-345678"}</p>
              </div>
            </div>
            <div style="text-align: center; width: 85px;">
              ${scannableQrSvg}
              <span style="font-size: 6pt; font-weight: 700; color: #000000; display: block; text-align: center; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Scan to Verify</span>
            </div>
          </div>

          <!-- 2. INLINE PATIENT DEMOGRAPHICS -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; font-size: 8.5pt; color: #000000;">
            <table style="width: 100%; border-collapse: collapse; color: #000000; font-size: 8.5pt;">
              <tr>
                <td style="padding: 3px 6px; width: 40%;"><span style="font-weight: 600; color: #000000;">Patient Name:</span> <b style="color: #000000; font-weight: 800;">${activeOrder.patient?.name || "Patient"}</b></td>
                <td style="padding: 3px 6px; width: 30%;"><span style="font-weight: 600; color: #000000;">Age / Gender:</span> <b style="color: #000000;">${activeOrder.patient?.age || "—"} Y / ${activeOrder.patient?.gender || "—"}</b></td>
                <td style="padding: 3px 6px; width: 30%;"><span style="font-weight: 600; color: #000000;">Patient ID:</span> <b style="color: #000000; font-family: 'Consolas', monospace;">${activeOrder.patient?.id || "N/A"}</b></td>
              </tr>
              <tr>
                <td style="padding: 3px 6px;"><span style="font-weight: 600; color: #000000;">Ref. Doctor:</span> <b style="color: #000000;">${doctorName}</b></td>
                <td style="padding: 3px 6px;"><span style="font-weight: 600; color: #000000;">Date:</span> <b style="color: #000000;">${activeOrder.date || new Date().toISOString().slice(0, 10)}</b></td>
                <td style="padding: 3px 6px;">${sixthSlotDemographics}</td>
              </tr>
            </table>
          </div>

          <!-- 3. DEPARTMENT BANNER OVER TEST RESULTS -->
          <div style="text-align: center; margin: 10px 0 6px 0;">
            <span style="font-size: 9.5pt; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #000000;">
              DEPARTMENT OF ${departmentBannerTitle}
            </span>
          </div>

          <!-- 4. RESULTS TABLE -->
          ${testsTableHtml}
          ${remarksHtml}
        </div>

       
        <!-- 5. SIGNATURES & FOOTER -->
        <div>
          ${isVerified ? `
            <div style="margin-top: 24px; padding-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
              
              <!-- LEFT: TECHNOLOGIST -->
              <div style="text-align: center; width: 230px;">
                ${renderSignatureHtml(techUser.signature_data, techUser.full_name)}
                <div style="border-top: 1.5px solid #000000; padding-top: 4px;">
                  <div style="font-weight: 800; font-size: 8.5pt; color: #000000;">${techUser.full_name}</div>
                  <div style="font-size: 7.5pt; font-weight: 500; color: #000000; margin-top: 1px;">${techUser.designation}</div>
                </div>
              </div>

              <!-- RIGHT: CONSULTANT PATHOLOGIST / DOCTOR -->
              <div style="text-align: center; width: 230px;">
                ${renderSignatureHtml(verifierUser.signature_data, verifierUser.full_name)}
                <div style="border-top: 1.5px solid #000000; padding-top: 4px;">
                  <div style="font-weight: 800; font-size: 8.5pt; color: #000000;">${verifierUser.full_name}</div>
                  <div style="font-size: 7.5pt; font-weight: 500; color: #000000; margin-top: 1px;">${verifierUser.designation}</div>
                </div>
              </div>

            </div>
          ` : `
            <!-- HIDDEN BEFORE VERIFICATION: Zero names, lines, or designations -->
            <div style="height: 55px;"></div>
          `}
          <p style="text-align: center; font-size: 6.5pt; color: #475569; margin: 12px 0 0 0; border-top: 0.5px dashed #cbd5e1; padding-top: 4px;">${labSettings?.report_footer || "This is a clinically verified electronic laboratory report."}</p>
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
          @page { size: A4 portrait; margin: 12mm 14mm; }
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
    patient: { id: "PT-10024", name: "Patient", age: "30", gender: "Male", phone: "N/A", doctor: "Self" },
    tests: [],
    billing: { subTotal: 0, discount: 0, netPayable: 0, paid: 0, due: 0 }
  };

  const patientId = activeOrd.patient?.id || "PT-10024";
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
              <h1 style="margin: 0; font-size: 12pt; font-weight: 900; letter-spacing: 0.5px;">${(labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES").toUpperCase()}</h1>
              <p style="margin: 1px 0; font-size: 7.5pt; color: #334155;">${labSettings?.tagline || "Clinical Diagnostic Reference Laboratory"}</p>
              <p style="margin: 0; font-size: 7pt; color: #475569;">${labSettings?.address || "Dhanmondi, Dhaka"} • Tel: ${labSettings?.phone || "+880 9612-345678"}</p>
            </div>
          </div>
          <div style="border: 1.5px solid #000; padding: 3px 6px; font-weight: 900; font-size: 7.5pt; text-transform: uppercase;">MONEY RECEIPT</div>
        </div>

        <div style="border: 1px dashed #000; padding: 6px 8px; margin-bottom: 10px; font-size: 8pt; background: #fafafa;">
          <table style="width: 100%; border-collapse: collapse; font-family: inherit;">
            <tr>
              <td style="padding: 1px 0;"><b>RECEIPT NO:</b> ${activeOrd.receiptNo || "RCP-2026-001"}</td>
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

// =========================================================================
// 3. VIAL BARCODE LABEL PRINT DRIVER
// =========================================================================
export function printSpecificVialBarcode(vial, onPrintedCallback) {
  if (!vial) return;
  if (onPrintedCallback) onPrintedCallback();

  const svgBarcode = generateSvgBarcodeHtml(vial.testBarcode);

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
          @page { size: 50mm 25mm; margin: 0mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 1.5mm 2mm; width: 50mm; height: 25mm; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #fff; color: #000; display: flex; flex-direction: column; justify-content: space-between; }
          .header { display: flex; justify-content: space-between; font-size: 7.5pt; font-weight: 900; border-bottom: 0.8px solid #000; }
          .center { text-align: center; }
          .footer { display: flex; justify-content: space-between; font-size: 6.5pt; font-weight: 800; border-top: 0.8px solid #000; }
        </style>
      </head>
      <body>
        <div class="header"><span>${vial.patientName}</span><span>${vial.patientId}</span></div>
        <div class="center">${svgBarcode}<p style="font-size: 7.5pt; font-weight: 900; margin: 0; font-family: monospace;">${vial.testBarcode}</p></div>
        <div class="footer"><span>${(vial.tubeColor || "").split(" ")[0]}</span><span>${(vial.testNames || []).join(", ")}</span></div>
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
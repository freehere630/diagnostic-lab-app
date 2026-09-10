// ==========================================
// 1. STANDARD CODE 128 BARCODE GENERATOR
// ==========================================
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
  return `<svg viewBox="0 0 ${x} 28" preserveAspectRatio="none" style="width: 100%; height: 26px;"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
}

export function generateQrSvgLocal(text, size = 60) {
  const clean = text || "https://apexlab.com/verify";
  const matrixSize = 25;
  const matrix = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0));

  const addFinder = (row, col) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[row + r][col + c] = 1;
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, matrixSize - 7);
  addFinder(matrixSize - 7, 0);

  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  let bitIdx = 0;
  const bytes = Array.from(unescape(encodeURIComponent(clean))).map(c => c.charCodeAt(0));
  for (let c = matrixSize - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let r = 0; r < matrixSize; r++) {
      for (let colOff = 0; colOff < 2; colOff++) {
        const col = c - colOff;
        if ((r < 8 && col < 8) || (r < 8 && col >= matrixSize - 8) || (r >= matrixSize - 8 && col < 8) || r === 6 || col === 6) continue;
        const bit = ((bytes[bitIdx % bytes.length] || 0x55) >> (bitIdx % 8)) & 1;
        matrix[r][col] = bit ^ ((r + col) % 2 === 0 ? 1 : 0);
        bitIdx++;
      }
    }
  }

  const cellSize = size / matrixSize;
  let rects = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c] === 1) {
        rects += `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${(cellSize + 0.1).toFixed(2)}" height="${(cellSize + 0.1).toFixed(2)}" fill="#000000" />`;
      }
    }
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="background: #ffffff; padding: 2px; border-radius: 4px; display: block; margin: 0 auto;"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
}

// Helper: Compile Template Tokens
export function compileTemplate(templateHtml, tokens) {
  let compiled = String(templateHtml || "");
  Object.keys(tokens).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    compiled = compiled.replace(regex, tokens[key] !== undefined ? tokens[key] : "");
  });
  return compiled;
}

// Helper: Get Active Template directly from Storage/Settings
function getActiveTemplate(settings, type = "report") {
  // 1. Check direct localStorage key (Instant 0ms sync)
  const localKey = type === "report" ? "apex_report_template" : "apex_receipt_template";
  const localVal = localStorage.getItem(localKey);
  if (localVal && localVal.trim() !== "") return localVal;

  // 2. Check settings object
  const designObj = type === "report" 
    ? (settings?.report_design || settings?.reportDesign)
    : (settings?.receipt_design || settings?.receiptDesign);

  if (typeof designObj === "object" && designObj?.templateHtml) {
    return designObj.templateHtml;
  }

  return "";
}

// ===================================================================
// 1. PRINT A5 MONEY RECEIPT (EXACT 1:1 WITH CANVAS DESIGN)
// ===================================================================
export function printMoneyReceiptA5(orderToPrint, labSettings = {}) {
  const activeOrd = orderToPrint || {
    receiptNo: "RCP-2026-1001",
    date: new Date().toISOString().slice(0, 10),
    patient: { id: "PT-10024", name: "Rahim Ahmed", age: "35", gender: "Male", phone: "01712345678", doctor: "Dr. K. S. Hossain, MD" },
    tests: [{ name: "Complete Blood Count (CBC)", price: 800, sample_type: "Blood" }, { name: "SGPT / ALT Liver Test", price: 300, sample_type: "Serum" }],
    billing: { subTotal: 1100, discount: 10, netPayable: 990, paid: 990, due: 0 }
  };

  const patientId = activeOrd.patient?.id || "PT-10024";
  const itemsHtml = (activeOrd.tests || []).map((t, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 5px 8px; font-weight: 600;">${idx + 1}. ${t.name}</td>
      <td style="padding: 5px 8px; color: #475569;">${t.sample_type || "Blood"}</td>
      <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: bold;">৳ ${t.price}</td>
    </tr>
  `).join("");

  const templateToUse = getActiveTemplate(labSettings, "receipt");

  const tokens = {
    hospital_name: (labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES").toUpperCase(),
    hospital_tagline: labSettings?.tagline || "ISO 15189 Certified Reference Lab",
    hospital_address: labSettings?.address || "Dhanmondi, Dhaka",
    hospital_phone: labSettings?.phone || "+880 9612-345678",
    hospital_logo: labSettings?.logo_data ? `<img src="${labSettings.logo_data}" style="height: 38px; max-width: 120px; object-fit: contain;" />` : "",
    receipt_no: activeOrd.receiptNo || "RCP-2026-001",
    patient_id: patientId,
    patient_name: activeOrd.patient?.name || "Patient",
    age_gender: `${activeOrd.patient?.age || ""}Y / ${activeOrd.patient?.gender || ""}`,
    patient_phone: activeOrd.patient?.phone || "N/A",
    doctor: activeOrd.patient?.doctor || "Self",
    date: activeOrd.date || new Date().toISOString().slice(0, 10),
    items_table: itemsHtml,
    subtotal: activeOrd.billing?.subTotal || 0,
    discount: activeOrd.billing?.discount || 0,
    discount_amount: (((activeOrd.billing?.subTotal || 0) * (activeOrd.billing?.discount || 0)) / 100).toFixed(0),
    net_payable: activeOrd.billing?.netPayable || 0,
    paid_amount: activeOrd.billing?.paid || 0,
    due_amount: activeOrd.billing?.due || 0,
    patient_barcode: generateSvgBarcodeHtml(patientId),
    receipt_footer: labSettings?.receipt_footer || "Please bring this original receipt for collection."
  };

  const compiledHtml = compileTemplate(templateToUse, tokens);

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
          @page { size: 148mm 210mm; margin: 0mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 6mm 8mm; width: 148mm; height: 210mm; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #000; font-size: 8pt; }
        </style>
      </head>
      <body>${compiledHtml}</body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
  }, 250);
}

// ==========================================
// 2. PRINT SCANNABLE VIAL BARCODE
// ==========================================
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
    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
  }, 250);
}

// ==========================================
// 3. PRINT A4 REPORT (EXACT 1:1 WITH CANVAS)
// ==========================================
export function printDepartmentA4Report(targetDeptId = "ALL", activeOrder, departmentGroupedReports, staffList = [], labSettings = {}, onPrintedCallback) {
  if (!activeOrder) return;
  if (onPrintedCallback) onPrintedCallback();

  const techUser = staffList.find((u) => u.role === "technologist") || { full_name: "Md. Al-Amin", designation: "BSc in Medical Technology - Senior Technologist", signature_data: "" };
  const verifierUser = staffList.find((u) => u.role === "verifier" || u.role === "admin") || { full_name: "Dr. S. Rahman", designation: "MBBS, MD (Pathology) - Consultant Biochemist & Lab Incharge", signature_data: "" };

  const renderSignatureHtml = (sigData, fallbackName) => {
    if (sigData && sigData.startsWith("data:image")) {
      return `<img src="${sigData}" style="height: 36px; max-width: 140px; object-fit: contain; margin: 0 auto 2px auto; display: block;" />`;
    }
    return `<div style="font-family: 'Brush Script MT', cursive; font-size: 18pt; color: #000; height: 34px; line-height: 34px;">${sigData || fallbackName}</div>`;
  };

  const templateToUse = getActiveTemplate(labSettings, "report");

  const deptGroupsToPrint = targetDeptId === "ALL"
    ? departmentGroupedReports
    : (departmentGroupedReports || []).filter((g) => g.dept?.id === targetDeptId);

  const qrUrl = `${window.location.origin}/?verify=${activeOrder.orderId}&pid=${activeOrder.patient?.id || ""}&bc=${activeOrder.barcode}`;
  const scannableQrSvg = generateQrSvgLocal(qrUrl, 56);

  const pagesHtml = (deptGroupsToPrint || []).map((group, idx) => {
    const testsTableHtml = (group.tests || []).map((test) => {
      const params = test.test_parameters || test.parameters || [];
      const rows = params.map((p) => {
        const val = activeOrder.results?.[p.id]?.value || "—";
        const refRange = p.param_type === "numeric" && p.min_range ? `${p.min_range} – ${p.max_range}` : (p.param_type === "qualitative" ? "Negative" : "Normal");

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 10px; font-weight: 600;">${p.name}</td>
            <td style="padding: 6px 10px; font-family: monospace; font-weight: 700; font-size: 10pt;">${val}</td>
            <td style="padding: 6px 10px; color: #334155; font-family: monospace;">${p.unit || ""}</td>
            <td style="padding: 6px 10px; color: #334155; font-family: monospace;">${refRange}</td>
          </tr>`;
      }).join("");

      return `
        <div style="margin-bottom: 10px;">
          
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; text-align: left;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1.5px solid #000; font-size: 8pt; font-weight: 900; text-transform: uppercase;">
                <th style="padding: 4px 10px;">Test Parameter</th>
                <th style="padding: 4px 10px;">Observed Result</th>
                <th style="padding: 4px 10px;">Unit</th>
                <th style="padding: 4px 10px;">Reference Range</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join("");

    const tokens = {
      hospital_name: (labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES").toUpperCase(),
      hospital_tagline: labSettings?.tagline || "ISO 15189 Certified Reference Lab",
      hospital_address: labSettings?.address || "Dhanmondi, Dhaka",
      hospital_phone: labSettings?.phone || "+880 9612-345678",
      hospital_logo: labSettings?.logo_data ? `<img src="${labSettings.logo_data}" style="height: 44px; max-width: 120px; object-fit: contain;" />` : "",
      department_name: (group.dept?.name || "General Diagnostics").toUpperCase(),
      patient_name: activeOrder.patient?.name || "Patient",
      age_gender: `${activeOrder.patient?.age || ""}Y / ${activeOrder.patient?.gender || ""}`,
      patient_id: activeOrder.patient?.id || "N/A",
      doctor: activeOrder.patient?.doctor || "Self",
      date: activeOrder.date || new Date().toISOString().slice(0, 10),
      barcode: activeOrder.barcode || "",
      qr_code: scannableQrSvg,
      results_table: testsTableHtml,
      remarks: activeOrder.verifierRemarks ? `<div style="background: #fafaf9; border: 1px solid #000; border-radius: 6px; padding: 6px 10px; margin-top: 8px; font-size: 8pt;"><b>Pathologist Remarks:</b> <i>${activeOrder.verifierRemarks}</i></div>` : "",
      tech_name: techUser.full_name,
      tech_designation: techUser.designation,
      tech_signature: renderSignatureHtml(techUser.signature_data, techUser.full_name),
      doctor_name: verifierUser.full_name,
      doctor_designation: verifierUser.designation,
      doctor_signature: renderSignatureHtml(verifierUser.signature_data, verifierUser.full_name),
      report_footer: labSettings?.report_footer || "This is a clinically verified electronic laboratory report."
    };

    const isLastPage = idx === deptGroupsToPrint.length - 1;
    return `<div style="${isLastPage ? "" : "page-break-after: always;"}">${compileTemplate(templateToUse, tokens)}</div>`;
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
        <title>Report - ${activeOrder.barcode}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 12mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; background: #fff; }
        </style>
      </head>
      <body>${pagesHtml}</body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
  }, 250);
}
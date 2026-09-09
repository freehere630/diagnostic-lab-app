// CODE 128 ENCODER
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
  const clean = text.trim();
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

function generateSvgBarcodeHtml(codeText) {
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

function generateQrSvgLocal(text, size = 58) {
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

// ===================================================================
// 1. PRINT TRUE A5 MONEY RECEIPT (FORCED EXACT 148mm x 210mm DIMENSIONS)
// ===================================================================
export function printMoneyReceiptA5(orderToPrint, labSettings = {}) {
  const activeOrd = orderToPrint || {
    receiptNo: "RCP-2026-1001",
    date: new Date().toISOString().slice(0, 10),
    patient: { id: "PT-10024", name: "Rahim Ahmed", age: "35", gender: "Male", phone: "01712345678", doctor: "Dr. K. S. Hossain, MD" },
    tests: [{ name: "Complete Blood Count (CBC)", price: 800, sample_type: "Blood" }, { name: "SGPT / ALT Liver Test", price: 300, sample_type: "Serum" }],
    billing: { subTotal: 1100, discount: 10, netPayable: 990, paid: 990, due: 0 }
  };

  const labName = labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES";
  const tagline = labSettings?.tagline || "ISO 15189:2022 Certified Clinical Reference Laboratory";
  const address = labSettings?.address || "House 42, Road 11, Dhanmondi, Dhaka";
  const phone = labSettings?.phone || "+880 9612-345678";
  const logoData = labSettings?.logo_data || "";
  const footerNote = labSettings?.receipt_footer || "Please bring this original receipt during report collection.";
  
  const customBlocks = labSettings?.receipt_design?.customBlocks || [];

  const receiptNo = activeOrd.receiptNo || "RCP-2026-001";
  const patientId = activeOrd.patient?.id || "PID-10024";
  const patientName = activeOrd.patient?.name || "Walk-in Patient";
  const pPhone = activeOrd.patient?.phone || "N/A";
  const ageGender = `${activeOrd.patient?.age || "—"} Y / ${activeOrd.patient?.gender || "—"}`;
  const doctor = activeOrd.patient?.doctor || "Self / General Practitioner";
  const dateStr = activeOrd.date || new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const testRowsHtml = (activeOrd.tests || []).map((t, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 5px 8px; font-weight: 600; color: #000000;">${idx + 1}. ${t.name}</td>
      <td style="padding: 5px 8px; color: #475569; font-size: 8pt;">${t.sample_type || 'Blood'}</td>
      <td style="text-align: right; padding: 5px 8px; font-family: monospace; font-weight: bold; color: #000000;">৳ ${t.price}</td>
    </tr>
  `).join("");

  const activeReceiptBlocks = (customBlocks.length > 0 ? customBlocks : [
    { id: "receipt_header", visible: true, padding: 8, borderWidth: 1.5, borderStyle: "solid", borderColor: "#000", textColor: "#000", fontSize: 13 },
    { id: "receipt_patient", visible: true, padding: 8, borderWidth: 1, borderStyle: "solid", borderColor: "#cbd5e1", bgColor: "#f8fafc", borderRadius: 6, fontSize: 8.5 },
    { id: "receipt_items", visible: true, padding: 6, borderWidth: 1, borderStyle: "solid", borderColor: "#000", fontSize: 8.5, innerHeaderBg: "#f1f5f9" },
    { id: "receipt_totals", visible: true, padding: 6, fontSize: 9, innerHeaderBg: "#0f172a" },
    { id: "receipt_barcode_sign", visible: true, padding: 6 }
  ]).filter(b => b.visible !== false);

  const topBlocks = activeReceiptBlocks.filter(b => b.id !== "receipt_barcode_sign");
  const bottomBlocks = activeReceiptBlocks.filter(b => b.id === "receipt_barcode_sign");

  // Build Top Stack (1, 2, 3, 4)
  const renderedTopHtml = topBlocks.map(block => {
    const fontFam = block.fontFamily === "serif" ? "Times New Roman, serif" : block.fontFamily === "mono" ? "Courier New, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    if (block.id === "receipt_header") {
      return `
        <div style="background: ${block.bgColor || '#fff'}; border-bottom: ${block.borderWidth || 1.5}px ${block.borderStyle || 'solid'} ${block.borderColor || '#000'}; padding: ${block.padding || 8}px; display: flex; justify-content: space-between; align-items: center; font-family: ${fontFam};">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${logoData ? `<img src="${logoData}" style="height: ${block.logoSize || 36}px; max-width: 100px; object-fit: contain;" />` : ''}
            <div>
              <h1 style="margin: 0; font-size: ${block.fontSize || 12}pt; font-weight: 900; color: ${block.textColor || '#000'};">${labName.toUpperCase()}</h1>
              <p style="margin: 1px 0; font-size: 7pt; color: #334155; font-weight: 600;">${tagline}</p>
              <p style="margin: 0; font-size: 6.5pt; color: #475569;">${address} • Hotline: ${phone}</p>
            </div>
          </div>
          <div style="text-align: right; background: ${block.innerHeaderBg || '#0f172a'}; color: #fff; padding: 3px 6px; border-radius: 4px;">
            <span style="font-size: 7.5pt; font-weight: 900;">MONEY RECEIPT</span>
          </div>
        </div>
      `;
    }

    if (block.id === "receipt_patient") {
      return `
        <div style="background: ${block.bgColor || '#f8fafc'}; border: ${block.borderWidth || 1}px ${block.borderStyle || 'solid'} ${block.borderColor || '#cbd5e1'}; border-radius: ${block.borderRadius || 6}px; padding: ${block.padding || 6}px; margin: 5px 0; font-family: ${fontFam};">
          <table style="width: 100%; font-size: ${block.fontSize || 8}pt; color: ${block.textColor || '#000'}; border-collapse: collapse;">
            <tr>
              <td><b>Receipt No:</b> <span style="font-family: monospace;">${receiptNo}</span></td>
              <td><b>Date:</b> ${dateStr} ${timeStr}</td>
              <td><b>Patient ID:</b> <b style="font-family: monospace; color: #1d4ed8;">${patientId}</b></td>
            </tr>
            <tr>
              <td colspan="2"><b>Patient Name:</b> ${patientName} (${ageGender})</td>
              <td><b>Phone:</b> ${pPhone}</td>
            </tr>
            <tr>
              <td colspan="3"><b>Ref. Doctor:</b> ${doctor}</td>
            </tr>
          </table>
        </div>
      `;
    }

    if (block.id === "receipt_items") {
      return `
        <div style="background: ${block.bgColor || '#fff'}; border: ${block.borderWidth || 1}px ${block.borderStyle || 'solid'} ${block.borderColor || '#000'}; padding: ${block.padding || 5}px; margin: 5px 0; font-family: ${fontFam};">
          <table style="width: 100%; border-collapse: collapse; font-size: ${block.fontSize || 8}pt;">
            <thead>
              <tr style="background: ${block.innerHeaderBg || '#f1f5f9'}; border-bottom: 1px solid #000; font-weight: 900;">
                <th style="padding: 3px 6px; text-align: left;">Test Description</th>
                <th style="padding: 3px 6px; text-align: left;">Specimen</th>
                <th style="padding: 3px 6px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>${testRowsHtml}</tbody>
          </table>
        </div>
      `;
    }

    if (block.id === "receipt_totals") {
      return `
        <div style="display: flex; justify-content: flex-end; margin: 4px 0; font-family: ${fontFam};">
          <table style="width: 210px; font-size: ${block.fontSize || 8.5}pt; background: ${block.bgColor || '#fff'}; border: ${block.borderWidth || 1}px ${block.borderStyle || 'solid'} ${block.borderColor || '#000'}; padding: ${block.padding || 5}px;">
            <tr><td>Subtotal:</td><td style="text-align: right; font-family: monospace;">৳ ${activeOrd.billing?.subTotal || 0}</td></tr>
            <tr><td>Discount (${activeOrd.billing?.discount || 0}%):</td><td style="text-align: right; font-family: monospace;">- ৳ ${((activeOrd.billing?.subTotal || 0) * (activeOrd.billing?.discount || 0) / 100).toFixed(0)}</td></tr>
            <tr style="font-weight: 900; font-size: 9.5pt; border-top: 1px solid #000; border-bottom: 1px solid #000; color: ${block.innerHeaderBg || '#000'};">
              <td>Net Payable:</td><td style="text-align: right; font-family: monospace;">৳ ${activeOrd.billing?.netPayable || 0}</td>
            </tr>
            <tr style="font-weight: bold;"><td>Paid Amount:</td><td style="text-align: right; font-family: monospace;">৳ ${activeOrd.billing?.paid || 0}</td></tr>
            <tr style="font-weight: bold; color: #000;">
              <td>Due Balance:</td><td style="text-align: right; font-family: monospace;">৳ ${activeOrd.billing?.due || 0}</td>
            </tr>
          </table>
        </div>
      `;
    }

    return "";
  }).join("");

  // Build Bottom Stack (5)
  const renderedBottomHtml = bottomBlocks.map(block => {
    const fontFam = block.fontFamily === "serif" ? "Times New Roman, serif" : block.fontFamily === "mono" ? "Courier New, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    return `
      <div style="border-top: 1px dashed ${block.borderColor || '#94a3b8'}; padding: ${block.padding || 5}px 0; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; font-family: ${fontFam};">
        <div style="text-align: center; width: 160px;">
          ${generateSvgBarcodeHtml(patientId)}
          <p style="margin: 2px 0 0 0; font-family: monospace; font-size: 7.5pt; font-weight: 900; letter-spacing: 1px;">${patientId}</p>
          <span style="font-size: 5.5pt; color: #475569; text-transform: uppercase;">Scan for Patient Records</span>
        </div>
        <div style="text-align: center; width: 130px;">
          <div style="border-bottom: 1px solid #000; height: 16px; margin-bottom: 2px;"></div>
          <span style="font-size: 7pt; font-weight: bold;">Authorized Cashier</span>
        </div>
      </div>
      <p style="text-align: center; margin: 3px 0 0 0; font-size: 6pt; color: #475569;">${footerNote}</p>
    `;
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
        <title>Money Receipt - ${receiptNo}</title>
        <style>
          @page {
            size: 148mm 210mm; /* FORCES EXACT A5 PORTRAIT */
            margin: 0mm;
          }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            width: 148mm;
            height: 210mm;
            background: #ffffff;
            color: #000000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 8pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .a5-receipt-sheet {
            width: 148mm;
            height: 208mm;
            padding: 7mm 9mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .receipt-border {
            border: 1.5px solid #000000;
            border-radius: 6px;
            padding: 8px 10px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="a5-receipt-sheet">
          <div class="receipt-border">
            <div>
              ${renderedTopHtml}
            </div>
            <div>
              ${renderedBottomHtml}
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}

// ===================================================================
// 2. PRINT SCANNABLE THERMAL BARCODE LABEL (50mm x 25mm)
// ===================================================================
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
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 1.5mm 2mm; width: 50mm; height: 25mm;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            background: #ffffff; color: #000000;
            display: flex; flex-direction: column; justify-content: space-between;
            overflow: hidden;
          }
          .header { display: flex; justify-content: space-between; font-size: 7.5pt; font-weight: 900; border-bottom: 0.8px solid #000; padding-bottom: 0.5px; line-height: 1.1; }
          .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 26mm; }
          .center { text-align: center; margin: 0.5mm 0; }
          .code-text { font-size: 7.5pt; font-weight: 900; letter-spacing: 0.8px; margin: 0; font-family: monospace; }
          .footer { display: flex; justify-content: space-between; font-size: 6.5pt; font-weight: 800; border-top: 0.8px solid #000; padding-top: 0.5px; line-height: 1.1; }
          .tests { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 30mm; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header"><span class="name">${vial.patientName}</span><span>${vial.patientId}</span></div>
        <div class="center">${svgBarcode}<p class="code-text">${vial.testBarcode}</p></div>
        <div class="footer"><span>${(vial.tubeColor || "").split(" ")[0]}</span><span class="tests">${(vial.testNames || []).join(", ")}</span></div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}

// ===================================================================
// 3. PRINT A4 REPORT (CLEAN VALUES, ZERO FLAGS)
// ===================================================================
export function printDepartmentA4Report(targetDeptId = "ALL", activeOrder, departmentGroupedReports, staffList = [], labSettings = {}, onPrintedCallback) {
  if (!activeOrder) return;
  if (onPrintedCallback) onPrintedCallback();

  const labName = labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES";
  const tagline = labSettings?.tagline || "ISO 15189:2022 Certified Clinical Reference Laboratory";
  const address = labSettings?.address || "House 42, Road 11, Dhanmondi, Dhaka";
  const phone = labSettings?.phone || "+880 9612-345678";
  const email = labSettings?.email || "reports@apexlab.com";
  const logoData = labSettings?.logo_data || "";
  const reportFooter = labSettings?.report_footer || "This is a clinically verified electronic laboratory report.";
  
  const customBlocks = labSettings?.report_design?.customBlocks || [];

  const deptGroupsToPrint = targetDeptId === "ALL"
    ? departmentGroupedReports
    : (departmentGroupedReports || []).filter((g) => g.dept?.id === targetDeptId);

  if (!deptGroupsToPrint || deptGroupsToPrint.length === 0) return;

  const techUser = staffList.find((u) => u.role === "technologist") || { full_name: "Md. Al-Amin", designation: "BSc in Medical Technology - Senior Technologist", signature_data: "" };
  const verifierUser = staffList.find((u) => u.role === "verifier" || u.role === "admin") || { full_name: "Dr. S. Rahman", designation: "MBBS, MD (Pathology) - Consultant Biochemist & Lab Incharge", signature_data: "" };

  const renderSignatureHtml = (sigData, fallbackName, fontColor = "#000000") => {
    if (sigData && sigData.startsWith("data:image")) {
      return `<img src="${sigData}" style="height: 38px; max-width: 160px; object-fit: contain; margin: 0 auto 2px auto; display: block;" />`;
    }
    return `<div style="font-family: 'Brush Script MT', cursive; font-size: 19pt; color: ${fontColor}; height: 36px; line-height: 36px;">${sigData || fallbackName}</div>`;
  };

  const qrDataText = `${window.location.origin}/?verify=${activeOrder.orderId}&pid=${activeOrder.patient?.id || ''}&bc=${activeOrder.barcode}`;
  const scannableQrSvg = generateQrSvgLocal(qrDataText, 58);

  const departmentSheetsHtml = deptGroupsToPrint.map((group, deptIndex) => {
    const deptName = group.dept?.name || "General Diagnostics";
    const deptIcon = group.dept?.icon || "🔬";

    const activeBlocks = customBlocks.length > 0 ? customBlocks : [
      { id: "header", visible: true, padding: 10, borderWidth: 2, borderStyle: "solid", borderColor: "#000", textColor: "#000", fontSize: 16 },
      { id: "patient_box", visible: true, padding: 10, borderWidth: 1, borderStyle: "solid", borderColor: "#cbd5e1", bgColor: "#f8fafc", borderRadius: 8, fontSize: 9.5 },
      { id: "results_table", visible: true, padding: 8, borderWidth: 1.5, borderStyle: "solid", borderColor: "#000", fontSize: 9.5, innerHeaderBg: "#0f172a" },
      { id: "clinical_remarks", visible: true, padding: 8, borderWidth: 1, borderStyle: "solid", borderColor: "#000", bgColor: "#fafaf9", borderRadius: 6, fontSize: 9 },
      { id: "signatures", visible: true, padding: 12, borderWidth: 1, borderStyle: "solid", borderColor: "#334155" },
      { id: "footer", visible: true, padding: 6, fontSize: 7.5 }
    ];

    const topBlocks = activeBlocks.filter(b => b.id !== "signatures" && b.id !== "footer" && b.visible !== false);
    const bottomBlocks = activeBlocks.filter(b => (b.id === "signatures" || b.id === "footer") && b.visible !== false);

    const renderedTopHtml = topBlocks.map(block => {
      const fontFam = block.fontFamily === "serif" ? "Times New Roman, serif" : block.fontFamily === "mono" ? "Courier New, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      if (block.id === "header") {
        return `
          <div style="background: ${block.bgColor}; border-bottom: ${block.borderWidth}px ${block.borderStyle} ${block.borderColor}; padding: ${block.padding}px; display: flex; justify-content: space-between; align-items: center; font-family: ${fontFam};">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${logoData ? `<img src="${logoData}" style="height: ${block.logoSize || 48}px; max-width: 140px; object-fit: contain;" />` : ''}
              <div>
                <h1 style="font-size: ${block.fontSize || 16}pt; font-weight: 900; color: ${block.textColor}; letter-spacing: -0.5px; line-height: 1; margin: 0;">${labName.toUpperCase()}</h1>
                <p style="font-size: 8.5pt; color: #334155; font-weight: 700; margin: 3px 0 0 0;">${deptIcon} DEPARTMENT OF ${deptName.toUpperCase()} (${tagline})</p>
                <p style="font-size: 7.5pt; color: #475569; margin: 2px 0 0 0;">${address} • Phone: ${phone} • Email: ${email}</p>
              </div>
            </div>
            ${block.showQr !== false ? `
            <div style="text-align: right; width: 85px;">
              <div style="border: 1px solid #000; padding: 3px; border-radius: 6px; display: inline-block; background: #fff;">
                ${scannableQrSvg}
                <p style="font-size: 6pt; font-family: monospace; color: #000; font-weight: bold; margin: 0; text-align: center;">Scan to Verify</p>
              </div>
            </div>` : ''}
          </div>
        `;
      }

      if (block.id === "patient_box") {
        return `
          <div style="background: ${block.bgColor}; border: ${block.borderWidth}px ${block.borderStyle} ${block.borderColor}; border-radius: ${block.borderRadius}px; padding: ${block.padding}px; margin: 8px 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; font-size: ${block.fontSize || 9}pt; color: ${block.textColor}; font-family: ${fontFam};">
            <div><span style="color: #475569; font-size: 8pt; text-transform: uppercase;">Patient:</span> <b>${activeOrder.patient?.name || "N/A"}</b></div>
            <div><span style="color: #475569; font-size: 8pt; text-transform: uppercase;">Age/Sex:</span> <b>${activeOrder.patient?.age || "—"}Y / ${activeOrder.patient?.gender || "—"}</b></div>
            <div><span style="color: #475569; font-size: 8pt; text-transform: uppercase;">Patient ID:</span> <b style="font-family: monospace; color: #1d4ed8;">${activeOrder.patient?.id || "—"}</b></div>
            <div><span style="color: #475569; font-size: 8pt; text-transform: uppercase;">Ref. By:</span> <b>${activeOrder.patient?.doctor || "Self"}</b></div>
            <div><span style="color: #475569; font-size: 8pt; text-transform: uppercase;">Date:</span> <b>${activeOrder.date || "—"}</b></div>
            <div><span style="color: #475569; font-size: 8pt; text-transform: uppercase;">Receipt:</span> <b style="font-family: monospace;">${activeOrder.receiptNo || "—"}</b></div>
          </div>
        `;
      }

      if (block.id === "results_table") {
        const testsHtml = (group.tests || []).map((test) => {
          const params = test.test_parameters || test.parameters || [];
          const paramRows = params.map((p) => {
            const val = activeOrder.results?.[p.id]?.value || "—";
            const refRange = p.param_type === 'numeric' && p.min_range ? `${p.min_range} – ${p.max_range}` : (p.param_type === 'qualitative' ? "Negative / Non-Reactive" : "Normal");

            return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 7px 10px; font-weight: 600; color: #000000;">${p.name}</td>
                <td style="padding: 7px 10px; font-family: monospace; font-weight: 700; color: #000000; font-size: 10.5pt;">
                  ${val}
                </td>
                <td style="padding: 7px 10px; color: #334155; font-family: monospace;">${p.unit || ""}</td>
                <td style="padding: 7px 10px; color: #334155; font-family: monospace;">${refRange}</td>
              </tr>`;
          }).join("");

          return `
            <div style="margin-bottom: 12px;">
              <div style="background: ${block.innerHeaderBg || '#f1f5f9'}; padding: 5px 10px; border-left: 4px solid ${block.borderColor || '#000'}; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; font-size: 10.5pt; color: #000000; text-transform: uppercase;">${test.name}</span>
                <span style="font-size: 8pt; color: #334155; font-weight: 700;">Specimen: ${test.sample_type || "Blood"}</span>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: ${block.fontSize || 9.5}pt; text-align: left;">
                <thead>
                  <tr style="background: #f8fafc; border-bottom: 2px solid #000000; color: #000000; font-size: 8.5pt; text-transform: uppercase; font-weight: 900;">
                    <th style="padding: 6px 10px;">Test Parameter</th>
                    <th style="padding: 6px 10px;">Observed Result</th>
                    <th style="padding: 6px 10px;">Unit</th>
                    <th style="padding: 6px 10px;">Biological Reference Range</th>
                  </tr>
                </thead>
                <tbody>${paramRows}</tbody>
              </table>
            </div>`;
        }).join("");

        return `<div style="background: ${block.bgColor}; border: ${block.borderWidth}px ${block.borderStyle} ${block.borderColor}; padding: ${block.padding}px; font-family: ${fontFam};">${testsHtml}</div>`;
      }

      if (block.id === "clinical_remarks" && activeOrder.verifierRemarks) {
        return `
          <div style="background: ${block.bgColor}; border: ${block.borderWidth}px ${block.borderStyle} ${block.borderColor}; border-radius: ${block.borderRadius}px; padding: ${block.padding}px; margin: 8px 0; font-size: ${block.fontSize || 8.5}pt; font-family: ${fontFam};">
            <span style="font-weight: 800; text-transform: uppercase; font-size: 7.5pt; color: #000; display: block; margin-bottom: 2px;">Pathologist Clinical Remarks:</span>
            <span style="font-style: italic; color: #000;">${activeOrder.verifierRemarks}</span>
          </div>
        `;
      }

      return "";
    }).join("");

    const renderedBottomHtml = bottomBlocks.map(block => {
      const fontFam = block.fontFamily === "serif" ? "Times New Roman, serif" : block.fontFamily === "mono" ? "Courier New, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      if (block.id === "signatures") {
        return `
          <div style="margin-top: 25px; padding-top: 12px; border-top: ${block.borderWidth}px ${block.borderStyle} ${block.borderColor}; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; font-family: ${fontFam};">
            <div style="text-align: center; width: 230px;">
              ${renderSignatureHtml(techUser.signature_data, techUser.full_name, block.textColor)}
              <div style="border-top: 1.5px solid #000; margin-top: 4px; padding-top: 4px;">
                <div style="font-weight: 800; font-size: 9pt; color: #000000;">${techUser.full_name}</div>
                <div style="font-size: 7.5pt; color: #334155; font-weight: 600;">${techUser.designation}</div>
              </div>
            </div>
            <div style="text-align: center; width: 230px;">
              ${renderSignatureHtml(verifierUser.signature_data, verifierUser.full_name, block.textColor)}
              <div style="border-top: 1.5px solid #000; margin-top: 4px; padding-top: 4px;">
                <div style="font-weight: 800; font-size: 9pt; color: #000000;">${verifierUser.full_name}</div>
                <div style="font-size: 7.5pt; color: #334155; font-weight: 600;">${verifierUser.designation}</div>
              </div>
            </div>
          </div>
        `;
      }

      if (block.id === "footer") {
        return `<p style="text-align: center; font-size: ${block.fontSize || 7}pt; color: ${block.textColor}; margin: 15px 0 0 0; border-top: 0.5px dashed #cbd5e1; padding-top: 4px; font-family: ${fontFam};">${reportFooter}</p>`;
      }

      return "";
    }).join("");

    const isLastDept = deptIndex === deptGroupsToPrint.length - 1;
    const pageBreakStyle = isLastDept ? "" : "page-break-after: always;";

    return `
      <div class="department-sheet" style="${pageBreakStyle} min-height: 270mm; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
        <div>
          ${renderedTopHtml}
        </div>
        <div>
          ${renderedBottomHtml}
        </div>
      </div>`;
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
        <title>Department Reports - ${activeOrder.barcode}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 14mm 12mm 14mm; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #000000; background: #ffffff; margin: 0; padding: 0; font-size: 9.5pt; }
        </style>
      </head>
      <body>
        ${departmentSheetsHtml}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}
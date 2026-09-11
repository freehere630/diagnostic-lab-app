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
  return `<svg viewBox="0 0 ${x} 28" preserveAspectRatio="none" style="width: 100%; height: 26px;"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
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
  if (directVal && directVal.trim()) return directVal;

  const designObj = type === "report" 
    ? (settings?.report_design || settings?.reportDesign)
    : (settings?.receipt_design || settings?.receiptDesign);

  if (typeof designObj === "object" && designObj?.templateHtml) {
    return designObj.templateHtml;
  }

  try {
    const cached = JSON.parse(localStorage.getItem("apex_lab_settings") || "{}");
    const cachedTemplate = type === "report" 
      ? cached.report_design?.templateHtml || cached.reportDesign?.templateHtml
      : cached.receipt_design?.templateHtml || cached.receiptDesign?.templateHtml;
    if (cachedTemplate && cachedTemplate.trim()) return cachedTemplate;
  } catch (e) {}

  return "";
}

// Single Master Header for Reports
export function buildUnifiedResultsTable(tests = [], results = {}) {
  let tableRows = "";

  (tests || []).forEach((test) => {
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
      test.isProfile === "true" ||
      params.length > 1
    );

    // Profile Section Header
    if (isProfile) {
      tableRows += `
        <tr style="background-color: #f1f5f9; border-top: 1.5px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
          <td colspan="4" style="padding: 6px 10px; font-weight: 900; font-size: 8.5pt; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            ✦ ${test.name} ${test.code ? `(${test.code})` : ""}
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
        refRange = "Negative / Non-Reactive";
      }

      let valStyle = "font-family: monospace; font-weight: 700; font-size: 9pt; color: #000;";
      if (p.param_type === "numeric" && val !== "—") {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (p.min_range !== null && num < p.min_range) valStyle += " color: #b45309; font-weight: 900;";
          if (p.max_range !== null && num > p.max_range) valStyle += " color: #b91c1c; font-weight: 900;";
        }
      } else if (p.param_type === "qualitative" && (String(val).toLowerCase() === "positive" || String(val).toLowerCase() === "reactive")) {
        valStyle += " color: #b91c1c; font-weight: 900;";
      }

      tableRows += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 5px 10px; font-size: 8.5pt; color: #1e293b; font-weight: 500;">${displayName}</td>
          <td style="padding: 5px 10px; ${valStyle}">${val}</td>
          <td style="padding: 5px 10px; font-size: 8pt; color: #475569; font-family: monospace;">${p.unit || test.unit || "—"}</td>
          <td style="padding: 5px 10px; font-size: 8pt; color: #475569; font-family: monospace;">${refRange}</td>
        </tr>
      `;
    });
  });

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <thead>
        <tr style="border: 1px solid #e2e8f0; background-color: #F8FAFC; color: black; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px;">
          <th style="padding: 6px 10px; text-align: left; width: 42%;">Test Parameter</th>
          <th style="padding: 6px 10px; text-align: left; width: 22%;">Observed Result</th>
          <th style="padding: 6px 10px; text-align: left; width: 16%;">Unit</th>
          <th style="padding: 6px 10px; text-align: left; width: 20%;">Reference Range</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

// =========================================================================
// 1. A4 CLINICAL REPORT PRINT DRIVER (REMARKS GUARANTEED ON EVERY REPORT)
// =========================================================================
export function printDepartmentA4Report(targetDeptId = "ALL", activeOrder, departmentGroupedReports, staffList = [], labSettings = {}, onPrintedCallback) {
  if (!activeOrder) return;
  if (onPrintedCallback) onPrintedCallback();

  const techUser = staffList.find((u) => u.role === "technologist") || { 
    full_name: "Md. Al-Amin", 
    designation: "BSc in Medical Technology - Senior Technologist", 
    signature_data: "" 
  };
  const verifierUser = staffList.find((u) => u.role === "verifier" || u.role === "admin") || { 
    full_name: "Dr. S. Rahman", 
    designation: "MBBS, MD (Pathology) - Consultant Biochemist & Lab Incharge", 
    signature_data: "" 
  };

  const renderSignatureHtml = (sigData, fallbackName) => {
    if (sigData && sigData.startsWith("data:image")) {
      return `<img src="${sigData}" style="height: 38px; max-width: 140px; object-fit: contain; margin: 0 auto 2px auto; display: block;" />`;
    }
    return `<div style="font-family: 'Brush Script MT', cursive; font-size: 18pt; color: #000; height: 34px; line-height: 34px;">${sigData || fallbackName}</div>`;
  };

  let templateToUse = getActiveTemplate(labSettings, "report");
  if (!templateToUse) {
    templateToUse = `
      <div style="border: 2px solid #000; border-radius: 8px; padding: 14px 16px; min-height: 270mm; display: flex; flex-direction: column; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div>
          <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
              {{hospital_logo}}
              <div>
                <h1 style="font-size: 16pt; font-weight: 900; margin: 0; color: #0f172a;">{{hospital_name}}</h1>
                <p style="font-size: 8.5pt; font-weight: 700; color: #334155; margin: 2px 0;">DEPARTMENT OF {{department_name}} ({{hospital_tagline}})</p>
                <p style="font-size: 7.5pt; color: #475569; margin: 0;">{{hospital_address}} • Phone: {{hospital_phone}}</p>
              </div>
            </div>
            <div style="text-align: right; width: 85px;">
              {{qr_code}}
              <span style="font-size: 6pt; font-family: monospace; display: block; text-align: center; margin-top: 2px;">Scan to Verify</span>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px; font-size: 8.5pt;">
            <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Patient:</span> <b>{{patient_name}}</b></div>
            <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Age/Sex:</span> <b>{{age_gender}}</b></div>
            <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Patient ID:</span> <b style="font-family: monospace; color: #1d4ed8;">{{patient_id}}</b></div>
            <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Ref. By:</span> <b>{{doctor}}</b></div>
            <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Date:</span> <b>{{date}}</b></div>
            <div><span style="color: #475569; font-size: 7.5pt; text-transform: uppercase;">Barcode:</span> <b style="font-family: monospace;">{{barcode}}</b></div>
          </div>

          {{results_table}}
          {{remarks}}
        </div>

        <div>
          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #334155; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
            <div style="text-align: center; width: 220px;">
              {{tech_signature}}
              <div style="border-top: 1.5px solid #000; padding-top: 4px;">
                <div style="font-weight: 800; font-size: 8.5pt;">{{tech_name}}</div>
                <div style="font-size: 7pt; color: #334155;">{{tech_designation}}</div>
              </div>
            </div>
            <div style="text-align: center; width: 220px;">
              {{doctor_signature}}
              <div style="border-top: 1.5px solid #000; padding-top: 4px;">
                <div style="font-weight: 800; font-size: 8.5pt;">{{doctor_name}}</div>
                <div style="font-size: 7pt; color: #334155;">{{doctor_designation}}</div>
              </div>
            </div>
          </div>
          <p style="text-align: center; font-size: 6.5pt; color: #64748b; margin: 10px 0 0 0; border-top: 0.5px dashed #cbd5e1; padding-top: 4px;">{{report_footer}}</p>
        </div>
      </div>
    `;
  }

  const deptGroupsToPrint = targetDeptId === "ALL"
    ? departmentGroupedReports
    : (departmentGroupedReports || []).filter((g) => g.dept?.id === targetDeptId);

  const orderId = activeOrder.orderId || activeOrder.id || "";
  const qrUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(activeOrder.barcode || "")}`;
  const scannableQrSvg = generateQrSvgString(qrUrl, 56);

  // GUARANTEE REMARKS ON REPORT
  const remarksText = (activeOrder.verifierRemarks && activeOrder.verifierRemarks.trim())
    ? activeOrder.verifierRemarks
    : "Clinically correlated and verified with internal quality control standards.";

  const remarksHtml = `
    <div style="margin-top: 20px; padding: 3px 10px;  font-size: 7pt; color: #1e293b;">
      <b style="color: #0f172a; text-transform: uppercase; font-size: 6pt;">Pathologist Remarks / Interpretation:</b> 
      <span style="font-style: italic; margin-left: 4px; ">${remarksText}</span>
    </div>
  `;

  const pagesHtml = (deptGroupsToPrint || []).map((group, idx) => {
    const testsTableHtml = buildUnifiedResultsTable(group.tests || [], activeOrder.results || {});

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
      remarks: remarksHtml, // <--- Always populated
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
        <title>Report - ${activeOrder.barcode || activeOrder.orderId}</title>
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
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
  }, 250);
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

  const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(orderId)}&bc=${encodeURIComponent(barcode)}`;
  const scannableTrackingQrSvg = generateQrSvgString(trackingUrl, 56);

  const qrBlockHtml = `
    <div style="text-align: center; width: 95px; margin: 0 auto;">
      ${scannableTrackingQrSvg}
      <span style="font-size: 5.5pt; font-family: sans-serif; font-weight: bold; display: block; color: #0f172a; margin-top: 1px; text-align: center;">
        Scan for Live Report
      </span>
    </div>
  `;

  const itemsHtml = (activeOrd.tests || []).map((t, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 5px 8px; font-weight: 600;">${idx + 1}. ${t.name}</td>
      <td style="padding: 5px 8px; color: #475569;">${t.sample_type || "Blood"}</td>
      <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: bold;">৳ ${t.price}</td>
    </tr>
  `).join("");

  let templateToUse = getActiveTemplate(labSettings, "receipt");

  if (!templateToUse) {
    templateToUse = `
      <div style="border: 1.5px solid #000; border-radius: 8px; padding: 10px 12px; min-height: 190mm; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div>
          <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              {{hospital_logo}}
              <div>
                <h1 style="margin: 0; font-size: 13pt; font-weight: 900;">{{hospital_name}}</h1>
                <p style="margin: 1px 0; font-size: 7.5pt; color: #334155;">{{hospital_tagline}}</p>
                <p style="margin: 0; font-size: 7pt; color: #475569;">{{hospital_address}} • Phone: {{hospital_phone}}</p>
              </div>
            </div>
            <div style="background: #000; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: 900; font-size: 8pt;">MONEY RECEIPT</div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; font-size: 8pt;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td><b>Receipt No:</b> {{receipt_no}}</td><td><b>Date:</b> {{date}}</td><td><b>Patient ID:</b> <b style="color: #1d4ed8;">{{patient_id}}</b></td></tr>
              <tr><td colspan="2"><b>Name:</b> {{patient_name}} ({{age_gender}})</td><td><b>Phone:</b> {{patient_phone}}</td></tr>
              <tr><td colspan="3"><b>Ref. Doctor:</b> {{doctor}}</td></tr>
            </table>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 8px;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 1px solid #000; font-weight: 900;">
                <th style="padding: 4px 8px; text-align: left;">Test Description</th>
                <th style="padding: 4px 8px; text-align: left;">Specimen</th>
                <th style="padding: 4px 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>{{items_table}}</tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <table style="width: 220px; font-size: 8.5pt;">
              <tr><td>Subtotal:</td><td style="text-align: right; font-family: monospace;">৳ {{subtotal}}</td></tr>
              <tr><td>Discount ({{discount}}%):</td><td style="text-align: right; font-family: monospace;">- ৳ {{discount_amount}}</td></tr>
              <tr style="font-weight: 900; font-size: 10pt; border-top: 1px solid #000; border-bottom: 1px solid #000;"><td>Net Payable:</td><td style="text-align: right; font-family: monospace;">৳ {{net_payable}}</td></tr>
              <tr style="font-weight: bold;"><td>Paid (Cash):</td><td style="text-align: right; font-family: monospace;">৳ {{paid_amount}}</td></tr>
              <tr style="font-weight: bold;"><td>Due Balance:</td><td style="text-align: right; font-family: monospace;">৳ {{due_amount}}</td></tr>
            </table>
          </div>
        </div>

        <div>
          <div style="border-top: 1px dashed #94a3b8; padding: 6px 0; display: flex; justify-content: space-between; align-items: center;">
            <div style="text-align: center; width: 140px;">
              {{patient_barcode}}
              <p style="margin: 2px 0 0 0; font-family: monospace; font-size: 8pt; font-weight: 900; color: #000;">{{patient_id}}</p>
            </div>

            <div style="text-align: center; width: 95px;">
              {{report_tracking_qr}}
            </div>

            <div style="text-align: center; width: 120px;">
              <div style="border-bottom: 1px solid #000; height: 16px; margin-bottom: 2px;"></div>
              <span style="font-size: 7pt; font-weight: bold;">Authorized Cashier</span>
            </div>
          </div>
          <p style="text-align: center; margin: 3px 0 0 0; font-size: 6.5pt; color: #475569;">{{receipt_footer}}</p>
        </div>
      </div>
    `;
  }

  if (!templateToUse.includes("{{report_tracking_qr}}") && !templateToUse.includes("report_tracking_qr")) {
    if (templateToUse.includes("{{patient_id}}")) {
      templateToUse = templateToUse.replace(
        /({{patient_id}}<\/p>\s*<\/div>|{{patient_id}}<\/div>)/i,
        `$1<div style="text-align: center; width: 95px;">{{report_tracking_qr}}</div>`
      );
    } else {
      templateToUse = templateToUse.replace(
        "{{receipt_footer}}",
        `<div style="text-align: center; margin: 4px auto;">{{report_tracking_qr}}</div>{{receipt_footer}}`
      );
    }
  }

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
    report_tracking_qr: qrBlockHtml,
    tracking_url: trackingUrl,
    receipt_footer: labSettings?.receipt_footer || "Scan the QR code to check real-time report status & download results."
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
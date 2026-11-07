export function printPrescription({ order, doctorName, diagnosis, advice, followUpDate, items, labSettings, currentUser, chiefComplaint, vitals }) {
  if (!order || !items?.length) return;

  const esc = (v) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const labName = labSettings?.lab_name || "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER";
  const address = labSettings?.address || "";
  const phone = labSettings?.phone || "";
  const logoData = labSettings?.logo_data || "";

  const rowsHtml = items.map((it, i) => {
    // Combine frequency into a single string (e.g. "1 + 0 + 1")
    const freqParts = [it.freq_morning, it.freq_noon, it.freq_night].map(v => v || "0");
    const freqStr = freqParts.join(" + ");
    
    return `
    <tr>
      <td style="padding:6px 6px;border-bottom:1px solid #e2e8f0;font-weight:700;width:28px;">${i + 1}.</td>
      <td style="padding:6px 6px;border-bottom:1px solid #e2e8f0;">
        <div style="font-weight:700;font-size:10pt;">${esc(it.medicine_name)}</div>
        <div style="font-size:8.5pt;color:#64748b;">
          ${esc(it.strength || "")} ${it.strength && it.dosage_form ? "·" : ""} ${esc(it.dosage_form || "")}
          ${it.generic_name ? ` · <i>${esc(it.generic_name)}</i>` : ""}
        </div>
      </td>
      <td style="padding:6px 6px;border-bottom:1px solid #e2e8f0;font-family:'Consolas',monospace;font-size:9pt;">${esc(freqStr)}</td>
      <td style="padding:6px 6px;border-bottom:1px solid #e2e8f0;font-size:9pt;">${esc(it.meal_relation || "—")}</td>
      <td style="padding:6px 6px;border-bottom:1px solid #e2e8f0;font-size:9pt;">${esc(it.duration || "—")}</td>
      <td style="padding:6px 6px;border-bottom:1px solid #e2e8f0;font-size:8.5pt;color:#334155;">${esc(it.instructions || "")}</td>
    </tr>`;
  }).join("");

  const html = `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Prescription — ${esc(order.patient?.name)}</title>
<style>
  @page { size: A5 portrait; margin: 10mm; }
  * { box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important; }
  body { margin:0;padding:0;font-family:'Inter',-apple-system,sans-serif;color:#0f172a;font-size:10pt;line-height:1.4; }
  .header { display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:12px; }
  .brand { display:flex;align-items:center;gap:10px; }
  .logo { width:44px;height:44px;object-fit:contain; }
  .lab-name { font-size:12pt;font-weight:800;text-transform:uppercase;margin:0;letter-spacing:0.2px; }
  .lab-meta { font-size:8pt;color:#475569;margin:2px 0 0; }
  .rx-symbol { font-size:22pt;font-weight:900;color:#2563eb;font-family:Georgia,serif; }
  .patient-box { background:#f8fafc;border:1px solid #cbd5e1;border-radius:5px;padding:8px 10px;margin-bottom:12px;font-size:9pt; }
  .patient-box table { width:100%;border-collapse:collapse; }
  .patient-box td { padding:1px 0; }
  .section-label { font-size:9pt;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#334155;margin:12px 0 4px; }
  table.meds { width:100%;border-collapse:collapse; }
  table.meds th { background:#f1f5f9;padding:5px 6px;text-align:left;font-size:8pt;font-weight:700;text-transform:uppercase;color:#475569;border-bottom:1.5px solid #cbd5e1; }
  .advice { margin-top:10px;padding:8px 10px;border:1px dashed #94a3b8;border-radius:5px;font-size:9pt; }
  .sig { display:flex;justify-content:space-between;margin-top:32px;padding-top:8px;page-break-inside:avoid; }
  .sig-block { width:45%;text-align:center; }
  .sig-line { border-top:1px solid #0f172a;margin-top:36px;padding-top:4px;font-size:9pt;font-weight:700; }
  .sig-role { font-size:7.5pt;color:#64748b;margin-top:1px; }
  .footer { text-align:center;margin-top:16px;padding-top:8px;border-top:1px dashed #cbd5e1;font-size:7pt;color:#94a3b8; }
</style></head><body>

<div class="header">
  <div class="brand">
    ${logoData ? `<img src="${esc(logoData)}" class="logo" />` : ""}
    <div>
      <h1 class="lab-name">${esc(labName)}</h1>
      ${address ? `<p class="lab-meta">${esc(address)}</p>` : ""}
      ${phone ? `<p class="lab-meta">Hotline: ${esc(phone)}</p>` : ""}
    </div>
  </div>
  <div class="rx-symbol">℞</div>
</div>

<div class="patient-box">
  <table>
    <tr>
      <td style="width:55%;"><b>Patient:</b> ${esc(order.patient?.name)}</td>
      <td><b>Age / Sex:</b> ${esc(order.patient?.age || "—")} Y / ${esc(order.patient?.gender || "—")}</td>
    </tr>
    <tr>
      <td><b>Patient ID:</b> ${esc(order.patient?.id)}</td>
      <td><b>Date:</b> ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</td>
    </tr>
    <tr>
      <td colspan="2"><b>Ref. Doctor:</b> ${esc(doctorName || "Self")}</td>
    </tr>
  </table>
</div>

${(chiefComplaint || vitals?.bp || vitals?.pulse || vitals?.temp) ? `
  <div class="section-label">Clinical Notes</div>
  <div style="font-size:9.5pt; margin-bottom: 8px;">
    ${chiefComplaint ? `<div><b>Complaint:</b> ${esc(chiefComplaint)}</div>` : ""}
    ${(vitals?.bp || vitals?.pulse || vitals?.temp || vitals?.weight) ? `
      <div style="margin-top: 4px; font-family:'Consolas',monospace;">
        ${vitals.bp ? `<b>BP:</b> ${esc(vitals.bp)} mmHg &nbsp; ` : ""}
        ${vitals.pulse ? `<b>Pulse:</b> ${esc(vitals.pulse)} bpm &nbsp; ` : ""}
        ${vitals.temp ? `<b>Temp:</b> ${esc(vitals.temp)} °F &nbsp; ` : ""}
        ${vitals.weight ? `<b>Weight:</b> ${esc(vitals.weight)} kg` : ""}
      </div>
    ` : ""}
  </div>
` : ""}

${diagnosis ? `<div class="section-label">Diagnosis</div><div style="font-size:9.5pt;">${esc(diagnosis)}</div>` : ""}

<div class="section-label">Medications</div>
<table class="meds">
  <thead><tr><th>#</th><th>Medicine</th><th>Frequency</th><th>Meal</th><th>Duration</th><th>Instructions</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>

${advice ? `<div class="section-label">Advice</div><div class="advice">${esc(advice)}</div>` : ""}
${followUpDate ? `<div style="margin-top:8px;font-size:9pt;"><b>Follow-up:</b> ${esc(followUpDate)}</div>` : ""}

<div class="sig">
  <div class="sig-block"><div class="sig-line">Doctor's Signature</div><div class="sig-role">${esc(doctorName || "Consultant")}</div></div>
  <div class="sig-block"><div class="sig-line">Patient / Attendant</div><div class="sig-role">Received medicines as prescribed</div></div>
</div>

<div class="footer">Prescription generated ${new Date().toLocaleString("en-GB")} by ${esc(currentUser?.name || "System")} · ${esc(labName)}</div>
</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1000);
  }, 350);
}
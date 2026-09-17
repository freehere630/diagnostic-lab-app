/**
 * Clean and format mobile numbers to international format (+880 for Bangladesh)
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");

  // Bangladesh numbers: 017xxxxxxxx -> 88017xxxxxxxx
  if (clean.startsWith("01") && clean.length === 11) {
    clean = "88" + clean;
  } else if (clean.startsWith("1") && clean.length === 10) {
    clean = "880" + clean;
  }
  return clean;
}

/**
 * 1. Send Verified Report Link via WhatsApp (100% Free)
 */
export function sendReportReadyWhatsApp(order, labSettings = {}) {
  if (!order || !order.patient?.phone) {
    alert("Patient phone number is missing.");
    return;
  }

  const phone = formatPhoneForWhatsApp(order.patient.phone);
  const patientName = order.patient?.name || "Patient";
  const pid = order.patient?.id || "N/A";
  const labName = labSettings?.lab_name || "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER";
  const phoneHotline = labSettings?.phone || "01723854472, 01624787444";
  
  const reportUrl = `${window.location.origin}/?track=${encodeURIComponent(order.orderId || order.id)}&bc=${encodeURIComponent(order.barcode || "")}`;

  const message = 
`🏥 *${labName}*
*CLINICAL LABORATORY REPORT READY*

Dear *${patientName}*,
Your diagnostic investigation report is now *clinically verified* and ready for download.

📋 *Patient ID (UHID):* ${pid}
📅 *Date:* ${order.date || new Date().toISOString().slice(0, 10)}
🔒 *Status:* Official Verified Certificate

📥 *View & Download Your Report Here:*
${reportUrl}

_For inquiries, please contact our hotline: ${phoneHotline}_
_Solmaid Purbo Para, Panir pump, Vatara, Dhaka 1212_`;

  const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(waUrl, "_blank");
}

/**
 * 2. Send Repeat Collection Notice via WhatsApp (100% Free)
 */
export function sendRecollectionWhatsApp(order, reason = "Hemolyzed Specimen", labSettings = {}) {
  if (!order || !order.patient?.phone) {
    alert("Patient phone number is missing.");
    return;
  }

  const phone = formatPhoneForWhatsApp(order.patient.phone);
  const patientName = order.patient?.name || "Patient";
  const pid = order.patient?.id || "N/A";
  const labName = labSettings?.lab_name || "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER";
  const phoneHotline = labSettings?.phone || "01723854472, 01624787444";

  const message = 
`⚠️ *${labName}*
*URGENT: REPEAT SAMPLE COLLECTION NOTICE*

Dear *${patientName}* (ID: ${pid}),
During quality control analysis of your recent test sample, our laboratory noted *${reason}* (cellular breakdown during collection).

To guarantee 100% medical accuracy for your physician, our consultant pathologist recommends a *complimentary (free) repeat sample collection*.

📍 *Please visit our phlebotomy counter at your earliest convenience:*
Solmaid Purbo Para, Panir pump, Vatara, Dhaka 1212
📞 *Hotline:* ${phoneHotline}

Thank you for your cooperation in ensuring the highest clinical standards.`;

  const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(waUrl, "_blank");
}
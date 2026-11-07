import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, RefreshCw, Calendar,
  Wallet, TrendingUp, TrendingDown, DollarSign, Users, Receipt,
  Activity, AlertCircle, Stethoscope, FlaskConical, Banknote,
  CreditCard, BarChart3, PieChart, Clock, Minus, Printer,
} from "lucide-react";
import { getMonthlyAnalytics } from "../services/analyticsApi";

/* ──────────────────────────────────────────────────────────────── */
/* HELPERS                                                          */
/* ──────────────────────────────────────────────────────────────── */
const fmtMoney = (n) => `৳${Math.round(Number(n) || 0).toLocaleString()}`;
const fmtInt = (n) => (Number(n) || 0).toLocaleString();

const DEPT_NAME_MAP = {
  "DEP-HEM": "Hematology",
  "DEP-BIO": "Biochemistry",
  "DEP-IMM": "Immunology",
  "DEP-MIC": "Microbiology",
  "DEP-PAT": "Pathology",
  "DEP-RAD": "Radiology",
  "DEP-USG": "Ultrasound",
  "DEP-CTMRI": "CT / MRI",
  "DEP-CARD": "Cardiology",
  "DEP-HISTO": "Histopathology",
};

const pad2 = (n) => String(n).padStart(2, "0");
const toIso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return toIso(d);
}

function daysBetween(fromIso, toIso_) {
  return Math.round((new Date(toIso_ + "T00:00:00") - new Date(fromIso + "T00:00:00")) / 86400000) + 1;
}

function formatRangeLabel(fromIso, toIso_) {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso_ + "T00:00:00");
  if (fromIso === toIso_) {
    return from.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  }
  const sameYear = from.getFullYear() === to.getFullYear();
  const left = from.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: sameYear ? undefined : "numeric" });
  const right = to.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${left} – ${right}`;
}

/* ──────────────────────────────────────────────────────────────── */
/* PRINTABLE STATEMENT                                              */
/* ──────────────────────────────────────────────────────────────── */
function printAnalyticsStatement({ current, prior, rangeInfo, departments, labSettings, currentUser }) {
  if (!current) return;

  const esc = (v) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const fmt = (n) => `৳${Math.round(Number(n) || 0).toLocaleString()}`;
  const fmtI = (n) => (Number(n) || 0).toLocaleString();

  const labName = labSettings?.lab_name || "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER";
  const tagline = labSettings?.tagline || "";
  const address = labSettings?.address || "";
  const phone = labSettings?.phone || "";
  const logoData = labSettings?.logo_data || "";

  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const summary = current.summary || {};
  const priorSummary = prior?.summary || {};

  const trendOf = (cur, prev, invert = false) => {
    if (prev == null || (prev === 0 && cur === 0)) return { text: "—", cls: "flat" };
    if (prev === 0) return { text: "NEW", cls: "new" };
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    if (Math.abs(pct) < 0.5) return { text: "0%", cls: "flat" };
    const up = pct > 0;
    const good = invert ? !up : up;
    return { text: `${up ? "+" : ""}${pct.toFixed(0)}%`, cls: good ? "up" : "down" };
  };

  const getDeptName = (id) => {
    const found = (departments || []).find((d) => d.id === id);
    if (found?.name) return found.name;
    return DEPT_NAME_MAP[id] || id.replace("DEP-", "");
  };

  const rangeDays = daysBetween(rangeInfo.from, rangeInfo.to);

  // Choose row granularity for the collections table
  let dailyRows = [];
  if (rangeDays > 90) {
    const m = new Map();
    for (const d of current.daily || []) {
      const k = d.date.slice(0, 7);
      if (!m.has(k)) m.set(k, { label: k, collected: 0, orders: 0 });
      const w = m.get(k);
      w.collected += d.collected;
      w.orders += d.orders;
    }
    dailyRows = Array.from(m.values());
  } else if (rangeDays > 31) {
    const m = new Map();
    for (const d of current.daily || []) {
      const k = getWeekStart(d.date);
      if (!m.has(k)) m.set(k, { label: k, collected: 0, orders: 0 });
      const w = m.get(k);
      w.collected += d.collected;
      w.orders += d.orders;
    }
    dailyRows = Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label));
  } else {
    dailyRows = (current.daily || []).map((d) => ({ label: d.date, collected: d.collected, orders: d.orders }));
  }

  const formatRowLabel = (key) => {
    if (key.length === 7) return new Date(key + "-01T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return new Date(key + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const dailyHtml = dailyRows.length === 0
    ? `<tr><td colspan="3" style="text-align:center;padding:10px;color:#94a3b8;font-style:italic;">No payments recorded during this period.</td></tr>`
    : dailyRows.map((r) => `<tr>
        <td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;">${esc(formatRowLabel(r.label))}</td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmt(r.collected)}</td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmtI(r.orders)}</td>
      </tr>`).join("");

  const deptHtml = (current.departments || []).length === 0
    ? `<tr><td colspan="3" style="text-align:center;padding:10px;color:#94a3b8;font-style:italic;">No department activity.</td></tr>`
    : current.departments.map((d) => `<tr>
        <td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;">${esc(getDeptName(d.id))}</td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmtI(d.orders)}</td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmt(d.revenue)}</td>
      </tr>`).join("");

  const testsHtml = (current.topTests || []).slice(0, 12).length === 0
    ? `<tr><td colspan="3" style="text-align:center;padding:10px;color:#94a3b8;font-style:italic;">No tests billed.</td></tr>`
    : current.topTests.slice(0, 12).map((t) => `<tr>
        <td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;">
          <div style="font-weight:600;">${esc(t.name)}</div>
          <div style="font-size:8pt;color:#64748b;font-family:'Consolas',monospace;">${esc(t.code || "—")}</div>
        </td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmtI(t.count)}</td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmt(t.revenue)}</td>
      </tr>`).join("");

  const doctorsHtml = (current.topDoctors || []).slice(0, 12).length === 0
    ? `<tr><td colspan="4" style="text-align:center;padding:10px;color:#94a3b8;font-style:italic;">No referred patients.</td></tr>`
    : current.topDoctors.slice(0, 12).map((d) => `<tr>
        <td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;">${esc(d.name)}</td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmtI(d.orders)}</td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmt(d.revenue)}</td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmt(d.commission)}</td>
      </tr>`).join("");

  const expensesHtml = (current.expenseBreakdown || []).length === 0
    ? `<tr><td colspan="2" style="text-align:center;padding:10px;color:#94a3b8;font-style:italic;">No expenses logged.</td></tr>`
    : current.expenseBreakdown.map((e) => `<tr>
        <td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;">${esc(e.category)}</td>
        <td style="padding:4px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmt(e.amount)}</td>
      </tr>`).join("");

  const kpi = (label, cur, prev, invert = false, isMoney = true) => {
    const t = trendOf(cur, prev, invert);
    return `<div style="border:1px solid #cbd5e1;border-radius:5px;padding:9px 11px;background:#ffffff;position:relative;">
      <span style="position:absolute;top:8px;right:9px;font-size:8pt;font-weight:800;padding:1px 6px;border-radius:3px;"
        class="trend-${t.cls}">${esc(t.text)}</span>
      <div style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#64748b;">${esc(label)}</div>
      <div style="font-size:14pt;font-weight:800;color:#0f172a;font-family:'Consolas',monospace;margin-top:3px;">${isMoney ? fmt(cur) : fmtI(cur)}</div>
      <div style="font-size:8pt;color:#94a3b8;font-family:'Consolas',monospace;margin-top:1px;">prior: ${isMoney ? fmt(prev || 0) : fmtI(prev || 0)}</div>
    </div>`;
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Analytics Statement — ${esc(rangeInfo.label)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; font-size: 10pt; line-height: 1.4; background: #ffffff; }
  .trend-up   { color: #059669; background: #d1fae5; }
  .trend-down { color: #dc2626; background: #fee2e2; }
  .trend-flat { color: #64748b; background: #f1f5f9; }
  .trend-new  { color: #2563eb; background: #dbeafe; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-logo { width: 52px; height: 52px; object-fit: contain; }
  .brand-name { font-size: 14pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; margin: 0; }
  .brand-tagline { font-size: 9pt; color: #475569; margin: 2px 0 0 0; }
  .brand-contact { font-size: 8.5pt; color: #64748b; margin: 1px 0 0 0; }
  .title-block { text-align: right; padding-top: 4px; }
  .title { font-size: 13pt; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 1.2px; color: #0f172a; }
  .subtitle { font-size: 9.5pt; color: #334155; margin: 3px 0 0 0; font-family: 'Consolas', monospace; font-weight: 600; }
  .meta { display: flex; justify-content: space-between; font-size: 8.5pt; color: #475569; margin-bottom: 16px; padding: 7px 10px; background: #f8fafc; border-left: 3px solid #3b82f6; border-radius: 3px; }
  .section { margin-bottom: 16px; page-break-inside: avoid; }
  .section-title { font-size: 10.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px; border-bottom: 1.5px solid #0f172a; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: baseline; }
  .section-note { font-size: 8.5pt; font-weight: 500; color: #64748b; text-transform: none; letter-spacing: 0; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #f1f5f9; padding: 5px 6px; text-align: left; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; color: #334155; letter-spacing: 0.3px; border-bottom: 1.5px solid #cbd5e1; }
  th.right { text-align: right; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .profit-box { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 2px solid #0f172a; border-radius: 5px; margin-top: 8px; }
  .profit-box .label { font-size: 10.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }
  .profit-box .value { font-size: 16pt; font-weight: 800; font-family: 'Consolas', monospace; }
  .profit-box.positive { border-color: #059669; background: #f0fdf4; }
  .profit-box.positive .value { color: #047857; }
  .profit-box.negative { border-color: #dc2626; background: #fef2f2; }
  .profit-box.negative .value { color: #b91c1c; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 34px; padding-top: 10px; page-break-inside: avoid; }
  .sig-block { width: 42%; text-align: center; }
  .sig-line { border-top: 1px solid #0f172a; margin-top: 44px; padding-top: 5px; font-size: 9.5pt; font-weight: 700; }
  .sig-role { font-size: 8pt; color: #64748b; margin-top: 2px; }
  .footer { text-align: center; margin-top: 22px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 7.5pt; color: #94a3b8; }
</style>
</head>
<body>

<div class="header">
  <div class="brand">
    ${logoData ? `<img src="${esc(logoData)}" class="brand-logo" alt="Logo" />` : ""}
    <div>
      <h1 class="brand-name">${esc(labName)}</h1>
      ${tagline ? `<p class="brand-tagline">${esc(tagline)}</p>` : ""}
      ${address ? `<p class="brand-contact">${esc(address)}</p>` : ""}
      ${phone ? `<p class="brand-contact">Hotline: ${esc(phone)}</p>` : ""}
    </div>
  </div>
  <div class="title-block">
    <h2 class="title">Analytics Statement</h2>
    <p class="subtitle">${esc(rangeInfo.label)}</p>
  </div>
</div>

<div class="meta">
  <span><b>Period:</b> ${esc(rangeInfo.label)} (${rangeDays} day${rangeDays === 1 ? "" : "s"})</span>
  <span><b>Generated:</b> ${esc(generatedAt)}</span>
  <span><b>By:</b> ${esc(currentUser?.name || "System")}</span>
</div>

<div class="section">
  <div class="section-title">Summary Metrics <span class="section-note">vs. prior ${rangeDays}-day period</span></div>
  <div class="kpi-grid">
    ${kpi("Gross Revenue", summary.gross || 0, priorSummary.gross || 0)}
    ${kpi("Collected", summary.collected || 0, priorSummary.collected || 0)}
    ${kpi("Outstanding Due", summary.due || 0, priorSummary.due || 0, true)}
    ${kpi("Total Orders", summary.totalOrders || 0, priorSummary.totalOrders || 0, false, false)}
    ${kpi("Unique Patients", summary.uniquePatients || 0, priorSummary.uniquePatients || 0, false, false)}
    ${kpi("Net Profit", summary.netProfit || 0, priorSummary.netProfit || 0)}
  </div>
</div>

<div class="section">
  <div class="section-title">Collections Timeline <span class="section-note">${rangeDays > 90 ? "monthly" : rangeDays > 31 ? "weekly" : "daily"} breakdown</span></div>
  <table>
    <thead>
      <tr>
        <th>${rangeDays > 90 ? "Month" : rangeDays > 31 ? "Week Of" : "Date"}</th>
        <th class="right">Collected</th>
        <th class="right">Receipts</th>
      </tr>
    </thead>
    <tbody>${dailyHtml}</tbody>
  </table>
</div>

<div class="two-col">
  <div class="section">
    <div class="section-title">Department Breakdown</div>
    <table>
      <thead><tr><th>Department</th><th class="right">Tests</th><th class="right">Revenue</th></tr></thead>
      <tbody>${deptHtml}</tbody>
    </table>
  </div>
  <div class="section">
    <div class="section-title">Expense Breakdown</div>
    <table>
      <thead><tr><th>Category</th><th class="right">Amount</th></tr></thead>
      <tbody>${expensesHtml}</tbody>
    </table>
  </div>
</div>

<div class="two-col">
  <div class="section">
    <div class="section-title">Top Tests <span class="section-note">by revenue</span></div>
    <table>
      <thead><tr><th>Test</th><th class="right">Count</th><th class="right">Revenue</th></tr></thead>
      <tbody>${testsHtml}</tbody>
    </table>
  </div>
  <div class="section">
    <div class="section-title">Top Doctors <span class="section-note">by referral revenue</span></div>
    <table>
      <thead><tr><th>Doctor</th><th class="right">Orders</th><th class="right">Revenue</th><th class="right">Commission</th></tr></thead>
      <tbody>${doctorsHtml}</tbody>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">Profit Summary</div>
  <table>
    <tbody>
      <tr>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;">Cash Received</td>
        <td style="padding:5px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmt(summary.cashReceived || 0)}</td>
      </tr>
      <tr>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;">Online Received</td>
        <td style="padding:5px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #e2e8f0;">${fmt(summary.onlineReceived || 0)}</td>
      </tr>
      <tr style="background:#f1f5f9;font-weight:700;">
        <td style="padding:5px 6px;border-bottom:1px solid #cbd5e1;">Total Cash In</td>
        <td style="padding:5px 6px;text-align:right;font-family:'Consolas',monospace;border-bottom:1px solid #cbd5e1;">${fmt(summary.totalCashIn || 0)}</td>
      </tr>
      <tr>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;">Less: Expenses</td>
        <td style="padding:5px 6px;text-align:right;font-family:'Consolas',monospace;color:#b91c1c;border-bottom:1px solid #e2e8f0;">− ${fmt(summary.totalExpenses || 0)}</td>
      </tr>
      <tr>
        <td style="padding:5px 6px;border-bottom:1px solid #e2e8f0;">Less: Doctor Payouts</td>
        <td style="padding:5px 6px;text-align:right;font-family:'Consolas',monospace;color:#4338ca;border-bottom:1px solid #e2e8f0;">− ${fmt(summary.totalPayouts || 0)}</td>
      </tr>
    </tbody>
  </table>
  <div class="profit-box ${(summary.netProfit || 0) >= 0 ? "positive" : "negative"}">
    <span class="label">Net Profit</span>
    <span class="value">${fmt(summary.netProfit || 0)}</span>
  </div>
</div>

<div class="sig-row">
  <div class="sig-block">
    <div class="sig-line">Prepared By</div>
    <div class="sig-role">${esc(currentUser?.name || "Accounts Department")}</div>
  </div>
  <div class="sig-block">
    <div class="sig-line">Reviewed By</div>
    <div class="sig-role">Authorized Signatory</div>
  </div>
</div>

<div class="footer">
  System-generated financial statement. All amounts in BDT (৳). Confidential — for internal use only.<br/>
  ${esc(labName)} · Generated ${esc(generatedAt)}
</div>

</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { if (iframe.parentNode) document.body.removeChild(iframe); }, 1200);
  }, 400);
}

/* ──────────────────────────────────────────────────────────────── */
/* SUB-COMPONENTS                                                   */
/* ──────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, prior, format, icon: Icon, gradient, trendPositive = "up" }) {
  const trend = useMemo(() => {
    if (prior == null) return null;
    if (prior === 0 && value === 0) return { type: "flat" };
    if (prior === 0) return { type: "new" };
    const pct = ((value - prior) / Math.abs(prior)) * 100;
    if (Math.abs(pct) < 0.5) return { type: "flat" };
    return { type: pct > 0 ? "up" : "down", pct };
  }, [value, prior]);

  const isGood = trend?.type === "flat" || trendPositive === "neutral"
    ? null
    : trendPositive === "down"
      ? trend.type === "down"
      : trend.type === "up";

  const chipClass =
    !trend || trend.type === "flat"
      ? "bg-slate-100 text-slate-500 border-slate-200"
      : isGood === null
        ? "bg-slate-100 text-slate-600 border-slate-200"
        : isGood
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br ${gradient}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-0.5 ${chipClass}`}>
            {trend.type === "up" ? <TrendingUp className="w-3 h-3" /> :
             trend.type === "down" ? <TrendingDown className="w-3 h-3" /> :
             trend.type === "new" ? <Activity className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {trend.type === "new" ? "NEW" : trend.pct != null ? `${Math.abs(trend.pct).toFixed(0)}%` : "0%"}
          </span>
        )}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-slate-900 font-mono leading-tight">{format(value)}</div>
      {prior != null && (
        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">prior: {format(prior)}</div>
      )}
    </div>
  );
}

function RevenueChart({ data }) {
  const W = 800, H = 220;
  const PAD_L = 56, PAD_R = 16, PAD_T = 16, PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  if (!data || data.length === 0) {
    return (
      <div className="py-10 text-center text-slate-400 text-xs italic">
        No collections recorded for this range.
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const niceMax = Math.ceil(maxVal / 1000) * 1000 || 1000;

  const points = data.map((d, i) => ({
    x: PAD_L + (i / Math.max(1, data.length - 1)) * innerW,
    y: PAD_T + innerH - (d.value / niceMax) * innerH,
    ...d,
  }));

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = data.length === 1
    ? ""
    : `${lineD} L${points[points.length - 1].x.toFixed(1)},${PAD_T + innerH} L${points[0].x.toFixed(1)},${PAD_T + innerH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: PAD_T + innerH - f * innerH, val: niceMax * f }));
  const labelEvery = Math.max(1, Math.ceil(data.length / 15));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 200 }}>
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={g.y} x2={W - PAD_R} y2={g.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "3 3"} />
          <text x={PAD_L - 8} y={g.y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
            {g.val >= 1000 ? `৳${(g.val / 1000).toFixed(0)}k` : `৳${g.val}`}
          </text>
        </g>
      ))}

      {areaD && <path d={areaD} fill="url(#revGrad)" />}
      {data.length > 1 && <path d={lineD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5">
          <title>{p.tooltip || `${p.label}: ৳${p.value.toLocaleString()}`}</title>
        </circle>
      ))}

      {points.map((p, i) => (i === 0 || (i + 1) % labelEvery === 0 || i === points.length - 1) && (
        <text key={i} x={p.x} y={H - 8} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function PaymentDonut({ cash, online }) {
  const total = cash + online;
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-6 text-slate-400">
        <PieChart className="w-10 h-10 mb-2 text-slate-300" />
        <span className="text-xs italic">No payments in this range</span>
      </div>
    );
  }

  const R = 60, C = 2 * Math.PI * R;
  const cashPct = cash / total;
  const onlinePct = online / total;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 160 160" className="w-40 h-40">
        <defs>
          <linearGradient id="cashGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="onlineGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={R} fill="none" stroke="#f1f5f9" strokeWidth="20" />
        <circle cx="80" cy="80" r={R} fill="none" stroke="url(#cashGrad)" strokeWidth="20"
          strokeDasharray={`${cashPct * C} ${C}`} transform="rotate(-90 80 80)" />
        <circle cx="80" cy="80" r={R} fill="none" stroke="url(#onlineGrad)" strokeWidth="20"
          strokeDasharray={`${onlinePct * C} ${C}`} strokeDashoffset={`-${cashPct * C}`} transform="rotate(-90 80 80)" />
        <text x="80" y="74" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">TOTAL</text>
        <text x="80" y="92" textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a" fontFamily="monospace">
          ৳{Math.round(total).toLocaleString()}
        </text>
      </svg>

      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <Banknote className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-700">Cash</span>
          </span>
          <span className="font-mono font-bold text-slate-900">
            {fmtMoney(cash)} <span className="text-slate-400 font-normal">({(cashPct * 100).toFixed(0)}%)</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-700">Online</span>
          </span>
          <span className="font-mono font-bold text-slate-900">
            {fmtMoney(online)} <span className="text-slate-400 font-normal">({(onlinePct * 100).toFixed(0)}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function HorizontalBars({ items, colorFrom = "from-blue-500", colorTo = "to-blue-600", valueFormat = fmtMoney }) {
  if (!items || items.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-xs italic">No data for this period.</div>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-32 text-[11px] font-semibold text-slate-700 truncate" title={item.label}>{item.label}</div>
          <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden relative">
            <div className={`h-full bg-gradient-to-r ${colorFrom} ${colorTo} rounded-md transition-all duration-500`}
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
          <div className="w-24 text-right font-mono text-[11px] font-bold text-slate-800">{valueFormat(item.value)}</div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/* MAIN COMPONENT                                                   */
/* ──────────────────────────────────────────────────────────────── */
const RANGE_PRESETS = [
  { key: "TODAY", label: "Today" },
  { key: "YESTERDAY", label: "Yesterday" },
  { key: "LAST_7", label: "7 Days" },
  { key: "LAST_15", label: "15 Days" },
  { key: "LAST_30", label: "30 Days" },
  { key: "THIS_MONTH", label: "This Month" },
  { key: "THIS_YEAR", label: "This Year" },
  { key: "CUSTOM", label: "Custom…" },
];

export default function MonthlyAnalytics({ departments = [], labSettings = {}, currentUser = null }) {
  const [mode, setMode] = useState("MONTH"); // "MONTH" | "RANGE"
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [rangePreset, setRangePreset] = useState("LAST_15");
  const [customFrom, setCustomFrom] = useState(toIso(addDays(new Date(), -14)));
  const [customTo, setCustomTo] = useState(toIso(new Date()));
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(null);
  const [prior, setPrior] = useState(null);
  const [error, setError] = useState("");

  /* Compute from/to/prior/label for the current mode. */
  const rangeInfo = useMemo(() => {
    const now = new Date();
    const todayIso = toIso(now);

    if (mode === "MONTH") {
      const y = selectedMonth.getFullYear();
      const m = selectedMonth.getMonth();
      const from = toIso(new Date(y, m, 1));
      const lastDay = new Date(y, m + 1, 0).getDate();
      const to = toIso(new Date(y, m, lastDay));
      const prevMonthFrom = toIso(new Date(y, m - 1, 1));
      const prevMonthLastDay = new Date(y, m, 0).getDate();
      const prevMonthTo = toIso(new Date(y, m - 1, prevMonthLastDay));
      return {
        from, to,
        priorFrom: prevMonthFrom,
        priorTo: prevMonthTo,
        label: selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        isCurrent: from <= todayIso && todayIso <= to,
        mode: "MONTH",
      };
    }

    let from, to;
    if (rangePreset === "TODAY") { from = to = todayIso; }
    else if (rangePreset === "YESTERDAY") { from = to = toIso(addDays(now, -1)); }
    else if (rangePreset === "LAST_7") { from = toIso(addDays(now, -6)); to = todayIso; }
    else if (rangePreset === "LAST_15") { from = toIso(addDays(now, -14)); to = todayIso; }
    else if (rangePreset === "LAST_30") { from = toIso(addDays(now, -29)); to = todayIso; }
    else if (rangePreset === "THIS_MONTH") {
      from = toIso(new Date(now.getFullYear(), now.getMonth(), 1));
      to = todayIso;
    } else if (rangePreset === "THIS_YEAR") {
      from = `${now.getFullYear()}-01-01`;
      to = todayIso;
    } else {
      from = customFrom || todayIso;
      to = customTo || todayIso;
    }

    // Guard against inverted range
    if (from > to) { const tmp = from; from = to; to = tmp; }

    const days = daysBetween(from, to);
    const priorTo = toIso(addDays(new Date(from + "T00:00:00"), -1));
    const priorFrom = toIso(addDays(new Date(from + "T00:00:00"), -days));

    return {
      from, to,
      priorFrom, priorTo,
      label: formatRangeLabel(from, to),
      isCurrent: from <= todayIso && todayIso <= to,
      mode: "RANGE",
    };
  }, [mode, selectedMonth, rangePreset, customFrom, customTo]);

  const rangeDays = daysBetween(rangeInfo.from, rangeInfo.to);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [cur, prev] = await Promise.all([
        getMonthlyAnalytics(rangeInfo.from, rangeInfo.to),
        getMonthlyAnalytics(rangeInfo.priorFrom, rangeInfo.priorTo),
      ]);
      setCurrent(cur);
      setPrior(prev);
    } catch (e) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeInfo.from, rangeInfo.to, rangeInfo.priorFrom, rangeInfo.priorTo]);

  /* Navigate months (Month mode only). */
  const now = new Date();
  const isCurrentMonth = selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth();
  const isFutureMonth = selectedMonth > new Date(now.getFullYear(), now.getMonth(), 1);
  const goPrev = () => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  const goNext = () => { if (!isFutureMonth) setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)); };
  const goToday = () => setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));

  const summary = current?.summary || {};
  const priorSummary = prior?.summary || {};
  const isEmpty = !current || summary.totalOrders === 0;

  /* Prepare chart series (auto-aggregates for longer ranges). */
  const chartSeries = useMemo(() => {
    if (!current?.daily || current.daily.length === 0) return [];
    if (rangeDays <= 31) {
      const byDay = {};
      for (const d of current.daily) byDay[d.date] = d;
      const data = [];
      const start = new Date(rangeInfo.from + "T00:00:00");
      for (let i = 0; i < rangeDays; i++) {
        const dt = addDays(start, i);
        const iso = toIso(dt);
        const entry = byDay[iso];
        data.push({
          label: String(dt.getDate()),
          value: entry?.collected || 0,
          tooltip: `${iso}: ৳${(entry?.collected || 0).toLocaleString()} (${entry?.orders || 0} orders)`,
        });
      }
      return data;
    }
    if (rangeDays <= 180) {
      const m = new Map();
      for (const d of current.daily) {
        const k = getWeekStart(d.date);
        if (!m.has(k)) m.set(k, { value: 0, orders: 0 });
        const w = m.get(k);
        w.value += d.collected;
        w.orders += d.orders;
      }
      return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([week, v]) => ({
        label: new Date(week + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        value: v.value,
        tooltip: `Week of ${week}: ৳${v.value.toLocaleString()} (${v.orders} orders)`,
      }));
    }
    const m = new Map();
    for (const d of current.daily) {
      const k = d.date.slice(0, 7);
      if (!m.has(k)) m.set(k, { value: 0, orders: 0 });
      const w = m.get(k);
      w.value += d.collected;
      w.orders += d.orders;
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({
      label: new Date(month + "-01T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      value: v.value,
      tooltip: `${month}: ৳${v.value.toLocaleString()} (${v.orders} orders)`,
    }));
  }, [current, rangeDays, rangeInfo.from]);

  const getDeptName = (id) => {
    const found = departments.find((d) => d.id === id);
    if (found?.name) return found.name;
    return DEPT_NAME_MAP[id] || id.replace("DEP-", "");
  };

  const deptBars = (current?.departments || []).slice(0, 8).map((d) => ({ label: getDeptName(d.id), value: d.revenue }));
  const expenseBars = (current?.expenseBreakdown || []).slice(0, 8).map((e) => ({ label: e.category, value: e.amount }));

  const handlePrint = () => {
    printAnalyticsStatement({ current, prior, rangeInfo, departments, labSettings, currentUser });
  };

  /* ── RENDER ── */
  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">

      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3.5">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">

            {/* Left: title + range info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-blue-300" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-white leading-tight">Monthly Analytics</h2>
                <p className="text-[10.5px] text-slate-300 leading-tight mt-0.5 truncate">
                  {rangeInfo.label} · {rangeDays} day{rangeDays === 1 ? "" : "s"} · {isEmpty ? "No activity" : `${fmtInt(summary.totalOrders)} receipts`}
                  {rangeInfo.isCurrent && rangeInfo.mode === "MONTH" && " · in progress"}
                </p>
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Mode toggle */}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMode("MONTH")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${mode === "MONTH" ? "bg-white text-slate-900" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setMode("RANGE")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${mode === "RANGE" ? "bg-white text-slate-900" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                >
                  Range
                </button>
              </div>

              {/* Mode-specific picker */}
              {mode === "MONTH" ? (
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 shrink-0">
                  <button type="button" onClick={goPrev} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-white whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-blue-300" />
                    {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </div>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={isFutureMonth}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {!isCurrentMonth && (
                    <button
                      type="button"
                      onClick={goToday}
                      className="ml-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold transition"
                    >
                      Today
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <select
                    value={rangePreset}
                    onChange={(e) => setRangePreset(e.target.value)}
                    className="bg-white/10 border border-white/15 text-white text-[11px] font-semibold rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                  >
                    {RANGE_PRESETS.map((p) => (
                      <option key={p.key} value={p.key} className="text-slate-900">{p.label}</option>
                    ))}
                  </select>
                  {rangePreset === "CUSTOM" && (
                    <>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="bg-white/10 border border-white/15 text-white text-[11px] rounded-lg px-2 py-1 outline-none font-mono [color-scheme:dark]"
                      />
                      <span className="text-white/60 text-xs">→</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="bg-white/10 border border-white/15 text-white text-[11px] rounded-lg px-2 py-1 outline-none font-mono [color-scheme:dark]"
                      />
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={!current || loading || isEmpty}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm transition shrink-0"
                title="Print statement"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-lg transition disabled:opacity-50 shrink-0"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* LOADING */}
      {loading && !current ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading analytics…</p>
        </div>
      ) : isEmpty && !loading ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">No activity in this period</h3>
          <p className="text-xs text-slate-500 mb-4">There are no orders, payments, or expenses recorded in {rangeInfo.label}.</p>
          {mode === "MONTH" && (
            <button
              type="button"
              onClick={goPrev}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
            >
              View {new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1).toLocaleDateString("en-US", { month: "long" })}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* KPI STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Gross Revenue" value={summary.gross} prior={priorSummary.gross} format={fmtMoney} icon={DollarSign} gradient="from-blue-500 to-blue-600" trendPositive="up" />
            <KpiCard label="Collected" value={summary.collected} prior={priorSummary.collected} format={fmtMoney} icon={Wallet} gradient="from-emerald-500 to-emerald-600" trendPositive="up" />
            <KpiCard label="Outstanding Due" value={summary.due} prior={priorSummary.due} format={fmtMoney} icon={Clock} gradient="from-rose-500 to-rose-600" trendPositive="down" />
            <KpiCard label="Total Orders" value={summary.totalOrders} prior={priorSummary.totalOrders} format={fmtInt} icon={Receipt} gradient="from-violet-500 to-violet-600" trendPositive="up" />
            <KpiCard label="Unique Patients" value={summary.uniquePatients} prior={priorSummary.uniquePatients} format={fmtInt} icon={Users} gradient="from-amber-500 to-amber-600" trendPositive="up" />
            <KpiCard label="Net Profit" value={summary.netProfit} prior={priorSummary.netProfit} format={fmtMoney} icon={TrendingUp} gradient="from-cyan-500 to-cyan-600" trendPositive="up" />
          </div>

          {/* DAILY CHART + PAYMENT DONUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Collections Timeline
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    {rangeDays <= 31 ? "Daily" : rangeDays <= 180 ? "Weekly" : "Monthly"} amount received
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</div>
                  <div className="font-mono font-bold text-sm text-slate-900">{fmtMoney(summary.collected)}</div>
                </div>
              </div>
              <RevenueChart data={chartSeries} />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
              <div className="mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  Payment Split
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">How patients settled their bills</p>
              </div>
              <PaymentDonut cash={summary.cashReceived} online={summary.onlineReceived} />
            </div>
          </div>

          {/* DEPARTMENT BREAKDOWN */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div className="mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                Department Performance
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Gross billable (before discount) grouped by department</p>
            </div>
            <HorizontalBars items={deptBars} colorFrom="from-indigo-500" colorTo="to-indigo-600" valueFormat={fmtMoney} />
          </div>

          {/* TOP TESTS + TOP DOCTORS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-blue-600" /> Top Tests
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">Ranked by revenue</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Top {(current?.topTests || []).slice(0, 8).length}</span>
              </div>
              {(current?.topTests || []).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">No tests billed this period.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/60 text-[10px] font-semibold uppercase text-slate-500">
                    <tr><th className="py-1.5 px-3 text-left">Test</th><th className="py-1.5 px-2 text-right">Count</th><th className="py-1.5 px-3 text-right">Revenue</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {current.topTests.slice(0, 8).map((t, i) => (
                      <tr key={t.id || i} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 truncate max-w-[240px]">{t.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{t.code || "—"}</div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-slate-700">{fmtInt(t.count)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{fmtMoney(t.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-rose-600" /> Top Referring Doctors
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">Commission based on doctor's configured rate</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Top {(current?.topDoctors || []).slice(0, 8).length}</span>
              </div>
              {(current?.topDoctors || []).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">No referred patients this period.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/60 text-[10px] font-semibold uppercase text-slate-500">
                    <tr><th className="py-1.5 px-3 text-left">Doctor</th><th className="py-1.5 px-2 text-right">Orders</th><th className="py-1.5 px-2 text-right">Revenue</th><th className="py-1.5 px-3 text-right">Commission</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {current.topDoctors.slice(0, 8).map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 truncate max-w-[180px]">{d.name}</div>
                          <div className="text-[10px] text-slate-400">{d.rate}% rate</div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-slate-700">{fmtInt(d.orders)}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-slate-800">{fmtMoney(d.revenue)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">{fmtMoney(d.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* EXPENSES + PROFIT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
              <div className="mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-amber-600" /> Expense Breakdown
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">By category — sorted by spend</p>
              </div>
              <HorizontalBars items={expenseBars} colorFrom="from-amber-500" colorTo="to-rose-500" valueFormat={fmtMoney} />
              {expenseBars.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs italic">No expenses logged this period.</div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
              <div className="mb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" /> Profit Summary
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-0.5">Cash flow for {rangeInfo.label}</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
                  <span className="font-medium text-slate-700 flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5 text-emerald-600" />Cash Received</span>
                  <span className="font-mono font-bold text-emerald-700">{fmtMoney(summary.cashReceived)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-blue-50/60 border border-blue-200">
                  <span className="font-medium text-slate-700 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-blue-600" />Online Received</span>
                  <span className="font-mono font-bold text-blue-700">{fmtMoney(summary.onlineReceived)}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-slate-50 border border-slate-200 my-1">
                  <span className="font-bold text-slate-700">Total Cash In</span>
                  <span className="font-mono font-bold text-slate-900">{fmtMoney(summary.totalCashIn)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2.5">
                  <span className="font-medium text-slate-600 flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-rose-500" />Expenses</span>
                  <span className="font-mono font-semibold text-rose-700">− {fmtMoney(summary.totalExpenses)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2.5">
                  <span className="font-medium text-slate-600 flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5 text-indigo-500" />Doctor Payouts</span>
                  <span className="font-mono font-semibold text-indigo-700">− {fmtMoney(summary.totalPayouts)}</span>
                </div>
                <div className={`flex items-center justify-between py-3 px-3 rounded-xl border-2 mt-2 ${summary.netProfit >= 0 ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300" : "bg-gradient-to-r from-rose-50 to-red-50 border-rose-300"}`}>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    {summary.netProfit >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
                    Net Profit
                  </span>
                  <span className={`font-mono font-bold text-lg ${summary.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {fmtMoney(summary.netProfit)}
                  </span>
                </div>
                {summary.totalCashIn > 0 && (
                  <div className="text-center text-[10.5px] text-slate-500 pt-1">
                    Profit margin: <span className="font-bold text-slate-700">{((summary.netProfit / summary.totalCashIn) * 100).toFixed(1)}%</span> of cash received
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
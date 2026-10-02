// src/utils/reportLayout.js
export const REPORT_PAGE = { width: 2480, height: 3508 };

export const FIELD_TOKENS = [
  { token: "{{lab_name}}", key: "lab_name", label: "Lab name" },
  { token: "{{tagline}}", key: "tagline", label: "Tagline" },
  { token: "{{address}}", key: "address", label: "Address" },
  { token: "{{phone}}", key: "phone", label: "Phone" },
  { token: "{{email}}", key: "email", label: "Email" },
  { token: "{{website}}", key: "website", label: "Website" },
];

const SANS = "Arial, Helvetica, sans-serif";
export const newId = () => "el-" + Math.random().toString(36).slice(2, 9);

const text = (id, x, y, w, h, t, o = {}) => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  text: t,
  fontSize: 14,
  fontFamily: SANS,
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  color: "#111111",
  ...o,
});

export const DEFAULT_REPORT_LAYOUT = {
  version: 1,
  header: {
    height: 132,
    bg: null, // null = follow header_bg in settings
    elements: [
      { id: "h-logo", type: "logo", x: 24, y: 22, w: 62, h: 62 },
      text("h-tagline", 6, 90, 200, 14, "{{tagline}}", { fontSize: 9, align: "center", color: "#ffffff" }),
      text("h-name", 250, 30, 505, 72, "{{lab_name}}", { fontSize: 26, bold: true, align: "right", color: "#ffffff" }),
    ],
  },
  footer: {
    height: 72,
    bg: "#ffffff",
    borderTop: "#222222",
    elements: [
      text("f-address", 40, 25, 470, 22, "📍 {{address}}", { bold: true }),
      text("f-phone", 520, 25, 220, 22, "🎧 {{phone}}", { bold: true, align: "right" }),
    ],
  },
};

const withDefaults = (settings) => ({
  lab_name: "AL FATTAH DIAGNOSTIC & CONSULTATION CENTER",
  tagline: "With Al-Fattah on the Journey to Wellness",
  address: "Solmaid Purbo Para, Panir pump, Vatara, Dhaka 1212",
  phone: "01723854472, 01624787444",
  email: "alfattahdiagnostic@gmail.com",
  website: "www.alfattahlab.com",
  header_bg: "#20122e",
  header_color: "#ffffff",
  logo_data: "",
  ...(settings || {}),
});

export const escapeHtml = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeAttr = (s) => escapeHtml(s).replace(/"/g, "&quot;");

export function resolveText(t, settings) {
  const S = withDefaults(settings);
  return String(t ?? "").replace(/\{\{(\w+)\}\}/g, (m, k) =>
    FIELD_TOKENS.some((f) => f.key === k) ? S[k] ?? "" : m
  );
}

export function getReportLayout(settings) {
  let saved = settings?.report_layout;
  if (typeof saved === "string") {
    try {
      saved = JSON.parse(saved);
    } catch {
      saved = null;
    }
  }
  return saved?.header?.elements && saved?.footer?.elements ? saved : DEFAULT_REPORT_LAYOUT;
}

export function elementStyle(el) {
  const base = {
    position: "absolute",
    left: `${el.x}px`,
    top: `${el.y}px`,
    width: `${el.w}px`,
    height: `${el.h}px`,
    boxSizing: "border-box",
  };
  switch (el.type) {
    case "text":
      return {
        ...base,
        fontFamily: el.fontFamily,
        fontSize: `${el.fontSize}px`,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? "italic" : "normal",
        textDecoration: el.underline ? "underline" : "none",
        textAlign: el.align,
        color: el.color,
        lineHeight: 1.25,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      };
    case "line":
      return { ...base, background: el.color };
    case "rect":
      return { ...base, background: el.bg, borderRadius: `${el.radius || 0}px` };
    default:
      return base;
  }
}

const styleToCss = (s) =>
  Object.entries(s)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`)
    .join(";");

const FALLBACK_LOGO = `<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="#fff" stroke="#16a34a" stroke-width="2"/><path d="M 50 8 A 42 42 0 0 0 50 92 A 34 34 0 0 1 50 8 Z" fill="#dc2626"/><path d="M 36 28 L 64 28 L 64 56 C 64 70 50 78 50 78 C 50 78 36 70 36 56 Z" fill="#15803d"/><text x="50" y="58" font-size="28" font-weight="900" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">AF</text></svg>`;

const IMG_STYLE = "width:100%;height:100%;object-fit:contain;display:block";

export function elementInnerHtml(el, settings) {
  switch (el.type) {
    case "text":
      return escapeHtml(resolveText(el.text, settings));
    case "logo": {
      const src = withDefaults(settings).logo_data;
      return src ? `<img src="${escapeAttr(src)}" alt="" style="${IMG_STYLE}">` : FALLBACK_LOGO;
    }
    case "image":
      return el.src ? `<img src="${escapeAttr(el.src)}" alt="" style="${IMG_STYLE}">` : "";
    default:
      return "";
  }
}

function zoneHtml(kind, settings) {
  const layout = getReportLayout(settings);
  const z = layout[kind];
  const bg = z.bg || (kind === "header" ? withDefaults(settings).header_bg : "#ffffff");
  const border = kind === "footer" && z.borderTop ? `border-top:1px solid ${z.borderTop};` : "";
  const items = z.elements
    .map((el) => `<div style="${styleToCss(elementStyle(el))}">${elementInnerHtml(el, settings)}</div>`)
    .join("");
  return `<div style="position:relative;width:100%;max-width:${REPORT_PAGE.width}px;height:${z.height}px;background:${bg};${border}box-sizing:border-box;overflow:hidden;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${items}</div>`;
}

export const buildReportHeaderHtml = (settings) => zoneHtml("header", settings);
export const buildReportFooterHtml = (settings) => zoneHtml("footer", settings);
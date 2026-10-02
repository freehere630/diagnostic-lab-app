// src/components/ReportLayoutDesigner.jsx
import React, { useRef, useState, useEffect } from "react";
import {
  Type, Image as ImageIcon, Building2, Minus, Square, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Trash2, Copy, Undo2, Redo2,
  BringToFront, SendToBack, ZoomIn, ZoomOut, Printer, RotateCcw,
} from "lucide-react";
import {
  REPORT_PAGE, FIELD_TOKENS, DEFAULT_REPORT_LAYOUT, newId, elementStyle,
  elementInnerHtml, buildReportHeaderHtml, buildReportFooterHtml,
} from "../utils/reportLayout";

const FONTS = [
  ["Arial", "Arial, Helvetica, sans-serif"],
  ["Segoe UI / Inter", "'Inter','Segoe UI',system-ui,sans-serif"],
  ["Tahoma", "Tahoma, sans-serif"],
  ["Verdana", "Verdana, sans-serif"],
  ["Georgia", "Georgia, serif"],
  ["Times New Roman", "'Times New Roman', Times, serif"],
  ["Courier New", "'Courier New', monospace"],
  ["Nirmala UI (বাংলা)", "'Nirmala UI','Noto Sans Bengali',sans-serif"],
];

const Btn = ({ onClick, active, title, children }) => (
  <button
    type="button" title={title} onClick={onClick}
    className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 font-semibold ${
      active ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
    }`}
  >
    {children}
  </button>
);

const Num = ({ label, value, onChange, min = 0, w = "w-14" }) => (
  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
    {label}
    <input
      type="number" min={min} value={Math.round((value || 0) * 10) / 10}
      onChange={(e) => onChange(e.target.value === "" ? min : parseFloat(e.target.value))}
      className={`${w} p-1 border border-slate-300 rounded-lg text-xs text-slate-800 font-mono`}
    />
  </label>
);

const Sep = () => <span className="w-px h-6 bg-slate-200 mx-1" />;

export default function ReportLayoutDesigner({ layout, onChange, settings }) {
  const [zone, setZone] = useState("header");
  const [selId, setSelId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [zoom, setZoom] = useState(0.9);
  const past = useRef([]);
  const future = useRef([]);
  const drag = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const layoutRef = useRef(layout);

  useEffect(() => {
    layoutRef.current = layout;
  });

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, []);

  const currentLayout = layout || DEFAULT_REPORT_LAYOUT;
  const zoneData = currentLayout[zone] || DEFAULT_REPORT_LAYOUT[zone];
  const sel = zoneData.elements.find((e) => e.id === selId) || null;
  const ink = zone === "header" ? "#ffffff" : "#111111";

  const setZoneData = (kind, patch, record = true) => {
    const L = layoutRef.current || DEFAULT_REPORT_LAYOUT;
    if (record) {
      past.current.push(L);
      if (past.current.length > 60) past.current.shift();
      future.current = [];
    }
    onChange({ ...L, [kind]: { ...L[kind], ...patch } });
  };

  const patchEl = (id, patch, record = true) =>
    setZoneData(zone, {
      elements: (layoutRef.current?.[zone]?.elements || []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }, record);

  const undo = () => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(layoutRef.current);
    setEditId(null);
    onChange(p);
  };

  const redo = () => {
    const n = future.current.pop();
    if (!n) return;
    past.current.push(layoutRef.current);
    onChange(n);
  };

  const addEl = (el) => {
    const e = { id: newId(), ...el };
    const elements = layoutRef.current?.[zone]?.elements || [];
    setZoneData(zone, { elements: [...elements, e] });
    setSelId(e.id);
    canvasRef.current?.focus();
  };

  const addText = (t = "New text") =>
    addEl({
      type: "text", x: 40, y: 40, w: 240, h: 28, text: t, fontSize: 14,
      fontFamily: FONTS[0][1], bold: false, italic: false, underline: false, align: "left", color: ink,
    });

  const addField = (token) => {
    if (!token) return;
    if (sel?.type === "text") patchEl(sel.id, { text: `${sel.text}${sel.text ? " " : ""}${token}` });
    else addText(token);
  };

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 1024 * 1024) return alert("Please choose an image under 1 MB.");
    const r = new FileReader();
    r.onload = () => {
      const im = new window.Image();
      im.onload = () => {
        const w = Math.min(160, im.naturalWidth);
        addEl({ type: "image", x: 30, y: 20, w, h: Math.round((w * im.naturalHeight) / im.naturalWidth), src: r.result });
      };
      im.src = r.result;
    };
    r.readAsDataURL(f);
  };

  const removeSel = () => {
    if (!sel) return;
    setZoneData(zone, { elements: zoneData.elements.filter((e) => e.id !== sel.id) });
    setSelId(null);
  };

  const dupSel = () => {
    if (!sel) return;
    const c = { ...sel, id: newId(), x: sel.x + 12, y: sel.y + 12 };
    setZoneData(zone, { elements: [...zoneData.elements, c] });
    setSelId(c.id);
  };

  const reorder = (toFront) => {
    if (!sel) return;
    const rest = zoneData.elements.filter((e) => e.id !== sel.id);
    setZoneData(zone, { elements: toFront ? [...rest, sel] : [sel, ...rest] });
  };

  const resetZone = () => {
    if (!window.confirm(`Reset the ${zone} to the default layout?`)) return;
    setZoneData(zone, DEFAULT_REPORT_LAYOUT[zone]);
    setSelId(null);
  };

  const startDrag = (e, el, mode) => {
    e.stopPropagation();
    canvasRef.current?.focus();
    setSelId(el.id);
    past.current.push(layoutRef.current);
    future.current = [];
    drag.current = { id: el.id, mode, zone, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = Math.round((e.clientX - d.sx) / zoom);
    const dy = Math.round((e.clientY - d.sy) / zoom);
    const patch = d.mode === "move"
      ? { x: d.ox + dx, y: d.oy + dy }
      : { w: Math.max(6, d.ow + dx), h: Math.max(1, d.oh + dy) };
    setZoneData(d.zone, {
      elements: (layoutRef.current?.[d.zone]?.elements || []).map((x) => (x.id === d.id ? { ...x, ...patch } : x)),
    }, false);
  };

  const onKeyDown = (e) => {
    if (editId) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && k === "y") { e.preventDefault(); redo(); return; }
    if (!sel) return;
    if (mod && k === "d") { e.preventDefault(); dupSel(); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSel(); return; }
    const s = e.shiftKey ? 10 : 1;
    const mv = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    if (mv) { e.preventDefault(); patchEl(sel.id, { x: sel.x + mv[0], y: sel.y + mv[1] }); }
  };

  const testPrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const merged = { ...settings, report_layout: currentLayout };
    w.document.write(
      `<!doctype html><html><head><title>Letterhead test print</title><style>@page{size:2,480px 3508px;margin:0}html,body{margin:0}body{width:2,480px;height:3508px;display:flex;flex-direction:column;justify-content:space-between;font-family:Arial,sans-serif}.mid{padding:20px 28px;color:#888;font-size:13px}</style></head><body>${buildReportHeaderHtml(merged)}<div class="mid">[ Patient details and results appear here ]</div>${buildReportFooterHtml(merged)}</body></html>`
    );
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

const renderEl = (el, active) => {
    const selected = active && el.id === selId;
    const editing = active && el.id === editId;
    return (
    <div
    key={el.id}
    style={{
    ...elementStyle(el),
    cursor: active ? (editing ? "text" : "move") : "inherit",
    outline: selected ? "1.5px solid #2563eb" : undefined,
    userSelect: editing ? "text" : "none",
    touchAction: "none",
    }}
    className={active && !selected ? "hover:ring-1 hover:ring-blue-400" : ""}
    onPointerDown={active && !editing ? (e) => startDrag(e, el, "move") : undefined}
    onDoubleClick={active && el.type === "text" ? () => setEditId(el.id) : undefined}
    >
    {editing ? (
    <div
    contentEditable suppressContentEditableWarning spellCheck={false}
    ref={(n) => { if (n && document.activeElement !== n) n.focus(); }}
    onBlur={(e) => { patchEl(el.id, { text: e.currentTarget.innerText }); setEditId(null); }}
    onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") e.currentTarget.blur(); }}
    style={{ outline: "none", minHeight: "100%", whiteSpace: "pre-wrap" }}
    >
    {el.text}
    </div>
    ) : (
    <div
    style={{ width: "100%", height: "100%", pointerEvents: "none" }}
    dangerouslySetInnerHTML={{ __html: elementInnerHtml(el, settings) }}
    />
    )}
    {selected && !editing && (
    <span
    onPointerDown={(e) => startDrag(e, el, "resize")}
    style={{ position: "absolute", right: -5, bottom: -5, width: 10, height: 10, background: "#2563eb", border: "1px solid #fff", cursor: "nwse-resize" }}
    />
    )}
    </div>
    );
};

  const renderZone = (kind) => {
    const z = currentLayout[kind];
    const active = zone === kind;
    const bg = z.bg || (kind === "header" ? settings?.header_bg || "#20122e" : "#ffffff");
    return (
      <div
        onPointerDown={(e) => {
          if (!active) { setZone(kind); setSelId(null); setEditId(null); }
          else if (e.target === e.currentTarget) setSelId(null);
          canvasRef.current?.focus();
        }}
        style={{
          position: "relative", width: REPORT_PAGE.width, height: z.height, flex: "none",
          background: bg, boxSizing: "border-box",
          borderTop: kind === "footer" && z.borderTop ? `1px solid ${z.borderTop}` : "none",
          outline: active ? "2px dashed #3b82f6" : "none", outlineOffset: -2,
          cursor: active ? "default" : "pointer", overflow: "hidden",
        }}
      >
        {z.elements.map((el) => renderEl(el, active))}
        <span
          className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold shadow"
          style={{ pointerEvents: "none", opacity: active ? 1 : 0.45 }}
        >
          {kind === "header" ? "Header" : "Footer"}{active ? "" : " (click to edit)"}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-3 text-xs text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5 shadow-sm">
        {/* Top Action Ribbon */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Btn title="Undo (Ctrl+Z)" onClick={undo}><Undo2 className="w-4 h-4" /></Btn>
          <Btn title="Redo (Ctrl+Y)" onClick={redo}><Redo2 className="w-4 h-4" /></Btn>
          <Sep />
          <span className="font-bold text-slate-500 mr-0.5">Insert:</span>
          <Btn title="Text box" onClick={() => addText()}><Type className="w-4 h-4" /> Text</Btn>
          <select
            value="" onChange={(e) => addField(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white cursor-pointer"
            title="Insert a branding field into the selected text box"
          >
            <option value="">Dynamic Field…</option>
            {FIELD_TOKENS.map((f) => <option key={f.token} value={f.token}>{f.label}</option>)}
          </select>
          <Btn title="Hospital logo from branding" onClick={() => addEl({ type: "logo", x: 24, y: 22, w: 62, h: 62 })}>
            <Building2 className="w-4 h-4" /> Logo
          </Btn>
          <Btn title="Upload image" onClick={() => fileRef.current?.click()}><ImageIcon className="w-4 h-4" /> Image</Btn>
          <Btn title="Line" onClick={() => addEl({ type: "line", x: 24, y: 60, w: 300, h: 2, color: ink })}><Minus className="w-4 h-4" /> Line</Btn>
          <Btn title="Box" onClick={() => addEl({ type: "rect", x: 24, y: 24, w: 140, h: 40, bg: "#16a34a", radius: 0 })}><Square className="w-4 h-4" /> Box</Btn>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
          <Sep />
          <Btn title="Duplicate (Ctrl+D)" onClick={dupSel}><Copy className="w-4 h-4" /></Btn>
          <Btn title="Bring to front" onClick={() => reorder(true)}><BringToFront className="w-4 h-4" /></Btn>
          <Btn title="Send to back" onClick={() => reorder(false)}><SendToBack className="w-4 h-4" /></Btn>
          <Btn title="Delete (Del)" onClick={removeSel}><Trash2 className="w-4 h-4 text-rose-600" /></Btn>
          <span className="flex-1" />
          <Btn title="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}><ZoomOut className="w-4 h-4" /></Btn>
          <span className="w-10 text-center font-mono font-bold">{Math.round(zoom * 100)}%</span>
          <Btn title="Zoom in" onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))}><ZoomIn className="w-4 h-4" /></Btn>
          <Btn title="Print a test page" onClick={testPrint}><Printer className="w-4 h-4" /> Test print</Btn>
        </div>

        {/* Formatting row */}
        <div className="flex flex-wrap items-center gap-2 min-h-[32px] border-t pt-2.5">
          {!sel ? (
            <span className="text-slate-500">
              💡 Click an item to format it. Drag to move, use the blue corner square to resize, double-click text to edit,
              arrow keys to nudge. Dynamic fields like <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-blue-700">{"{{phone}}"}</code> automatically fill with Hospital Details.
            </span>
          ) : (
            <>
              {sel.type === "text" && (
                <>
                  <select
                    value={sel.fontFamily} onChange={(e) => patchEl(sel.id, { fontFamily: e.target.value })}
                    className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white max-w-[150px]"
                  >
                    {FONTS.map(([n, v]) => <option key={n} value={v}>{n}</option>)}
                  </select>
                  <Num label="Size" value={sel.fontSize} min={6} onChange={(v) => patchEl(sel.id, { fontSize: v })} />
                  <Btn active={sel.bold} title="Bold" onClick={() => patchEl(sel.id, { bold: !sel.bold })}><Bold className="w-4 h-4" /></Btn>
                  <Btn active={sel.italic} title="Italic" onClick={() => patchEl(sel.id, { italic: !sel.italic })}><Italic className="w-4 h-4" /></Btn>
                  <Btn active={sel.underline} title="Underline" onClick={() => patchEl(sel.id, { underline: !sel.underline })}><Underline className="w-4 h-4" /></Btn>
                  <Btn active={sel.align === "left"} title="Align left" onClick={() => patchEl(sel.id, { align: "left" })}><AlignLeft className="w-4 h-4" /></Btn>
                  <Btn active={sel.align === "center"} title="Center" onClick={() => patchEl(sel.id, { align: "center" })}><AlignCenter className="w-4 h-4" /></Btn>
                  <Btn active={sel.align === "right"} title="Align right" onClick={() => patchEl(sel.id, { align: "right" })}><AlignRight className="w-4 h-4" /></Btn>
                  <label className="flex items-center gap-1 font-semibold text-slate-500">Color
                    <input type="color" value={sel.color} onChange={(e) => patchEl(sel.id, { color: e.target.value })} className="w-7 h-7 rounded border p-0.5 cursor-pointer" />
                  </label>
                </>
              )}
              {sel.type === "line" && (
                <label className="flex items-center gap-1 font-semibold text-slate-500">Color
                  <input type="color" value={sel.color} onChange={(e) => patchEl(sel.id, { color: e.target.value })} className="w-7 h-7 rounded border p-0.5 cursor-pointer" />
                </label>
              )}
              {sel.type === "rect" && (
                <>
                  <label className="flex items-center gap-1 font-semibold text-slate-500">Fill
                    <input type="color" value={sel.bg} onChange={(e) => patchEl(sel.id, { bg: e.target.value })} className="w-7 h-7 rounded border p-0.5 cursor-pointer" />
                  </label>
                  <Num label="Corner" value={sel.radius || 0} onChange={(v) => patchEl(sel.id, { radius: v })} />
                </>
              )}
              <Sep />
              <Num label="X" value={sel.x} min={-200} onChange={(v) => patchEl(sel.id, { x: v })} />
              <Num label="Y" value={sel.y} min={-200} onChange={(v) => patchEl(sel.id, { y: v })} />
              <Num label={sel.type === "line" ? "Length" : "W"} value={sel.w} min={4} onChange={(v) => patchEl(sel.id, { w: v })} />
              <Num label={sel.type === "line" ? "Thickness" : "H"} value={sel.h} min={1} onChange={(v) => patchEl(sel.id, { h: v })} />
            </>
          )}
        </div>

        {/* Section/Zone Settings */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-2.5">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold">
            {["header", "footer"].map((k) => (
              <button
                key={k} type="button" onClick={() => { setZone(k); setSelId(null); setEditId(null); }}
                className={`px-3 py-1 rounded-lg transition ${zone === k ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
              >
                {k === "header" ? "Header Section" : "Footer Section"}
              </button>
            ))}
          </div>
          <Num label="Height (px)" value={zoneData.height} min={30} w="w-16" onChange={(v) => setZoneData(zone, { height: Math.min(320, v) })} />
          <label className="flex items-center gap-1 font-semibold text-slate-500">Background
            <input
              type="color" className="w-7 h-7 rounded border p-0.5 cursor-pointer"
              value={zoneData.bg || (zone === "header" ? settings?.header_bg || "#20122e" : "#ffffff")}
              onChange={(e) => setZoneData(zone, { bg: e.target.value })}
            />
          </label>
          {zone === "header" && zoneData.bg && (
            <Btn title="Use the colour from Hospital Branding" onClick={() => setZoneData("header", { bg: null })}>Match branding colour</Btn>
          )}
          {zone === "footer" && (
            <label className="flex items-center gap-1.5 font-semibold text-slate-500">
              <input
                type="checkbox" checked={!!zoneData.borderTop}
                onChange={(e) => setZoneData("footer", { borderTop: e.target.checked ? "#222222" : "" })}
              />
              Top line
              {zoneData.borderTop && (
                <input type="color" value={zoneData.borderTop} onChange={(e) => setZoneData("footer", { borderTop: e.target.value })} className="w-7 h-7 rounded border p-0.5 cursor-pointer" />
              )}
            </label>
          )}
          <span className="flex-1" />
          <Btn title="Reset this section to default" onClick={resetZone}><RotateCcw className="w-3.5 h-3.5" /> Reset {zone}</Btn>
        </div>
      </div>

      {/* Interactive Page Canvas */}
      <div className="bg-slate-200 rounded-2xl border border-slate-300 p-4 overflow-auto shadow-inner" style={{ maxHeight: "75vh" }}>
        <div style={{ width: REPORT_PAGE.width * zoom, height: REPORT_PAGE.height * zoom, margin: "0 auto" }}>
          <div
            ref={canvasRef} tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            className="bg-white shadow-2xl flex flex-col outline-none border border-slate-300"
            style={{ width: REPORT_PAGE.width, height: REPORT_PAGE.height, transform: `scale(${zoom})`, transformOrigin: "top left" }}
          >
            {renderZone("header")}
            <div className="flex-1 px-7 py-5 space-y-3 overflow-hidden bg-slate-50/50" style={{ pointerEvents: "none" }}>
              <div className="h-14 rounded-xl border border-slate-300 bg-white" />
              <div className="h-5 w-64 mx-auto bg-slate-200 rounded-full" />
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-3 bg-slate-200/70 rounded" style={{ width: `${95 - (i % 3) * 12}%` }} />
              ))}
              <p className="text-center text-slate-400 text-[11px] pt-4 font-sans font-medium">
                [ Patient Demographics, Clinical Results Table & Dual Signatures appear here automatically ]
              </p>
            </div>
            {renderZone("footer")}
          </div>
        </div>
      </div>
    </div>
  );
}
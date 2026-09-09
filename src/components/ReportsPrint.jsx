import React, { useMemo } from "react";
import { Printer } from "lucide-react";

function generateQRCodeMatrix(text) {
  const clean = text || "https://apexlab.com/verify";
  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  const addFinderPattern = (row, col) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[row + r][col + c] = 1;
        }
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  let bitIndex = 0;
  const bytes = Array.from(unescape(encodeURIComponent(clean))).map(c => c.charCodeAt(0));
  
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let r = 0; r < size; r++) {
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = c - colOffset;
        if (
          (r < 8 && col < 8) ||
          (r < 8 && col >= size - 8) ||
          (r >= size - 8 && col < 8) ||
          r === 6 || col === 6
        ) {
          continue;
        }
        const byteVal = bytes[bitIndex % bytes.length] || 0x55;
        const bit = (byteVal >> (bitIndex % 8)) & 1;
        matrix[r][col] = (bit ^ ((r + col) % 2 === 0 ? 1 : 0));
        bitIndex++;
      }
    }
  }

  return matrix;
}

function QRCodeSVG({ value, size = 60 }) {
  const matrix = useMemo(() => generateQRCodeMatrix(value), [value]);
  const matrixSize = matrix.length;
  const cellSize = size / matrixSize;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bg-white p-0.5 rounded shadow-sm border border-slate-300">
      <rect width="100%" height="100%" fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell === 1 ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.1}
              height={cellSize + 0.1}
              fill="#000000"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function ReportsPrint({ 
  activeOrder, 
  departmentGroupedReports, 
  handlePrintDepartmentA4Report,
  staffList = [],
  labSettings = {},
  onOpenVerificationModal
}) {
  if (!activeOrder) {
    return <div className="p-8 text-center text-slate-400 font-sans">No active order selected for report printing.</div>;
  }

  const labName = labSettings?.lab_name || "APEX DIAGNOSTIC LABORATORIES";
  const tagline = labSettings?.tagline || "ISO 15189:2022 Certified Clinical Laboratory";
  const logoData = labSettings?.logo_data || "";
  const reportDesign = labSettings?.report_design || {};
  const accentColor = reportDesign.accentColor || "#0f172a";
  const headerBg = reportDesign.headerBg || "#f8fafc";
  const fontFam = reportDesign.fontFamily === "serif" ? "font-serif" : reportDesign.fontFamily === "mono" ? "font-mono" : "font-sans";

  const techUser = staffList.find(u => u.role === "technologist") || {
    full_name: "Md. Al-Amin",
    designation: "BSc in Medical Technology - Senior Technologist",
    signature_data: ""
  };

  const verifierUser = staffList.find(u => u.role === "verifier" || u.role === "admin") || {
    full_name: "Dr. S. Rahman",
    designation: "MBBS, MD (Pathology) - Consultant Biochemist & Lab Incharge",
    signature_data: ""
  };

  const isTechImage = techUser.signature_data && techUser.signature_data.startsWith("data:image");
  const isVerifierImage = verifierUser.signature_data && verifierUser.signature_data.startsWith("data:image");

  const qrUrl = `${window.location.origin}/?verify=${activeOrder.orderId}&pid=${activeOrder.patient?.id || ''}&bc=${activeOrder.barcode}`;

  return (
    <div className={`w-full max-w-5xl mx-auto space-y-6 text-slate-900 ${fontFam}`}>
      
      {/* Top Hub Bar */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Diagnostic Reports Hub (Department-Wise)</h2>
          <p className="text-xs text-slate-500">Patient: <b>{activeOrder.patient?.name}</b> | Barcode: <b className="font-mono text-blue-700">{activeOrder.barcode}</b></p>
        </div>

        <button
          onClick={() => handlePrintDepartmentA4Report("ALL")}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
        >
          <Printer className="w-4 h-4" /> Print All Departments (Auto Page-Break A4)
        </button>
      </div>

      {/* Department Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Departmental Report Sheets (Combined Tests per Department)
        </h3>

        {(departmentGroupedReports || []).map((group) => (
          <div key={group.dept.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{group.dept.icon || "🔬"}</span>
                <span className="font-black text-sm text-slate-900">Department of {group.dept.name}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px]">
                  {group.tests.length} Tests Combined
                </span>
              </div>
              <p className="text-xs text-slate-500 pl-7">
                Contains: <b>{group.tests.map((t) => `${t.name} (${t.code})`).join(", ")}</b>
              </p>
            </div>

            <button
              onClick={() => handlePrintDepartmentA4Report(group.dept.id)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition self-end md:self-auto"
            >
              <Printer className="w-3.5 h-3.5" /> Print {group.dept.name} A4 Sheet Only
            </button>
          </div>
        ))}
      </div>

      {/* Screen Live Preview with Clean Black Values and Zero Flags */}
      <div 
        className="bg-white p-8 sm:p-12 rounded-2xl border shadow-xl text-slate-900 w-full text-xs"
        style={{ borderColor: accentColor }}
      >
        <div 
          className="border-b-2 pb-4 flex justify-between items-start"
          style={{ borderBottomColor: accentColor }}
        >
          <div className="flex items-center gap-3">
            {logoData ? (
              <img src={logoData} alt="Logo" className="h-12 w-12 object-contain mix-blend-multiply" />
            ) : (
              <div className="p-2 bg-blue-600 rounded-xl text-white font-bold text-lg">🏥</div>
            )}
            <div>
              <h1 className="text-2xl font-black" style={{ color: accentColor }}>{labName.toUpperCase()}</h1>
              <p className="text-xs text-slate-600 font-semibold">{tagline}</p>
            </div>
          </div>

          <div 
            onClick={onOpenVerificationModal} 
            className="text-center cursor-pointer group"
            title="Click to view online verification certificate"
          >
            <QRCodeSVG value={qrUrl} size={60} />
            <span className="text-[7px] font-mono text-blue-600 group-hover:underline block mt-0.5 font-bold">
              Click to Verify
            </span>
          </div>
        </div>

        <div 
          className="grid grid-cols-3 gap-2 py-3 border-b text-xs px-4 my-4 rounded-xl text-slate-900"
          style={{ backgroundColor: headerBg }}
        >
          <div>Patient: <b>{activeOrder.patient?.name}</b></div>
          <div>Age/Sex: <b>{activeOrder.patient?.age}Y / {activeOrder.patient?.gender}</b></div>
          <div>Barcode: <b className="font-mono">{activeOrder.barcode}</b></div>
        </div>

        <div className="mt-6 space-y-6">
          {(departmentGroupedReports || []).map((group) => (
            <div key={group.dept.id} className="border-b pb-4">
              <h4 className="font-bold text-xs uppercase mb-2 flex items-center gap-1.5 text-slate-900">
                <span>{group.dept.icon}</span> Department of {group.dept.name}
              </h4>
              {group.tests.map((test) => (
                <div key={test.id} className="mb-3">
                  <p 
                    className="font-bold text-[11px] text-slate-900 p-1 pl-2 border-l-4 uppercase"
                    style={{ backgroundColor: headerBg, borderLeftColor: accentColor }}
                  >
                    {test.name}
                  </p>
                  <table className="w-full text-left text-xs mt-1">
                    <thead>
                      <tr className="text-slate-600 border-b font-bold">
                        <th className="py-1">Test Parameter</th>
                        <th className="py-1">Observed Result</th>
                        <th className="py-1">Unit</th>
                        <th className="py-1">Reference Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(test.test_parameters || test.parameters || []).map(p => {
                        const val = activeOrder.results?.[p.id]?.value || "—";

                        return (
                          <tr key={p.id}>
                            <td className="py-1.5 font-semibold text-slate-900">{p.name}</td>
                            {/* PURE CLEAN OBSERVED VALUE (NO FLAGS) */}
                            <td className="py-1.5 font-mono font-bold text-slate-900">
                              {val}
                            </td>
                            <td className="py-1.5 text-slate-600 font-mono">{p.unit}</td>
                            <td className="py-1.5 text-slate-600 font-mono">{p.min_range ? `${p.min_range} - ${p.max_range}` : "Normal"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* DUAL SIGNATURES */}
        <div className="mt-12 pt-4 border-t flex justify-between items-end text-xs text-center">
          <div className="w-64">
            <div className="h-10 flex items-center justify-center mb-1">
              {isTechImage ? (
                <img src={techUser.signature_data} alt="Technologist Signature" className="h-9 max-w-full object-contain mix-blend-multiply" />
              ) : (
                <div className="font-serif italic font-bold text-base text-slate-900">{techUser.signature_data || techUser.full_name}</div>
              )}
            </div>
            <p className="font-bold text-slate-900 border-t border-slate-900 pt-1">{techUser.full_name}</p>
            <p className="text-[10px] text-slate-500">{techUser.designation}</p>
          </div>

          <div className="w-64">
            <div className="h-10 flex items-center justify-center mb-1">
              {isVerifierImage ? (
                <img src={verifierUser.signature_data} alt="Pathologist Signature" className="h-9 max-w-full object-contain mix-blend-multiply" />
              ) : (
                <div className="font-serif italic font-bold text-base text-slate-900">{verifierUser.signature_data || verifierUser.full_name}</div>
              )}
            </div>
            <p className="font-bold text-slate-900 border-t border-slate-900 pt-1">{verifierUser.full_name}</p>
            <p className="text-[10px] text-slate-500">{verifierUser.designation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
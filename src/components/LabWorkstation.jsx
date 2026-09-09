import React, { useState } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  ShieldCheck, 
  RotateCcw, 
  FlaskConical,
  User, 
  Calendar, 
  Stethoscope,
  Barcode
} from "lucide-react";

export default function LabWorkstation() {
  const [patient] = useState({
    id: "PT-90482",
    barcode: "BC-7892103",
    name: "Eleanor Vance",
    age: 38,
    gender: "Female",
    doctor: "Dr. Robert Chen, MD",
    testGroup: "Complete Blood Count (CBC) with Differential",
    collectionTime: "Today, 08:30 AM",
  });

  const [parameters, setParameters] = useState([
    { id: "1", name: "Hemoglobin (Hb)", value: "11.2", unit: "g/dL", minRange: 12.0, maxRange: 15.5, prevValue: "11.8" },
    { id: "2", name: "Total Leucocyte Count (TLC)", value: "13500", unit: "/cumm", minRange: 4000, maxRange: 11000, prevValue: "8500" },
    { id: "3", name: "Platelet Count", value: "240000", unit: "/cumm", minRange: 150000, maxRange: 450000, prevValue: "220000" },
    { id: "4", name: "Packed Cell Volume (PCV)", value: "35", unit: "%", minRange: 36, maxRange: 46, prevValue: "37" },
    { id: "5", name: "Neutrophils", value: "78", unit: "%", minRange: 40, maxRange: 70, prevValue: "65" },
    { id: "6", name: "Lymphocytes", value: "18", unit: "%", minRange: 20, maxRange: 40, prevValue: "28" },
  ]);

  const [doctorNotes, setDoctorNotes] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  const handleValueChange = (id, newValue) => {
    setParameters((prev) =>
      prev.map((item) => (item.id === id ? { ...item, value: newValue } : item))
    );
  };

  const getStatus = (valStr, min, max) => {
    const val = parseFloat(valStr);
    if (isNaN(val)) return { label: "PENDING", color: "bg-slate-100 text-slate-600 border-slate-200" };
    if (val < min) return { label: "LOW", color: "bg-amber-100 text-amber-800 border-amber-300" };
    if (val > max) return { label: "HIGH", color: "bg-rose-100 text-rose-800 border-rose-300" };
    return { label: "NORMAL", color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Diagnostics LIMS Workstation</h1>
            <p className="text-xs text-slate-500">Department of Hematology & Clinical Pathology</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> Print Preview
          </button>
          <button 
            onClick={() => setIsApproved(!isApproved)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow transition ${
              isApproved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {isApproved ? "Approved & Digitally Signed" : "Approve & Sign Report"}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Patient Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
              Patient Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-900">{patient.name}</span>
              </div>
              <div className="text-sm text-slate-600 flex justify-between">
                <span>Age / Sex:</span>
                <span className="font-medium text-slate-800">{patient.age} Y / {patient.gender}</span>
              </div>
              <div className="text-sm text-slate-600 flex justify-between">
                <span>UHID:</span>
                <span className="font-mono text-xs font-semibold text-blue-600">{patient.id}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            <h2 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
              Sample Details
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Barcode className="w-4 h-4 text-slate-400" /> Barcode:
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">{patient.barcode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Stethoscope className="w-4 h-4 text-slate-400" /> Ref. Doctor:
                </span>
                <span className="text-slate-800 font-medium text-right text-xs">{patient.doctor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" /> Drawn At:
                </span>
                <span className="text-slate-800 text-xs">{patient.collectionTime}</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider block mb-2">
              Pathologist Interpretation
            </label>
            <textarea
              rows={4}
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="e.g., Mild anemia observed..."
              className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
        </div>

        {/* Right Column: Test Parameters */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800">{patient.testGroup}</h3>
                <p className="text-xs text-slate-500">Change values to see auto-flagging in action</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Machine: Sysmex XN-550
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Test Parameter</th>
                    <th className="py-3 px-4 w-36">Result Value</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Normal Reference Range</th>
                    <th className="py-3 px-4">Previous Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {parameters.map((param) => {
                    const status = getStatus(param.value, param.minRange, param.maxRange);
                    const isAbnormal = status.label === "HIGH" || status.label === "LOW";

                    return (
                      <tr key={param.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {param.name}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => handleValueChange(param.id, e.target.value)}
                            className={`w-full px-2.5 py-1.5 text-sm font-semibold font-mono rounded-md border text-center transition focus:outline-none focus:ring-2 ${
                              isAbnormal 
                                ? "border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-400" 
                                : "border-slate-300 bg-white text-slate-900 focus:ring-blue-500"
                            }`}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border ${status.color}`}>
                            {isAbnormal ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                          {param.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs font-mono">
                          {param.minRange} - {param.maxRange}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                          {param.prevValue || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>Delta Check: <b className="text-slate-700">Passed</b></span>
              <span>TAT: <b className="text-emerald-600">42 mins (Normal)</b></span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
// src/components/doctor/PrescriptionWorkspace.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Save, Printer, Plus, X, AlertTriangle, Activity, 
  Stethoscope, Pill, FlaskConical, FileText, CheckCircle2, User,
  Loader2, Search, RefreshCw 
} from "lucide-react";
import { Btn, Input, Field } from "./shared";
import { searchMedicines } from "../../services/prescriptionApi";
import { savePrescription } from "../../services/prescriptionApi";

export default function PrescriptionWorkspace({ 
  currentUser, 
  matchedDoctor,
  labSettings,
  patient: initialPatient 
}) {
  // --- Patient State ---
  const [patient, setPatient] = useState(initialPatient || {
    id: null, full_name: "Walk-in Patient", age: "", gender: "", phone: "", uhid: ""
  });

  useEffect(() => {
    if (initialPatient) setPatient(initialPatient);
  }, [initialPatient]);

  const allergies = "Penicillin (Rash), Sulfa drugs"; // Hook to patient.allergies if available

  // --- Clinical State ---
  const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "", spo2: "", weight: "", height: "" });
  const [history, setHistory] = useState({ complaints: "", past: "", exam: "" });
  const [diagnoses, setDiagnoses] = useState([]);
  const [dxInput, setDxInput] = useState("");
  
  const [medicines, setMedicines] = useState([]);
  
  const [investigations, setInvestigations] = useState([]);
  const [invInput, setInvInput] = useState("");
  
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");

  // --- UI State ---
  const [isSaving, setIsSaving] = useState(false);
    // Helper to force short abbreviations
  const getShortType = (type) => {
    if (!type) return "TAB";
    const t = type.toUpperCase();
    if (t.includes("SUPP")) return "SUPP";
    if (t.includes("CAP")) return "CAP";
    if (t.includes("SYR")) return "SYR";
    if (t.includes("INJ")) return "INJ";
    if (t.includes("DROP")) return "DRP";
    if (t.includes("INH")) return "INH";
    if (t.includes("TAB")) return "TAB";
    return t.substring(0, 3); // Fallback to first 3 letters
  };
  const [isSaved, setIsSaved] = useState(false);
  const printRef = useRef();

  // Auto-calculate BMI
  const bmi = useMemo(() => {
    const w = parseFloat(vitals.weight);
    const h = parseFloat(vitals.height) / 100;
    if (w > 0 && h > 0) return (w / (h * h)).toFixed(1);
    return "--";
  }, [vitals.weight, vitals.height]);

  // --- Handlers ---
  const fetchLastVitals = () => {
    // In a real app, fetch from DB. Here is a mock for the "auto-complete" feature:
    setVitals({ bp: "120/80", pulse: "78", temp: "98.4", spo2: "99", weight: "72", height: "175" });
  };

  const handleAddDiagnosis = (e) => {
    if (e.key === 'Enter' && dxInput.trim()) {
      e.preventDefault();
      setDiagnoses([...diagnoses, { id: Date.now(), text: dxInput.trim(), primary: diagnoses.length === 0 }]);
      setDxInput("");
    }
  };

  const handleAddInvestigation = (e) => {
    if (e.key === 'Enter' && invInput.trim()) {
      e.preventDefault();
      if (!investigations.includes(invInput.trim())) {
        setInvestigations([...investigations, invInput.trim()]);
      }
      setInvInput("");
    }
  };

  const addMedicine = () => {
    setMedicines([...medicines, { 
      id: Date.now(), name: "", type: "Tablet", dose: "1", 
      route: "Oral", freq: "1+0+1", duration: "5", meal: "After meal", notes: "" 
    }]);
  };

  const updateMed = (id, field, val) => {
    setMedicines(meds => meds.map(m => m.id === id ? { ...m, [field]: val } : m));
  };

  const removeMed = (id) => setMedicines(meds => meds.filter(m => m.id !== id));

  const loadTemplate = (type) => {
    if (type === "Fever") {
      setDiagnoses([{ id: 1, text: "Viral Fever", primary: true }]);
      setMedicines([
        { id: 1, name: "Napa Extend 665mg", type: "Tablet", dose: "1", route: "Oral", freq: "1+0+1", duration: "3", meal: "After meal", notes: "" },
        { id: 2, name: "Seclo 20mg", type: "Capsule", dose: "1", route: "Oral", freq: "1+0+0", duration: "5", meal: "Before meal", notes: "" }
      ]);
      setInvestigations(["CBC"]);
      setAdvice("Rest for 3 days. Plenty of fluids.");
    }
  };

  // --- Save & Print Logic ---
  const handleSave = async (printAfter = false) => {
    if (!patient?.id) return alert("No registered patient selected.");
    setIsSaving(true);
    setIsSaved(false);

    try {
      const formattedItems = medicines.map(m => ({
        medicine_name: m.name,
        medicine_type: m.type,
        dose: m.dose,
        frequency: m.freq,
        duration: m.duration,
        meal_instruction: m.meal,
        instruction: m.notes || ""
      }));

      const dxString = diagnoses.map(d => d.text).join(", ");
      const invString = investigations.join(", ");

      await savePrescription({
        orderId: null, 
        patientId: patient.id,
        doctorId: matchedDoctor?.id,
        doctorName: matchedDoctor?.doctor_name || currentUser?.full_name,
        diagnosis: dxString + (invString ? ` | Inv: ${invString}` : ""),
        advice: advice,
        followUpDate: followUp || null,
        items: formattedItems,
        existingId: null, 
        chief_complaint: history.complaints,
        history_notes: history.past,
        examination_notes: history.exam,
        vitals: vitals
      });

      setIsSaved(true);
      
      if (printAfter) {
        setTimeout(() => window.print(), 500);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative print:bg-white print:h-auto print:block">
      
      {/* ======================================================== */}
      {/* PRINT-ONLY VIEW (Hidden on screen) */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* PRINT-ONLY VIEW (Hidden on screen) */}
      {/* ======================================================== */}
            {/* ======================================================== */}
      {/* PRINT-ONLY VIEW (Hidden on screen) */}
      {/* ======================================================== */}
      <div className="print-section hidden print:flex print:flex-col bg-white text-black w-[210mm] h-[275mm] mx-auto font-sans p-4" ref={printRef}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b-2 border-blue-500 pb-3 mb-2">
          {/* Left: Clinic Info */}
          <div className="w-1/3 text-right pr-4 text-xs leading-tight">
            <h2 className="text-lg font-bold text-blue-900 mb-1">
              {labSettings?.clinic_name || labSettings?.lab_name || "Clinic Name"}
            </h2>
            <p className="text-gray-700">{labSettings?.address || "Address Line"}</p>
            <ul className="mt-2 text-[10px] text-gray-600 list-disc list-inside">
              <li>{labSettings?.tagline || "Diagnostic Center"}</li>
            </ul>
            <p className="mt-1 font-medium">☎ {labSettings?.phone || "Phone Number"}</p>
          </div>

          {/* Center: Logo */}
          <div className="w-1/3 flex flex-col items-center justify-center">
            {labSettings?.logo_url ? (
              <img src={labSettings.logo_url} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 rounded-full border-2 border-blue-400 flex items-center justify-center">
                <Stethoscope className="w-8 h-8 text-blue-500" />
              </div>
            )}
          </div>

          {/* Right: Doctor Info */}
          <div className="w-1/3 text-left pl-4 text-xs leading-tight">
            <h2 className="text-lg font-bold text-blue-900 mb-1">
              {matchedDoctor?.doctor_name || currentUser?.full_name || "Doctor Name"}
            </h2>
            <p className="text-gray-700">{matchedDoctor?.qualifications || labSettings?.doctor_qualifications || "MBBS"}</p>
            <ul className="mt-2 text-[10px] text-gray-600 list-disc list-inside">
              <li>{matchedDoctor?.specialization || "Specialist"}</li>
            </ul>
          </div>
        </div>

        {/* PATIENT INFO GRID */}
        <div className="grid grid-cols-3 border border-gray-400 text-sm mb-0">
          <div className="border-r border-b border-gray-400 p-1.5"><b>Name:</b> {patient.full_name || patient.name || "N/A"}</div>
          <div className="border-r border-b border-gray-400 p-1.5"><b>Age/Sex:</b> {patient.age || "N/A"} / {patient.gender || "N/A"}</div>
          <div className="border-b border-gray-400 p-1.5"><b>Date:</b> {new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}</div>
          
          <div className="border-r border-gray-400 p-1.5"><b>Patient ID:</b> {patient.uhid || patient.id || "N/A"}</div>
          <div className="border-r border-gray-400 p-1.5"><b>Mobile:</b> {patient.phone || "N/A"}</div>
          <div className="p-1.5"><b>Address:</b> {patient.address || ""}</div>
        </div>

        {/* VITALS GRID */}
        <div className="border border-gray-400 border-t-0 p-1.5 flex justify-between text-xs mb-2">
          <span><b>BP:</b> {vitals.bp || "-"}</span>
          <span><b>Pulse:</b> {vitals.pulse || "-"}</span>
          <span><b>Temp:</b> {vitals.temp || "-"}</span>
          <span><b>SpO2:</b> {vitals.spo2 || "-"}</span>
          <span><b>Weight:</b> {vitals.weight || "-"} kg</span>
          <span><b>Height:</b> {vitals.height || "-"} cm</span>
          <span><b>BMI:</b> {bmi !== "--" ? bmi : "-"}</span>
        </div>

        {/* MAIN BODY SPLIT */}
        <div className="flex border border-gray-400 flex-1">
          
          {/* LEFT SIDEBAR */}
          <div className="w-[25%] border-r border-gray-400 p-2 space-y-3 text-sm">
            <div>
              <p className="font-bold underline mb-0.5">Dx:</p>
              <p>{diagnoses.map(d => d.text).join(", ") || "-"}</p>
            </div>

            <div>
              <p className="font-bold underline mb-0.5">C/C:</p>
              <p className="whitespace-pre-wrap">{history.complaints || "-"}</p>
            </div>

            {history.past && (
              <div>
                <p className="font-bold underline mb-0.5">Past Hx:</p>
                <p className="whitespace-pre-wrap">{history.past}</p>
              </div>
            )}

            {history.exam && (
              <div>
                <p className="font-bold underline mb-0.5">O/E:</p>
                <p className="whitespace-pre-wrap">{history.exam}</p>
              </div>
            )}

            <div>
              <p className="font-bold underline mb-0.5">Investigation:</p>
              <p>{investigations.join(", ") || "-"}</p>
            </div>
          </div>

          {/* RIGHT MAIN CONTENT */}
          <div className="w-[75%] p-4 flex flex-col">
            
            {/* Rx Symbol */}
            <h1 className="text-2xl font-serif italic font-bold mb-2">Rx.</h1>

            {/* Medicines Table Header */}
            <div className="flex border-b border-gray-300 pb-1 mb-2 text-sm font-bold text-gray-700">
              <div className="flex-1">Drug Name</div>
              <div className="w-24 text-center">Dose</div>
              <div className="w-20 text-center">Days</div>
              <div className="w-24 text-center">Meal</div>
            </div>

            {/* Medicines List */}
            <div className="space-y-3 mb-6 flex-1">
              {medicines.map((m, i) => {
                const mealBn = m.meal === "After meal" ? "খাবার পর" : m.meal === "Before meal" ? "খাবারের আগে" : "খাবারের সাথে";
                return (
                  <div key={m.id} className="flex text-sm items-start mb-2">
                    <div className="flex-1 font-bold flex gap-2">
                      <span>{i + 1}.</span>
                      <div>
                        <span>{getShortType(m.type)}. {m.name}</span>
                        {/* THIS IS THE FIX: Render the special instruction if it exists */}
                        {m.notes && (
                          <p className="text-[10px] font-normal text-gray-600 mt-0.5">
                            {m.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-24 text-center">({m.freq})</div>
                    <div className="w-20 text-center">{m.duration} দিন</div>
                    <div className="w-24 text-center">{mealBn}</div>
                  </div>
                );
              })}
            </div>

            {/* Advice */}
            <div className="mb-6">
              <h3 className="font-bold text-sm mb-1">Advice</h3>
              <ul className="list-disc list-inside text-sm">
                {advice ? advice.split('\n').map((line, idx) => (
                   <li key={idx}>{line}</li>
                )) : <li>-</li>}
              </ul>
            </div>

            {/* Follow Up */}
            <div className="mb-6">
              <h3 className="font-bold text-sm mb-1">Follow Up</h3>
              <p className="text-sm">{followUp ? `Follow up after ${followUp}` : "As advised."}</p>
            </div>

            {/* Signature */}
            <div className="mt-auto flex justify-end pt-12">
              <div className="text-center">
                <div className="w-48 border-b border-black mb-1"></div>
                <p className="text-xs font-bold">Signature</p>
                <p className="text-xs font-bold">{matchedDoctor?.doctor_name || currentUser?.full_name || "Doctor Name"}</p>
                <p className="text-[10px] text-gray-600">{matchedDoctor?.qualifications || "MBBS"}</p>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center text-xs mt-2 pt-1 text-blue-900 border-t border-blue-200">
          ডাক্তারের পরামর্শ ছাড়া কোনো ঔষধ সেবন করবেন না।
        </div>

      </div>

      {/* ======================================================== */}
      {/* SCREEN-ONLY VIEW */}
      {/* ======================================================== */}
      <div className="flex flex-col h-full print:hidden">
        
        {/* 1. TOP ACTION BAR & ALLERGY BANNER */}
        <div className="bg-white border-b border-slate-200 shrink-0">
          {allergies && (
            <div className="bg-red-50 text-red-700 px-6 py-2 text-sm font-medium flex items-center gap-2 border-b border-red-100">
              <AlertTriangle className="w-4 h-4" />
              <strong>Allergies:</strong> {allergies}
            </div>
          )}

          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                {(patient.full_name || patient.name || "W").charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                  {patient.full_name || patient.name || "Unknown Patient"}
                  <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{patient.uhid || patient.id}</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {patient.age ? `${patient.age}y` : ""} {patient.gender ? `, ${patient.gender}` : ""} {patient.phone ? ` • ${patient.phone}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                {isSaving ? <span className="animate-pulse">Saving...</span> : isSaved ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Saved</> : null}
              </span>
              <Btn variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
                <Save className="w-4 h-4" /> Save Draft
              </Btn>
              <Btn onClick={() => handleSave(true)} disabled={isSaving}>
                <Printer className="w-4 h-4" /> Finalize & Print
              </Btn>
            </div>
          </div>
        </div>

        {/* 2. MAIN WORKSPACE (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-2">
            
            {/* ================= LEFT COLUMN ================= */}
            <div className="col-span-7 space-y-2">
              
              {/* Vitals */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" /> Vital Signs
                  </h2>
                  <button onClick={fetchLastVitals} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
                    <RefreshCw className="w-3 h-3" /> Fetch Last
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <Field label="BP (mmHg)"><Input value={vitals.bp} onChange={e => setVitals({...vitals, bp: e.target.value})} placeholder="120/80" /></Field>
                  <Field label="Pulse (bpm)"><Input value={vitals.pulse} onChange={e => setVitals({...vitals, pulse: e.target.value})} placeholder="75" /></Field>
                  <Field label="Temp (°F)"><Input value={vitals.temp} onChange={e => setVitals({...vitals, temp: e.target.value})} placeholder="98.6" /></Field>
                  <Field label="SpO2 (%)"><Input value={vitals.spo2} onChange={e => setVitals({...vitals, spo2: e.target.value})} placeholder="98" /></Field>
                  <Field label="Weight (kg)"><Input value={vitals.weight} onChange={e => setVitals({...vitals, weight: e.target.value})} /></Field>
                  <Field label="Height (cm)"><Input value={vitals.height} onChange={e => setVitals({...vitals, height: e.target.value})} /></Field>
                  <div className="col-span-2">
                    <Field label="BMI (Auto)">
                      <div className="h-9 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 flex items-center">
                        {bmi} <span className="text-xs font-normal text-slate-400 ml-1">kg/m²</span>
                      </div>
                    </Field>
                  </div>
                </div>
              </div>

              {/* Clinical History */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" /> Clinical Notes
                </h2>
                <div className="space-y-4">
                  <Field label="Chief Complaints">
                    <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" rows={2} placeholder="e.g. Fever for 3 days, dry cough..." value={history.complaints} onChange={e => setHistory({...history, complaints: e.target.value})} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Past Medical History">
                      <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" rows={2} placeholder="e.g. HTN, DM..." value={history.past} onChange={e => setHistory({...history, past: e.target.value})} />
                    </Field>
                    <Field label="Examination Findings">
                      <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" rows={2} placeholder="e.g. Chest clear..." value={history.exam} onChange={e => setHistory({...history, exam: e.target.value})} />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-indigo-500" /> Diagnosis
                </h2>
                <div className="relative">
                  <Input 
                    placeholder="Type diagnosis and press Enter (e.g. Viral Fever, Type 2 DM)..." 
                    value={dxInput}
                    onChange={e => setDxInput(e.target.value)}
                    onKeyDown={handleAddDiagnosis}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {diagnoses.map(dx => (
                    <span key={dx.id} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-indigo-100 flex items-center gap-2">
                      {dx.primary && <span className="bg-indigo-200 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded">PRIMARY</span>}
                      {dx.text}
                      <X 
                        className="w-4 h-4 cursor-pointer hover:text-red-500" 
                        onClick={() => setDiagnoses(diagnoses.filter(d => d.id !== dx.id))}
                      />
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* ================= RIGHT COLUMN ================= */}
            <div className="col-span-5 space-y-6">
              
              <div className="flex gap-2">
                <Btn variant="outline" className="flex-1 text-xs" onClick={() => loadTemplate("Fever")}>+ Fever Template</Btn>
                <Btn variant="outline" className="flex-1 text-xs" onClick={() => loadTemplate("Gastritis")}>+ Gastritis Template</Btn>
              </div>

              {/* Medications (Rx) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-indigo-500" /> Medications (Rx)
                  </h2>
                  <Btn onClick={addMedicine} className="py-1 px-3 text-xs"><Plus className="w-3 h-3" /> Add</Btn>
                </div>
                
                <div className="p-4 space-y-3">
                  {medicines.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">No medicines added. Click "Add" or a template.</p>
                  )}
                  
                  {medicines.map((med) => (
                    <MedicineRow 
                      key={med.id} 
                      med={med} 
                      updateMed={updateMed} 
                      removeMed={removeMed} 
                    />
                  ))}
                </div>
              </div>

              {/* Investigations */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-indigo-500" /> Investigations
                </h2>
                <Input 
                  placeholder="Search tests and press Enter (CBC, X-Ray)..." 
                  value={invInput}
                  onChange={e => setInvInput(e.target.value)}
                  onKeyDown={handleAddInvestigation}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {investigations.map(inv => (
                    <span key={inv} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 flex items-center gap-1.5">
                      {inv} 
                      <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setInvestigations(investigations.filter(i => i !== inv))} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Advice & Follow-up */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> Advice & Follow-up
                </h2>
                <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" rows={3} placeholder="Rest, hydration, warning signs..." value={advice} onChange={e => setAdvice(e.target.value)} />
                <div className="mt-3">
                  <Field label="Follow-up Date">
                    <Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className="w-48" />
                  </Field>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// MEDICINE AUTOCOMPLETE ROW COMPONENT
// =========================================================================
function MedicineRow({ med, updateMed, removeMed }) {
  const [query, setQuery] = useState(med.name);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search DB
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    let alive = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchMedicines(query.trim(), 10);
        if (alive) {
          setResults(data || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Failed to search medicines:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [query]);

  const handleSelect = (item) => {
    const drugName = `${item.brand_name || item.name || ""} ${item.strength || ""}`.trim();
    setQuery(drugName);
    
    // Automatically abbreviate the type from the database
    const rawType = item.dosage_form || "Tablet";
    // Using the same logic as the helper function
    let shortType = "TAB";
    const t = rawType.toUpperCase();
    if (t.includes("SUPP")) shortType = "SUPP";
    else if (t.includes("CAP")) shortType = "CAP";
    else if (t.includes("SYR")) shortType = "SYR";
    else if (t.includes("INJ")) shortType = "INJ";
    else if (t.includes("DROP")) shortType = "DRP";
    else if (t.includes("INH")) shortType = "INH";
    
    updateMed(med.id, 'name', drugName);
    updateMed(med.id, 'type', shortType);
    
    setIsOpen(false);
  };

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 relative group">
      <button onClick={() => removeMed(med.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition z-10">
        <X className="w-4 h-4" />
      </button>
      
      {/* Row 1: Drug Name & Auto-captured Type */}
      <div className="flex gap-2 pr-6 items-center" ref={wrapperRef}>
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            
            {/* Read-only Type Badge inside the input field */}
            {med.name && med.type && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                {med.type.substring(0, 4).toUpperCase()}
              </span>
            )}

            <input
              type="text"
              placeholder="Search drug in database..."
              className="w-full rounded-lg border border-slate-200 pl-8 pr-16 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                updateMed(med.id, 'name', e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => { if (results.length > 0) setIsOpen(true); }}
            />
            {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
          </div>

          {/* Dropdown Results */}
          {isOpen && query.trim().length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {loading && results.length === 0 && <div className="p-3 text-xs text-slate-500 text-center">Searching database...</div>}
              {!loading && results.length === 0 && <div className="p-3 text-xs text-slate-500 text-center">No medicines found. Custom entry enabled.</div>}
              {results.map((r, i) => (
                <button key={r.id || i} type="button" onClick={() => handleSelect(r)} className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition flex justify-between items-center">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{r.brand_name} {r.strength ? `- ${r.strength}` : ""}</div>
                    <div className="text-[11px] text-slate-500">{r.generic_name || "Generic N/A"}</div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600">{r.dosage_form ? r.dosage_form.toUpperCase() : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Dose, Freq, Duration */}
      <div className="flex gap-2 items-center">
        <select className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700" value={med.dose} onChange={e => updateMed(med.id, 'dose', e.target.value)}>
          <option value="1">1</option>
          <option value="1/2">1/2</option>
          <option value="2">2</option>
        </select>

        <div className="flex bg-slate-200 rounded-lg p-0.5">
          {["1+0+0", "1+0+1", "1+1+1"].map(f => (
            <button key={f} type="button" onClick={() => updateMed(med.id, 'freq', f)} className={`px-2 py-1 text-xs font-medium rounded-md transition ${med.freq === f ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <input className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm" value={med.duration} onChange={e => updateMed(med.id, 'duration', e.target.value)} />
          <span className="text-xs text-slate-500">days</span>
        </div>
      </div>

      {/* Row 3: Meal & Notes */}
      <div className="flex gap-2">
        <select className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700" value={med.meal} onChange={e => updateMed(med.id, 'meal', e.target.value)}>
          <option>After meal</option>
          <option>Before meal</option>
          <option>With meal</option>
          <option>Empty stomach</option>
        </select>
        <input className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="Special instructions (e.g. After 30 mins)..." value={med.notes || ""} onChange={e => updateMed(med.id, 'notes', e.target.value)} />
      </div>
    </div>
  );
}
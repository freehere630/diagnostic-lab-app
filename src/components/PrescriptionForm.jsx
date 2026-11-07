import React, { useState, useEffect, useRef } from "react";
import { Pill, Plus, Trash2, X, Search, Save, Printer, Loader2 } from "lucide-react";
import { searchMedicines, getPrescriptionByOrder, savePrescription } from "../services/prescriptionApi";
import { printPrescription } from "../utils/prescriptionPrint";

const EMPTY_ITEM = {
  id: "",
  medicine_id: null,
  medicine_name: "",
  strength: "",
  dosage_form: "",
  generic_name: "",
  freq_morning: "", // Empty string so we can show the "+" icon
  freq_noon: "",
  freq_night: "",
  meal_relation: "After Meal",
  duration: "",
  instructions: "",
};

export default function PrescriptionForm({ order, doctorsList = [], currentUser, labSettings = {}, onClose, onSaved }) {
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "", weight: "" });
  const [items, setItems] = useState([{ ...EMPTY_ITEM, id: crypto.randomUUID() }]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);
  const suggestionWrapRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!order?.orderId) return;
      const rx = await getPrescriptionByOrder(order.orderId);
      if (rx) {
        setExistingId(rx.id);
        setDiagnosis(rx.diagnosis || "");
        setAdvice(rx.advice || "");
        setFollowUp(rx.follow_up_date || "");
        setChiefComplaint(rx.chief_complaint || "");
        if (rx.vitals) setVitals(rx.vitals);
        setItems(
          rx.items.length > 0
            ? rx.items.map((it) => ({
                id: it.id,
                medicine_id: it.medicine_id,
                medicine_name: it.medicine_name_snapshot,
                strength: it.strength_snapshot,
                dosage_form: it.dosage_form_snapshot,
                generic_name: it.generic_snapshot,
                freq_morning: it.freq_morning === "0" ? "" : (it.freq_morning || ""),
                freq_noon: it.freq_noon === "0" ? "" : (it.freq_noon || ""),
                freq_night: it.freq_night === "0" ? "" : (it.freq_night || ""),
                meal_relation: it.meal_relation || "After Meal",
                duration: it.duration || "",
                instructions: it.instructions || "",
              }))
            : [{ ...EMPTY_ITEM, id: crypto.randomUUID() }]
        );
      }
    })();
  }, [order?.orderId]);

  useEffect(() => {
    const onDown = (e) => {
      if (suggestionWrapRef.current && !suggestionWrapRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  // Cycle frequency: "" -> 1 -> 2 -> 3 -> ""
  const cycleFreq = (idx, field) => {
    setItems(prev => {
      const newItems = [...prev];
      const current = parseInt(newItems[idx][field], 10) || 0;
      const next = current >= 3 ? "" : String(current + 1);
      newItems[idx] = { ...newItems[idx], [field]: next };
      return newItems;
    });
  };

  const handleMedicineType = (idx, text) => {
    updateItem(idx, { medicine_name: text, medicine_id: null });
    setActiveIdx(idx);
    setShowDropdown(true); // Open dropdown when typing
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSugLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchMedicines(text);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSugLoading(false);
      }
    }, 260);
  };

  const pickSuggestion = (idx, med) => {
    updateItem(idx, {
      medicine_id: med.id,
      medicine_name: med.brand_name,
      strength: med.strength || "",
      dosage_form: med.dosage_form || "",
      generic_name: med.generic_name || "",
    });
    setSuggestions([]);
    setShowDropdown(false); // Instantly close dropdown so "No matches" doesn't show
  };

  const addLine = () => setItems((prev) => [...prev, { ...EMPTY_ITEM, id: crypto.randomUUID() }]);
  const removeLine = (idx) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!order?.patient?.id) return alert("No patient on this order.");
    const cleanItems = items.filter((it) => it.medicine_name.trim());
    if (cleanItems.length === 0) return alert("Add at least one medicine.");

    setSaving(true);
    try {
      const res = await savePrescription({
        orderId: order.orderId,
        patientId: order.patient.id,
        doctorId: doctorsList.find((d) => d.name?.toLowerCase() === (order.patient?.doctor || "").toLowerCase())?.id || null,
        doctorName: order.patient?.doctor || "Self",
        diagnosis,
        advice,
        followUpDate: followUp,
        items: cleanItems,
        existingId,
        chief_complaint: chiefComplaint,
        vitals: vitals,
      });
      setExistingId(res.id);
      if (onSaved) onSaved(res.id);
      alert("Prescription saved.");
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const cleanItems = items.filter((it) => it.medicine_name.trim());
    if (cleanItems.length === 0) return alert("Add at least one medicine first.");
    printPrescription({
      order,
      doctorName: order.patient?.doctor || "Self",
      diagnosis,
      advice,
      followUpDate: followUp,
      items: cleanItems,
      labSettings,
      currentUser,
      chiefComplaint,
      vitals,
    });
  };

  const FreqButton = ({ value, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50 transition flex items-center justify-center text-sm font-bold text-slate-800 shrink-0"
    >
      {(!value || value === "0") ? <Plus className="w-3.5 h-3.5 text-slate-400" /> : value}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[94vh] overflow-hidden text-xs flex flex-col">
        
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-sm text-slate-900">Write Prescription</span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {order.patient?.name} ({order.patient?.id})
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          
          {/* Clinical Notes & Vitals */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wide block mb-1">Chief Complaint</label>
                <input type="text" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="e.g. Fever, cough for 3 days" className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" />
              </div>
              <div className="col-span-2 grid grid-cols-4 gap-2">
                <div>
                  <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wide block mb-1">BP</label>
                  <input type="text" value={vitals.bp} onChange={(e) => setVitals({...vitals, bp: e.target.value})} placeholder="120/80" className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm text-center font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wide block mb-1">Pulse</label>
                  <input type="text" value={vitals.pulse} onChange={(e) => setVitals({...vitals, pulse: e.target.value})} placeholder="72" className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm text-center font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wide block mb-1">Temp (°F)</label>
                  <input type="text" value={vitals.temp} onChange={(e) => setVitals({...vitals, temp: e.target.value})} placeholder="98.6" className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm text-center font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wide block mb-1">Wt (kg)</label>
                  <input type="text" value={vitals.weight} onChange={(e) => setVitals({...vitals, weight: e.target.value})} placeholder="70" className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm text-center font-mono" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wide block mb-1">Diagnosis</label>
                <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Enter working diagnosis…" className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-semibold" />
              </div>
              <div>
                <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wide block mb-1">Advice</label>
                <input type="text" value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Diet, rest, follow-up instructions…" className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" />
              </div>
            </div>
          </div>

          {/* Medicine Lines */}
          <div className="border border-slate-200 rounded-xl overflow-visible bg-slate-50/50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white rounded-t-xl">
              <label className="font-bold text-slate-700 text-[10px] uppercase tracking-wide">Medications</label>
              <button type="button" onClick={addLine} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {items.map((it, idx) => (
                <div key={it.id} className="p-3 flex items-start gap-2 hover:bg-white transition relative">
                  
                  {/* 1. Medicine Search */}
                  <div className="flex-1 relative min-w-[200px]" ref={idx === activeIdx ? suggestionWrapRef : null}>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={it.medicine_name}
                        onChange={(e) => handleMedicineType(idx, e.target.value)}
                        onFocus={() => { setActiveIdx(idx); setShowDropdown(true); }}
                        placeholder="Search medicine…"
                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold bg-white text-xs"
                        spellCheck={false} autoComplete="off"
                      />
                    </div>
                    
                    {/* Dropdown */}
                    {idx === activeIdx && showDropdown && it.medicine_name.trim().length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {sugLoading && <div className="px-3 py-2 text-[11px] text-slate-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Searching...</div>}
                        {suggestions.map((s) => (
                          <button key={s.id} type="button" onClick={() => pickSuggestion(idx, s)} className="w-full text-left px-3 py-2 hover:bg-blue-50 transition group">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700">{s.brand_name}</span>
                              <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded shrink-0">{s.strength}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{s.generic_name}</div>
                          </button>
                        ))}
                        {!sugLoading && suggestions.length === 0 && (
                          <div className="px-3 py-3 text-[11px] text-slate-500 italic text-center">
                            No matches found. Check spelling or try generic name.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Frequency Clickers (M, N, N) */}
                  <div className="flex items-center gap-1 shrink-0 h-9">
                    <FreqButton value={it.freq_morning} onClick={() => cycleFreq(idx, "freq_morning")} />
                    <span className="text-slate-300 font-bold">-</span>
                    <FreqButton value={it.freq_noon} onClick={() => cycleFreq(idx, "freq_noon")} />
                    <span className="text-slate-300 font-bold">-</span>
                    <FreqButton value={it.freq_night} onClick={() => cycleFreq(idx, "freq_night")} />
                  </div>

                  {/* 3. Meal Dropdown */}
                  <div className="w-28 shrink-0 h-9">
                    <select
                      value={it.meal_relation}
                      onChange={(e) => updateItem(idx, { meal_relation: e.target.value })}
                      className="w-full h-full px-2 border border-slate-300 rounded-lg outline-none bg-white text-xs focus:border-blue-500 font-medium"
                    >
                      <option value="After Meal">After Meal</option>
                      <option value="Before Meal">Before Meal</option>
                      <option value="With Meal">With Meal</option>
                      <option value="Empty Stomach">Empty Stomach</option>
                    </select>
                  </div>

                  {/* 4. Duration */}
                  <div className="w-20 shrink-0 h-9">
                    <input
                      type="text"
                      value={it.duration}
                      onChange={(e) => updateItem(idx, { duration: e.target.value })}
                      placeholder="Duration"
                      className="w-full h-full px-2 border border-slate-300 rounded-lg outline-none bg-white text-xs text-center focus:border-blue-500 font-medium"
                    />
                  </div>

                  {/* 5. Instructions */}
                  <div className="w-32 shrink-0 h-9">
                    <input
                      type="text"
                      value={it.instructions}
                      onChange={(e) => updateItem(idx, { instructions: e.target.value })}
                      placeholder="Instructions"
                      className="w-full h-full px-2 border border-slate-300 rounded-lg outline-none bg-white text-xs focus:border-blue-500"
                    />
                  </div>

                  {/* 6. Delete */}
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={items.length <= 1}
                    className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-30 transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>
              ))}
            </div>
          </div>

          {/* Footer Row: Follow-up, Print, Save */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-600 text-[10px] uppercase tracking-wide">Follow-up:</label>
              <input
                type="date"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg outline-none font-mono focus:border-blue-500 text-xs h-9"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition text-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save Prescription"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
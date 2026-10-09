import React, { useState } from "react";
import { 
  Settings, Plus, Edit, Trash2, X, Sparkles, Search, 
  Layers, Bookmark, AlignLeft, Check, FileCode, FileText
} from "lucide-react";
import {
  MASTER_CBC_PARAMETERS,
  MASTER_URINE_PARAMETERS,
  MASTER_STOOL_PARAMETERS,
  MASTER_WIDAL_PARAMETERS,
  MASTER_LIPID_PARAMETERS,
  MASTER_LFT_PARAMETERS,
  MASTER_ELECTROLYTE_PARAMETERS,
  MASTER_SEMEN_PARAMETERS,
  DESCRIPTIVE_STANDARD_TEMPLATES
} from "../services/api";

export default function TestManager({
  departments = [],
  testCatalog = [],
  newTestForm,
  setNewTestForm,
  handleSaveNewTest,
  handleSaveTestEdits,
  handleDeleteTest,
  handleToggleReagent,
  editingTest,
  setEditingTest,
  handleOpenEditModal,
  handleSeedRadiology,
  MASTER_SAMPLE_TYPES = [],
  MASTER_TUBE_COLORS = [],
  isLoading
}) {
  const [searchCatalog, setSearchCatalog] = useState("");
  const [catalogDeptFilter, setCatalogDeptFilter] = useState("ALL");
  const [testFormatMode, setTestFormatMode] = useState("tabular"); // 'tabular' | 'descriptive'

  // Pre-configured clinical templates
  const CLINICAL_PRESETS = [
    {
      id: "cbc",
      name: "🩸 CBC with 5-Part Differential",
      format: "tabular",
      data: {
        name: "Complete Blood Count (CBC) with 5-Part Differential",
        code: "CBC",
        deptId: "DEP-HEM",
        price: "400",
        sampleType: "Whole Blood",
        tubeColor: "Purple / Lavender (EDTA)",
        isProfile: true,
        reportType: "tabular",
        parameters: MASTER_CBC_PARAMETERS.map((p, i) => ({
          id: String(i + 1),
          name: p.name,
          param_type: p.type === "numeric" ? "numeric" : "text",
          unit: p.unit || "",
          min: p.min !== null && p.min !== undefined ? String(p.min) : "",
          max: p.max !== null && p.max !== undefined ? String(p.max) : "",
          reference_text: p.defaultRef || ""
        }))
      }
    },
    {
      id: "urine",
      name: "🧫 Urine Routine & Microscopic (R/M/E)",
      format: "tabular",
      data: {
        name: "Urine Routine & Microscopic Examination (R/M/E)",
        code: "URINE-RME",
        deptId: "DEP-PAT",
        price: "250",
        sampleType: "Clean Catch Urine",
        tubeColor: "Sterile Urine Cup",
        isProfile: true,
        reportType: "tabular",
        parameters: MASTER_URINE_PARAMETERS.map((p, i) => ({
          id: String(i + 1),
          name: p.name,
          param_type: p.type === "numeric" ? "numeric" : (p.type === "qualitative" ? "qualitative" : "text"),
          unit: p.unit || "",
          min: p.min !== null && p.min !== undefined ? String(p.min) : "",
          max: p.max !== null && p.max !== undefined ? String(p.max) : "",
          reference_text: p.defaultRef || ""
        }))
      }
    },
    {
      id: "histo",
      name: "🔬 Histopathology / Biopsy Study",
      format: "descriptive",
      data: {
        name: "Histopathology (Biopsy Examination)",
        code: "HISTO-BX",
        deptId: "DEP-HISTO",
        price: "1800",
        sampleType: "Biopsy Specimen",
        tubeColor: "Formalin Container",
        isProfile: false,
        reportType: "descriptive",
        parameters: [{
          id: "1",
          name: "Histopathological Examination Findings",
          param_type: "text",
          unit: "Report",
          min: "",
          max: "",
          reference_text: DESCRIPTIVE_STANDARD_TEMPLATES.histopathology
        }]
      }
    },
    {
      id: "fnac",
      name: "🔬 FNAC / Cytology Smear Study",
      format: "descriptive",
      data: {
        name: "Fine Needle Aspiration Cytology (FNAC)",
        code: "FNAC",
        deptId: "DEP-HISTO",
        price: "1200",
        sampleType: "Aspiration Smear",
        tubeColor: "Fixed Glass Slides",
        isProfile: false,
        reportType: "descriptive",
        parameters: [{
          id: "1",
          name: "Cytological Examination Findings",
          param_type: "text",
          unit: "Report",
          min: "",
          max: "",
          reference_text: DESCRIPTIVE_STANDARD_TEMPLATES.fnacCytology
        }]
      }
    },
    {
      id: "xray",
      name: "🩻 X-Ray Chest (P/A View)",
      format: "descriptive",
      data: {
        name: "X-Ray Chest (P/A View)",
        code: "XRAY-CHEST",
        deptId: "DEP-RAD",
        price: "500",
        sampleType: "Radiological Study",
        tubeColor: "No Specimen (Imaging)",
        isProfile: false,
        reportType: "descriptive",
        parameters: [{
          id: "1",
          name: "Chest Radiography Findings",
          param_type: "text",
          unit: "Report",
          min: "",
          max: "",
          reference_text: DESCRIPTIVE_STANDARD_TEMPLATES.radiologyChest
        }]
      }
    },
    {
      id: "usg",
      name: "📡 USG of Whole Abdomen",
      format: "descriptive",
      data: {
        name: "USG of Whole Abdomen",
        code: "USG-ABD",
        deptId: "DEP-USG",
        price: "1500",
        sampleType: "Ultrasound Protocol",
        tubeColor: "No Specimen (Imaging)",
        isProfile: false,
        reportType: "descriptive",
        parameters: [{
          id: "1",
          name: "Abdominal Sonography Findings",
          param_type: "text",
          unit: "Report",
          min: "",
          max: "",
          reference_text: DESCRIPTIVE_STANDARD_TEMPLATES.usgAbdomen
        }]
      }
    },
    {
      id: "ecg",
      name: "💓 12-Lead Electrocardiogram (ECG)",
      format: "descriptive",
      data: {
        name: "12-Lead Electrocardiogram (ECG)",
        code: "ECG-12",
        deptId: "DEP-CARD",
        price: "350",
        sampleType: "12-Lead Tracing",
        tubeColor: "No Specimen (Imaging)",
        isProfile: false,
        reportType: "descriptive",
        parameters: [{
          id: "1",
          name: "Electrocardiogram Findings",
          param_type: "text",
          unit: "Tracing",
          min: "",
          max: "",
          reference_text: DESCRIPTIVE_STANDARD_TEMPLATES.ecg12Lead
        }]
      }
    }
  ];

  const handleApplyPreset = (presetId) => {
    const tpl = CLINICAL_PRESETS.find((p) => p.id === presetId);
    if (!tpl) return;
    setTestFormatMode(tpl.format);
    setNewTestForm({
      ...tpl.data
    });
  };

  const handleSwitchFormatMode = (mode) => {
    setTestFormatMode(mode);
    if (mode === "descriptive") {
      setNewTestForm((prev) => ({
        ...prev,
        isProfile: false,
        reportType: "descriptive",
        parameters: prev.parameters.length > 0
          ? [{
              ...prev.parameters[0],
              name: prev.parameters[0].name || `${prev.name || "Investigation"} Findings`,
              param_type: "text",
              unit: "Report",
              reference_text: prev.parameters[0].reference_text || DESCRIPTIVE_STANDARD_TEMPLATES.radiologyChest
            }]
          : [{
              id: "1",
              name: `${prev.name || "Investigation"} Findings`,
              param_type: "text",
              unit: "Report",
              min: "",
              max: "",
              reference_text: DESCRIPTIVE_STANDARD_TEMPLATES.radiologyChest
            }]
      }));
    } else {
      setNewTestForm((prev) => ({
        ...prev,
        reportType: "tabular",
        parameters: prev.parameters.map((p) => ({
          ...p,
          param_type: p.param_type === "text" ? "numeric" : p.param_type
        }))
      }));
    }
  };

  const addCreateParameterRow = () => {
    setNewTestForm({
      ...newTestForm,
      parameters: [
        ...newTestForm.parameters,
        { 
          id: String(Date.now()), 
          name: "", 
          param_type: testFormatMode === "descriptive" ? "text" : "numeric", 
          unit: testFormatMode === "descriptive" ? "Report" : "mg/dL", 
          min: "", 
          max: "",
          reference_text: testFormatMode === "descriptive" ? DESCRIPTIVE_STANDARD_TEMPLATES.radiologyChest : ""
        }
      ]
    });
  };

  const removeCreateParameterRow = (idx) => {
    if (newTestForm.parameters.length <= 1) return;
    setNewTestForm({
      ...newTestForm,
      parameters: newTestForm.parameters.filter((_, i) => i !== idx)
    });
  };

  const addEditParameterRow = () => {
    if (!editingTest) return;
    const isDescriptiveTest = editingTest.reportType === "descriptive" || editingTest.report_type === "descriptive";
    setEditingTest({
      ...editingTest,
      parameters: [
        ...(editingTest.parameters || []),
        { 
          id: `p-${Date.now()}`, 
          name: "", 
          param_type: isDescriptiveTest ? "text" : "numeric", 
          unit: isDescriptiveTest ? "Report" : "mg/dL", 
          min: "", 
          max: "",
          min_range: "",
          max_range: "",
          reference_text: isDescriptiveTest ? DESCRIPTIVE_STANDARD_TEMPLATES.radiologyChest : ""
        }
      ]
    });
  };

  const removeEditParameterRow = (idx) => {
    if (!editingTest || (editingTest.parameters || []).length <= 1) {
      alert("A test must have at least one parameter.");
      return;
    }
    setEditingTest({
      ...editingTest,
      parameters: editingTest.parameters.filter((_, i) => i !== idx)
    });
  };

  const filteredCatalog = testCatalog.filter((t) => {
    const q = searchCatalog.trim().toLowerCase();
    const matchSearch =
      !q ||
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.code && t.code.toLowerCase().includes(q)) ||
      (t.dept_id && t.dept_id.toLowerCase().includes(q));

    const matchDept =
      catalogDeptFilter === "ALL" ||
      (t.dept_id && t.dept_id.toUpperCase().includes(catalogDeptFilter.toUpperCase()));

    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900 font-sans">
      
      {/* 1. SEED RADIOLOGY QUICK-BANNER */}
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <span className="font-bold text-xs block">Standard Radiology & Modality Protocols</span>
            <span className="text-[10px] text-slate-400 block">1-Click seed structured templates for X-Ray, USG, CT Scan, and 12-Lead ECG.</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={handleSeedRadiology}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" /> {isLoading ? "Importing..." : "Seed Modality Tests"}
        </button>
      </div>

      {/* 2. TEST & PROFILE CONFIGURATION PANEL */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-xs uppercase tracking-wide text-slate-800">
              Investigation Architecture & Catalogue Builder
            </span>
          </div>

          {/* Format Mode Switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => handleSwitchFormatMode("tabular")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  testFormatMode === "tabular" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Tabular / Numeric
              </button>
              <button
                type="button"
                onClick={() => handleSwitchFormatMode("descriptive")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  testFormatMode === "descriptive" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" /> Descriptive Narrative
              </button>
            </div>

            <select
              value=""
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="px-2 py-1 border border-blue-200 bg-blue-50/50 text-blue-900 font-bold rounded-lg text-xs outline-none cursor-pointer sm:w-60"
            >
              <option value="">-- Load Preset Template --</option>
              {CLINICAL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Master Details Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="col-span-2 sm:col-span-1">
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Investigation Name *</label>
            <input
              type="text"
              placeholder="e.g. Histopathology (Punch Biopsy)"
              value={newTestForm.name}
              onChange={(e) => setNewTestForm({ ...newTestForm, name: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Short Code *</label>
            <input
              type="text"
              placeholder="e.g. HISTO-BX"
              value={newTestForm.code}
              onChange={(e) => setNewTestForm({ ...newTestForm, code: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Department</label>
            <select
              value={newTestForm.deptId}
              onChange={(e) => setNewTestForm({ ...newTestForm, deptId: e.target.value })}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-medium"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.icon || "🔬"} {d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Price (BDT) *</label>
            <input
              type="number"
              placeholder="1200"
              value={newTestForm.price}
              onChange={(e) => setNewTestForm({ ...newTestForm, price: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Specimen</label>
            <select
              value={newTestForm.sampleType}
              onChange={(e) => setNewTestForm({ ...newTestForm, sampleType: e.target.value })}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-medium"
            >
              {MASTER_SAMPLE_TYPES.map((type, idx) => (
                <option key={idx} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Vial / Container</label>
            <select
              value={newTestForm.tubeColor}
              onChange={(e) => setNewTestForm({ ...newTestForm, tubeColor: e.target.value })}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-medium"
            >
              {MASTER_TUBE_COLORS.map((tube, idx) => (
                <option key={idx} value={tube}>{tube}</option>
              ))}
            </select>
          </div>
        </div>

        {testFormatMode === "descriptive" ? (
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg text-xs text-blue-900 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlignLeft className="w-4 h-4 text-blue-600 shrink-0" />
              <span><b>Descriptive Mode Active:</b> This test will render in the formal narrative format (Clinical Indication, Observations, Impression).</span>
            </span>
            <span className="px-2 py-0.5 bg-blue-600 text-white font-mono font-bold text-[10px] rounded uppercase">Standard Descriptive</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-1">
            <input
              type="checkbox"
              id="createIsProfileCheck"
              checked={Boolean(newTestForm.isProfile)}
              onChange={(e) => setNewTestForm({ ...newTestForm, isProfile: e.target.checked })}
              className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
            />
            <label htmlFor="createIsProfileCheck" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
              Multi-Parameter Profile / Panel (Groups parameters under single report table header)
            </label>
          </div>
        )}

        {/* Parameters & Templates Builder */}
        <div className="border-t border-slate-100 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500">
              {testFormatMode === "descriptive" ? "Descriptive Study Parameter & Template" : `Parameters & Reference Limits (${newTestForm.parameters.length})`}
            </span>
            {testFormatMode !== "descriptive" && (
              <button
                type="button"
                onClick={addCreateParameterRow}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" /> Add Parameter
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {newTestForm.parameters.map((param, index) => {
              const isDescriptiveParam = param.param_type === "text" || testFormatMode === "descriptive";
              const isMultiRange = param.param_type === "multirange";
              const isNumeric = param.param_type === "numeric";

              return (
                <div key={param.id || index} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs space-y-1.5">
                  <div className="grid grid-cols-12 gap-1.5 items-start">
                    <div className="col-span-4">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Parameter Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Histopathological Findings"
                        value={param.name}
                        onChange={(e) => {
                          const updated = [...newTestForm.parameters];
                          updated[index].name = e.target.value;
                          setNewTestForm({ ...newTestForm, parameters: updated });
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-medium outline-none text-xs"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Parameter Type</label>
                      <select
                        value={param.param_type}
                        onChange={(e) => {
                          const updated = [...newTestForm.parameters];
                          const newT = e.target.value;
                          updated[index].param_type = newT;
                          if (newT === "text") updated[index].unit = "Report";
                          if (newT === "qualitative") updated[index].unit = "";
                          setNewTestForm({ ...newTestForm, parameters: updated });
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-semibold text-blue-700 outline-none text-xs"
                      >
                        <option value="numeric">Simple Numeric (Min - Max)</option>
                        <option value="multirange">Multi-Range (Line Breaks Allowed)</option>
                        <option value="qualitative">Qualitative (Negative / Nil)</option>
                        <option value="text">Descriptive / Narrative Text</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Unit</label>
                      <input
                        type="text"
                        placeholder="Unit"
                        value={param.unit}
                        onChange={(e) => {
                          const updated = [...newTestForm.parameters];
                          updated[index].unit = e.target.value;
                          setNewTestForm({ ...newTestForm, parameters: updated });
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-mono outline-none text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        {isMultiRange ? "Reference Limits (Press Enter for Line Break)" : "Range / Limits"}
                      </label>
                      {isNumeric ? (
                        <div className="flex gap-1">
                          <input
                            type="number"
                            placeholder="Min"
                            value={param.min || ""}
                            onChange={(e) => {
                              const updated = [...newTestForm.parameters];
                              updated[index].min = e.target.value;
                              setNewTestForm({ ...newTestForm, parameters: updated });
                            }}
                            className="w-1/2 px-1 py-1 border border-slate-200 rounded bg-white font-mono text-center outline-none text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={param.max || ""}
                            onChange={(e) => {
                              const updated = [...newTestForm.parameters];
                              updated[index].max = e.target.value;
                              setNewTestForm({ ...newTestForm, parameters: updated });
                            }}
                            className="w-1/2 px-1 py-1 border border-slate-200 rounded bg-white font-mono text-center outline-none text-xs"
                          />
                        </div>
                      ) : isMultiRange ? (
                        /* MULTI-LINE TEXTAREA FOR MULTI-RANGE WITH LINE BREAKS */
                        <textarea
                          rows={2}
                          placeholder={`Men: 13.0 - 17.5\nWomen: 11.5 - 15.5`}
                          value={param.reference_text || ""}
                          onKeyDown={(e) => { e.stopPropagation(); }}
                          onChange={(e) => {
                            const updated = [...newTestForm.parameters];
                            updated[index].reference_text = e.target.value;
                            setNewTestForm({ ...newTestForm, parameters: updated });
                          }}
                          className="w-full px-1.5 py-1 border border-blue-300 rounded bg-white font-mono text-[10px] outline-none resize-y leading-tight focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="text-[10px] text-slate-500 font-semibold px-2 py-1 bg-white border border-slate-200 rounded truncate">
                          {isDescriptiveParam ? "Narrative Template" : "Negative / Nil"}
                        </div>
                      )}
                    </div>

                    <div className="col-span-1 flex justify-center pt-3">
                      <button
                        type="button"
                        onClick={() => removeCreateParameterRow(index)}
                        disabled={newTestForm.parameters.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded transition"
                        title="Remove Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Descriptive Template editor */}
                  {isDescriptiveParam && (
                    <div className="mt-1 pt-1.5 border-t border-slate-200/60 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-bold text-[10px] text-blue-900 uppercase flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-blue-600" /> Catalog Default Template:
                        </span>

                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newTestForm.parameters];
                              updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.histopathology;
                              setNewTestForm({ ...newTestForm, parameters: updated });
                            }}
                            className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                          >
                            + Biopsy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newTestForm.parameters];
                              updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.fnacCytology;
                              setNewTestForm({ ...newTestForm, parameters: updated });
                            }}
                            className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                          >
                            + FNAC
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newTestForm.parameters];
                              updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.radiologyChest;
                              setNewTestForm({ ...newTestForm, parameters: updated });
                            }}
                            className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                          >
                            + X-Ray
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newTestForm.parameters];
                              updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.usgAbdomen;
                              setNewTestForm({ ...newTestForm, parameters: updated });
                            }}
                            className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                          >
                            + USG
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newTestForm.parameters];
                              updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.ecg12Lead;
                              setNewTestForm({ ...newTestForm, parameters: updated });
                            }}
                            className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                          >
                            + ECG
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={5}
                        placeholder="Type or paste your clinical template here (e.g. CLINICAL INDICATION, FINDINGS, IMPRESSION)..."
                        value={param.reference_text || ""}
                        onKeyDown={(e) => { e.stopPropagation(); }}
                        onChange={(e) => {
                          const updated = [...newTestForm.parameters];
                          updated[index].reference_text = e.target.value;
                          setNewTestForm({ ...newTestForm, parameters: updated });
                        }}
                        className="w-full p-2 text-xs font-mono border border-slate-200 rounded-md bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSaveNewTest}
              disabled={isLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> {isLoading ? "Saving..." : "Add to Catalog"}
            </button>
          </div>
        </div>

      </div>

      {/* 3. DIAGNOSTIC CATALOG DIRECTORY */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
              Diagnostic Catalog Directory ({testCatalog.length} Investigations)
            </h3>
            <p className="text-[10px] text-slate-400">Toggle reagent stock status or edit prices and narrative templates</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by test, code, dept..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50 transition"
              />
            </div>
          </div>
        </div>

        {/* Department Filter Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setCatalogDeptFilter("ALL")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 ${
              catalogDeptFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({testCatalog.length})
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setCatalogDeptFilter(d.id.replace("DEP-", ""))}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition shrink-0 ${
                catalogDeptFilter === d.id.replace("DEP-", "") ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {d.icon} {d.name.split(" ")[0]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredCatalog.map((t) => {
            const isDescriptive = t.report_type === "descriptive" || 
              (t.test_parameters || t.parameters || []).some(p => p.param_type === "text");

            return (
              <div 
                key={t.id} 
                className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-bold text-xs text-slate-900 leading-snug truncate">{t.name}</span>
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded shrink-0">
                      {t.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 my-1">
                    <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[9px] font-semibold">
                      {t.dept_id?.replace("DEP-", "") || "GEN"}
                    </span>
                    {isDescriptive ? (
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">
                        NARRATIVE STUDY
                      </span>
                    ) : t.is_profile ? (
                      <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">
                        PANEL
                      </span>
                    ) : null}
                  </div>

                  <p className="text-[11px] text-slate-500 truncate">{t.sample_type || "Blood"} • {t.tube_color || "Standard"}</p>
                  <p className="font-mono font-bold text-slate-800 text-xs mt-1">৳{t.price}</p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold">Reagent:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleReagent && handleToggleReagent(t.id, t.is_available === false)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                      t.is_available === false
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${t.is_available === false ? "bg-rose-600" : "bg-emerald-600"}`}></span>
                    {t.is_available === false ? "Out of Stock" : "In Stock"}
                  </button>
                </div>

                <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-200/80">
                  <button
                    onClick={() => handleOpenEditModal(t)}
                    className="flex-1 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTest(t.id, t.name)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Delete Investigation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. EDIT TEST MODAL (WITH MULTI-LINE TEXTAREA SUPPORT FOR MULTI-RANGE) */}
      {editingTest && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-3xl w-full shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto text-xs space-y-3">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-2">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-xs text-slate-900">
                  Edit Investigation & Parameters: {editingTest.name} ({editingTest.code})
                </span>
              </div>
              <button onClick={() => setEditingTest(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Name *</label>
                <input
                  type="text"
                  value={editingTest.name || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none font-semibold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Code *</label>
                <input
                  type="text"
                  value={editingTest.code || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, code: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Price (৳) *</label>
                <input
                  type="number"
                  value={editingTest.price !== undefined ? editingTest.price : ""}
                  onChange={(e) => setEditingTest({ ...editingTest, price: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Department</label>
                <select
                  value={editingTest.deptId || editingTest.dept_id || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, deptId: e.target.value, dept_id: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 text-xs font-medium"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Specimen and Format Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Specimen</label>
                <select
                  value={editingTest.sampleType || editingTest.sample_type || "Serum"}
                  onChange={(e) => setEditingTest({ ...editingTest, sampleType: e.target.value, sample_type: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded bg-white"
                >
                  {MASTER_SAMPLE_TYPES.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Container</label>
                <select
                  value={editingTest.tubeColor || editingTest.tube_color || "Red / Yellow (SST / Plain Clot)"}
                  onChange={(e) => setEditingTest({ ...editingTest, tubeColor: e.target.value, tube_color: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded bg-white"
                >
                  {MASTER_TUBE_COLORS.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Report Architecture</label>
                <select
                  value={editingTest.reportType || editingTest.report_type || "tabular"}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setEditingTest({
                      ...editingTest,
                      reportType: newType,
                      report_type: newType,
                      isProfile: newType === "descriptive" ? false : editingTest.isProfile
                    });
                  }}
                  className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-bold text-blue-700"
                >
                  <option value="tabular">Tabular / Quantitative Panel</option>
                  <option value="descriptive">Descriptive Narrative Study</option>
                </select>
              </div>
            </div>

            {/* Edit Parameters Section */}
            <div className="border-t border-slate-100 pt-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[11px] uppercase text-slate-600">
                  Investigation Parameters ({editingTest.parameters?.length})
                </span>
                <button
                  type="button"
                  onClick={addEditParameterRow}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" /> Add Parameter Row
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(editingTest.parameters || []).map((param, index) => {
                  const isDescriptiveParam = param.param_type === "text";
                  const isNumericParam = param.param_type === "numeric";
                  const isMultiRangeParam = param.param_type === "multirange";
                  const isQualParam = param.param_type === "qualitative";

                  return (
                    <div key={param.id || index} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="grid grid-cols-12 gap-1.5 items-start">
                        <div className="col-span-4">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Parameter Name</label>
                          <input
                            type="text"
                            value={param.name || ""}
                            onChange={(e) => {
                              const updated = [...editingTest.parameters];
                              updated[index].name = e.target.value;
                              setEditingTest({ ...editingTest, parameters: updated });
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs font-semibold"
                            placeholder="Parameter Name"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Parameter Type</label>
                          <select
                            value={param.param_type || "numeric"}
                            onChange={(e) => {
                              const updated = [...editingTest.parameters];
                              const newPType = e.target.value;
                              updated[index].param_type = newPType;
                              if (newPType === "text") updated[index].unit = "Report";
                              if (newPType === "qualitative") updated[index].unit = "";
                              setEditingTest({ ...editingTest, parameters: updated });
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-[11px] font-bold text-blue-700"
                          >
                            <option value="numeric">Simple Numeric (Min-Max)</option>
                            <option value="multirange">Multi-Range (Line Breaks Allowed)</option>
                            <option value="qualitative">Qualitative (Negative/Nil)</option>
                            <option value="text">Descriptive / Narrative Text</option>
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Unit</label>
                          <input
                            type="text"
                            value={param.unit || ""}
                            onChange={(e) => {
                              const updated = [...editingTest.parameters];
                              updated[index].unit = e.target.value;
                              setEditingTest({ ...editingTest, parameters: updated });
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs font-mono"
                            placeholder="Unit"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                            {isMultiRangeParam ? "Limits (Press Enter to Break Line)" : "Reference Limits"}
                          </label>
                          {isNumericParam ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="Min"
                                value={param.min !== undefined ? param.min : (param.min_range ?? "")}
                                onChange={(e) => {
                                  const updated = [...editingTest.parameters];
                                  updated[index].min = e.target.value;
                                  updated[index].min_range = e.target.value;
                                  setEditingTest({ ...editingTest, parameters: updated });
                                }}
                                className="w-1/2 px-1 py-1 border border-slate-200 rounded text-xs text-center font-mono bg-white font-bold"
                              />
                              <input
                                type="text"
                                placeholder="Max"
                                value={param.max !== undefined ? param.max : (param.max_range ?? "")}
                                onChange={(e) => {
                                  const updated = [...editingTest.parameters];
                                  updated[index].max = e.target.value;
                                  updated[index].max_range = e.target.value;
                                  setEditingTest({ ...editingTest, parameters: updated });
                                }}
                                className="w-1/2 px-1 py-1 border border-slate-200 rounded text-xs text-center font-mono bg-white font-bold"
                              />
                            </div>
                          ) : isMultiRangeParam ? (
                            /* MULTI-LINE TEXTAREA FOR MULTI-RANGE IN EDIT MODAL */
                            <textarea
                              rows={2}
                              value={param.reference_text || ""}
                              onKeyDown={(e) => { e.stopPropagation(); }}
                              onChange={(e) => {
                                const updated = [...editingTest.parameters];
                                updated[index].reference_text = e.target.value;
                                setEditingTest({ ...editingTest, parameters: updated });
                              }}
                              className="w-full px-1.5 py-1 border border-blue-300 rounded text-[10px] font-mono bg-white resize-y leading-tight focus:ring-1 focus:ring-blue-500"
                              placeholder={`Men: 13.0 - 17.5\nWomen: 11.5 - 15.5`}
                            />
                          ) : isQualParam ? (
                            <input
                              type="text"
                              value={param.reference_text || "Negative / Nil"}
                              onChange={(e) => {
                                const updated = [...editingTest.parameters];
                                updated[index].reference_text = e.target.value;
                                setEditingTest({ ...editingTest, parameters: updated });
                              }}
                              className="w-full px-1.5 py-1 border border-slate-200 rounded text-[11px] font-mono bg-white"
                              placeholder="Negative / Nil"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-500 font-bold block truncate py-1">
                              Narrative Template
                            </span>
                          )}
                        </div>

                        <div className="col-span-1 flex justify-center pt-3">
                          <button
                            type="button"
                            onClick={() => removeEditParameterRow(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Remove Parameter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Descriptive Template editor inside Edit Modal */}
                      {isDescriptiveParam && (
                        <div className="pt-1.5 border-t border-slate-200 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <label className="text-[10px] font-bold text-blue-900 uppercase flex items-center gap-1">
                              <FileCode className="w-3 h-3 text-blue-600" /> Saved Study Narrative Template:
                            </label>

                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editingTest.parameters];
                                  updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.histopathology;
                                  setEditingTest({ ...editingTest, parameters: updated });
                                }}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                              >
                                + Biopsy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editingTest.parameters];
                                  updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.fnacCytology;
                                  setEditingTest({ ...editingTest, parameters: updated });
                                }}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                              >
                                + FNAC
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editingTest.parameters];
                                  updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.radiologyChest;
                                  setEditingTest({ ...editingTest, parameters: updated });
                                }}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                              >
                                + X-Ray
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editingTest.parameters];
                                  updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.usgAbdomen;
                                  setEditingTest({ ...editingTest, parameters: updated });
                                }}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                              >
                                + USG
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editingTest.parameters];
                                  updated[index].reference_text = DESCRIPTIVE_STANDARD_TEMPLATES.ecg12Lead;
                                  setEditingTest({ ...editingTest, parameters: updated });
                                }}
                                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-[9px] font-bold"
                              >
                                + ECG
                              </button>
                            </div>
                          </div>

                          <textarea
                            rows={5}
                            value={param.reference_text || ""}
                            onKeyDown={(e) => { e.stopPropagation(); }}
                            onChange={(e) => {
                              const updated = [...editingTest.parameters];
                              updated[index].reference_text = e.target.value;
                              setEditingTest({ ...editingTest, parameters: updated });
                            }}
                            placeholder="CLINICAL INDICATION: ...&#10;FINDINGS: ...&#10;IMPRESSION: ..."
                            className="w-full p-2 text-xs font-mono border border-slate-200 rounded-md bg-white outline-none focus:border-blue-500 leading-relaxed"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-1.5 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingTest(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTestEdits}
                disabled={isLoading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
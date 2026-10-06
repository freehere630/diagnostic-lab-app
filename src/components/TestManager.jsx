import React, { useState } from "react";
import { Settings, Plus, Edit, Trash2, X, Sparkles, Search, Check, AlertCircle } from "lucide-react";

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

  const addCreateParameterRow = () => {
    setNewTestForm({
      ...newTestForm,
      parameters: [
        ...newTestForm.parameters,
        { 
          id: String(Date.now()), 
          name: "", 
          param_type: "numeric", 
          unit: "mg/dL", 
          min: "", 
          max: "",
          reference_text: ""
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
    setEditingTest({
      ...editingTest,
      parameters: [
        ...(editingTest.parameters || []),
        { 
          id: `p-${Date.now()}`, 
          name: "", 
          param_type: "numeric", 
          unit: "mg/dL", 
          min: "", 
          max: "",
          reference_text: ""
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
    return (
      !q ||
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.code && t.code.toLowerCase().includes(q)) ||
      (t.dept_id && t.dept_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* 1. SEED RADIOLOGY QUICK-BANNER (COMPACT) */}
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <span className="font-bold text-xs block">Need Standard Radiology & Imaging Templates?</span>
            <span className="text-[10px] text-slate-400 block">1-Click import templates for X-Ray, USG, CT Scan, MRI, and ECG into catalog.</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={handleSeedRadiology}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" /> {isLoading ? "Importing..." : "Import Radiology Tests"}
        </button>
      </div>

      {/* 2. CREATE NEW TEST OR PROFILE PANEL (SPACE SAVING) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-bold text-xs uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-blue-600" /> New Test / Panel Configuration
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id="createIsProfileCheck"
              checked={Boolean(newTestForm.isProfile)}
              onChange={(e) => setNewTestForm({ ...newTestForm, isProfile: e.target.checked })}
              className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
            />
            <label htmlFor="createIsProfileCheck" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
              Multi-Parameter Profile / Panel (e.g. LFT, Lipid, KFT)
            </label>
          </div>
        </div>

        {/* Master Details Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Test Name *</label>
            <input
              type="text"
              placeholder="e.g. Serum Uric Acid"
              value={newTestForm.name}
              onChange={(e) => setNewTestForm({ ...newTestForm, name: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Short Code *</label>
            <input
              type="text"
              placeholder="e.g. UA or TSH"
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
              placeholder="400"
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
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Vial Tube</label>
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

        {/* Parameters Builder Rows */}
        <div className="border-t border-slate-100 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Investigation Parameters ({newTestForm.parameters.length})
            </span>
            <button
              type="button"
              onClick={addCreateParameterRow}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3" /> Add Parameter Row
            </button>
          </div>

          <div className="space-y-1.5">
            {newTestForm.parameters.map((param, index) => {
              const isMultiRange = param.param_type === "multirange";
              const isNumeric = param.param_type === "numeric";
              const isQual = param.param_type === "qualitative";

              return (
                <div key={param.id || index} className="grid grid-cols-12 gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-xs items-center">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Parameter Name"
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
                    <select
                      value={param.param_type}
                      onChange={(e) => {
                        const updated = [...newTestForm.parameters];
                        updated[index].param_type = e.target.value;
                        if (e.target.value === "text") updated[index].unit = "Report";
                        setNewTestForm({ ...newTestForm, parameters: updated });
                      }}
                      className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-semibold text-blue-700 outline-none text-xs"
                    >
                      <option value="numeric">Simple Numeric (Min - Max)</option>
                      <option value="multirange">Multi-Range (Gender / Age)</option>
                      <option value="qualitative">Qualitative (+ / -)</option>
                      <option value="text">Descriptive Text</option>
                    </select>
                  </div>

                  <div className="col-span-2">
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
                    {isMultiRange ? (
                      <input
                        type="text"
                        placeholder="M: 3.5-7.2, F: 2.6-6.0"
                        value={param.reference_text || ""}
                        onChange={(e) => {
                          const updated = [...newTestForm.parameters];
                          updated[index].reference_text = e.target.value;
                          setNewTestForm({ ...newTestForm, parameters: updated });
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-mono text-[11px] outline-none"
                      />
                    ) : isNumeric ? (
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
                    ) : isQual ? (
                      <div className="text-[10px] text-slate-500 font-semibold px-2 py-1 bg-white border border-slate-200 rounded truncate">
                        Negative (Ref)
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 font-semibold px-2 py-1 bg-white border border-slate-200 rounded truncate">
                        Observation
                      </div>
                    )}
                  </div>

                  <div className="col-span-1 flex justify-center">
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

      {/* 3. LIVE DIAGNOSTIC CATALOG DIRECTORY */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
              Diagnostic Catalog Directory ({testCatalog.length} Investigations)
            </h3>
            <p className="text-[10px] text-slate-400">Toggle reagent stock status or edit prices and reference limits</p>
          </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredCatalog.map((t) => (
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
                  {t.is_profile && (
                    <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">
                      PANEL
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 truncate">{t.sample_type || "Blood"} • {t.tube_color || "Standard"}</p>
                <p className="font-mono font-bold text-slate-800 text-xs mt-1">৳{t.price}</p>
              </div>

              {/* 1-Click Reagent Stock Toggle Button */}
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
          ))}
        </div>
      </div>

      {/* 4. COMPACT EDIT TEST MODAL */}
      {editingTest && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-2xl w-full shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto text-xs">
            
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <div>
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit Test Profile ({editingTest.code})
                </span>
              </div>
              <button onClick={() => setEditingTest(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Name *</label>
                <input
                  type="text"
                  value={editingTest.name || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded outline-none font-semibold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Code *</label>
                <input
                  type="text"
                  value={editingTest.code || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, code: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded outline-none font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Price (৳) *</label>
                <input
                  type="number"
                  value={editingTest.price || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, price: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded outline-none font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Department</label>
                <select
                  value={editingTest.deptId || editingTest.dept_id || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, deptId: e.target.value, dept_id: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded outline-none bg-slate-50 text-xs"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Edit Parameters Section */}
            <div className="border-t border-slate-100 pt-2 space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[11px] uppercase text-slate-600">Parameters ({editingTest.parameters?.length})</span>
                <button
                  type="button"
                  onClick={addEditParameterRow}
                  className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold"
                >
                  + Add Row
                </button>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {(editingTest.parameters || []).map((param, index) => (
                  <div key={param.id || index} className="grid grid-cols-12 gap-1 items-center bg-slate-50 p-1 rounded border border-slate-200">
                    <input
                      type="text"
                      value={param.name || ""}
                      onChange={(e) => {
                        const updated = [...editingTest.parameters];
                        updated[index].name = e.target.value;
                        setEditingTest({ ...editingTest, parameters: updated });
                      }}
                      className="col-span-5 px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white"
                      placeholder="Parameter"
                    />

                    <input
                      type="text"
                      value={param.unit || ""}
                      onChange={(e) => {
                        const updated = [...editingTest.parameters];
                        updated[index].unit = e.target.value;
                        setEditingTest({ ...editingTest, parameters: updated });
                      }}
                      className="col-span-2 px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white font-mono"
                      placeholder="Unit"
                    />

                    <input
                      type="text"
                      value={param.reference_text || (param.min !== undefined ? `${param.min}-${param.max}` : "")}
                      onChange={(e) => {
                        const updated = [...editingTest.parameters];
                        updated[index].reference_text = e.target.value;
                        setEditingTest({ ...editingTest, parameters: updated });
                      }}
                      className="col-span-4 px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white font-mono"
                      placeholder="Range / Limits"
                    />

                    <button
                      type="button"
                      onClick={() => removeEditParameterRow(index)}
                      className="col-span-1 text-center text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-3 border-t mt-3">
              <button
                type="button"
                onClick={() => setEditingTest(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTestEdits}
                disabled={isLoading}
                className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs shadow-xs"
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
import React from "react";
import { Settings, Plus, Edit, Trash2, X, Sparkles, CheckCircle2 } from "lucide-react";

export default function TestManager({
  departments = [],
  testCatalog = [],
  newTestForm,
  setNewTestForm,
  handleSaveNewTest,
  handleSaveTestEdits,
  handleDeleteTest,
  editingTest,
  setEditingTest,
  handleOpenEditModal,
  handleSeedRadiology,
  MASTER_SAMPLE_TYPES = [],
  MASTER_TUBE_COLORS = [],
  isLoading
}) {
  // CREATE FORM PARAMETER CONTROLS
  const addCreateParameterRow = () => {
    setNewTestForm({
      ...newTestForm,
      parameters: [
        ...newTestForm.parameters,
        { id: String(Date.now()), name: "", param_type: "numeric", unit: "mg/dL", min: "", max: "" }
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

  // EDIT MODAL PARAMETER CONTROLS
  const addEditParameterRow = () => {
    if (!editingTest) return;
    setEditingTest({
      ...editingTest,
      parameters: [
        ...(editingTest.parameters || []),
        { id: `p-${Date.now()}`, name: "", param_type: "numeric", unit: "mg/dL", min: "", max: "" }
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

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* 1-Click Radiology Quick Loader Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-4 rounded-2xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-300" /> Need Imaging & Radiology Investigations?
          </h3>
          <p className="text-xs text-blue-200 mt-0.5">
            1-Click import X-Ray, Ultrasonogram (USG), CT Scan, MRI, and ECG into your catalog.
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={handleSeedRadiology}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" /> {isLoading ? "Adding..." : "Load Radiology & Imaging Tests"}
        </button>
      </div>

      {/* CREATE SINGLE TEST OR PROFILE FORM */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
        <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" /> Create Single Test or Multi-Test Profile
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Supports Biochemistry, Hematology, and Radiology / Imaging investigations.
        </p>

        {/* 6 MASTER INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-600 uppercase">Test Name *</label>
            <input
              type="text"
              placeholder="e.g. SGPT or X-Ray Chest"
              value={newTestForm.name}
              onChange={(e) => setNewTestForm({ ...newTestForm, name: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Short Code *</label>
            <input
              type="text"
              placeholder="e.g. SGPT"
              value={newTestForm.code}
              onChange={(e) => setNewTestForm({ ...newTestForm, code: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Department</label>
            <select
              value={newTestForm.deptId}
              onChange={(e) => setNewTestForm({ ...newTestForm, deptId: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none bg-slate-50 font-medium"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.icon || "🔬"} {d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Price (BDT) *</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={newTestForm.price}
              onChange={(e) => setNewTestForm({ ...newTestForm, price: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none font-mono font-bold text-emerald-700"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Sample / Study Type</label>
            <select
              value={newTestForm.sampleType}
              onChange={(e) => setNewTestForm({ ...newTestForm, sampleType: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none bg-slate-50 font-medium"
            >
              {MASTER_SAMPLE_TYPES.map((type, idx) => (
                <option key={idx} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Tube / Specimen</label>
            <select
              value={newTestForm.tubeColor}
              onChange={(e) => setNewTestForm({ ...newTestForm, tubeColor: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none bg-slate-50 font-medium"
            >
              {MASTER_TUBE_COLORS.map((tube, idx) => (
                <option key={idx} value={tube}>{tube}</option>
              ))}
            </select>
          </div>
        </div>

        {/* PROFILE TOGGLE */}
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="createIsProfileCheck"
            checked={Boolean(newTestForm.isProfile)}
            onChange={(e) => setNewTestForm({ ...newTestForm, isProfile: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
          />
          <label htmlFor="createIsProfileCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
            Is this a Multi-Test Profile / Panel? (e.g. LFT, Lipid Profile, CBC)
          </label>
        </div>

        {/* PARAMETERS BUILDER */}
        <div className="mt-8 border-t pt-6">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Parameters & Reference Limits</h3>
              <p className="text-[11px] text-slate-400">Configure parameters or choose 'Descriptive Text' for imaging/X-Ray/USG</p>
            </div>
            <button
              type="button"
              onClick={addCreateParameterRow}
              className="px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 flex items-center gap-1.5 hover:bg-blue-100 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Parameter Row
            </button>
          </div>

          <div className="space-y-2">
            {newTestForm.parameters.map((param, index) => {
              const isQual = param.param_type === "qualitative";
              const isText = param.param_type === "text";

              return (
                <div key={param.id || index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs items-center">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Parameter Name"
                      value={param.name}
                      onChange={(e) => {
                        const updated = [...newTestForm.parameters];
                        updated[index].name = e.target.value;
                        setNewTestForm({ ...newTestForm, parameters: updated });
                      }}
                      className="w-full p-2 border rounded-lg bg-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <select
                      value={param.param_type}
                      onChange={(e) => {
                        const updated = [...newTestForm.parameters];
                        updated[index].param_type = e.target.value;
                        if (e.target.value === "text") updated[index].unit = "Report";
                        setNewTestForm({ ...newTestForm, parameters: updated });
                      }}
                      className="w-full p-2 border rounded-lg bg-white font-bold text-blue-700 outline-none"
                    >
                      <option value="numeric">Numeric (Min – Max)</option>
                      <option value="qualitative">Qualitative (+ / - Reactive)</option>
                      <option value="text">Descriptive Text (Imaging)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Unit"
                      value={param.unit}
                      onChange={(e) => {
                        const updated = [...newTestForm.parameters];
                        updated[index].unit = e.target.value;
                        setNewTestForm({ ...newTestForm, parameters: updated });
                      }}
                      className="w-full p-2 border rounded-lg bg-white font-mono outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    {isQual ? (
                      <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-800 font-bold text-[11px] text-center truncate">
                        Normal: Negative
                      </div>
                    ) : isText ? (
                      <div className="bg-slate-100 p-2 rounded-lg text-slate-600 font-medium text-[11px] text-center truncate">
                        Observation / Finding
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          placeholder="Min"
                          value={param.min}
                          onChange={(e) => {
                            const updated = [...newTestForm.parameters];
                            updated[index].min = e.target.value;
                            setNewTestForm({ ...newTestForm, parameters: updated });
                          }}
                          className="w-1/2 p-2 border rounded-lg bg-white font-mono text-center outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={param.max}
                          onChange={(e) => {
                            const updated = [...newTestForm.parameters];
                            updated[index].max = e.target.value;
                            setNewTestForm({ ...newTestForm, parameters: updated });
                          }}
                          className="w-1/2 p-2 border rounded-lg bg-white font-mono text-center outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeCreateParameterRow(index)}
                      disabled={newTestForm.parameters.length <= 1}
                      className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30 rounded-lg transition"
                      title="Remove parameter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSaveNewTest}
            disabled={isLoading}
            className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {isLoading ? "Saving..." : "Save Test to Catalog"}
          </button>
        </div>
      </div>

      {/* DIRECTORY */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
        <h3 className="font-bold text-sm text-slate-800 mb-4">
          Live Diagnostic Test Catalog ({testCatalog.length} Investigations)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {testCatalog.map((t) => (
            <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-black text-sm text-slate-900">{t.name}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold text-[10px]">{t.code}</span>
                </div>
                <div className="flex items-center gap-1.5 my-1">
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-bold rounded text-[10px]">
                    {t.dept_id?.replace("DEP-", "") || "GEN"}
                  </span>
                  {t.is_profile && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-[10px]">
                      PROFILE
                    </span>
                  )}
                </div>
                <p className="text-slate-500 font-medium">{t.sample_type} • {t.tube_color}</p>
                <p className="font-mono text-xs font-bold text-emerald-700 mt-1">Price: ৳ {t.price}</p>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200">
                <button
                  onClick={() => handleOpenEditModal(t)}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteTest(t.id, t.name)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT MODAL (RESTORED FULL CAPABILITY) */}
      {editingTest && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" /> Edit Diagnostic Test / Profile
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Editing: <b>{editingTest.name}</b> ({editingTest.code})
                </p>
              </div>
              <button onClick={() => setEditingTest(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 6 MASTER DETAILS IN EDIT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 uppercase">Test Name *</label>
                <input
                  type="text"
                  value={editingTest.name || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase">Short Code *</label>
                <input
                  type="text"
                  value={editingTest.code || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, code: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase">Department</label>
                <select
                  value={editingTest.deptId || editingTest.dept_id || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, deptId: e.target.value, dept_id: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none bg-slate-50 font-medium"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.icon || "🔬"} {d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase">Price (BDT) *</label>
                <input
                  type="number"
                  value={editingTest.price || ""}
                  onChange={(e) => setEditingTest({ ...editingTest, price: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase">Sample Type</label>
                <select
                  value={editingTest.sampleType || editingTest.sample_type || MASTER_SAMPLE_TYPES[0]}
                  onChange={(e) => setEditingTest({ ...editingTest, sampleType: e.target.value, sample_type: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none bg-slate-50 font-medium"
                >
                  {MASTER_SAMPLE_TYPES.map((type, idx) => (
                    <option key={idx} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase">Tube Color</label>
                <select
                  value={editingTest.tubeColor || editingTest.tube_color || MASTER_TUBE_COLORS[0]}
                  onChange={(e) => setEditingTest({ ...editingTest, tubeColor: e.target.value, tube_color: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none bg-slate-50 font-medium"
                >
                  {MASTER_TUBE_COLORS.map((tube, idx) => (
                    <option key={idx} value={tube}>{tube}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PROFILE CHECKBOX IN EDIT */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsProfileCheck"
                checked={Boolean(editingTest.isProfile !== undefined ? editingTest.isProfile : editingTest.is_profile)}
                onChange={(e) => setEditingTest({ ...editingTest, isProfile: e.target.checked, is_profile: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="editIsProfileCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                Is this a Multi-Test Profile / Panel? (e.g. LFT, Lipid Profile, CBC)
              </label>
            </div>

            {/* EDIT PARAMETERS BUILDER */}
            <div className="mt-8 border-t pt-6">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Parameters & Reference Limits</h4>
                  <p className="text-[11px] text-slate-400">Modify parameter names, types, units, and ranges</p>
                </div>
                <button
                  type="button"
                  onClick={addEditParameterRow}
                  className="px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 flex items-center gap-1.5 hover:bg-blue-100 transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Parameter Row
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(editingTest.parameters || []).map((param, index) => {
                  const isQual = param.param_type === "qualitative";
                  const isText = param.param_type === "text";

                  return (
                    <div key={param.id || index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs items-center">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Parameter Name"
                          value={param.name || ""}
                          onChange={(e) => {
                            const updated = [...editingTest.parameters];
                            updated[index].name = e.target.value;
                            setEditingTest({ ...editingTest, parameters: updated });
                          }}
                          className="w-full p-2 border rounded-lg bg-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <select
                          value={param.param_type || "numeric"}
                          onChange={(e) => {
                            const updated = [...editingTest.parameters];
                            updated[index].param_type = e.target.value;
                            if (e.target.value === "text") updated[index].unit = "Report";
                            setEditingTest({ ...editingTest, parameters: updated });
                          }}
                          className="w-full p-2 border rounded-lg bg-white font-bold text-blue-700 outline-none"
                        >
                          <option value="numeric">Numeric (Min – Max)</option>
                          <option value="qualitative">Qualitative (+ / - Reactive)</option>
                          <option value="text">Descriptive Text (Imaging)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Unit"
                          value={param.unit || ""}
                          onChange={(e) => {
                            const updated = [...editingTest.parameters];
                            updated[index].unit = e.target.value;
                            setEditingTest({ ...editingTest, parameters: updated });
                          }}
                          className="w-full p-2 border rounded-lg bg-white font-mono outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        {isQual ? (
                          <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-800 font-bold text-[11px] text-center truncate">
                            Normal: Negative
                          </div>
                        ) : isText ? (
                          <div className="bg-slate-100 p-2 rounded-lg text-slate-600 font-medium text-[11px] text-center truncate">
                            Observation
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              placeholder="Min"
                              value={param.min !== undefined && param.min !== null ? param.min : (param.min_range || "")}
                              onChange={(e) => {
                                const updated = [...editingTest.parameters];
                                updated[index].min = e.target.value;
                                updated[index].min_range = e.target.value;
                                setEditingTest({ ...editingTest, parameters: updated });
                              }}
                              className="w-1/2 p-2 border rounded-lg bg-white font-mono text-center outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Max"
                              value={param.max !== undefined && param.max !== null ? param.max : (param.max_range || "")}
                              onChange={(e) => {
                                const updated = [...editingTest.parameters];
                                updated[index].max = e.target.value;
                                updated[index].max_range = e.target.value;
                                setEditingTest({ ...editingTest, parameters: updated });
                              }}
                              className="w-1/2 p-2 border rounded-lg bg-white font-mono text-center outline-none"
                            />
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => removeEditParameterRow(index)}
                          disabled={(editingTest.parameters || []).length <= 1}
                          className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30 rounded-lg transition"
                          title="Remove parameter"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 border-t pt-4">
              <button
                type="button"
                onClick={() => setEditingTest(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTestEdits}
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Save Changes to Supabase
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
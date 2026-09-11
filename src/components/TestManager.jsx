import React from "react";
import { Settings, Plus, Edit, Trash2, X, CheckSquare, Layers } from "lucide-react";

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
  MASTER_SAMPLE_TYPES = [],
  MASTER_TUBE_COLORS = [],
  isLoading
}) {
  // CREATE FORM: Add & Remove Parameter Rows
  const addCreateParameterRow = () => {
    setNewTestForm({
      ...newTestForm,
      parameters: [
        ...newTestForm.parameters,
        { id: String(Date.now()), name: "", param_type: "numeric", unit: "mg/dL", min: "", max: "" }
      ]
    });
  };

  const removeCreateParameterRow = (idxToRemove) => {
    if (newTestForm.parameters.length <= 1) return;
    setNewTestForm({
      ...newTestForm,
      parameters: newTestForm.parameters.filter((_, idx) => idx !== idxToRemove)
    });
  };

  // EDIT MODAL: Add & Remove Parameter Rows
  const addEditParameterRow = () => {
    setEditingTest({
      ...editingTest,
      parameters: [
        ...(editingTest.parameters || []),
        { id: String(Date.now()), name: "", param_type: "numeric", unit: "mg/dL", min: "", max: "" }
      ]
    });
  };

  const removeEditParameterRow = (idxToRemove) => {
    if ((editingTest.parameters || []).length <= 1) {
      alert("A test must have at least one parameter.");
      return;
    }
    setEditingTest({
      ...editingTest,
      parameters: editingTest.parameters.filter((_, idx) => idx !== idxToRemove)
    });
  };

  // Helper to safely open the edit modal with normalized fields
  const onEditClick = (t) => {
    const rawParams = t.test_parameters || t.parameters || [];
    const normalizedParams = rawParams.length > 0
      ? rawParams.map((p, i) => ({
          id: p.id || String(i + 1),
          name: p.name || "",
          param_type: p.param_type || "numeric",
          unit: p.unit || "",
          min: p.min_range !== null && p.min_range !== undefined ? p.min_range : (p.min !== undefined ? p.min : ""),
          max: p.max_range !== null && p.max_range !== undefined ? p.max_range : (p.max !== undefined ? p.max : "")
        }))
      : [{ id: "1", name: t.name || "", param_type: "numeric", unit: "", min: "", max: "" }];

    setEditingTest({
      ...t,
      id: t.id,
      name: t.name || "",
      code: t.code || "",
      deptId: t.dept_id || t.deptId || (departments[0]?.id || "DEP-BIO"),
      price: t.price || "",
      sampleType: t.sample_type || t.sampleType || MASTER_SAMPLE_TYPES[0] || "Serum",
      tubeColor: t.tube_color || t.tubeColor || MASTER_TUBE_COLORS[0] || "Red / Yellow (SST / Plain Clot)",
      isProfile: t.is_profile !== undefined ? Boolean(t.is_profile) : Boolean(t.isProfile),
      parameters: normalizedParams
    });
  };

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* =========================================================================
          1. CREATE SINGLE TEST OR MULTI-TEST PROFILE
      ========================================================================= */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
        <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" /> Create Single Test or Multi-Test Profile
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Supports both Numeric Tests (<em>Hb, Glucose</em>) and Qualitative Positive/Negative Tests (<em>HBsAg, Dengue, Pregnancy</em>).
        </p>

        {/* 6 MASTER DETAILS INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-600 uppercase">Test Name *</label>
            <input
              type="text"
              placeholder="e.g. HBsAg or SGPT"
              value={newTestForm.name}
              onChange={(e) => setNewTestForm({ ...newTestForm, name: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Short Code *</label>
            <input
              type="text"
              placeholder="e.g. HBSAG"
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
                <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Price (BDT) *</label>
            <input
              type="number"
              placeholder="e.g. 450"
              value={newTestForm.price}
              onChange={(e) => setNewTestForm({ ...newTestForm, price: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none font-mono font-bold text-emerald-700"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Sample Type</label>
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
            <label className="font-bold text-slate-600 uppercase">Tube Color</label>
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

        {/* PROFILE TOGGLE CHECKBOX */}
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
              <p className="text-[11px] text-slate-400">Configure parameters included in this diagnostic test or profile</p>
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
                  
                  {/* Parameter Name (4 Cols) */}
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Parameter Name (e.g. Bilirubin Total)"
                      value={param.name}
                      onChange={(e) => {
                        const updated = [...newTestForm.parameters];
                        updated[index].name = e.target.value;
                        setNewTestForm({ ...newTestForm, parameters: updated });
                      }}
                      className="w-full p-2 border rounded-lg bg-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Param Type (3 Cols) */}
                  <div className="sm:col-span-3">
                    <select
                      value={param.param_type}
                      onChange={(e) => {
                        const updated = [...newTestForm.parameters];
                        updated[index].param_type = e.target.value;
                        if (e.target.value === "qualitative" && !updated[index].unit) {
                          updated[index].unit = "Result";
                        }
                        setNewTestForm({ ...newTestForm, parameters: updated });
                      }}
                      className="w-full p-2 border rounded-lg bg-white font-bold text-blue-700 outline-none"
                    >
                      <option value="numeric">Numeric (Min – Max)</option>
                      <option value="qualitative">Qualitative (+ / - Reactive)</option>
                      <option value="text">Descriptive Text</option>
                    </select>
                  </div>

                  {/* Unit (2 Cols) */}
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Unit (mg/dL)"
                      value={param.unit}
                      onChange={(e) => {
                        const updated = [...newTestForm.parameters];
                        updated[index].unit = e.target.value;
                        setNewTestForm({ ...newTestForm, parameters: updated });
                      }}
                      className="w-full p-2 border rounded-lg bg-white font-mono outline-none"
                    />
                  </div>

                  {/* Min/Max OR Qualitative Badge (2 Cols) */}
                  <div className="sm:col-span-2">
                    {isQual ? (
                      <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-800 font-bold text-[11px] text-center truncate">
                        Normal: Negative
                      </div>
                    ) : isText ? (
                      <div className="bg-slate-100 p-2 rounded-lg text-slate-600 font-medium text-[11px] text-center truncate">
                        Descriptive Text
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

                  {/* Delete Row Action (1 Col) */}
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
            <Plus className="w-4 h-4" /> {isLoading ? "Saving..." : "Save Test to Supabase"}
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. LIVE TEST CATALOG DIRECTORY
      ========================================================================= */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-slate-800">
            Live Test Catalog ({testCatalog.length} Tests in Database)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {testCatalog.map((t) => {
            const isProfile = t.is_profile || (t.test_parameters && t.test_parameters.length > 1);

            return (
              <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-black text-sm text-slate-900">{t.name}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold text-[10px]">{t.code}</span>
                  </div>
                  <div className="flex items-center gap-1.5 my-1">
                    {isProfile ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-[10px]">PROFILE PANEL</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-bold rounded text-[10px]">SINGLE TEST</span>
                    )}
                  </div>
                  <p className="text-slate-500 font-medium">{t.sample_type} • {t.tube_color}</p>
                  <p className="font-mono text-xs font-bold text-emerald-700 mt-1">Price: ৳ {t.price}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {(t.test_parameters || []).length} parameters configured
                  </p>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => onEditClick(t)}
                    className="flex-1 py-1.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTest(t.id, t.name)}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition"
                    title="Delete Test"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          3. EDIT TEST MODAL (100% IDENTICAL IN STRUCTURE & CAPABILITIES TO CREATE)
      ========================================================================= */}
      {editingTest && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Top Header */}
            <div className="flex justify-between items-start border-b pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" /> Edit Diagnostic Test / Profile
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Editing master test: <b className="text-slate-900">{editingTest.name}</b> ({editingTest.code})
                </p>
              </div>
              <button 
                onClick={() => setEditingTest(null)} 
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 6 MASTER DETAILS INPUTS (IDENTICAL TO CREATE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 uppercase">Test Name *</label>
                <input
                  type="text"
                  value={editingTest.name}
                  onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase">Short Code *</label>
                <input
                  type="text"
                  value={editingTest.code}
                  onChange={(e) => setEditingTest({ ...editingTest, code: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase">Department</label>
                <select
                  value={editingTest.deptId || editingTest.dept_id}
                  onChange={(e) => setEditingTest({ ...editingTest, deptId: e.target.value, dept_id: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none bg-slate-50 font-medium"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase">Price (BDT) *</label>
                <input
                  type="number"
                  value={editingTest.price}
                  onChange={(e) => setEditingTest({ ...editingTest, price: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 uppercase">Sample Type</label>
                <select
                  value={editingTest.sampleType || editingTest.sample_type}
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
                  value={editingTest.tubeColor || editingTest.tube_color}
                  onChange={(e) => setEditingTest({ ...editingTest, tubeColor: e.target.value, tube_color: e.target.value })}
                  className="w-full mt-1 p-2.5 border rounded-xl outline-none bg-slate-50 font-medium"
                >
                  {MASTER_TUBE_COLORS.map((tube, idx) => (
                    <option key={idx} value={tube}>{tube}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PROFILE TOGGLE CHECKBOX (IDENTICAL TO CREATE) */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsProfileCheck"
                checked={Boolean(editingTest.isProfile)}
                onChange={(e) => setEditingTest({ ...editingTest, isProfile: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="editIsProfileCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                Is this a Multi-Test Profile / Panel? (e.g. LFT, Lipid Profile, CBC)
              </label>
            </div>

            {/* PARAMETERS BUILDER (IDENTICAL 12-COL GRID TO CREATE) */}
            <div className="mt-8 border-t pt-6">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">Parameters & Reference Limits</h4>
                  <p className="text-[11px] text-slate-400">Modify parameter names, types, units, and reference ranges</p>
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
                      
                      {/* Parameter Name (4 Cols) */}
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Parameter Name"
                          value={param.name}
                          onChange={(e) => {
                            const updated = [...editingTest.parameters];
                            updated[index].name = e.target.value;
                            setEditingTest({ ...editingTest, parameters: updated });
                          }}
                          className="w-full p-2 border rounded-lg bg-white font-medium outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Param Type (3 Cols) */}
                      <div className="sm:col-span-3">
                        <select
                          value={param.param_type}
                          onChange={(e) => {
                            const updated = [...editingTest.parameters];
                            updated[index].param_type = e.target.value;
                            if (e.target.value === "qualitative" && !updated[index].unit) {
                              updated[index].unit = "Result";
                            }
                            setEditingTest({ ...editingTest, parameters: updated });
                          }}
                          className="w-full p-2 border rounded-lg bg-white font-bold text-blue-700 outline-none"
                        >
                          <option value="numeric">Numeric (Min – Max)</option>
                          <option value="qualitative">Qualitative (+ / - Reactive)</option>
                          <option value="text">Descriptive Text</option>
                        </select>
                      </div>

                      {/* Unit (2 Cols) */}
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Unit"
                          value={param.unit}
                          onChange={(e) => {
                            const updated = [...editingTest.parameters];
                            updated[index].unit = e.target.value;
                            setEditingTest({ ...editingTest, parameters: updated });
                          }}
                          className="w-full p-2 border rounded-lg bg-white font-mono outline-none"
                        />
                      </div>

                      {/* Min/Max OR Qualitative Badge (2 Cols) */}
                      <div className="sm:col-span-2">
                        {isQual ? (
                          <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-800 font-bold text-[11px] text-center truncate">
                            Normal: Negative
                          </div>
                        ) : isText ? (
                          <div className="bg-slate-100 p-2 rounded-lg text-slate-600 font-medium text-[11px] text-center truncate">
                            Descriptive Text
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

                      {/* Delete Row Action (1 Col) */}
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

            {/* Modal Bottom Actions */}
            <div className="flex justify-end items-center gap-3 mt-8 border-t pt-4">
              <button
                type="button"
                onClick={() => setEditingTest(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTestEdits}
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
              >
                {isLoading ? "Saving Changes..." : "Save Changes to Supabase"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
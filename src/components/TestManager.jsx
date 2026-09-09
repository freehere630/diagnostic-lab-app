import React from "react";
import { Settings, Plus, Edit, Trash2, X, CheckSquare } from "lucide-react";

export default function TestManager({
  departments,
  testCatalog,
  newTestForm,
  setNewTestForm,
  handleSaveNewTest,
  handleSaveTestEdits,
  handleDeleteTest,
  editingTest,
  setEditingTest,
  handleOpenEditModal,
  MASTER_SAMPLE_TYPES,
  MASTER_TUBE_COLORS,
  isLoading
}) {
  const addParameterRow = () => {
    setNewTestForm({
      ...newTestForm,
      parameters: [
        ...newTestForm.parameters,
        { id: String(newTestForm.parameters.length + 1), name: "", param_type: "numeric", unit: "mg/dL", min: "", max: "", defaultVal: "Negative" }
      ]
    });
  };

  const addEditParameterRow = () => {
    setEditingTest({
      ...editingTest,
      parameters: [
        ...editingTest.parameters,
        { id: `TEMP-${Date.now()}`, name: "", param_type: "numeric", unit: "", min_range: "", max_range: "" }
      ]
    });
  };

  const removeEditParameterRow = (idxToRemove) => {
    setEditingTest({
      ...editingTest,
      parameters: editingTest.parameters.filter((_, idx) => idx !== idxToRemove)
    });
  };

  return (
    <div className="space-y-6 w-full font-sans text-slate-800">
      
      {/* Create New Test Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
        <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" /> Create Single Test or Multi-Test Profile
        </h2>
        <p className="text-xs text-slate-500 mb-6">Supports both Numeric Tests (*Hb, Glucose*) and Qualitative Positive/Negative Tests (*HBsAg, Dengue, Pregnancy*).</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-600 uppercase">Test Name *</label>
            <input
              type="text"
              placeholder="e.g. HBsAg or SGPT"
              value={newTestForm.name}
              onChange={(e) => setNewTestForm({ ...newTestForm, name: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Short Code *</label>
            <input
              type="text"
              placeholder="e.g. HBSAG"
              value={newTestForm.code}
              onChange={(e) => setNewTestForm({ ...newTestForm, code: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="font-bold text-slate-600 uppercase">Department</label>
            <select
              value={newTestForm.deptId}
              onChange={(e) => setNewTestForm({ ...newTestForm, deptId: e.target.value })}
              className="w-full mt-1 p-2.5 border rounded-xl outline-none bg-slate-50"
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
              className="w-full mt-1 p-2.5 border rounded-xl outline-none font-mono font-bold"
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

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="isProfileCheck"
            checked={newTestForm.isProfile}
            onChange={(e) => setNewTestForm({ ...newTestForm, isProfile: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label htmlFor="isProfileCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
            Is this a Multi-Test Profile / Panel? (e.g. LFT, Lipid Profile, CBC)
          </label>
        </div>

        {/* Dynamic Parameter Builder (Handles Numeric & Positive/Negative) */}
        <div className="mt-8 border-t pt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Parameters & Reference Limits</h3>
            <button
              type="button"
              onClick={addParameterRow}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 flex items-center gap-1 hover:bg-blue-100"
            >
              <Plus className="w-3.5 h-3.5" /> Add Parameter Row
            </button>
          </div>

          <div className="space-y-2">
            {newTestForm.parameters.map((param, index) => {
              const isQual = param.param_type === "qualitative";
              const isText = param.param_type === "text";

              return (
                <div key={param.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs items-center">
                  <input
                    type="text"
                    placeholder="Parameter Name (e.g. HBsAg Screening)"
                    value={param.name}
                    onChange={(e) => {
                      const updated = [...newTestForm.parameters];
                      updated[index].name = e.target.value;
                      setNewTestForm({ ...newTestForm, parameters: updated });
                    }}
                    className="p-2 border rounded-lg bg-white sm:col-span-2 font-medium"
                  />
                  
                  <select
                    value={param.param_type}
                    onChange={(e) => {
                      const updated = [...newTestForm.parameters];
                      updated[index].param_type = e.target.value;
                      if (e.target.value === "qualitative") updated[index].unit = "Result";
                      setNewTestForm({ ...newTestForm, parameters: updated });
                    }}
                    className="p-2 border rounded-lg bg-white font-bold text-blue-700"
                  >
                    <option value="numeric">Numeric (Range: Min-Max)</option>
                    <option value="qualitative">Qualitative (+ / - Reactive)</option>
                    <option value="text">Descriptive Text</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Unit (e.g. mg/dL)"
                    value={param.unit}
                    onChange={(e) => {
                      const updated = [...newTestForm.parameters];
                      updated[index].unit = e.target.value;
                      setNewTestForm({ ...newTestForm, parameters: updated });
                    }}
                    className="p-2 border rounded-lg bg-white font-mono"
                  />

                  {/* If Qualitative: Hide Min/Max Numbers and show Expected Negative */}
                  {isQual ? (
                    <div className="sm:col-span-2 bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-800 font-bold text-[11px] text-center">
                      Normal: Negative / Non-Reactive
                    </div>
                  ) : isText ? (
                    <div className="sm:col-span-2 bg-slate-100 p-2 rounded-lg text-slate-600 font-medium text-[11px] text-center">
                      Descriptive Visual Result
                    </div>
                  ) : (
                    <>
                      <input
                        type="number"
                        placeholder="Min Normal"
                        value={param.min}
                        onChange={(e) => {
                          const updated = [...newTestForm.parameters];
                          updated[index].min = e.target.value;
                          setNewTestForm({ ...newTestForm, parameters: updated });
                        }}
                        className="p-2 border rounded-lg bg-white font-mono"
                      />
                      <input
                        type="number"
                        placeholder="Max Normal"
                        value={param.max}
                        onChange={(e) => {
                          const updated = [...newTestForm.parameters];
                          updated[index].max = e.target.value;
                          setNewTestForm({ ...newTestForm, parameters: updated });
                        }}
                        className="p-2 border rounded-lg bg-white font-mono"
                      />
                    </>
                  )}
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

      {/* Catalog Cards with Delete & Edit */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-slate-800">Live Test Catalog ({testCatalog.length} Tests in Database)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {testCatalog.map((t) => (
            <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-black text-sm text-slate-900">{t.name}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold text-[10px]">{t.code}</span>
                </div>
                <div className="flex items-center gap-1.5 my-1">
                  {t.is_profile ? (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-[10px]">PROFILE PANEL</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-bold rounded text-[10px]">SINGLE TEST</span>
                  )}
                </div>
                <p className="text-slate-500 font-medium">{t.sample_type} • {t.tube_color}</p>
                <p className="font-mono text-xs font-bold text-emerald-700 mt-1">Price: ৳ {t.price}</p>
                <p className="text-[10px] text-slate-400 mt-1">{(t.test_parameters || []).length} parameters configured</p>
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
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition"
                  title="Delete Test"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal (Supports Qualitative & Numeric Editing) */}
      {editingTest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" /> Edit Test: {editingTest.name}
              </h3>
              <button onClick={() => setEditingTest(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 uppercase">Test Name</label>
                <input
                  type="text"
                  value={editingTest.name}
                  onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 uppercase">Short Code</label>
                <input
                  type="text"
                  value={editingTest.code}
                  onChange={(e) => setEditingTest({ ...editingTest, code: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl font-bold font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 uppercase">Price (BDT)</label>
                <input
                  type="number"
                  value={editingTest.price}
                  onChange={(e) => setEditingTest({ ...editingTest, price: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl font-bold font-mono text-emerald-700"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 uppercase">Sample Type</label>
                <select
                  value={editingTest.sampleType}
                  onChange={(e) => setEditingTest({ ...editingTest, sampleType: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl bg-slate-50 font-medium"
                >
                  {MASTER_SAMPLE_TYPES.map((type, idx) => (
                    <option key={idx} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-600 uppercase">Tube Color</label>
                <select
                  value={editingTest.tubeColor}
                  onChange={(e) => setEditingTest({ ...editingTest, tubeColor: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-xl bg-slate-50 font-medium"
                >
                  {MASTER_TUBE_COLORS.map((tube, idx) => (
                    <option key={idx} value={tube}>{tube}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-xs uppercase text-slate-700">Parameters & Reference Ranges</h4>
                <button onClick={addEditParameterRow} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
                  + Add Parameter
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {editingTest.parameters.map((p, idx) => {
                  const isQual = p.param_type === "qualitative";
                  return (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 bg-slate-50 p-2 rounded-xl border text-xs items-center">
                      <input
                        type="text"
                        placeholder="Name"
                        value={p.name}
                        onChange={(e) => {
                          const updated = [...editingTest.parameters];
                          updated[idx].name = e.target.value;
                          setEditingTest({ ...editingTest, parameters: updated });
                        }}
                        className="p-1.5 border rounded-lg bg-white sm:col-span-2 font-medium"
                      />

                      <select
                        value={p.param_type || "numeric"}
                        onChange={(e) => {
                          const updated = [...editingTest.parameters];
                          updated[idx].param_type = e.target.value;
                          setEditingTest({ ...editingTest, parameters: updated });
                        }}
                        className="p-1.5 border rounded-lg bg-white font-bold"
                      >
                        <option value="numeric">Numeric</option>
                        <option value="qualitative">Qualitative (+/-)</option>
                        <option value="text">Text</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Unit"
                        value={p.unit}
                        onChange={(e) => {
                          const updated = [...editingTest.parameters];
                          updated[idx].unit = e.target.value;
                          setEditingTest({ ...editingTest, parameters: updated });
                        }}
                        className="p-1.5 border rounded-lg bg-white font-mono"
                      />

                      {isQual ? (
                        <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg text-emerald-800 font-bold text-[10px] text-center">
                          Normal: Negative
                        </div>
                      ) : (
                        <input
                          type="number"
                          placeholder="Min"
                          value={p.min_range !== null ? p.min_range : ""}
                          onChange={(e) => {
                            const updated = [...editingTest.parameters];
                            updated[idx].min_range = e.target.value;
                            setEditingTest({ ...editingTest, parameters: updated });
                          }}
                          className="p-1.5 border rounded-lg bg-white font-mono"
                        />
                      )}

                      <div className="flex gap-1 items-center">
                        {!isQual && (
                          <input
                            type="number"
                            placeholder="Max"
                            value={p.max_range !== null ? p.max_range : ""}
                            onChange={(e) => {
                              const updated = [...editingTest.parameters];
                              updated[idx].max_range = e.target.value;
                              setEditingTest({ ...editingTest, parameters: updated });
                            }}
                            className="p-1.5 border rounded-lg bg-white w-full font-mono"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeEditParameterRow(idx)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          title="Remove parameter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 border-t pt-4">
              <button onClick={() => setEditingTest(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button onClick={handleSaveTestEdits} disabled={isLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow">
                {isLoading ? "Saving..." : "Save Changes to Supabase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from "react";
import {
  Cpu, Plus, Trash2, Search, RefreshCw, X, Activity, Settings
} from "lucide-react";
import {
  getAnalyzerMappings, saveAnalyzerMapping, deleteAnalyzerMapping,
  getAllTestParameters, getBridgeStatus, getAnalyzers, saveAnalyzer,
  deleteAnalyzer // <--- IMPORT THE NEW FUNCTION
} from "../services/api";

const DEPARTMENTS = [
  { id: "DEP-HEM", name: "Hematology" },
  { id: "DEP-BIO", name: "Biochemistry" },
  { id: "DEP-IMM", name: "Immunology" },
  { id: "DEP-MIC", name: "Microbiology" },
  { id: "DEP-PAT", name: "Clinical Pathology" },
];

export default function AnalyzerSettings() {
  const [mappings, setMappings] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [bridges, setBridges] = useState([]);
  const [analyzers, setAnalyzers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isAnalyzerModalOpen, setIsAnalyzerModalOpen] = useState(false);

  // Form states
  const [mappingForm, setMappingForm] = useState({
    analyzer_name: "",
    machine_code: "",
    lims_parameter_id: "",
  });
  
  const [analyzerForm, setAnalyzerForm] = useState({
    name: "",
    departments: [],
  });

  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [maps, params, stats, ans] = await Promise.all([
        getAnalyzerMappings(),
        getAllTestParameters(),
        getBridgeStatus(),
        getAnalyzers(),
      ]);
      setMappings(maps);
      setParameters(params);
      setBridges(stats);
      setAnalyzers(ans);
      
      if (ans.length > 0 && !mappingForm.analyzer_name) {
        setMappingForm(f => ({ ...f, analyzer_name: ans[0].name }));
      }
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      getBridgeStatus().then(setBridges).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteMapping = async (id) => {
    if (!window.confirm("Delete this mapping?")) return;
    try {
      await deleteAnalyzerMapping(id);
      await loadData();
    } catch (e) { alert(e.message); }
  };

  const handleDeleteAnalyzer = async (id, name) => {
    if (!window.confirm(`Delete analyzer "${name}"?\n\nThis will also remove ALL test mappings linked to this machine.`)) return;
    try {
      await deleteAnalyzer(id, name);
      await loadData();
    } catch (e) { alert(e.message); }
  };

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!mappingForm.machine_code.trim() || !mappingForm.lims_parameter_id || !mappingForm.analyzer_name) {
      return alert("Please fill all fields.");
    }
    try {
      await saveAnalyzerMapping(mappingForm);
      setIsMappingModalOpen(false);
      setMappingForm({ ...mappingForm, machine_code: "", lims_parameter_id: "" });
      await loadData();
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleSaveAnalyzer = async (e) => {
    e.preventDefault();
    if (!analyzerForm.name.trim() || analyzerForm.departments.length === 0) {
      return alert("Enter a name and select at least one department.");
    }
    try {
      // Explicitly pass department_ids so there is no confusion
      await saveAnalyzer({
        name: analyzerForm.name,
        department_ids: analyzerForm.departments
      });
      setIsAnalyzerModalOpen(false);
      setAnalyzerForm({ name: "", departments: [] });
      await loadData();
    } catch (e) { alert("Error: " + e.message); }
  };

  const getBridgeState = (name) => {
    const stat = bridges.find(b => b.analyzer_name === name);
    if (!stat) return { online: false, lastPing: "Never" };
    const diff = (new Date().getTime() - new Date(stat.last_ping).getTime()) / 1000;
    return {
      online: diff < 120,
      lastPing: new Date(stat.last_ping).toLocaleTimeString()
    };
  };

  const selectedAnalyzer = analyzers.find(a => a.name === mappingForm.analyzer_name);
  const availableParams = parameters.filter(p => {
    if (!selectedAnalyzer || !selectedAnalyzer.department_ids) return false;
    return selectedAnalyzer.department_ids.includes(p.test?.dept_id);
  });

  const filteredMappings = mappings.filter(m => 
    m.machine_code.toLowerCase().includes(search.toLowerCase()) ||
    (m.parameter?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-[1200px] mx-auto text-slate-900">
      
      {/* Live Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analyzers.map(analyzer => {
          const status = getBridgeState(analyzer.name);
          return (
            <div key={analyzer.id} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status.online ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{analyzer.name}</h3>
                  <p className="text-[11px] text-slate-500">
                    {status.online ? "Live" : "Offline"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs font-bold ${status.online ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                  {status.online ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analyzers Directory */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-600" /> Registered Analyzers
          </h2>
          <button
            onClick={() => setIsAnalyzerModalOpen(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Analyzer
          </button>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
              <th className="py-2.5 px-3">Analyzer Name</th>
              <th className="py-2.5 px-3">Assigned Departments</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analyzers.map(m => (
              <tr key={m.id} className="hover:bg-slate-50/80">
                <td className="py-2 px-3 font-semibold text-slate-800">{m.name}</td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {(m.department_ids || []).map(dId => (
                      <span key={dId} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                        {DEPARTMENTS.find(d => d.id === dId)?.name || dId}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3 text-right">
                  <button 
                    onClick={() => handleDeleteAnalyzer(m.id, m.name)} 
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Delete Analyzer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mapping Directory */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" /> Analyzer Test Mappings
            </h2>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search code or parameter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white"
              />
            </div>
            <button onClick={loadData} className="p-1.5 text-slate-500 hover:text-indigo-600 border border-slate-200 rounded-lg bg-white">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsMappingModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Mapping
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading mappings…
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            No mappings found.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 font-semibold text-[10px] uppercase tracking-wide">
                <th className="py-2.5 px-3">Analyzer</th>
                <th className="py-2.5 px-3">Machine Code</th>
                <th className="py-2.5 px-3">Target LIMS Parameter</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMappings.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2 px-3 font-semibold text-slate-700">{m.analyzer_name}</td>
                  <td className="py-2 px-3 font-mono font-bold text-indigo-600">{m.machine_code}</td>
                  <td className="py-2 px-3">
                    <div className="font-bold text-slate-900">{m.parameter?.name}</div>
                    <div className="text-[10px] text-slate-400">Test: {m.parameter?.test?.name}</div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button onClick={() => handleDeleteMapping(m.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ADD ANALYZER MODAL */}
      {isAnalyzerModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full text-xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-sm">Add New Analyzer</span>
              <button onClick={() => setIsAnalyzerModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAnalyzer} className="p-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Analyzer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biolumi CX8"
                  value={analyzerForm.name}
                  onChange={(e) => setAnalyzerForm({ ...analyzerForm, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-semibold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Assigned Departments (Select Multiple) *</label>
                <div className="space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                  {DEPARTMENTS.map(d => (
                    <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={analyzerForm.departments.includes(d.id)}
                        onChange={(e) => {
                          const depts = e.target.checked 
                            ? [...analyzerForm.departments, d.id]
                            : analyzerForm.departments.filter(id => id !== d.id);
                          setAnalyzerForm({ ...analyzerForm, departments: depts });
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 rounded"
                      />
                      <span className="text-xs font-medium">{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsAnalyzerModalOpen(false)} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold">
                  Save Analyzer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MAPPING MODAL */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-sm">Add Analyzer Mapping</span>
              <button onClick={() => setIsMappingModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveMapping} className="p-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Analyzer</label>
                <select
                  value={mappingForm.analyzer_name}
                  onChange={(e) => setMappingForm({ ...mappingForm, analyzer_name: e.target.value, lims_parameter_id: "" })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-semibold"
                >
                  {analyzers.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Machine Code (Sent by Analyzer)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IgE II or 10030"
                  value={mappingForm.machine_code}
                  onChange={(e) => setMappingForm({ ...mappingForm, machine_code: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1 flex justify-between">
                  <span>Target LIMS Parameter</span>
                  <span className="text-indigo-600">{availableParams.length} available</span>
                </label>
                <select
                  required
                  value={mappingForm.lims_parameter_id}
                  onChange={(e) => setMappingForm({ ...mappingForm, lims_parameter_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-white"
                >
                  <option value="">— Select Parameter —</option>
                  {availableParams.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.test?.name} → {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Only showing parameters for the selected analyzer's departments.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsMappingModalOpen(false)} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
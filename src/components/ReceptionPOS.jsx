import React, { useState, useMemo, useEffect } from "react";
import { Users, Search, Receipt, History, UserCheck, AlertCircle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { searchPatients, getPatientHistory } from "../services/api";

export default function ReceptionPOS({
  testCatalog,
  patientForm,
  setPatientForm,
  selectedTestIds,
  setSelectedTestIds,
  discountVal,
  setDiscountVal,
  paidVal,
  setPaidVal,
  handleSaveOrderToDb,
  isLoading
}) {
  const [posFilterType, setPosFilterType] = useState("ALL");
  const [posSearch, setPosSearch] = useState("");

  // Patient Lookup States
  const [lookupQuery, setLookupQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [patientHistoryList, setPatientHistoryList] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Live Patient Search debouncer
  useEffect(() => {
    if (!lookupQuery || lookupQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPatients(lookupQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [lookupQuery]);

  // Select Returning Patient
  const handleSelectPatient = async (p) => {
    setPatientForm({
      id: p.id,
      name: p.name,
      age: p.age || "",
      gender: p.gender || "Male",
      phone: p.phone || "",
      doctor: p.address?.replace("Ref: ", "") || "Self"
    });
    setLookupQuery("");
    setSearchResults([]);

    // Fetch previous clinical history
    const history = await getPatientHistory(p.id);
    setPatientHistoryList(history);
  };

  // Reset to New Patient Registration
  const handleClearPatient = () => {
    setPatientForm({ id: "", name: "", age: "", gender: "Male", phone: "", doctor: "Self" });
    setPatientHistoryList([]);
  };

  // Billing calculations
  const subTotal = useMemo(() => {
    const chosen = testCatalog.filter((t) => selectedTestIds.includes(t.id));
    return chosen.reduce((acc, t) => acc + parseFloat(t.price || 0), 0);
  }, [testCatalog, selectedTestIds]);

  const discountAmount = (subTotal * discountVal) / 100;
  const netPayable = Math.max(0, subTotal - discountAmount);
  
  // Custom Paid / Due calculation
  const currentPaid = paidVal !== undefined ? paidVal : netPayable;
  const currentDue = Math.max(0, netPayable - currentPaid);

  // Sync paid amount when net payable changes (if full payment default)
  useEffect(() => {
    if (paidVal === undefined || paidVal === null) {
      setPaidVal(netPayable);
    }
  }, [netPayable, paidVal, setPaidVal]);

  const filteredCatalog = useMemo(() => {
    return testCatalog.filter((test) => {
      const matchType =
        posFilterType === "ALL" ||
        (posFilterType === "SINGLE" && !test.is_profile) ||
        (posFilterType === "PROFILE" && test.is_profile);

      const matchSearch =
        posSearch === "" ||
        test.name.toLowerCase().includes(posSearch.toLowerCase()) ||
        test.code.toLowerCase().includes(posSearch.toLowerCase());

      return matchType && matchSearch;
    });
  }, [testCatalog, posFilterType, posSearch]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
      <div className="lg:col-span-2 xl:col-span-3 space-y-6">
        
        {/* RETURNING PATIENT QUICK SEARCH HUB */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-300" /> Returning Patient Lookup (Auto-Fill)
              </h3>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Search by <b>Patient ID (UHID)</b>, <b>Phone Number</b>, or <b>Name</b> to auto-load details & history
              </p>
            </div>

            {patientForm.id && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <History className="w-3.5 h-3.5" /> View Past History ({patientHistoryList.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
                >
                  New Patient
                </button>
              </div>
            )}
          </div>

          <div className="relative mt-3">
            <input
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="Type Patient ID (PID-...), Phone Number (017...), or Name..."
              className="w-full pl-4 pr-10 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-semibold outline-none shadow-sm focus:ring-2 focus:ring-blue-400"
            />
            {isSearching && (
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">Searching...</span>
            )}

            {/* Dropdown Suggestions */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full p-3 text-left hover:bg-blue-50 flex items-center justify-between transition group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700">{p.name}</span>
                        <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{p.id}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Phone: {p.phone} • Age: {p.age}Y • {p.gender}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-0.5">
                      Select <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PATIENT DETAILS REGISTRATION CARD */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> 
              {patientForm.id ? `Patient Demographics (ID: ${patientForm.id})` : "Patient Registration"}
            </h3>
            {patientForm.id && (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Returning Patient Linked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 uppercase">Patient Full Name *</label>
              <input
                type="text"
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                placeholder="e.g. Rahim Ahmed"
                className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 uppercase">Phone Number *</label>
              <input
                type="text"
                value={patientForm.phone}
                onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                placeholder="017xxxxxxxx"
                className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 uppercase">Age / Gender</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  value={patientForm.age}
                  onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                  placeholder="Age"
                  className="w-1/2 p-2.5 border border-slate-300 rounded-xl outline-none font-bold"
                />
                <select
                  value={patientForm.gender}
                  onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                  className="w-1/2 p-2.5 border border-slate-300 rounded-xl outline-none font-medium"
                >
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-600 uppercase">Referring Doctor</label>
              <input
                type="text"
                value={patientForm.doctor}
                onChange={(e) => setPatientForm({ ...patientForm, doctor: e.target.value })}
                placeholder="Self / Dr. Name"
                className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl outline-none font-medium"
              />
            </div>
          </div>

          <hr className="my-6 border-slate-100" />

          {/* TEST SELECTION FILTERS */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border text-xs">
              <button
                onClick={() => setPosFilterType("ALL")}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${posFilterType === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                All Tests ({testCatalog.length})
              </button>
              <button
                onClick={() => setPosFilterType("SINGLE")}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${posFilterType === "SINGLE" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500"}`}
              >
                Single Tests
              </button>
              <button
                onClick={() => setPosFilterType("PROFILE")}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${posFilterType === "PROFILE" ? "bg-purple-600 text-white shadow-sm" : "text-slate-500"}`}
              >
                Profiles & Panels (LFT, KFT, CBC)
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search SGPT, Glucose, LFT..."
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* TESTS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredCatalog.map((test) => {
              const isSel = selectedTestIds.includes(test.id);
              return (
                <button
                  key={test.id}
                  type="button"
                  onClick={() => setSelectedTestIds(isSel ? selectedTestIds.filter((id) => id !== test.id) : [...selectedTestIds, test.id])}
                  className={`p-3 text-left rounded-xl border flex justify-between items-center transition ${
                    isSel ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-300/30" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs">{test.name}</span>
                      {test.is_profile ? (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-black text-[9px]">PROFILE</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-bold text-[9px]">SINGLE</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{test.sample_type} • {test.tube_color}</p>
                  </div>
                  <span className="font-bold text-xs font-mono text-slate-900">৳ {test.price}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* POS INVOICE & DUE AMOUNT SUMMARY */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-fit w-full">
        <div>
          <h3 className="font-bold text-slate-800 text-base border-b pb-3">Billing & Payment Summary</h3>
          <div className="mt-4 space-y-2 text-xs max-h-56 overflow-y-auto">
            {selectedTestIds.map((tid) => {
              const t = testCatalog.find((m) => m.id === tid);
              return t ? (
                <div key={tid} className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-700 truncate">{t.name}</span>
                  <span className="font-bold font-mono">৳ {t.price}</span>
                </div>
              ) : null;
            })}
          </div>

          <div className="border-t my-4 pt-4 space-y-2.5 text-xs font-semibold">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">৳ {subTotal}</span>
            </div>
            
            <div className="flex justify-between items-center text-slate-600">
              <span>Discount (%):</span>
              <input
                type="number"
                min="0"
                max="100"
                value={discountVal}
                onChange={(e) => setDiscountVal(Number(e.target.value))}
                className="w-16 p-1 border rounded text-right font-mono"
              />
            </div>

            <div className="flex justify-between text-sm font-black text-slate-900 border-t pt-2">
              <span>Net Payable:</span>
              <span className="text-blue-700 font-mono text-base">৳ {netPayable.toFixed(0)}</span>
            </div>

            {/* PAID AMOUNT INPUT */}
            <div className="flex justify-between items-center pt-2 border-t text-slate-700">
              <span className="font-bold">Paid (Cash/Card):</span>
              <input
                type="number"
                min="0"
                value={paidVal !== undefined ? paidVal : netPayable}
                onChange={(e) => setPaidVal(Math.max(0, Number(e.target.value)))}
                className="w-24 p-1.5 border border-emerald-400 bg-emerald-50 rounded text-right font-mono font-black text-emerald-900 text-sm outline-none"
              />
            </div>

            {/* DUE AMOUNT KEEPING */}
            <div className="flex justify-between items-center text-rose-700 bg-rose-50 p-2 rounded-xl">
              <span className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Due Balance:
              </span>
              <span className="font-mono font-black text-base">
                ৳ {currentDue.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSaveOrderToDb}
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow text-xs flex items-center justify-center gap-2 transition"
          >
            <Receipt className="w-4 h-4" /> {isLoading ? "Saving..." : "Save Order & Generate Receipt"}
          </button>
        </div>
      </div>

      {/* PATIENT TEST HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-slate-800">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Patient Clinical Test History</h3>
                <p className="text-xs text-slate-300">{patientForm.name} (Patient ID: {patientForm.id})</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {patientHistoryList.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs italic">No previous test history found for this patient.</p>
              ) : (
                patientHistoryList.map((ord) => (
                  <div key={ord.id || ord.orderId} className="border rounded-xl p-3 text-xs bg-slate-50 space-y-1.5">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-blue-700 font-mono">{ord.id || ord.orderId}</span>
                      <span className="text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {ord.order_date || ord.date}
                      </span>
                    </div>

                    <div className="text-slate-700">
                      Tests: <b>{(ord.order_tests || ord.tests || []).map(t => t.test?.name || t.name).join(", ")}</b>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t text-[11px]">
                      <span>Paid: ৳{ord.paid_amount || ord.billing?.paid || 0} / Due: <b className="text-rose-600">৳{ord.due_amount || ord.billing?.due || 0}</b></span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${ord.qc_status === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {ord.qc_status || ord.qcStatus || "Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
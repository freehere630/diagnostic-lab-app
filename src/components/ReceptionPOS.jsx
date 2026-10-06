import React, { useState, useMemo, useEffect } from "react";
import { 
  Users, Search, Receipt, History, UserCheck, 
  AlertCircle, Clock, ChevronRight, Check, X
} from "lucide-react";
import { searchPatients, getPatientHistory } from "../services/api";

export default function ReceptionPOS({
  testCatalog = [],
  patientForm,
  setPatientForm,
  selectedTestIds = [],
  setSelectedTestIds,
  discountVal = 0,
  setDiscountVal,
  paidVal,
  setPaidVal,
  handleSaveOrderToDb,
  isLoading,
  doctorsList = []
}) {
  const [posFilterType, setPosFilterType] = useState("ALL"); // 'ALL' | 'SINGLE' | 'PROFILE'
  const [posSearch, setPosSearch] = useState("");

  // Patient Lookup States
  const [lookupQuery, setLookupQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [patientHistoryList, setPatientHistoryList] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Profile check helper
  const checkIsProfile = (test) => {
    if (!test) return false;
    const isProfFlag = 
      test.is_profile === true || 
      test.is_profile === "true" || 
      test.is_profile === 1 || 
      test.isProfile === true || 
      test.isProfile === "true";

    const params = test.test_parameters || test.parameters || [];
    return isProfFlag || params.length > 1;
  };

  // Reagent availability filter
  const availableCatalog = useMemo(() => {
    return (testCatalog || []).filter(
      (test) => test.is_available !== false && test.is_active !== false
    );
  }, [testCatalog]);

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return availableCatalog.filter((test) => {
      const isProfile = checkIsProfile(test);

      const matchType =
        posFilterType === "ALL" ||
        (posFilterType === "SINGLE" && !isProfile) ||
        (posFilterType === "PROFILE" && isProfile);

      const query = posSearch.trim().toLowerCase();
      const matchSearch =
        !query ||
        (test.name && test.name.toLowerCase().includes(query)) ||
        (test.code && test.code.toLowerCase().includes(query)) ||
        (test.sample_type && test.sample_type.toLowerCase().includes(query));

      return matchType && matchSearch;
    });
  }, [availableCatalog, posFilterType, posSearch]);

  const singleCount = useMemo(() => availableCatalog.filter(t => !checkIsProfile(t)).length, [availableCatalog]);
  const profileCount = useMemo(() => availableCatalog.filter(t => checkIsProfile(t)).length, [availableCatalog]);

  // Patient Live Search debouncer
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

    const history = await getPatientHistory(p.id);
    setPatientHistoryList(history);
  };

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
  
  const currentPaid = paidVal !== undefined ? paidVal : netPayable;
  const currentDue = Math.max(0, netPayable - currentPaid);

  useEffect(() => {
    if (paidVal === undefined || paidVal === null) {
      setPaidVal(netPayable);
    }
  }, [netPayable, paidVal, setPaidVal]);

  const safeDoctorsList = Array.isArray(doctorsList) ? doctorsList : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* LEFT SECTION (9 COLS): PATIENT FORM + TEST SELECTOR */}
      <div className="xl:col-span-8 2xl:col-span-9 space-y-3">
        
        {/* RETURNING PATIENT AUTO-LOOKUP BAR (COMPACT) */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs relative">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" /> Returning Patient Lookup
              </span>
              <span className="text-[10px] text-slate-400">Search by UHID, Phone, or Name</span>
            </div>

            {patientForm.id && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
                >
                  <History className="w-3 h-3" /> History ({patientHistoryList.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[11px] font-semibold transition"
                >
                  New Patient
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="Start typing UHID (P-1001), phone number, or name..."
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-medium transition"
            />
            {isSearching && (
              <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">Searching...</span>
            )}

            {/* Live Search Auto-Suggest Box */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full p-2.5 text-left hover:bg-slate-50 flex items-center justify-between transition group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600">{p.name}</span>
                        <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded">{p.id}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">📞 {p.phone} • {p.age}Y / {p.gender}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-0.5">
                      Select <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PATIENT DEMOGRAPHICS ENTRY */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" /> Patient Information
            </span>
            {patientForm.id && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> UHID Linked: {patientForm.id}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Full Name *</label>
              <input
                type="text"
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                placeholder="e.g. Rahim Ahmed"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Mobile Phone *</label>
              <input
                type="text"
                value={patientForm.phone}
                onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                placeholder="017xxxxxxxx"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Age / Gender</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={patientForm.age}
                  onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                  placeholder="Age"
                  className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg outline-none font-bold text-center"
                />
                <select
                  value={patientForm.gender}
                  onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-medium"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Referring Doctor</label>
              <input
                type="text"
                value={patientForm.doctor}
                onChange={(e) => setPatientForm({ ...patientForm, doctor: e.target.value })}
                placeholder="Self / Dr. Name"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
              />

              {safeDoctorsList.length > 0 && patientForm.doctor && patientForm.doctor.length >= 2 && !safeDoctorsList.some(d => d.name?.toLowerCase() === patientForm.doctor.toLowerCase()) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {safeDoctorsList
                    .filter(d => (d.name && d.name.toLowerCase().includes(patientForm.doctor.toLowerCase())) || (d.chamber && d.chamber.toLowerCase().includes(patientForm.doctor.toLowerCase())))
                    .map(doc => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setPatientForm({ ...patientForm, doctor: `${doc.name} (${doc.degrees || doc.chamber || ''})`.trim() })}
                        className="w-full p-2 text-left text-xs hover:bg-slate-50 transition flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{doc.name}</p>
                          <p className="text-[10px] text-slate-500">{doc.degrees}</p>
                        </div>
                        <span className="text-[10px] text-blue-600 font-bold">Pick</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TEST CATALOG EXPLORER */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          
          {/* Controls toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPosFilterType("ALL")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  posFilterType === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All ({availableCatalog.length})
              </button>
              <button
                type="button"
                onClick={() => setPosFilterType("SINGLE")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  posFilterType === "SINGLE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Singles ({singleCount})
              </button>
              <button
                type="button"
                onClick={() => setPosFilterType("PROFILE")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  posFilterType === "PROFILE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Profiles ({profileCount})
              </button>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Find test, code, sample type..."
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition font-medium"
              />
            </div>
          </div>

          {/* Test Grid (Space-Saving Chips) */}
          {filteredCatalog.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No matching investigations found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredCatalog.map((test) => {
                const isSel = selectedTestIds.includes(test.id);
                const isProfile = checkIsProfile(test);

                return (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => {
                      setSelectedTestIds((prev) => 
                        isSel ? prev.filter((id) => id !== test.id) : [...prev, test.id]
                      );
                    }}
                    className={`p-2.5 rounded-lg border text-left transition flex items-start justify-between gap-2 ${
                      isSel 
                        ? "border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs ring-1 ring-blue-600/20" 
                        : "border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60 bg-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs truncate leading-snug">{test.name}</span>
                        {isProfile && (
                          <span className="px-1 py-0.2 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase">
                            Panel
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {test.code} • {test.sample_type || "Blood"}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-xs text-slate-900 block">৳{test.price}</span>
                      {isSel && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* RIGHT SECTION (3 COLS / 4 COLS): BILLING & CONFIRMATION */}
      <div className="xl:col-span-4 2xl:col-span-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs sticky top-16 space-y-3.5">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-blue-600" /> Invoice Summary
            </span>
            <span className="text-[11px] font-bold text-slate-500 font-mono">
              {selectedTestIds.length} Test{selectedTestIds.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Selected Tests List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {selectedTestIds.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                No investigations selected yet
              </div>
            ) : (
              selectedTestIds.map((tid) => {
                const t = testCatalog.find((m) => m.id === tid);
                return t ? (
                  <div key={tid} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-md hover:bg-slate-50 group">
                    <span className="font-medium text-slate-700 truncate max-w-[170px]">{t.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-semibold text-slate-900">৳{t.price}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTestIds(prev => prev.filter(id => id !== tid))}
                        className="text-slate-300 hover:text-rose-600 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : null;
              })
            )}
          </div>

          {/* Numeric Calculations Strip */}
          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">৳{subTotal}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Discount (%):</span>
              <input
                type="number"
                min="0"
                max="100"
                value={discountVal}
                onChange={(e) => setDiscountVal(Number(e.target.value))}
                className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-right font-mono text-xs outline-none"
              />
            </div>

            <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
              <span>Net Payable:</span>
              <span className="font-mono text-base text-blue-600">৳{netPayable.toFixed(0)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span className="font-semibold">Paid Amount:</span>
              <input
                type="number"
                min="0"
                value={paidVal !== undefined ? paidVal : netPayable}
                onChange={(e) => setPaidVal(Math.max(0, Number(e.target.value)))}
                className="w-24 px-2 py-1 border border-emerald-300 bg-emerald-50/50 rounded-lg text-right font-mono font-bold text-emerald-950 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* High-visibility due indicator */}
            <div className="flex justify-between items-center p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Due Balance:
              </span>
              <span className="font-mono font-bold text-sm">৳{currentDue.toFixed(0)}</span>
            </div>
          </div>

          {/* Save & Generate Receipt Action */}
          <button
            onClick={handleSaveOrderToDb}
            disabled={isLoading || selectedTestIds.length === 0}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
          >
            <Receipt className="w-4 h-4" /> {isLoading ? "Creating Order..." : "Confirm & Print Receipt"}
          </button>

        </div>
      </div>

      {/* RETURNING PATIENT HISTORICAL RECORD MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center font-bold">
              <div>
                <span>Clinical Test History</span>
                <span className="text-[11px] text-slate-300 font-normal ml-2">({patientForm.name} - {patientForm.id})</span>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="hover:opacity-75">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-2">
              {patientHistoryList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic">No historical orders logged for this patient.</div>
              ) : (
                patientHistoryList.map((ord) => (
                  <div key={ord.id || ord.orderId} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex justify-between font-mono font-bold text-slate-800">
                      <span>{ord.id || ord.orderId}</span>
                      <span className="text-slate-500 font-normal flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ord.order_date || ord.date}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {(ord.order_tests || ord.tests || []).map(t => t.test?.name || t.name).join(", ")}
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[10px]">
                      <span>Paid: ৳{ord.paid_amount || ord.billing?.paid || 0} | Due: <b className="text-rose-600">৳{ord.due_amount || ord.billing?.due || 0}</b></span>
                      <span className="px-1.5 py-0.2 rounded font-bold bg-slate-200 text-slate-700">
                        {ord.qc_status || ord.qcStatus || "Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 bg-slate-50 border-t flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-3 py-1 bg-slate-800 text-white rounded-md font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
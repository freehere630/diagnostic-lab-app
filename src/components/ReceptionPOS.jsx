import React, { useState, useMemo } from "react";
import { Users, Search, Receipt } from "lucide-react";

export default function ReceptionPOS({
  testCatalog,
  patientForm,
  setPatientForm,
  selectedTestIds,
  setSelectedTestIds,
  discountVal,
  setDiscountVal,
  handleSaveOrderToDb,
  isLoading
}) {
  const [posFilterType, setPosFilterType] = useState("ALL");
  const [posSearch, setPosSearch] = useState("");

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

  const subTotal = useMemo(() => {
    const chosen = testCatalog.filter((t) => selectedTestIds.includes(t.id));
    return chosen.reduce((acc, t) => acc + parseFloat(t.price || 0), 0);
  }, [testCatalog, selectedTestIds]);

  const netPayable = subTotal - (subTotal * discountVal) / 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
      <div className="lg:col-span-2 xl:col-span-3 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Patient Registration & Order Intake
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 uppercase">Patient Full Name *</label>
              <input
                type="text"
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                placeholder="e.g. Rahim Ahmed"
                className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 uppercase">Phone Number *</label>
              <input
                type="text"
                value={patientForm.phone}
                onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                placeholder="017xxxxxxxx"
                className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-1/2 p-2.5 border border-slate-300 rounded-xl outline-none"
                />
                <select
                  value={patientForm.gender}
                  onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                  className="w-1/2 p-2.5 border border-slate-300 rounded-xl outline-none"
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
                className="w-full mt-1 p-2.5 border border-slate-300 rounded-xl outline-none"
              />
            </div>
          </div>

          <hr className="my-6 border-slate-100" />

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
                Single Tests (e.g. SGPT)
              </button>
              <button
                onClick={() => setPosFilterType("PROFILE")}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${posFilterType === "PROFILE" ? "bg-purple-600 text-white shadow-sm" : "text-slate-500"}`}
              >
                Profiles & Panels (LFT, Lipid, CBC)
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

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-fit w-full">
        <div>
          <h3 className="font-bold text-slate-800 text-base border-b pb-3">Invoice & POS Summary</h3>
          <div className="mt-4 space-y-2 text-xs max-h-60 overflow-y-auto">
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

          <div className="border-t my-4 pt-4 space-y-2 text-xs font-semibold">
            <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span className="font-mono">৳ {subTotal}</span></div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Discount (%):</span>
              <input
                type="number"
                value={discountVal}
                onChange={(e) => setDiscountVal(Number(e.target.value))}
                className="w-16 p-1 border rounded text-right font-mono"
              />
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 border-t pt-2">
              <span>Net Payable:</span><span className="text-blue-600 font-mono text-lg">৳ {netPayable.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSaveOrderToDb}
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow text-xs flex items-center justify-center gap-2 transition"
          >
            <Receipt className="w-4 h-4" /> {isLoading ? "Saving..." : "Save Order to Supabase"}
          </button>
        </div>
      </div>
    </div>
  );
}
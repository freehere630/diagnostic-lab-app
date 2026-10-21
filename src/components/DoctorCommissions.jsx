import React, { useState, useEffect } from "react";
import {
  Stethoscope, Wallet, RefreshCw, X, Search, FileText, Clock
} from "lucide-react";
import { getDoctorCommissions, saveDoctorPayout, getDoctorPayouts } from "../services/financeApi";

export default function DoctorCommissions({ onSelectDoctor }) {
  const [activeTab, setActiveTab] = useState("LEDGER"); // 'LEDGER' | 'HISTORY'
  const [commissions, setCommissions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [form, setForm] = useState({
    payout_date: new Date().toISOString().slice(0, 10),
    amount: "",
    reference_no: "",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [commData, payData] = await Promise.all([
        getDoctorCommissions(),
        getDoctorPayouts()
      ]);
      setCommissions(commData);
      setPayouts(payData);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredCommissions = commissions.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPayouts = payouts.filter(p => 
    p.doctor?.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = commissions.reduce((sum, c) => sum + c.outstanding, 0);
  const totalPaid = commissions.reduce((sum, c) => sum + c.total_paid, 0);

  const handleOpenPayout = (e, doc) => {
    e.stopPropagation(); // Prevent triggering the row click (profile open)
    setSelectedDoc(doc);
    setForm({
      payout_date: new Date().toISOString().slice(0, 10),
      amount: doc.outstanding.toString(),
      reference_no: "",
      notes: "",
    });
    setIsPayoutOpen(true);
  };

  const submitPayout = async (e) => {
    e.preventDefault();
    if (!selectedDoc.id) return alert("This doctor is not registered in the system.");
    if (!form.amount || parseFloat(form.amount) <= 0) return alert("Enter a valid amount.");

    try {
      await saveDoctorPayout({
        doctor_id: selectedDoc.id,
        ...form
      });
      setIsPayoutOpen(false);
      await loadData(); // Refresh both tabs
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* Header */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Doctor Commissions & Payouts</h2>
            <p className="text-[10px] text-slate-400">Track referring doctor earnings and record payments</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-bold text-amber-600 block uppercase">Total Outstanding</span>
            <span className="font-mono font-bold text-amber-700">৳{totalOutstanding.toLocaleString()}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-600 block uppercase">Total Paid</span>
            <span className="font-mono font-bold text-emerald-700">৳{totalPaid.toLocaleString()}</span>
          </div>
          <button onClick={loadData} className="p-1.5 text-slate-500 hover:text-indigo-600 border border-slate-200 rounded-lg">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab("LEDGER")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "LEDGER" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
        >
          <FileText className="w-3.5 h-3.5" /> Commission Ledger
        </button>
        <button
          onClick={() => setActiveTab("HISTORY")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "HISTORY" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Clock className="w-3.5 h-3.5" /> Payout History
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <span className="font-bold text-xs uppercase tracking-wide text-slate-700">
            {activeTab === "LEDGER" ? "Doctor Earnings Summary" : "Recorded Payouts"}
          </span>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctor name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading data…
          </div>
        ) : activeTab === "LEDGER" ? (
          
          /* LEDGER TAB */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                  <th className="py-2.5 px-3">Doctor Name</th>
                  <th className="py-2.5 px-3 text-right">Patients</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  <th className="py-2.5 px-3 text-center">Rate</th>
                  <th className="py-2.5 px-3 text-right">Commission</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCommissions.map(doc => (
                  <tr key={doc.name} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-3">
                      <button
                        onClick={() => onSelectDoctor && onSelectDoctor(doc.id, doc.name)}
                        className="font-bold text-slate-900 hover:text-indigo-600 hover:underline text-left"
                        title="View Doctor Profile"
                      >
                        {doc.name}
                      </button>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">{doc.total_orders}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">৳{doc.total_revenue.toLocaleString()}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{doc.rate}%</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">৳{doc.total_commission.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600">৳{doc.total_paid.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">৳{doc.outstanding.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={(e) => handleOpenPayout(e, doc)}
                        disabled={doc.outstanding <= 0 || !doc.id}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md text-[11px] font-semibold transition"
                      >
                        Pay Out
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        ) : (

          /* HISTORY TAB */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Doctor Name</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  <th className="py-2.5 px-3">Method / Ref</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayouts.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-slate-400 italic">No payouts recorded yet.</td></tr>
                ) : (
                  filteredPayouts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{p.payout_date}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{p.doctor?.name || "Unknown Doctor"}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                        ৳{parseFloat(p.amount).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {p.reference_no || "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-500 italic">
                        {p.notes || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        )}
      </div>

      {/* PAYOUT MODAL */}
      {isPayoutOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full text-xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-sm">Pay Doctor Commission</span>
              </div>
              <button onClick={() => setIsPayoutOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={submitPayout} className="p-4 space-y-3">
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg mb-2">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Paying</div>
                <div className="font-bold text-slate-800 text-sm">{selectedDoc.name}</div>
                <div className="text-[10px] text-rose-600 font-bold mt-1">Owed: ৳{selectedDoc.outstanding.toLocaleString()}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Date</label>
                  <input
                    type="date"
                    value={form.payout_date}
                    onChange={(e) => setForm({ ...form, payout_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Amount Paid (৳) *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono text-indigo-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Method / Ref No</label>
                <input
                  type="text"
                  value={form.reference_no}
                  onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
                  placeholder="e.g. Cash / Cheque #123"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional remarks"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsPayoutOpen(false)} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
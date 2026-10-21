import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Stethoscope, DollarSign, Wallet, Clock, Printer, X, Plus, CheckCircle2
} from "lucide-react";
import { getDoctorProfileData, saveDoctorPayout } from "../services/financeApi";
import { printDoctorPayoutReceipt } from "../utils/printHelpers";

export default function DoctorProfile({ doctorId, doctorName, onBack, labSettings }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PATIENTS"); // 'PATIENTS' | 'PAYOUTS'

  // Payout Modal State
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    payout_date: new Date().toISOString().slice(0, 10),
    amount: "",
    reference_no: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDoctorProfileData(doctorId, doctorName);
      setData(res);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [doctorId, doctorName]);

  const openPayoutModal = () => {
    if (!data) return;
    setForm({
      payout_date: new Date().toISOString().slice(0, 10),
      amount: data.stats.outstanding.toString(),
      reference_no: "",
      notes: "",
    });
    setIsPayoutOpen(true);
  };

  const submitPayout = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return alert("Enter a valid amount.");
    setIsSaving(true);
    try {
      await saveDoctorPayout({
        doctor_id: data.doctor.id || doctorId,
        ...form
      });
      setIsPayoutOpen(false);
      await load(); // Refresh the profile data instantly
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading doctor profile…
      </div>
    );
  }

  const { doctor, stats, orders, payouts } = data;

  return (
    <div className="space-y-4 max-w-5xl mx-auto text-slate-900">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">{doctor.name}</h2>
            <p className="text-[11px] text-slate-500">{doctor.degrees || "Consultant"} • {stats.rate}% Commission</p>
          </div>
        </div>
        
        <button
          onClick={openPayoutModal}
          disabled={stats.outstanding <= 0}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Pay Commission
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><DollarSign className="w-3 h-3" /> Total Revenue</span>
          <div className="font-mono font-bold text-slate-800 text-lg mt-1">৳{stats.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1"><Wallet className="w-3 h-3" /> Total Commission</span>
          <div className="font-mono font-bold text-indigo-700 text-lg mt-1">৳{stats.totalCommission.toLocaleString()}</div>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Total Paid</span>
          <div className="font-mono font-bold text-emerald-700 text-lg mt-1">৳{stats.totalPaid.toLocaleString()}</div>
        </div>
        <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 shadow-xs">
          <span className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Outstanding</span>
          <div className="font-mono font-bold text-rose-700 text-lg mt-1">৳{stats.outstanding.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-sm">
        <button
          onClick={() => setActiveTab("PATIENTS")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === "PATIENTS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
        >
          Referred Patients ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("PAYOUTS")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === "PAYOUTS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
        >
          Payout History ({payouts.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {activeTab === "PATIENTS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-3">Patient ID</th>
                  <th className="py-2.5 px-3 text-right">Bill Amount</th>
                  <th className="py-2.5 px-3 text-right">Commission ({stats.rate}%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-slate-400 italic">No patients referred yet.</td></tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-mono text-slate-600">{o.order_date}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{o.patient?.name}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-blue-600">{o.patient?.id}</td>
                      <td className="py-2 px-3 text-right font-mono">৳{parseFloat(o.net_payable).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-indigo-600">
                        ৳{((parseFloat(o.net_payable) * stats.rate) / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "PAYOUTS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  <th className="py-2.5 px-3">Method / Ref</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-slate-400 italic">No payouts recorded yet.</td></tr>
                ) : (
                  payouts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-mono text-slate-600">{p.payout_date}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">৳{parseFloat(p.amount).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{p.reference_no || 'Cash'}</td>
                      <td className="py-2 px-3 text-slate-500 italic">{p.notes || "—"}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => printDoctorPayoutReceipt(p, doctor, labSettings)}
                          className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded transition"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
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
      {isPayoutOpen && (
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
                <div className="font-bold text-slate-800 text-sm">{doctor.name}</div>
                <div className="text-[10px] text-rose-600 font-bold mt-1">Owed: ৳{stats.outstanding.toLocaleString()}</div>
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
                <button type="submit" disabled={isSaving} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold">
                  {isSaving ? "Saving..." : "Confirm Payout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
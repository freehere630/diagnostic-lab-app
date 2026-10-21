import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle2, Wallet, AlertTriangle, RefreshCw, CreditCard, Clock } from "lucide-react";
import { getSystemTotalsForPeriod, saveCashClosing, getCashClosings } from "../services/financeApi";

export default function CashClosing() {
  // Default to today at 08:00 AM, and today at 11:59 PM
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(`${today}T08:00`);
  const [endDate, setEndDate] = useState(`${today}T23:59`);
  
  const [systemTotals, setSystemTotals] = useState({ cash: 0, online: 0 });
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  const [physicalCash, setPhysicalCash] = useState("");
  const [physicalOnline, setPhysicalOnline] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // Convert local datetime-local to ISO string for Supabase
      const startIso = new Date(startDate).toISOString();
      const endIso = new Date(endDate).toISOString();

      const [sys, hist] = await Promise.all([
        getSystemTotalsForPeriod(startIso, endIso),
        getCashClosings()
      ]);
      setSystemTotals(sys);
      setHistory(hist);
      setPhysicalCash(sys.cash.toString());
      setPhysicalOnline(sys.online.toString());
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [startDate, endDate]);

  const cashDiff = (parseFloat(physicalCash) || 0) - systemTotals.cash;
  const onlineDiff = (parseFloat(physicalOnline) || 0) - systemTotals.online;
  const totalDiff = cashDiff + onlineDiff;

  const submitClosing = async (e) => {
    e.preventDefault();
    
    // Check if a closing already exists that overlaps this window
    const isClosed = history.some(h => 
      new Date(h.period_start).getTime() === new Date(startDate).getTime()
    );
    if (isClosed) return alert("A closing record already exists for this exact shift.");

    try {
      await saveCashClosing({
        closing_date: startDate.slice(0, 10), // Date of the shift
        period_start: new Date(startDate).toISOString(),
        period_end: new Date(endDate).toISOString(),
        system_cash: systemTotals.cash,
        system_online: systemTotals.online,
        physical_cash: parseFloat(physicalCash) || 0,
        physical_online: parseFloat(physicalOnline) || 0,
        difference: totalDiff,
        notes: notes,
      });
      alert("✅ Shift closing recorded successfully.");
      await loadData();
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto text-slate-900">
      
      {/* Header */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Shift Closing</h2>
            <p className="text-[10px] text-slate-400">Reconcile physical money based on exact shift times</p>
          </div>
        </div>
        <button onClick={loadData} className="p-1.5 text-slate-500 hover:text-emerald-600 border border-slate-200 rounded-lg">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left: Entry Form */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          
          {/* Shift Time Window */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="font-semibold text-slate-600 text-[10px] block mb-1">Shift Start</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 text-[10px] block mb-1">Shift End (e.g., 1 AM next day)</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cash Column */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold border-b border-emerald-200 pb-2">
                <Wallet className="w-4 h-4" /> Cash in Drawer
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">System Expected:</span>
                <span className="font-mono font-bold text-slate-800">৳{systemTotals.cash.toLocaleString()}</span>
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[10px] block mb-1">Physical Cash Counted *</label>
                <input
                  type="number"
                  value={physicalCash}
                  onChange={(e) => setPhysicalCash(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-emerald-300 bg-white rounded-lg outline-none font-mono font-bold text-emerald-700 text-sm"
                />
              </div>
              <div className={`text-[11px] font-bold flex justify-between p-1.5 rounded ${cashDiff === 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                <span>Variance:</span>
                <span>{cashDiff > 0 ? "+" : ""}{cashDiff.toLocaleString()} ৳</span>
              </div>
            </div>

            {/* Online Column */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                <CreditCard className="w-4 h-4" /> Card / Mobile
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">System Expected:</span>
                <span className="font-mono font-bold text-slate-800">৳{systemTotals.online.toLocaleString()}</span>
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[10px] block mb-1">Physical Statement Total *</label>
                <input
                  type="number"
                  value={physicalOnline}
                  onChange={(e) => setPhysicalOnline(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-blue-300 bg-white rounded-lg outline-none font-mono font-bold text-blue-700 text-sm"
                />
              </div>
              <div className={`text-[11px] font-bold flex justify-between p-1.5 rounded ${onlineDiff === 0 ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
                <span>Variance:</span>
                <span>{onlineDiff > 0 ? "+" : ""}{onlineDiff.toLocaleString()} ৳</span>
              </div>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-600 text-[11px] block mb-1">Notes / Reason for Variance</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid 500 to sweeper from drawer"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none text-xs"
            />
          </div>

          <button
            onClick={submitClosing}
            className={`w-full py-2.5 rounded-lg text-xs font-bold transition shadow-xs ${
              Math.abs(totalDiff) > 0 ? "bg-amber-600 hover:bg-amber-700 text-white" : 
              "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            Submit Shift Closing
          </button>

        </div>

        {/* Right: History */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[450px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50 font-bold text-[11px] uppercase tracking-wide text-slate-700">
            Recent Shifts
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">No history yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.map(h => (
                  <li key={h.id} className="p-3 hover:bg-slate-50 transition text-xs">
                    <div className="flex justify-between font-bold mb-1">
                      <span>{h.closing_date}</span>
                      <span className={h.difference === 0 ? "text-emerald-600" : h.difference < 0 ? "text-rose-600" : "text-amber-600"}>
                        {h.difference > 0 ? "+" : ""}{h.difference} ৳
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mb-1">
                      {h.period_start ? new Date(h.period_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00 AM'} 
                      {' → '} 
                      {h.period_end ? new Date(h.period_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:59 PM'}
                    </div>
                    <div className="flex flex-col gap-0.5 text-slate-500 text-[10px]">
                      <div className="flex justify-between">
                        <span>Cash: (Sys {h.system_cash} vs Phy {h.physical_cash})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Online: (Sys {h.system_online} vs Phy {h.physical_online})</span>
                      </div>
                    </div>
                    {h.notes && <div className="text-[10px] text-rose-500 mt-1 italic">"{h.notes}"</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
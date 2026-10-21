import React, { useState, useEffect } from "react";
import {
  Wallet, TrendingDown, TrendingUp, RefreshCw, Plus, Trash2,
  FileText, Receipt, Truck, X
} from "lucide-react";
import {
  getExpenses, saveExpense, deleteExpense,
  getSupplierPayments, saveSupplierPayment, getSupplierBalances
} from "../services/financeApi";
import { getSuppliers } from "../services/inventoryApi";

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState("EXPENSES");
  const [loading, setLoading] = useState(true);

  // Data states
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [supplierBalances, setSupplierBalances] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Modals
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Utility",
    amount: "",
    description: "",
    payment_method: "Cash",
  });

  const [paymentForm, setPaymentForm] = useState({
    supplier_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "",
    payment_method: "Bank Transfer",
    reference_no: "",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [exps, pays, bals, sups] = await Promise.all([
        getExpenses(),
        getSupplierPayments(),
        getSupplierBalances(),
        getSuppliers({}),
      ]);
      setExpenses(exps);
      setPayments(pays);
      setSupplierBalances(bals);
      setSuppliers(sups);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const submitExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) return alert("Enter a valid amount.");
    try {
      await saveExpense(expenseForm);
      setIsExpenseOpen(false);
      setExpenseForm({ ...expenseForm, amount: "", description: "" });
      await loadData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Delete this expense record?")) return;
    try {
      await deleteExpense(id);
      await loadData();
    } catch (err) { alert(err.message); }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.supplier_id) return alert("Select a supplier.");
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return alert("Enter a valid amount.");
    try {
      await saveSupplierPayment(paymentForm);
      setIsPaymentOpen(false);
      setPaymentForm({ ...paymentForm, amount: "", reference_no: "", notes: "" });
      await loadData();
    } catch (err) { alert(err.message); }
  };

  const handleSupplierSelect = (supId) => {
    const bal = supplierBalances.find(b => b.supplier_id === supId);
    setPaymentForm({
      ...paymentForm,
      supplier_id: supId,
      amount: bal && bal.outstanding > 0 ? bal.outstanding.toString() : "",
    });
  };

  // ─── Calculations ─────────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalPaidSuppliers = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalOutstanding = supplierBalances.reduce((sum, b) => sum + parseFloat(b.outstanding), 0);

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* Top Header & Stats */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Accounts & Finance</h2>
            <p className="text-[10px] text-slate-400">Track daily expenses and supplier payables</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-bold text-rose-600 block uppercase">Total Expenses</span>
            <span className="font-mono font-bold text-rose-700">৳{totalExpenses.toLocaleString()}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-bold text-amber-600 block uppercase">Supplier Payable</span>
            <span className="font-mono font-bold text-amber-700">৳{totalOutstanding.toLocaleString()}</span>
          </div>
          <button onClick={loadData} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 rounded-lg">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab("EXPENSES")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "EXPENSES" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
        >
          <TrendingDown className="w-3.5 h-3.5" /> Expenses
        </button>
        <button
          onClick={() => setActiveTab("PAYABLES")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "PAYABLES" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Truck className="w-3.5 h-3.5" /> Supplier Payments
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200/80">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading financial data…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* EXPENSES TAB */}
          {activeTab === "EXPENSES" && (
            <div>
              <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <span className="font-bold text-xs uppercase tracking-wide text-slate-700">Daily Expense Log</span>
                <button
                  onClick={() => setIsExpenseOpen(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Expense
                </button>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">·</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr><td colSpan="6" className="py-8 text-center text-slate-400 italic">No expenses recorded yet.</td></tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{e.expense_date}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{e.category}</td>
                        <td className="py-2 px-3 text-slate-600">{e.description || "—"}</td>
                        <td className="py-2 px-3 text-[10px]">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">{e.payment_method}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          ৳{parseFloat(e.amount).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button onClick={() => handleDeleteExpense(e.id)} className="p-1 text-slate-300 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PAYABLES TAB */}
          {activeTab === "PAYABLES" && (
            <div>
              <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <span className="font-bold text-xs uppercase tracking-wide text-slate-700">Supplier Payables & History</span>
                <button
                  onClick={() => setIsPaymentOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Payment
                </button>
              </div>

              {/* Outstanding Balances Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-3 bg-slate-50/50 border-b border-slate-200">
                {supplierBalances.filter(b => b.outstanding > 0).map(b => (
                  <div key={b.supplier_id} className="bg-white p-2.5 rounded-lg border border-amber-200 shadow-2xs">
                    <div className="font-bold text-xs text-slate-800 truncate">{b.supplier_name}</div>
                    <div className="flex justify-between items-end mt-1">
                      <span className="text-[10px] text-slate-500">Outstanding:</span>
                      <span className="font-mono font-bold text-amber-600">৳{parseFloat(b.outstanding).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {supplierBalances.filter(b => b.outstanding > 0).length === 0 && (
                  <div className="col-span-full text-center py-2 text-xs text-slate-400 italic">All supplier balances are settled.</div>
                )}
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Method / Ref</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 ? (
                    <tr><td colSpan="4" className="py-8 text-center text-slate-400 italic">No supplier payments recorded yet.</td></tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{p.payment_date}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{p.supplier?.name}</td>
                        <td className="py-2 px-3 text-slate-600">
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mr-1">{p.payment_method}</span>
                          {p.reference_no && <span className="font-mono text-[10px]">{p.reference_no}</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          ৳{parseFloat(p.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {isExpenseOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full text-xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-600" />
                <span className="font-bold text-sm">Log Expense</span>
              </div>
              <button onClick={() => setIsExpenseOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitExpense} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Amount (৳) *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50"
                >
                  <option value="Rent">Rent</option>
                  <option value="Utility">Utility (Electricity, Water, Gas)</option>
                  <option value="Internet">Internet / Phone</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Salary">Salary Advance</option>
                  <option value="Transport">Transport</option>
                  <option value="Refreshment">Refreshment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Description</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g. October internet bill"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsExpenseOpen(false)} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full text-xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm">Record Supplier Payment</span>
              </div>
              <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitPayment} className="p-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Supplier *</label>
                <select
                  value={paymentForm.supplier_id}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-slate-50 font-semibold"
                >
                  <option value="">— choose supplier —</option>
                  {supplierBalances.map(b => (
                    <option key={b.supplier_id} value={b.supplier_id}>
                      {b.supplier_name} {b.outstanding > 0 ? `(Owed: ৳${b.outstanding})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 text-[11px] block mb-1">Amount Paid (৳) *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono text-emerald-700 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-600 text-[11px] block mb-1">Method / Ref No</label>
                <input
                  type="text"
                  value={paymentForm.reference_no}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                  placeholder="e.g. Cheque #12345"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsPaymentOpen(false)} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
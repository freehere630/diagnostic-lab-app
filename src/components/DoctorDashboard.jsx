import React, { useState, useEffect } from "react";
import {
  Stethoscope, LogOut, LayoutDashboard, FileText,
  User, Settings, Plus, Search, Clock, Activity, Users
} from "lucide-react";
import { getDoctorProfileData } from "../services/financeApi";
import { searchPatients } from "../services/api";
import { supabase } from "../supabaseClient";
import PrescriptionForm from "./PrescriptionForm";
import DoctorProfileSettings from "./DoctorProfileSettings";

export default function DoctorDashboard({ currentUser, labSettings, onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prescriptionOrder, setPrescriptionOrder] = useState(null);
  const [doctorRecord, setDoctorRecord] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getDoctorProfileData(currentUser.doctorId, currentUser.name);
      setData(res);
      
      // Fetch full doctor record for settings
      const { data: doc } = await supabase.from("doctors").select("*").eq("id", currentUser.doctorId).single();
      setDoctorRecord(doc);

    } catch (e) {
      alert("Failed to load dashboard: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentUser]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-500">Loading Portal...</p>
        </div>
      </div>
    );
  }

  const { stats, orders } = data;

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "patients", label: "Patient Directory", icon: Users },
    { id: "prescriptions", label: "Prescription History", icon: FileText },
    { id: "settings", label: "My Profile", icon: Settings },
  ];

  // Handle Patient Search
  const handlePatientSearch = async (q) => {
    setPatientSearch(q);
    if (q.trim().length < 2) return setPatientResults([]);
    setSearchingPatients(true);
    try {
      const res = await searchPatients(q);
      setPatientResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingPatients(false);
    }
  };

  // Start a walk-in consultation for an existing patient
  const startWalkIn = (patient) => {
    // Fake an order object so PrescriptionForm can process it normally
    setPrescriptionOrder({
      orderId: null,
      patient: patient
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm truncate">Doctor Portal</h1>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.name}</p>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === item.id ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 rounded-lg text-xs font-bold transition">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
            {NAV_ITEMS.find(i => i.id === activeTab)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{doctorRecord?.name}</p>
              <p className="text-[10px] text-slate-500">{doctorRecord?.degrees}</p>
            </div>
            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center border border-slate-300">
              <User className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* DASHBOARD TAB */}
            {activeTab === "dashboard" && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User className="w-4 h-4"/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Total Patients</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{orders.length}</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Activity className="w-4 h-4"/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Total Revenue</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 font-mono">৳{stats.totalRevenue.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText className="w-4 h-4"/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Commission</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 font-mono">৳{stats.totalCommission.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock className="w-4 h-4"/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Outstanding</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 font-mono">৳{stats.outstanding.toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Recent Patients (Quick Prescription)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-y border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Patient Name</th>
                          <th className="py-3 px-4">Patient ID</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders.slice(0, 5).map(o => (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-xs text-slate-500">{o.order_date}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{o.patient?.name}</td>
                            <td className="py-3 px-4 font-mono text-xs text-blue-600">{o.patient?.id}</td>
                            <td className="py-3 px-4 text-right">
                              <button onClick={() => setPrescriptionOrder(o)} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition">
                                <Plus className="w-3 h-3"/> Prescribe
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* PATIENT DIRECTORY TAB */}
            {activeTab === "patients" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[60vh]">
                <div className="max-w-xl mx-auto mb-8 text-center space-y-2">
                  <h3 className="font-bold text-xl text-slate-800">Patient Directory</h3>
                  <p className="text-sm text-slate-500">Search by Name, Phone, or Patient ID</p>
                  <div className="relative mt-4">
                    <Search className="w-5 h-5 absolute left-4 top-3 text-slate-400" />
                    <input 
                      type="text" 
                      value={patientSearch}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                      placeholder="Type to search..." 
                      className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none shadow-sm transition" 
                    />
                  </div>
                </div>

                {searchingPatients ? (
                   <div className="text-center py-10 text-slate-400">Searching database...</div>
                ) : patientResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patientResults.map(p => (
                      <div key={p.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition bg-slate-50">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-900">{p.name}</h4>
                          <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{p.id}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-1"><b>Age/Gender:</b> {p.age}Y / {p.gender}</p>
                        <p className="text-xs text-slate-600 mb-3"><b>Phone:</b> {p.phone}</p>
                        <button onClick={() => startWalkIn(p)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                          <Plus className="w-3.5 h-3.5" /> New Consultation
                        </button>
                      </div>
                    ))}
                  </div>
                ) : patientSearch.length >= 2 ? (
                  <div className="text-center py-10 text-slate-400 italic">No patients found matching "{patientSearch}".</div>
                ) : null}
              </div>
            )}

            {/* PRESCRIPTION HISTORY TAB */}
            {activeTab === "prescriptions" && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">All Prescriptions</h3>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
                      <input type="text" placeholder="Search patient..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" />
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-y border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Patient Name</th>
                          <th className="py-3 px-4">Patient ID</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders.map(o => (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-xs text-slate-500">{o.order_date}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{o.patient?.name}</td>
                            <td className="py-3 px-4 font-mono text-xs text-blue-600">{o.patient?.id}</td>
                            <td className="py-3 px-4 text-right">
                              <button onClick={() => setPrescriptionOrder(o)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">
                                Edit / View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}

            {/* PROFILE SETTINGS TAB */}
            {activeTab === "settings" && doctorRecord && (
              <DoctorProfileSettings 
                doctor={doctorRecord} 
                onUpdated={() => {
                  loadData(); // Refresh data so new name/degrees show instantly
                }} 
              />
            )}

          </div>
        </div>
      </main>

      {/* Prescription Modal */}
      {prescriptionOrder && (
        <PrescriptionForm
          order={prescriptionOrder}
          doctorsList={[doctorRecord]}
          currentUser={currentUser}
          labSettings={labSettings}
          onClose={() => setPrescriptionOrder(null)}
          onSaved={() => setPrescriptionOrder(null)}
        />
      )}
    </div>
  );
}
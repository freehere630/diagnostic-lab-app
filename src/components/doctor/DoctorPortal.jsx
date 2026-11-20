// src/components/doctor/DoctorPortal.jsx
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Plus, Users, Calendar, FileText, Pill,
  FlaskConical, BarChart3, Settings, LogOut, Search, Menu, X, Stethoscope,
} from "lucide-react";

import DoctorHome from "./DoctorHome";
import Appointments from "./Appointments";
import MedicineLibrary from "./MedicineLibrary";
import Templates from "./Templates";
import Investigations from "./Investigations";
import Reports from "./Reports";
import PatientDirectory from "./PatientDirectory"; // TODO: reuse existing read-only list
import PrescriptionHistory from "./PrescriptionHistory"; // TODO: reuse existing list
import CommandPalette from "./CommandPalette";

// Reuse existing components from the parent
import PrescriptionWorkspace from "./PrescriptionWorkspace";
import DoctorProfileSettings from "../DoctorProfileSettings";

const NAV = [
  { id: "home",          label: "Home",              icon: LayoutDashboard },
  { id: "new",           label: "New Prescription",  icon: Plus, accent: true },
  { id: "patients",      label: "Patients",          icon: Users },
  { id: "appointments",  label: "Appointments",      icon: Calendar },
  { id: "prescriptions", label: "Prescriptions",     icon: FileText },
  { id: "medicines",     label: "Medicine Library",  icon: Pill },
  { id: "templates",     label: "Templates",         icon: FileText },
  { id: "investigations",label: "Investigations",    icon: FlaskConical },
  { id: "reports",       label: "Reports",           icon: BarChart3 },
  { id: "settings",      label: "Settings",          icon: Settings },
];

export default function DoctorPortal({
  currentUser,
  matchedDoctor,
  labSettings,
  prescriptionFormProps, // { order, onSaved, ... } forwarded to PrescriptionForm
  onLogout,
}) {
  const [active, setActive] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const doctorId = matchedDoctor?.id;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  // ⌘K / Ctrl-K palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close mobile drawer on nav
  useEffect(() => setSidebarOpen(false), [active]);

  const goTo = (id) => setActive(id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-200 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
          <Stethoscope className="w-5 h-5 text-indigo-600" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Doctor Portal</div>
            <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
              {matchedDoctor?.doctor_name || currentUser?.full_name}
            </div>
          </div>
        </div>

        <nav className="p-2 space-y-0.5">
          {NAV.map((n) => {
            const Icon = n.icon;
            const isActive = active === n.id;
            return (
              <button
                key={n.id}
                onClick={() => goTo(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50"
                } ${n.accent && !isActive ? "text-indigo-600 font-medium" : ""}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-slate-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden"
        />
      )}

      {/* ── Main column ── */}
      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global search trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex-1 max-w-md flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-400 hover:border-slate-300 hover:bg-slate-50 text-left"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1">Search patients, prescriptions…</span>
            <kbd className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>

          <div className="flex-1" />

          <button
            onClick={() => goTo("new")}
            className="hidden sm:inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> New Prescription
          </button>

          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
            {(currentUser?.full_name || "Dr").split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
        </header>

        {/* Page */}
        <main className={active === "new" ? "w-full h-[calc(100vh-4rem)]" : "p-4 lg:p-8 max-w-6xl mx-auto"}>
          {active === "home" && (
            <DoctorHome
              greeting={greeting}
              doctorId={doctorId}
              doctorName={matchedDoctor?.doctor_name || currentUser?.full_name}
              onNavigate={goTo}
            />
          )}
          {active === "new" && (
            <PrescriptionWorkspace 
              currentUser={currentUser}
              matchedDoctor={matchedDoctor}
              labSettings={labSettings}
              patient={selectedPatient}
            />
          )}

          {active === "patients" && (
            <PatientDirectory 
              currentUser={currentUser} 
              onNewPrescription={(p) => { 
                setSelectedPatient(p); 
                goTo("new"); 
              }} 
            />
          )}

          {active === "appointments" && <Appointments doctorId={doctorId} />}

          {active === "prescriptions" && (
            <PrescriptionHistory doctorId={doctorId} onOpen={(id) => console.log("open", id)} />
          )}

          {active === "medicines" && <MedicineLibrary doctorId={doctorId} />}

          {active === "templates" && (
            <Templates doctorId={doctorId} onUse={(tpl) => console.log("use", tpl)} />
          )}

          {active === "investigations" && <Investigations doctorId={doctorId} />}

          {active === "reports" && <Reports doctorId={doctorId} />}

          {active === "settings" && (
            <DoctorProfileSettings currentUser={currentUser} matchedDoctor={matchedDoctor} />
          )}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        doctorId={doctorId}
        onNavigate={goTo}
      />
    </div>
  );
}
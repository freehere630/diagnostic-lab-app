import React from "react";
import {
  FlaskConical, Database, RefreshCw, Menu, X, Activity, 
  Receipt, QrCode, Layers, ShieldCheck, FileText, Settings, 
  UserCheck, Building2, LogOut
} from "lucide-react";

export default function Navbar({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  loadDatabaseData,
  isLoading,
  labSettings
}) {
  // Navigation Tabs with Permission Mapping
  const allTabs = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      icon: Activity, 
      roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist", "receptionist"] 
    },
    { 
      id: "reception", 
      label: "1. Reception & POS", 
      icon: Receipt, 
      roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist", "receptionist"] 
    },
    { 
      id: "samples", 
      label: "2. Sample Tracking", 
      icon: QrCode, 
      roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist", "receptionist"] 
    },
    { 
      id: "worklists", 
      label: "3. Worklists", 
      icon: Layers, 
      roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist"] 
    },
    { 
      id: "verifier", 
      label: "4. QC & Verification", 
      icon: ShieldCheck, 
      roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist"] 
    },
    { 
      id: "reports", 
      label: "5. Reports & Print", 
      icon: FileText, 
      roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist", "receptionist"] 
    },
    { 
      id: "test-manager", 
      label: "6. Test Management", 
      icon: Settings, 
      roles: ["developer", "manager", "admin"] 
    },
    { 
      id: "staff-manager", 
      label: "7. Staff & Signatures", 
      icon: UserCheck, 
      roles: ["developer", "manager", "admin"] 
    },
    { 
      id: "lab-settings", 
      label: "8. Hospital Branding", 
      icon: Building2, 
      roles: ["developer"] // Developer Only
    },
  ];

  const userRole = (currentUser?.role || "").toLowerCase();
  const visibleTabs = allTabs.filter((tab) => tab.roles.includes(userRole));
  const labName = labSettings?.lab_name || "Apex Clinical LIMS";
  const logoData = labSettings?.logo_data || "";

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {logoData ? (
              <img src={logoData} alt="Logo" className="h-9 w-9 object-contain bg-white p-1 rounded-xl shadow" />
            ) : (
              <div className="p-2 bg-blue-600 rounded-xl shadow">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-2">
                {labName}
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  <Database className="w-3 h-3" /> Supabase Live
                </span>
              </h1>
              <p className="text-[10px] text-slate-400">Diagnostic Laboratory System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDatabaseData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Refresh Cloud Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            </button>

            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
              <div className={`w-7 h-7 rounded-lg ${currentUser?.avatarBg || 'bg-blue-600'} flex items-center justify-center font-bold text-xs text-white`}>
                {currentUser?.name ? currentUser.name[0] : "U"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-200 leading-none">{currentUser?.name}</p>
                <p className="text-[10px] font-semibold text-amber-400 capitalize mt-0.5">
                  {currentUser?.role === "developer" ? "Chief Developer" : currentUser?.role}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1 text-xs font-bold"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </div>

      <div className={`w-full px-4 sm:px-6 lg:px-8 2xl:px-12 border-t border-slate-800 ${mobileMenuOpen ? "block" : "hidden md:flex"} overflow-x-auto py-2 gap-1.5`}>
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-md" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
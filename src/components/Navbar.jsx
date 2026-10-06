import React from "react";
import {
  FlaskConical,
  RefreshCw,
  Menu,
  X,
  Activity,
  Receipt,
  QrCode,
  Layers,
  ShieldCheck,
  FileText,
  Settings,
  UserCheck,
  Building2,
  Stethoscope,
  LogOut
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
  const allTabs = [
    { id: "dashboard", label: "Dashboard", icon: Activity, roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist", "receptionist"] },
    { id: "reception", label: "Reception POS", icon: Receipt, roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist", "receptionist"] },
    { id: "samples", label: "Vials & Barcodes", icon: QrCode, roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist", "receptionist"] },
    { id: "worklists", label: "Worklists", icon: Layers, roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist"] },
    { id: "verifier", label: "QC & Verification", icon: ShieldCheck, roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist"] },
    { id: "reports", label: "Reports & Print", icon: FileText, roles: ["developer", "manager", "admin", "verifier", "biochemist", "technologist", "receptionist"] },
    { id: "test-manager", label: "Test Catalog", icon: Settings, roles: ["developer", "manager", "admin"] },
    { id: "doctor-manager", label: "Doctors", icon: Stethoscope, roles: ["developer", "manager", "admin", "receptionist"] },
    { id: "staff-manager", label: "Staff", icon: UserCheck, roles: ["developer", "manager", "admin"] },
    { id: "lab-settings", label: "Branding", icon: Building2, roles: ["developer"] },
  ];

  const userRole = (currentUser?.role || "").toLowerCase();
  const visibleTabs = allTabs.filter((tab) => tab.roles.includes(userRole));
  const labName = labSettings?.lab_name || "Apex Clinical LIMS";
  const logoData = labSettings?.logo_data || "";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs select-none">
      <div className="max-w-[1720px] mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-4">
          
          {/* 1. Left: Branding */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              {logoData ? (
                <img src={logoData} alt="Logo" className="h-8 w-8 object-contain rounded-md border border-slate-200 p-0.5" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <FlaskConical className="w-4 h-4" />
                </div>
              )}

              <div className="leading-tight">
                <span className="font-bold text-sm text-slate-900 block truncate max-w-[200px] sm:max-w-xs">
                  {labName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  Diagnostic Laboratory System
                </span>
              </div>
            </div>
          </div>

          {/* 2. Center: Fixed Rigid Tabs (Zero Shift on Click) */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 3. Right: Refresh, User & Sign Out */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadDatabaseData}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg"
              title="Sync / Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
              </div>
              <div className="hidden xl:block text-left leading-none">
                <span className="font-semibold text-xs text-slate-800 block truncate max-w-[100px]">
                  {currentUser?.name?.split(" ")[0] || "Staff"}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-mono mt-0.5 block">
                  {currentUser?.role === "developer" ? "Chief Dev" : currentUser?.role}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-3 py-2 space-y-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold border ${
                  isActive ? "bg-blue-600 text-white border-blue-600" : "text-slate-700 hover:bg-slate-100 border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
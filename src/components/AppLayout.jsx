import React, { useState, useMemo, useEffect } from "react";
import {
  FlaskConical, Menu, X, ChevronLeft, ChevronRight, LogOut, RefreshCw,
  Plus, Bell, Activity, Receipt, QrCode, Layers, ShieldCheck,
  FileText, Settings, UserCheck, Building2, Stethoscope, ChevronDown,
  Calendar,
} from "lucide-react";

// ============================================================
// NAV CONFIG — grouped, role-aware. Add new pages here.
// ============================================================
const NAV_GROUPS = [
  {
    id: "workflow",
    label: "Workflow",
    items: [
      { id: "reception",  label: "Reception POS",     icon: Receipt,     roles: ["developer","manager","admin","verifier","biochemist","technologist","receptionist"] },
      { id: "samples",    label: "Vials & Barcodes",  icon: QrCode,      roles: ["developer","manager","admin","verifier","biochemist","technologist","receptionist"] },
      { id: "worklists",  label: "Worklists",         icon: Layers,      roles: ["developer","manager","admin","verifier","biochemist","technologist"] },
      { id: "verifier",   label: "QC & Verification", icon: ShieldCheck, roles: ["developer","manager","admin","verifier","biochemist","technologist"] },
      { id: "reports",    label: "Reports & Print",   icon: FileText,    roles: ["developer","manager","admin","verifier","biochemist","technologist","receptionist"] },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      { id: "dashboard",      label: "Dashboard", icon: Activity,    roles: ["developer","manager","admin","verifier","biochemist","technologist","receptionist"] },
      { id: "doctor-manager", label: "Doctors",   icon: Stethoscope, roles: ["developer","manager","admin","receptionist"] },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    items: [
      { id: "test-manager",  label: "Test Catalog", icon: Settings,  roles: ["developer","manager","admin"] },
      { id: "staff-manager", label: "Staff",        icon: UserCheck, roles: ["developer","manager","admin"] },
      { id: "lab-settings",  label: "Branding",     icon: Building2, roles: ["developer"] },
    ],
  },
];

// ============================================================
// LAYOUT
// ============================================================
export default function AppLayout({
  currentUser,
  labSettings,
  activeTab,
  setActiveTab,
  onLogout,
  onNewOrder,
  isLoading,
  loadDatabaseData,
  children,
  // Optional — date range filter (rendered in the top bar)
  dateRange,
  setDateRange,
  activePreset,
  setPreset,
  setCurrentPage,
}) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("apex_sidebar_collapsed") === "true"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("apex_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  const userRole = (currentUser?.role || "").toLowerCase();

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS
      .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(userRole)) }))
      .filter((g) => g.items.length > 0);
  }, [userRole]);

  const labName = labSettings?.lab_name || "Apex Clinical LIMS";
  const logoData = labSettings?.logo_data || "";

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-200 ${
          collapsed ? "w-[68px]" : "w-64"
        }`}
      >
        <SidebarContent
          labName={labName}
          logoData={logoData}
          collapsed={collapsed}
          visibleGroups={visibleGroups}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <div className="border-t border-slate-200 p-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" /> Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <span className="font-bold text-sm truncate">{labName}</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent
              labName={labName}
              logoData={logoData}
              collapsed={false}
              visibleGroups={visibleGroups}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </aside>
        </>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-3">
            {/* Mobile: hamburger + name */}
            <div className="flex items-center gap-2 lg:hidden shrink-0 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm truncate">{labName}</span>
            </div>

            {/* Desktop: date range picker + quick presets */}
            {dateRange && setDateRange && setPreset && (
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={dateRange.from || ""}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, from: e.target.value });
                      setCurrentPage?.(1);
                    }}
                    className="bg-transparent text-[11px] font-mono outline-none font-semibold text-slate-700"
                  />
                  <span className="text-slate-300">–</span>
                  <input
                    type="date"
                    value={dateRange.to || ""}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, to: e.target.value });
                      setCurrentPage?.(1);
                    }}
                    className="bg-transparent text-[11px] font-mono outline-none font-semibold text-slate-700"
                  />
                </div>

                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {[
                    { key: "TODAY", label: "Today" },
                    { key: "YESTERDAY", label: "Yesterday" },
                    { key: "LAST_7", label: "7D" },
                    { key: "THIS_MONTH", label: "Month" },
                    { key: "ALL", label: "All" },
                  ].map((p) => {
                    const isActive = activePreset === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPreset(p.key)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                          isActive
                            ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={loadDatabaseData}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg"
                title="Sync / Refresh"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={onNewOrder}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" /> New Order
              </button>

              <button
                type="button"
                className="relative p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg"
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-slate-100 rounded-lg transition"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
                  </div>
                  <div className="hidden md:block text-left leading-none pr-1">
                    <span className="font-semibold text-xs text-slate-800 block truncate max-w-[100px]">
                      {currentUser?.name?.split(" ")[0] || "Staff"}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-mono mt-0.5 block">
                      {currentUser?.role === "developer" ? "Chief Dev" : currentUser?.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden text-xs">
                      <div className="p-3 border-b border-slate-100">
                        <p className="font-bold text-slate-900 truncate">{currentUser?.name}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {currentUser?.email}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase">
                          {currentUser?.role}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 text-rose-600 font-semibold transition"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {children}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR CONTENT (shared by desktop + mobile)
// ============================================================
function SidebarContent({ labName, logoData, collapsed, visibleGroups, activeTab, setActiveTab }) {
  return (
    <>
      <div
        className={`flex items-center gap-2.5 border-b border-slate-200 ${
          collapsed ? "px-3 py-3.5 justify-center" : "px-4 py-3.5"
        }`}
      >
        {logoData ? (
          <img
            src={logoData}
            alt="Logo"
            className="h-8 w-8 object-contain rounded-md border border-slate-200 p-0.5 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
        )}
        {!collapsed && (
          <div className="leading-tight min-w-0">
            <span className="font-bold text-sm text-slate-900 block truncate">{labName}</span>
            <span className="text-[10px] text-slate-400 font-medium block">
              Diagnostic Laboratory
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {visibleGroups.map((group) => (
          <div key={group.id} className="px-2 mb-4">
            {!collapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
            )}
            {collapsed && <div className="mx-auto w-6 border-t border-slate-200 mb-2" />}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-semibold transition ${
                        collapsed ? "px-0 py-2 justify-center" : "px-2.5 py-2"
                      } ${
                        isActive
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? "text-white" : "text-slate-400"
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
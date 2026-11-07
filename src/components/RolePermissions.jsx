import React, { useState, useEffect } from "react";
import {
  ShieldCheck, Save, RefreshCw, Check, X
} from "lucide-react";
import { getRolePermissions, saveRolePermissions } from "../services/api";
import { NAV_GROUPS } from "./AppLayout";

// Import the NAV_GROUPS structure directly from AppLayout so it's always in sync
// NOTE: You need to export NAV_GROUPS from AppLayout.jsx for this to work!
// Or, we can just hardcode the list of all tabs here:
// Derived from NAV_GROUPS so it can never drift out of sync with the sidebar.
const ALL_TABS = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ id: item.id, label: item.label }))
);

const ROLES = [
  "receptionist", "technologist", "verifier", "biochemist", 
  "store_keeper", "manager", "admin", "developer"
];

export default function RolePermissions() {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const computeDefaultPermissions = () => {
    const map = {};
    ROLES.forEach((role) => { map[role] = []; });
    NAV_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        (item.roles || []).forEach((role) => {
          if (!map[role]) map[role] = [];
          if (!map[role].includes(item.id)) map[role].push(item.id);
        });
      });
    });
    return map;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRolePermissions();
      const merged = computeDefaultPermissions();

      // DB wins only if the role has a stored row. An empty array
      // stored in the DB still counts as "intentionally none".
      if (data && typeof data === "object") {
        Object.entries(data).forEach(([role, tabs]) => {
          if (tabs !== undefined && tabs !== null) {
            merged[role] = Array.isArray(tabs) ? tabs : [];
          }
        });
      }

      setPermissions(merged);
    } catch (e) {
      alert("Load failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const togglePermission = (role, tabId) => {
    if (role === "developer") return; // developer is always full access
    setPermissions(prev => {
      const currentList = prev[role] || [];
      const hasTab = currentList.includes(tabId);
      const newList = hasTab
        ? currentList.filter(id => id !== tabId)
        : [...currentList, tabId];
      return { ...prev, [role]: newList };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const role of ROLES) {
        if (role === "developer") continue; // AppLayout always grants developer full access
        await saveRolePermissions(role, permissions[role] || []);
      }
      alert("✅ Permissions updated successfully.");
      // Other users will see the changes when they refresh their browser.
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading permissions…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1720px] mx-auto text-slate-900">
      
      {/* Header */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs sm:text-sm text-slate-900">Role Permissions</h2>
            <p className="text-[10px] text-slate-400">Control exactly which modules each staff role can access</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 text-slate-500 hover:text-indigo-600 border border-slate-200 rounded-lg">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Permissions"}
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold text-slate-700 uppercase tracking-wide text-[10px] sticky left-0 bg-slate-50 border-r border-slate-200 min-w-[200px]">
                  Module / Feature
                </th>
                {ROLES.map(role => (
                  <th key={role} className="py-3 px-2 font-bold text-slate-600 uppercase tracking-wide text-[10px] text-center border-r border-slate-200 last:border-0">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ALL_TABS.map(tab => (
                <tr key={tab.id} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-4 font-semibold text-slate-800 sticky left-0 bg-white border-r border-slate-200">
                    {tab.label}
                  </td>
                  {ROLES.map(role => {
                    const isDevLock = role === "developer";
                    const isAllowed = isDevLock
                      ? true // developer always has access — never greyed out
                      : (permissions[role] || []).includes(tab.id);

                    return (
                      <td key={role} className="py-2 px-2 text-center border-r border-slate-100 last:border-0">
                        <button
                          onClick={() => togglePermission(role, tab.id)}
                          disabled={isDevLock}
                          className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition ${
                            isAllowed
                              ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                              : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                          } ${isDevLock ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          {isAllowed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
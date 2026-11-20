// src/components/doctor/CommandPalette.jsx
import { useEffect, useState } from "react";
import { Search, User, FileText, Plus, Calendar, Pill, FlaskConical, BarChart3, Settings } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { sanitizeSearchInput } from "../../services/api";

const ACTIONS = [
  { id: "new",           label: "New Prescription",  icon: Plus },
  { id: "patients",      label: "Find patient",      icon: User },
  { id: "appointments",  label: "Appointments",      icon: Calendar },
  { id: "prescriptions", label: "Prescription history", icon: FileText },
  { id: "medicines",     label: "Medicine library",  icon: Pill },
  { id: "investigations",label: "Investigations",    icon: FlaskConical },
  { id: "reports",       label: "Reports",           icon: BarChart3 },
  { id: "settings",      label: "Settings",          icon: Settings },
];

export default function CommandPalette({ open, onClose, doctorId, onNavigate }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);

  useEffect(() => { if (!open) { setQ(""); setHits([]); } }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) return setHits([]);
    let alive = true;
    const t = setTimeout(async () => {
      const safe = sanitizeSearchInput(q.trim());
      if (!safe) return;
      const { data } = await supabase
        .from("patients")
        .select("id,full_name,phone,uhid")
        .or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,uhid.ilike.%${safe}%`)
        .limit(8);
      if (alive) setHits(data || []);
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [q, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center pt-24 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-xl overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search patients or jump to a page…"
            className="flex-1 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {q.trim().length < 2 ? (
            <ul>
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => { onNavigate(a.id); onClose(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      {a.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : hits.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">No results.</p>
          ) : (
            <ul>
              {hits.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => { onNavigate("patients"); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                      {p.full_name?.[0] || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate">{p.full_name}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {p.phone || "—"} {p.uhid ? `· ${p.uhid}` : ""}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
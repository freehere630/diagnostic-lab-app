// src/components/doctor/Investigations.jsx
import { useState, useEffect } from "react";
import { FlaskConical, Calendar } from "lucide-react";
import { listInvestigationOrders } from "../../services/doctorApi";
import { Card, Empty, Loading } from "./shared";

export default function Investigations({ doctorId }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    let alive = true;
    setLoading(true);
    listInvestigationOrders({ doctorId, status: filter })
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(console.error)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [doctorId, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Investigations</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track ordered lab tests and imaging.</p>
      </div>

      <div className="flex gap-1.5">
        {["ALL", "ordered", "in_progress", "completed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filter === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {!loading && rows.length === 0 && (
        <Card>
          <Empty icon={FlaskConical} title="No investigations found" hint="Orders will appear here once placed." />
        </Card>
      )}

      {!loading && rows.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Patient ID: {r.patient_id || "—"}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {r.tests?.map(t => t.name || t).join(", ") || "No tests listed"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
                    {r.status}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(r.ordered_at).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
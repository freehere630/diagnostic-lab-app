// src/components/doctor/DoctorHome.jsx
import { useEffect, useState } from "react";
import {
  Calendar, Users, Activity, CheckCircle2, Clock, ArrowRight, Plus,
  Search, FileText, Stethoscope,
} from "lucide-react";
import { getDoctorHomeSnapshot } from "../../services/doctorApi";
import { Card, Loading } from "./shared";

const Stat = ({ icon: Icon, label, value, tone = "slate" }) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
  </Card>
);

export default function DoctorHome({ greeting, doctorId, doctorName, onNavigate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!doctorId) return;
    let alive = true;
    getDoctorHomeSnapshot({ doctorId })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [doctorId]);

  return (
    <div className="space-y-8">
      {/* Greeting — quiet, not a banner */}
      <div>
        <h1 className="text-xl font-semibold">
          {greeting}{doctorName ? `, ${doctorName.replace(/^Dr\.?\s*/i, "Dr. ")}` : ""}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: "new", label: "New Prescription", icon: Plus, primary: true },
          { id: "patients", label: "Find Patient", icon: Search },
          { id: "appointments", label: "Appointments", icon: Calendar },
          { id: "prescriptions", label: "History", icon: FileText },
        ].map(({ id, label, icon: Icon, primary }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${
              primary
                ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {err && <Card className="p-4 text-sm text-red-600">{err}</Card>}
      {!data && !err && <Loading />}
      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={Users} label="Patients today" value={data.todayPatients} />
            <Stat icon={Calendar} label="Appointments" value={data.todayAppointments} />
            <Stat icon={Clock} label="Waiting" value={data.waiting} />
            <Stat icon={CheckCircle2} label="Completed" value={data.completed} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent prescriptions */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Recent prescriptions</h2>
                <button
                  onClick={() => onNavigate("prescriptions")}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {data.recent.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No prescriptions yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recent.map((r) => (
                    <li
                      key={r.id}
                      className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.patient_name || "—"}</div>
                        <div className="text-xs text-slate-400 truncate">{r.diagnosis || "No diagnosis"}</div>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Follow-ups due today */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Follow-ups today</h2>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
              {data.followUpsDue.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">Nothing scheduled.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.followUpsDue.map((f) => (
                    <li key={f.id} className="py-2.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div className="text-sm">{f.patient_name || "—"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
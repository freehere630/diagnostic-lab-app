// src/components/doctor/Appointments.jsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Clock, CheckCircle2, XCircle, Play, Calendar } from "lucide-react";
import {
  listAppointments, createAppointment, updateAppointmentStatus, deleteAppointment,
} from "../../services/doctorApi";
import { Card, Btn, Input, Field, Empty, Loading } from "./shared";

const STATUS = ["waiting", "in_consultation", "completed", "cancelled", "missed"];
const STATUS_LABEL = {
  waiting: "Waiting",
  in_consultation: "In Consultation",
  completed: "Completed",
  cancelled: "Cancelled",
  missed: "Missed",
};
const STATUS_STYLE = {
  waiting: "bg-amber-50 text-amber-700 border-amber-200",
  in_consultation: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  missed: "bg-red-50 text-red-700 border-red-200",
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Appointments({ doctorId }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAppointments({
        doctorId,
        from: `${todayStr()}T00:00:00`,
        to: `${todayStr()}T23:59:59`,
      });
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (doctorId) load(); }, [doctorId]);

  const filtered = useMemo(
    () => (filter === "ALL" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  const counts = useMemo(() => {
    const c = { ALL: rows.length };
    for (const s of STATUS) c[s] = rows.filter((r) => r.status === s).length;
    return c;
  }, [rows]);

  const setStatus = async (id, status) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try { await updateAppointmentStatus(id, status); } catch { load(); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this appointment?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    try { await deleteAppointment(id); } catch { load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Appointments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Btn onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> Book</Btn>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {["ALL", ...STATUS].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filter === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {s === "ALL" ? "All" : STATUS_LABEL[s]} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {!loading && filtered.length === 0 && (
        <Card><Empty icon={Calendar} title="No appointments" hint="Book a new one to get started." /></Card>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4 flex items-center gap-4">
              <div className="w-16 text-center shrink-0">
                <div className="text-sm font-semibold tabular-nums">
                  {new Date(r.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-[11px] text-slate-400">
                  {r.token_no ? `#${r.token_no}` : ""}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.patient_name}</div>
                <div className="text-xs text-slate-400 truncate">
                  {r.patient_phone || "—"}{r.notes ? ` · ${r.notes}` : ""}
                </div>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
              <div className="flex items-center gap-1">
                {r.status === "waiting" && (
                  <button title="Start consultation" onClick={() => setStatus(r.id, "in_consultation")}
                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50">
                    <Play className="w-4 h-4" />
                  </button>
                )}
                {r.status === "in_consultation" && (
                  <button title="Mark completed" onClick={() => setStatus(r.id, "completed")}
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                {r.status !== "cancelled" && r.status !== "completed" && (
                  <button title="Cancel" onClick={() => setStatus(r.id, "cancelled")}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showNew && (
        <NewAppointmentModal
          doctorId={doctorId}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}

function NewAppointmentModal({ doctorId, onClose, onCreated }) {
  const [form, setForm] = useState({
    patient_name: "", patient_phone: "",
    scheduled_at: `${todayStr()}T${String(new Date().getHours() + 1).padStart(2, "0")}:00`,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.patient_name.trim()) return setErr("Patient name is required.");
    setSaving(true); setErr("");
    try {
      await createAppointment({
        doctor_id: doctorId,
        patient_name: form.patient_name.trim(),
        patient_phone: form.patient_phone.trim() || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        status: "waiting",
        notes: form.notes.trim() || null,
      });
      onCreated();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold">Book appointment</h2>
        <Field label="Patient name">
          <Input value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} autoFocus />
        </Field>
        <Field label="Phone">
          <Input value={form.patient_phone} onChange={(e) => setForm({ ...form, patient_phone: e.target.value })} />
        </Field>
        <Field label="Scheduled at">
          <Input type="datetime-local" value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
        </Field>
        <Field label="Notes">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Book"}</Btn>
        </div>
      </form>
    </div>
  );
}
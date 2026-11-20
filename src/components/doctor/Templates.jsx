// src/components/doctor/Templates.jsx
import { useEffect, useState } from "react";
import { FileText, Trash2, Plus, Pencil } from "lucide-react";
import { listTemplates, upsertTemplate, deleteTemplate } from "../../services/doctorApi";
import { Card, Btn, Input, Field, Empty, Loading } from "./shared";

export default function Templates({ doctorId, onUse }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await listTemplates(doctorId)); } finally { setLoading(false); }
  };
  useEffect(() => { if (doctorId) load(); }, [doctorId]);

  const remove = async (id) => {
    if (!confirm("Delete this template?")) return;
    await deleteTemplate(id);
    setRows((p) => p.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Reusable prescriptions for common cases.</p>
        </div>
        <Btn onClick={() => setEditing({ name: "", payload: {} })}>
          <Plus className="w-4 h-4" /> New
        </Btn>
      </div>

      {loading && <Loading />}
      {!loading && rows.length === 0 && (
        <Card>
          <Empty icon={FileText} title="No templates yet" hint="Create one for Fever, Gastritis, common cold…" />
        </Card>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Updated {new Date(t.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(t)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Btn variant="outline" onClick={() => onUse?.(t)}>Use template</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor
          doctorId={doctorId}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function TemplateEditor({ doctorId, initial, onClose, onSaved }) {
  const [name, setName] = useState(initial.name || "");
  const [diagnosis, setDiagnosis] = useState(initial.payload?.diagnosis || "");
  const [advice, setAdvice] = useState(initial.payload?.advice || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Name is required.");
    setSaving(true); setErr("");
    try {
      await upsertTemplate({
        id: initial.id,
        doctor_id: doctorId,
        name: name.trim(),
        payload: { diagnosis, advice, medicines: [], investigations: [] },
      });
      onSaved();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-base font-semibold">{initial.id ? "Edit" : "New"} template</h2>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus
            placeholder="e.g. Fever, Gastritis" />
        </Field>
        <Field label="Suggested diagnosis">
          <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </Field>
        <Field label="Advice">
          <textarea
            value={advice} onChange={(e) => setAdvice(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder="Rest, hydration, warning signs…"
          />
        </Field>
        <p className="text-[11px] text-slate-400">
          Medicines & investigations can be added to the template from a saved prescription later.
        </p>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </div>
  );
}
// src/components/doctor/PatientDirectory.jsx
import { useState, useEffect } from "react";
import { Search, User, Phone, Plus } from "lucide-react";
import { searchPatients } from "../../services/api";
import { Card, Input, Btn, Empty, Loading } from "./shared";

export default function PatientDirectory({ currentUser, onNewPrescription }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchPatients(q.trim());
        if (alive) setResults(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Patients</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search by name, phone, or UHID.</p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search patients..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>
      </Card>

      {loading && <Loading />}
      
      {!loading && q.trim().length >= 2 && results.length === 0 && (
        <Card>
          <Empty icon={User} title="No patients found" hint="Try a different name or phone number." />
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((p) => (
            <Card key={p.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="text-sm font-medium">{p.full_name}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> {p.phone || "—"}
                </div>
                {p.uhid && <div className="text-[11px] text-slate-400 mt-0.5">UHID: {p.uhid}</div>}
              </div>
              <div className="mt-4 flex gap-2">
                <Btn variant="outline" className="w-full" onClick={() => onNewPrescription(p)}>
                  <Plus className="w-3.5 h-3.5" /> New Rx
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
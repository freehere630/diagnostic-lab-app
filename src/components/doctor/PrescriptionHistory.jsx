// src/components/doctor/PrescriptionHistory.jsx
import { useState, useEffect } from "react";
import { FileText, Search, Calendar } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { Card, Input, Empty, Loading } from "./shared";

export default function PrescriptionHistory({ doctorId, onOpen }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    let alive = true;
    setLoading(true);
    
    const fetchPrescriptions = async () => {
      let query = supabase
        .from("prescriptions")
        .select("id, patient_name, diagnosis, created_at")
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (q.trim().length >= 2) {
        query = query.ilike("patient_name", `%${q.trim()}%`);
      }

      const { data, error } = await query;
      if (alive) {
        if (!error) setRows(data || []);
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPrescriptions, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [doctorId, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Prescription History</h1>
        <p className="text-sm text-slate-500 mt-0.5">View and reprint previous prescriptions.</p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search by patient name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </Card>

      {loading && <Loading />}
      
      {!loading && rows.length === 0 && (
        <Card>
          <Empty icon={FileText} title="No prescriptions found" hint="Any prescriptions you write will appear here." />
        </Card>
      )}

      {!loading && rows.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li 
                key={r.id} 
                className="p-4 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer" 
                onClick={() => onOpen?.(r.id)}
              >
                <div>
                  <div className="text-sm font-medium">{r.patient_name || "—"}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{r.diagnosis || "No diagnosis"}</div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
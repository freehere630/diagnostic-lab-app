// src/components/doctor/Reports.jsx
import { useState, useEffect } from "react";
import { BarChart3, Users, FileText } from "lucide-react";
import { getDoctorReport } from "../../services/doctorApi";
import { Card, Loading } from "./shared";

export default function Reports({ doctorId }) {
  const [range, setRange] = useState("month"); // day | week | month
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return;
    
    // Calculate dates
    const now = new Date();
    let from = new Date();
    if (range === "day") from.setHours(0, 0, 0, 0);
    else if (range === "week") from.setDate(now.getDate() - 7);
    else from.setMonth(now.getMonth() - 1);

    let alive = true;
    setLoading(true);
    getDoctorReport({ doctorId, from: from.toISOString(), to: now.toISOString() })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(console.error)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [doctorId, range]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your consultation stats.</p>
      </div>

      <div className="flex gap-1.5">
        {[
          { id: "day", label: "Today" },
          { id: "week", label: "This Week" },
          { id: "month", label: "This Month" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setRange(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              range === t.id
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Prescriptions
              </div>
              <div className="mt-2 text-2xl font-semibold">{data.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Patients Seen
              </div>
              <div className="mt-2 text-2xl font-semibold">{data.uniquePatients}</div>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" /> Top Diagnoses
            </h2>
            {data.topDiagnoses.length === 0 ? (
              <p className="text-sm text-slate-400">No diagnoses recorded in this period.</p>
            ) : (
              <ul className="space-y-3">
                {data.topDiagnoses.map(([dx, count]) => {
                  // Calculate percentage for the simple bar chart
                  const max = data.topDiagnoses[0][1];
                  const width = `${Math.max((count / max) * 100, 5)}%`;
                  return (
                    <li key={dx}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{dx}</span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
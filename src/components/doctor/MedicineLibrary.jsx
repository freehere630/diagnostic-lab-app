// src/components/doctor/MedicineLibrary.jsx
import { useEffect, useState } from "react";
import { Pill, Star, Trash2, Plus, Search } from "lucide-react";
import { searchMedicines } from "../../services/prescriptionApi";
import {
  listFavoriteMedicines, addFavoriteMedicine, removeFavoriteMedicine,
} from "../../services/doctorApi";
import { Card, Btn, Input, Field, Empty, Loading } from "./shared";

export default function MedicineLibrary({ doctorId }) {
  const [tab, setTab] = useState("favorites"); // favorites | search
  const [favs, setFavs] = useState([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadFavs = async () => {
    const rows = await listFavoriteMedicines(doctorId);
    setFavs(rows);
  };

  useEffect(() => { if (doctorId) loadFavs(); }, [doctorId]);

  useEffect(() => {
    if (tab !== "search" || q.trim().length < 2) return setResults([]);
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const rows = await searchMedicines(q.trim(), 20);
        if (alive) setResults(rows || []);
      } finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, tab]);

  const isFav = (m) =>
    favs.some(
      (f) => f.brand_name === m.brand_name && f.strength === m.strength && f.dosage_form === m.dosage_form
    );

  const toggleFav = async (m) => {
    const existing = favs.find(
      (f) => f.brand_name === m.brand_name && f.strength === m.strength && f.dosage_form === m.dosage_form
    );
    if (existing) {
      setFavs((p) => p.filter((x) => x.id !== existing.id));
      await removeFavoriteMedicine(existing.id);
    } else {
      await addFavoriteMedicine({
        doctor_id: doctorId,
        brand_name: m.brand_name,
        generic_name: m.generic_name || null,
        strength: m.strength || null,
        dosage_form: m.dosage_form || null,
        manufacturer: m.manufacturer || null,
      });
      loadFavs();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Medicine Library</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your favorites and quick search.</p>
      </div>

      <div className="flex gap-1.5">
        {[
          { id: "favorites", label: `Favorites (${favs.length})` },
          { id: "search", label: "Search catalog" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              tab === t.id
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "favorites" && (
        <Card>
          {favs.length === 0 ? (
            <Empty icon={Star} title="No favorites yet" hint="Search the catalog and star medicines you use often." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {favs.map((f) => (
                <li key={f.id} className="p-3 flex items-center gap-3">
                  <Pill className="w-4 h-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {f.brand_name} {f.strength ? `· ${f.strength}` : ""}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {f.generic_name || "—"} · {f.dosage_form || "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFav(f)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "search" && (
        <Card className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search by brand or generic name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>

          <div className="mt-3">
            {loading && <Loading />}
            {!loading && q.trim().length < 2 && (
              <p className="text-xs text-slate-400 py-4">Type at least 2 characters.</p>
            )}
            {!loading && results.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {results.map((m, i) => (
                  <li key={m.id || i} className="py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.brand_name} {m.strength ? `· ${m.strength}` : ""}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {m.generic_name || "—"} · {m.dosage_form || "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFav(m)}
                      className={`p-1.5 rounded-lg ${isFav(m) ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:bg-slate-100"}`}
                      title={isFav(m) ? "Remove favorite" : "Add favorite"}
                    >
                      <Star className={`w-4 h-4 ${isFav(m) ? "fill-current" : ""}`} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
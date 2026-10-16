import React, { useState, useEffect, useRef } from "react";
import { Search, User, Phone, Barcode as BarcodeIcon, X, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { sanitizeSearchInput } from "../services/api";

export default function GlobalSearch({ onPickPatient, onPickOrder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Debounced query
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      // Sanitize before building the .or() filter — PostgREST treats
      // , . : ( ) [ ] " ' % * and backslash as control characters, so a
      // stray comma from a patient name can break the request line.
      const q = sanitizeSearchInput(query);
      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Search both patients and orders in parallel
        const [patRes, ordRes] = await Promise.all([
          supabase
            .from("patients")
            .select("id, name, phone, age, gender")
            .or(`name.ilike.%${q}%,id.ilike.%${q}%,phone.ilike.%${q}%`)
            .limit(6),
          supabase
            .from("orders")
            .select("id, barcode, order_date, patient_id, patient:patients(id, name, phone)")
            .or(`barcode.ilike.%${q}%,id.ilike.%${q}%`)
            .order("order_date", { ascending: false })
            .limit(6),
        ]);

        const patients = (patRes.data || []).map((p) => ({
          kind: "patient",
          id: p.id,
          name: p.name,
          phone: p.phone,
          age: p.age,
          gender: p.gender,
        }));

        const orders = (ordRes.data || []).map((o) => ({
          kind: "order",
          id: o.id,
          barcode: o.barcode,
          date: o.order_date,
          patientId: o.patient?.id || o.patient_id,
          patientName: o.patient?.name || "Patient",
        }));

        setResults([...orders, ...patients]);
      } catch (e) {
        console.error("Global search error:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  const handlePick = (item) => {
    if (item.kind === "order") {
      onPickOrder?.(item.id);
    } else {
      onPickPatient?.(item.id);
    }
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <div ref={wrapRef} className="relative">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
          title="Search patients, orders, barcodes"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden md:inline text-[9px] font-mono text-slate-400 border border-slate-200 rounded px-1 ml-1">
            /
          </kbd>
        </button>
      ) : (
        <div className="flex items-center bg-white border border-blue-500 rounded-lg shadow-sm w-72 md:w-96">
          <Search className="w-3.5 h-3.5 text-slate-400 ml-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name, phone, UHID, or barcode…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "Enter" && results[0]) handlePick(results[0]);
            }}
            className="flex-1 px-2 py-1.5 text-xs outline-none bg-transparent"
          />
          {loading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin mr-1" />}
          <button
            type="button"
            onClick={close}
            className="p-1 mr-1 text-slate-400 hover:text-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Results dropdown */}
          {query.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto">
              {results.length === 0 && !loading ? (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  No matches found for "{query}"
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {results.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => handlePick(item)}
                        className="w-full p-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 transition"
                      >
                        {item.kind === "order" ? (
                          <BarcodeIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          {item.kind === "order" ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-blue-700">
                                  {item.barcode}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {item.date}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-700 truncate">
                                {item.patientName}
                                {item.patientId && (
                                  <span className="ml-1.5 font-mono text-[10px] text-slate-500">
                                    {item.patientId}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-semibold text-xs text-slate-800 truncate">
                                {item.name}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                <span>{item.id}</span>
                                {item.phone && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="w-2.5 h-2.5" /> {item.phone}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
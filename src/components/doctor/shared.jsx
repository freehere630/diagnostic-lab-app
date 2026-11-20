// src/components/doctor/shared.jsx
import { Loader2 } from "lucide-react";

export const Btn = ({ children, variant = "primary", className = "", ...p }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2",
    ghost: "text-slate-600 hover:bg-slate-100 px-3 py-2",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2",
    danger: "text-red-600 hover:bg-red-50 px-3 py-2",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...p}>
      {children}
    </button>
  );
};

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 rounded-xl ${className}`}>{children}</div>
);

export const Empty = ({ icon: Icon, title, hint }) => (
  <div className="text-center py-16">
    {Icon && <Icon className="w-8 h-8 text-slate-300 mx-auto mb-3" />}
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

export const Loading = () => (
  <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
  </div>
);

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-medium text-slate-500 mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
  </label>
);

export const Input = (p) => (
  <input
    {...p}
    className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${p.className || ""}`}
  />
);
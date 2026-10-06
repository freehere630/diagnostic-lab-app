import React, { useState } from "react";
import { FlaskConical, Lock, Mail, ShieldCheck, ArrowRight } from "lucide-react";
import { getStaffUsers } from "../services/api";

// Master Developer Account (Permanent Fail-Safe Credentials)
export const MASTER_DEVELOPER = {
  id: "DEV-001",
  role: "developer",
  roleName: "Chief System Developer",
  email: "rtraju630@gmail.com",
  password: "raju1234",
  name: "Md. Raju Sheikh",
  title: "Chief System Architect & Developer",
  avatarBg: "bg-indigo-600"
};

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    const inputEmail = email.trim().toLowerCase();
    const inputPass = password;

    // 1. Check Developer Account
    if (inputEmail === MASTER_DEVELOPER.email && inputPass === MASTER_DEVELOPER.password) {
      setIsSubmitting(false);
      onLoginSuccess(MASTER_DEVELOPER);
      return;
    }

    // 2. Check Database Registered Staff
    try {
      const staffList = await getStaffUsers();
      const matched = staffList.find(
        (u) => u.email?.trim().toLowerCase() === inputEmail && u.password === inputPass
      );

      if (matched) {
        onLoginSuccess({
          id: matched.id,
          role: matched.role,
          name: matched.full_name,
          designation: matched.designation,
          email: matched.email,
          signature_data: matched.signature_data,
          avatarBg: 
            matched.role === "manager" ? "bg-purple-600" :
            matched.role === "verifier" ? "bg-amber-600" :
            matched.role === "technologist" ? "bg-emerald-600" : "bg-blue-600"
        });
        return;
      }
    } catch (err) {
      console.warn("DB login check notice:", err);
    }

    setIsSubmitting(false);
    setErrorMsg("Invalid email or password. Please verify credentials.");
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center p-4 text-slate-900">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        
        {/* Brand Banner */}
        <div className="p-6 pb-4 text-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2.5 text-white shadow-xs">
            <FlaskConical className="w-5 h-5" />
          </div>
          <h1 className="text-base font-bold tracking-tight text-slate-900">Apex Clinical LIMS</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Laboratory Operating & Reporting System</p>
        </div>

        {/* Credentials Form */}
        <div className="p-6 pt-0 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg font-semibold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Workstation Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@lab.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600 text-[11px] block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-xs transition flex items-center justify-center gap-1.5 active:scale-[0.98] mt-2"
            >
              <span>{isSubmitting ? "Authenticating..." : "Authorize Workstation"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
            Protected Medical System • ISO 15189:2022 Compliant
          </div>
        </div>

      </div>
    </div>
  );
}
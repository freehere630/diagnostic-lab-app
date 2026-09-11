import React, { useState } from "react";
import { FlaskConical, Lock, Mail, ShieldCheck } from "lucide-react";
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
          role: matched.role, // 'manager', 'verifier', 'technologist', 'receptionist'
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
    setErrorMsg("Invalid email or password. Please verify your credentials.");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-800 w-full">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 p-8 text-white text-center">
          <div className="p-3 bg-white/10 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
            <FlaskConical className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Apex Clinical LIMS</h1>
          <p className="text-xs text-blue-200 mt-1">Enterprise Laboratory Operating System</p>
        </div>

        {/* Credentials Form */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-base font-bold text-slate-900">Workstation Authentication</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your designated laboratory email and password</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="e.g. rtraju630@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" /> 
              {isSubmitting ? "Authenticating..." : "Authorize & Enter Workstation"}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
            Protected Medical System • ISO 15189:2022 Compliant
          </div>
        </div>

      </div>
    </div>
  );
}
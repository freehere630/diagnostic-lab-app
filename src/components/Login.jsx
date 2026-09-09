import React, { useState } from "react";
import { FlaskConical, Lock, Mail, ShieldCheck, ArrowRight } from "lucide-react";

export const PRESET_USERS = [
  {
    role: "admin",
    roleName: "Lab Manager / Admin",
    email: "admin@apexlab.com",
    password: "admin123",
    name: "Dr. Arthur Pendelton",
    title: "Chief Laboratory Director",
    avatarBg: "bg-purple-600"
  },
  {
    role: "receptionist",
    roleName: "Receptionist / Front Desk",
    email: "reception@apexlab.com",
    password: "rec123",
    name: "Sadia Sultana",
    title: "Front Desk Executive",
    avatarBg: "bg-blue-600"
  },
  {
    role: "technologist",
    roleName: "Medical Lab Technologist",
    email: "tech@apexlab.com",
    password: "tech123",
    name: "Md. Al-Amin",
    title: "Senior Medical Technologist",
    avatarBg: "bg-emerald-600"
  },
  {
    role: "verifier",
    roleName: "Biochemist / Verifier",
    email: "biochemist@apexlab.com",
    password: "bio123",
    name: "Dr. S. Rahman",
    title: "Consultant Biochemist & QC Incharge",
    avatarBg: "bg-amber-600"
  }
];

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = (e) => {
    e?.preventDefault();
    setErrorMsg("");

    const user = PRESET_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );

    if (user) {
      onLoginSuccess(user);
    } else {
      setErrorMsg("Invalid credentials. Enter matching email and password, or use 1-click login.");
    }
  };

  const handleQuickLogin = (user) => {
    setEmail(user.email);
    setPassword(user.password);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800 w-full">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Left Side: 1-Click Quick Demo Sign-In */}
        <div className="bg-slate-950 p-8 sm:p-10 text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
                <FlaskConical className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">Apex Clinical LIMS</h1>
                <p className="text-xs text-slate-400">Enterprise Laboratory OS</p>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                1-Click Demo Sign-In
              </h3>
              <div className="space-y-2">
                {PRESET_USERS.map((user) => (
                  <button
                    key={user.role}
                    type="button"
                    onClick={() => handleQuickLogin(user)}
                    className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 rounded-xl flex items-center justify-between text-left transition group"
                  >
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-blue-400 transition">{user.roleName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{user.email} • Pass: {user.password}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>ISO 15189 Certified</span>
            <span>Role-Based Access</span>
          </div>
        </div>

        {/* Right Side: Manual Credentials Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Sign in to your workstation</h2>
            <p className="text-xs text-slate-500 mt-1">Select your designated laboratory access role</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
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
                  placeholder="e.g. admin@apexlab.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                  placeholder="Enter role password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4" /> Authenticate & Open Workspace
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
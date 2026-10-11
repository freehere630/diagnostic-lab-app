// src/services/authApi.js
import { supabase } from "../supabaseClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function loginWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);

  const profile = await fetchProfileForUser(data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error(
      "No staff profile linked to this account. Please contact your administrator."
    );
  }

  return mapUser(data.user, profile);
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export async function fetchProfileForUser(userId) {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export function mapUser(authUser, profile) {
  return {
    id: authUser.id,
    email: authUser.email,
    name: profile.full_name,
    role: profile.role,
    designation: profile.designation || "",
    signature_data: profile.signature_data || profile.full_name,
    is_active: profile.is_active,
  };
}

export async function createStaffUser({
  fullName,
  email,
  password,
  role,
  designation,
  signatureData,
}) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-staff-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      fullName,
      email,
      password,
      role,
      designation,
      signatureData,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || `Request failed (${res.status})`);
  return payload;
}

export async function deleteStaffUser(userId) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-staff-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ userId }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || `Request failed (${res.status})`);
  return payload;
}
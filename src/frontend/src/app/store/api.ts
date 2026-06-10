/**
 * api.ts — Centralized API client for PedalWrite / Bike First!
 *
 * All types mirror the actual Django serializers exactly.
 * Account.Roles: "admin" | "leader" | "caregiver" | "anonymous"
 * All model ids are UUIDs (strings) except BikeSpecs (no pk exposed).
 */

import { auth, loginWithGoogle as firebaseLoginWithGoogle, logoutFromFirebase } from "./firebase";

const BASE = "/api";

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? body.error ?? JSON.stringify(body);
    } catch { /* ignore */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function get<T>(path: string) { return request<T>(path, { method: "GET" }); }
function post<T>(path: string, body: unknown) { return request<T>(path, { method: "POST", body: JSON.stringify(body) }); }
function patch<T>(path: string, body: unknown) { return request<T>(path, { method: "PATCH", body: JSON.stringify(body) }); }
function del<T>(path: string) { return request<T>(path, { method: "DELETE" }); }

// ─── Role type (matches Account.Roles choices exactly) ───────────────────────
export type AccountRole = "admin" | "leader" | "caregiver" | "anonymous";

// ─── Types (mirrors serializers exactly) ─────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  firebase_uid: string;
  role: AccountRole | null;
  leader: string | null;
  caregiver: string | null;
}

export interface ApiSession {
  id: string;
  sessionnumber: number;
  starttime: string;
  endtime: string;
}

export interface ApiSkill {
  id: string;
  skillname: string;
  formlevel: number;
  category: string;
}

export interface ApiLeader {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  name: string; // read_only computed
  riders?: ApiRider[]; // read_only nested
}

export interface ApiRider {
  id: string;
  firstname: string;
  lastname: string;
  isquickstart: boolean;
  session: string | null;
  session_number: number | null; // read_only
  leader: string | null;
  leader_name: string | null;    // read_only
  caregivers: string[];          // list of caregiver UUIDs
}

export interface ApiDailyFormSkill {
  id: string;
  skill: string;
  skill_name: string; // read_only
  level: number;      // SkillLevel: 0=Intro 1=Model 2=Support 3=Encourage 4=Release
  comments: string;
}

export interface ApiFinalFormSkill {
  id: string;
  skill: string;
  skill_name: string;
  level: number;
  comments: string;
}

// Write-only shape for nested skill_links when creating/updating a form
export interface ApiDailyFormSkillInput {
  skill: string;
  level: number;
  comments: string;
}

export interface ApiFinalFormSkillInput {
  skill: string;
  level: number;
  comments: string;
}

export interface ApiDailyForm {
  id: string;
  date: string;
  rider: string;
  session: string | null;
  session_number: number | null;
  leader: string | null;
  leader_name: string | null;
  comments: string;
  level: number;
  skill_links: ApiDailyFormSkill[];
}

export interface ApiFinalForm {
  id: string;
  date: string;
  rider: string;
  session: string | null;
  session_number: number | null;
  leader: string | null;
  leader_name: string | null;
  comments: string;
  level: number;
  skill_links: ApiFinalFormSkill[];
}

// Used when POSTing/PATCHing — skill_links are write-only inputs, no id/skill_name
export interface ApiDailyFormWrite extends Omit<ApiDailyForm, 'skill_links'> {
  skill_links: ApiDailyFormSkillInput[];
}

export interface ApiFinalFormWrite extends Omit<ApiFinalForm, 'skill_links'> {
  skill_links: ApiFinalFormSkillInput[];
}

export interface ApiCaregiver {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  isemergencycontact: boolean;
  name: string; // read_only computed
  riders: string[];
}

export interface ApiCaregiverRider {
  id: string;
  caregiver: string;
  rider: string;
  firstname: string;
  lastname: string;
  phone: string;
  email: string;
  isemergencycontact: boolean;
}

export interface ApiRiderNested {
  id: string;
  firstname: string;
  lastname: string;
  isquickstart: boolean;
  session: string | null;
  session_number: number | null;
  leader: string | null;
  leader_name: string | null;
}

export interface ApiBike {
  id: string;
  size: string;
  name: string;
  riders: ApiRiderNested[]; // nested read-only
}

export interface ApiBikeSpecs {
  id: number;
  bike: string;
  rider: string | null;
  day: number;           // Days: 1–5
  seat_height: number;
  left_piston: number;
  right_piston: number;
}

export interface ApiGeneralStats {
  riders: number;
  sessions: number;
  daily_forms: number;
  final_forms: number;
}

export interface ApiAccountUser {
  uid: string;
  email: string;
  role: AccountRole | null;
  account_id: string | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginWithGoogle(): Promise<ApiUser> {
  await firebaseLoginWithGoogle();
  return fetchMe();
}

export async function logout(): Promise<void> {
  await logoutFromFirebase();
}

export function fetchMe() {
  return get<ApiUser>("/me/");
}

// ─── Riders ───────────────────────────────────────────────────────────────────

export function fetchRiders() { return get<ApiRider[]>("/riders/"); }
export function fetchRider(id: string) { return get<ApiRider>(`/riders/${id}/`); }
export function createRider(data: Partial<ApiRider>) { return post<ApiRider>("/riders/", data); }
export function updateRider(id: string, data: Partial<ApiRider>) { return patch<ApiRider>(`/riders/${id}/`, data); }
export function deleteRider(id: string) { return del<void>(`/riders/${id}/`); }

// ─── Daily Forms ──────────────────────────────────────────────────────────────

export function fetchDailyForms() { return get<ApiDailyForm[]>("/daily-forms/"); }
export function fetchDailyForm(id: string) { return get<ApiDailyForm>(`/daily-forms/${id}/`); }
export function createDailyForm(data: Partial<ApiDailyFormWrite>) { return post<ApiDailyForm>("/daily-forms/", data); }
export function updateDailyForm(id: string, data: Partial<ApiDailyFormWrite>) { return patch<ApiDailyForm>(`/daily-forms/${id}/`, data); }
export function deleteDailyForm(id: string) { return del<void>(`/daily-forms/${id}/`); }

// ─── Final Forms ──────────────────────────────────────────────────────────────

export function fetchFinalForms() { return get<ApiFinalForm[]>("/final-forms/"); }
export function fetchFinalForm(id: string) { return get<ApiFinalForm>(`/final-forms/${id}/`); }
export function createFinalForm(data: Partial<ApiFinalFormWrite>) { return post<ApiFinalForm>("/final-forms/", data); }
export function updateFinalForm(id: string, data: Partial<ApiFinalFormWrite>) { return patch<ApiFinalForm>(`/final-forms/${id}/`, data); }
export function deleteFinalForm(id: string) { return del<void>(`/final-forms/${id}/`); }

// ─── Form Skills (individual endpoints, used for reads) ───────────────────────
// Note: creation goes via nested skill_links on the form POST/PATCH

export function createDailyFormSkill(data: Partial<ApiDailyFormSkill>) { return post<ApiDailyFormSkill>("/daily-form-skills/", data); }
export function updateDailyFormSkill(id: string, data: Partial<ApiDailyFormSkill>) { return patch<ApiDailyFormSkill>(`/daily-form-skills/${id}/`, data); }
export function deleteDailyFormSkill(id: string) { return del<void>(`/daily-form-skills/${id}/`); }
export function createFinalFormSkill(data: Partial<ApiFinalFormSkill>) { return post<ApiFinalFormSkill>("/final-form-skills/", data); }
export function updateFinalFormSkill(id: string, data: Partial<ApiFinalFormSkill>) { return patch<ApiFinalFormSkill>(`/final-form-skills/${id}/`, data); }
export function deleteFinalFormSkill(id: string) { return del<void>(`/final-form-skills/${id}/`); }

// ─── Caregivers ───────────────────────────────────────────────────────────────

export function fetchCaregivers() { return get<ApiCaregiver[]>("/caregivers/"); }
export function fetchCaregiver(id: string) { return get<ApiCaregiver>(`/caregivers/${id}/`); }
export function createCaregiver(data: Partial<ApiCaregiver>) { return post<ApiCaregiver>("/caregivers/", data); }
export function updateCaregiver(id: string, data: Partial<ApiCaregiver>) { return patch<ApiCaregiver>(`/caregivers/${id}/`, data); }
export function deleteCaregiver(id: string) { return del<void>(`/caregivers/${id}/`); }

// ─── CaregiverRider (join table) ──────────────────────────────────────────────

export function fetchCaregiverRiders() { return get<ApiCaregiverRider[]>("/caregiver-riders/"); }
export function createCaregiverRider(data: Partial<ApiCaregiverRider>) { return post<ApiCaregiverRider>("/caregiver-riders/", data); }
export function updateCaregiverRider(id: string, data: Partial<ApiCaregiverRider>) { return patch<ApiCaregiverRider>(`/caregiver-riders/${id}/`, data); }
export function deleteCaregiverRider(id: string) { return del<void>(`/caregiver-riders/${id}/`); }

// ─── Leaders ──────────────────────────────────────────────────────────────────

export function fetchLeaders() { return get<ApiLeader[]>("/leaders/"); }
export function fetchLeader(id: string) { return get<ApiLeader>(`/leaders/${id}/`); }
export function createLeader(data: Partial<ApiLeader>) { return post<ApiLeader>("/leaders/", data); }
export function updateLeader(id: string, data: Partial<ApiLeader>) { return patch<ApiLeader>(`/leaders/${id}/`, data); }
export function deleteLeader(id: string) { return del<void>(`/leaders/${id}/`); }

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function fetchSessions() { return get<ApiSession[]>("/sessions/"); }
export function createSession(data: Partial<ApiSession>) { return post<ApiSession>("/sessions/", data); }
export function updateSession(id: string, data: Partial<ApiSession>) { return patch<ApiSession>(`/sessions/${id}/`, data); }
export function deleteSession(id: string) { return del<void>(`/sessions/${id}/`); }

// ─── Skills ───────────────────────────────────────────────────────────────────

export function fetchSkills(formlevel?: number) {
  const qs = formlevel !== undefined ? `?formlevel=${formlevel}` : "";
  return get<ApiSkill[]>(`/skills/${qs}`);
}
export function createSkill(data: Partial<ApiSkill>) { return post<ApiSkill>("/skills/", data); }
export function updateSkill(id: string, data: Partial<ApiSkill>) { return patch<ApiSkill>(`/skills/${id}/`, data); }
export function deleteSkill(id: string) { return del<void>(`/skills/${id}/`); }

// ─── Bikes ────────────────────────────────────────────────────────────────────

export function fetchBikes() { return get<ApiBike[]>("/bikes/"); }
export function createBike(data: Partial<ApiBike>) { return post<ApiBike>("/bikes/", data); }
export function updateBike(id: string, data: Partial<ApiBike>) { return patch<ApiBike>(`/bikes/${id}/`, data); }
export function deleteBike(id: string) { return del<void>(`/bikes/${id}/`); }

// ─── BikeSpecs ────────────────────────────────────────────────────────────────

export function fetchBikeSpecs() { return get<ApiBikeSpecs[]>("/bikespecs/"); }
export function createBikeSpecs(data: Partial<ApiBikeSpecs>) { return post<ApiBikeSpecs>("/bikespecs/", data); }
export function updateBikeSpecs(id: string, data: Partial<ApiBikeSpecs>) { return patch<ApiBikeSpecs>(`/bikespecs/${id}/`, data); }
export function deleteBikeSpecs(id: number) { return del<void>(`/bikespecs/${id}/`); }

// ─── User / Account management (admin only) ───────────────────────────────────

export function fetchUsers() { return get<ApiAccountUser[]>("/users/"); }

export function updateAccountRole(accountId: string, role: AccountRole) {
  return request<{ success: boolean }>(`/accounts/${accountId}/role/`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

// ─── Public stats ─────────────────────────────────────────────────────────────

export function fetchGeneralStats() { return get<ApiGeneralStats>("/stats/general/"); }
export function fetchAnonymousData() { return get<unknown>("/data/view/"); }

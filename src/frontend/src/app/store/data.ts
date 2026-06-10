/**
 * data.ts — App-level types and in-memory state.
 * All mock data removed. Real data comes from api.ts hooks.
 */

export type UserRole = "admin" | "leader" | "caregiver" | "anonymous";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// In-memory current user (set after Firebase + /me/ resolves)
let currentUser: User | null = null;

export function getCurrentUser(): User | null {
  return currentUser;
}

export function setCurrentUser(user: User | null) {
  currentUser = user;
}

export function canEditForms(user: User | null): boolean {
  return user?.role === "admin" || user?.role === "leader";
}

export function canViewAllRiders(user: User | null): boolean {
  return user?.role === "admin" || user?.role === "leader";
}

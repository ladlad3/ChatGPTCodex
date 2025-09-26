import { cookies, headers } from "next/headers";

export type UserRole = "admin" | "editor" | "viewer";

export function getRequestRole(): UserRole {
  const role = headers().get("x-user-role") ?? cookies().get("x-user-role")?.value;
  if (role === "admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return "viewer";
}

export function canEdit(role: UserRole) {
  return role === "editor" || role === "admin";
}

export function isAdmin(role: UserRole) {
  return role === "admin";
}

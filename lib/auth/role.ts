import { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "ADMIN" | "SUPERVISOR";

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole | null> {
  const { data } = await supabase
    .from("users_profile")
    .select("role")
    .eq("user_id", userId)
    .single();

  return (data?.role as UserRole) ?? null;
}

export function isAdmin(role: UserRole | null): boolean {
  return role === "ADMIN";
}

export function isAdminOrSupervisor(role: UserRole | null): boolean {
  return role === "ADMIN" || role === "SUPERVISOR";
}

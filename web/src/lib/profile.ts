import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProfileRole = "student" | "leader" | "coordinator" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  username?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  term_id?: number | null;
  college_id?: number | null;
  section_id?: number | null;
  role: ProfileRole;
  role_requested: boolean;
  created_at: string;
};

function extractName(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | null;
  const fullName = meta?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  const name = meta?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return null;
}

export async function ensureProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<Profile> {
  const payload = {
    id: user.id,
    email: user.email ?? null,
    full_name: extractName(user),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to upsert profile: ${error.message}`);
  }

  return data as Profile;
}

export async function getMyProfile(
  supabase: SupabaseClient,
): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return (data as Profile | null) ?? null;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../utils/supabase/server";
import ProfilesClient from "./ProfilesClient";

export default async function ProfilesPage() {
  const cookieStore = await cookies();
  const flatSession = cookieStore.get("flat_session")?.value;

  if (!flatSession) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Validate flat actually exists in the database
  const { data: flat } = await supabase
    .from("flats")
    .select("custom_flat_id")
    .eq("custom_flat_id", flatSession)
    .maybeSingle();

  if (!flat) {
    // Cannot delete cookies in a Server Component directly.
    // Redirect to login where a new valid session can be established.
    redirect("/login");
  }

  // Fetch all members of this flat
  const { data: members } = await supabase
    .from("members")
    .select("id, name")
    .eq("flat_id", flatSession)
    .order("name", { ascending: true });

  return (
    <ProfilesClient
      flatSession={flatSession}
      initialMembers={members || []}
    />
  );
}

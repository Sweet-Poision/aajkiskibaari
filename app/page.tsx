import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./utils/supabase/server";

export default async function Home() {
  const cookieStore = await cookies();
  const flatSession = cookieStore.get("flat_session")?.value;
  const profileMemberId = cookieStore.get("profile_member_id")?.value;

  if (!flatSession) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Validate that the flat actually exists in the database
  const { data: flat } = await supabase
    .from("flats")
    .select("custom_flat_id")
    .eq("custom_flat_id", flatSession)
    .maybeSingle();

  if (!flat) {
    redirect("/login");
  }

  if (!profileMemberId) {
    redirect("/profiles");
  }

  // Validate that the profile member exists and belongs to this flat
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", profileMemberId)
    .eq("flat_id", flatSession)
    .maybeSingle();

  if (!member) {
    redirect("/profiles");
  }

  redirect("/dashboard");
}

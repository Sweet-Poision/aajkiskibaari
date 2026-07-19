import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../utils/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const flatSession = cookieStore.get("flat_session")?.value;
  const profileMemberId = cookieStore.get("profile_member_id")?.value;

  if (!flatSession) {
    redirect("/login");
  }
  if (!profileMemberId) {
    redirect("/profiles");
  }

  const supabase = await createClient();

  // Validate flat session exists in DB
  const { data: flat } = await supabase
    .from("flats")
    .select("custom_flat_id")
    .eq("custom_flat_id", flatSession)
    .maybeSingle();

  if (!flat) {
    redirect("/login");
  }

  // Fetch all members of this flat
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("flat_id", flatSession)
    .order("name", { ascending: true });

  // Validate active profile member exists
  const activeMember = members?.find((m) => m.id === profileMemberId);
  if (!activeMember) {
    redirect("/profiles");
  }

  // Fetch chore definitions
  const { data: chores } = await supabase
    .from("chore_definitions")
    .select("*")
    .eq("flat_id", flatSession)
    .order("name", { ascending: true });

  // Fetch active chores (today's chores)
  const { data: activeChores } = await supabase
    .from("active_chores")
    .select("*")
    .eq("flat_id", flatSession);

  // Fetch pending presence requests
  const { data: presenceRequests } = await supabase
    .from("presence_requests")
    .select("*")
    .eq("flat_id", flatSession)
    .eq("status", "pending");

  return (
    <DashboardClient
      flatSession={flatSession}
      activeProfileId={profileMemberId}
      initialMembers={members || []}
      initialChores={chores || []}
      initialActiveChores={activeChores || []}
      initialPresenceRequests={presenceRequests || []}
    />
  );
}

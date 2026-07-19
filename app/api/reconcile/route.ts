import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";

export async function GET(request: NextRequest) {
  // Check CRON secret for Vercel Cron authorization
  const authHeader = request.headers.get("authorization");
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // 1. Fetch only flats that have members (Optimization: skipping abandoned flats)
  const { data: activeFlatsData, error: flatsError } = await supabase
    .from("members")
    .select("flat_id");

  if (flatsError) {
    return NextResponse.json(
      { error: flatsError.message || "Failed to fetch flats" },
      { status: 500 }
    );
  }

  // Deduplicate flat IDs
  const activeFlatIds = [...new Set(activeFlatsData?.map(m => m.flat_id) || [])];

  const currentHour = new Date().getHours();
  const todayStr = new Date().toDateString();

  // Process all active flats concurrently
  const results = await Promise.all(activeFlatIds.map(async (flatId) => {
    try {
      // 2. Reconcile active chores (Hourly Auto-Marking)
      const { data: openChores } = await supabase
        .from("active_chores")
        .select("id, created_at, deadline_hour, state")
        .eq("flat_id", flatId)
        .in("state", ["assigned", "pending_verification", "disputed"]);

      const toComplete: string[] = [];
      const toFail: string[] = [];

      for (const chore of (openChores || [])) {
        const isPastDay = new Date(chore.created_at).toDateString() !== todayStr && new Date(chore.created_at).getTime() < new Date().getTime();
        const isExpired = isPastDay || chore.deadline_hour <= currentHour;
        
        if (isExpired) {
          if (chore.state === "disputed") toFail.push(chore.id);
          else toComplete.push(chore.id);
        }
      }

      const updatePromises = [];
      if (toComplete.length > 0) {
        updatePromises.push(supabase.from("active_chores").update({ state: "completed" }).in("id", toComplete));
      }
      if (toFail.length > 0) {
        updatePromises.push(supabase.from("active_chores").update({ state: "failed" }).in("id", toFail));
      }
      await Promise.all(updatePromises);

      // 3 & 4. Fetch members and chore definitions concurrently
      const [membersRes, defsRes] = await Promise.all([
        supabase.from("members").select("id, name, presence_status").eq("flat_id", flatId),
        supabase.from("chore_definitions").select("*").eq("flat_id", flatId)
      ]);

      if (membersRes.error) throw new Error(membersRes.error.message);
      if (defsRes.error) throw new Error(defsRes.error.message);

      const presentIds = (membersRes.data || [])
        .filter((m) => m.presence_status === "in")
        .map((m) => m.id);

      const definitions = defsRes.data || [];
      let allocatedCount = 0;

      // ONLY generate next day's chores at 23:00
      if (currentHour === 23) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDayOfWeek = tomorrow.getDay();
        const tomorrowDate = tomorrow.getDate();

        const choresToInsert = [];
        const defUpdates = [];

        for (const def of definitions) {
          const freqType = def.freq_type || 'weekly';
          let isScheduled = false;

          if (freqType === 'weekly') {
            const daysOfWeek: number[] = def.days_of_week || [0,1,2,3,4,5,6];
            isScheduled = daysOfWeek.includes(tomorrowDayOfWeek);
          } else if (freqType === 'monthly') {
            const daysOfMonth: number[] = def.days_of_month || [1];
            isScheduled = daysOfMonth.includes(tomorrowDate);
          }

          if (!isScheduled) continue;

          const eligibleIn = def.eligible_member_ids.filter((id: string) => presentIds.includes(id));

          if (eligibleIn.length > 0) {
            const deadlineHours: number[] = def.deadline_hours || [23];
            let currentIndex = def.rotation_index;

            for (const hour of deadlineHours) {
              const assignedIdx = currentIndex % eligibleIn.length;
              const assignedMemberId = eligibleIn[assignedIdx];

              choresToInsert.push({
                flat_id: flatId,
                chore_definition_id: def.id,
                assigned_member_id: assignedMemberId,
                state: "assigned",
                deadline_hour: hour,
              });

              currentIndex++;
              allocatedCount++;
            }

            defUpdates.push(supabase
              .from("chore_definitions")
              .update({ rotation_index: currentIndex })
              .eq("id", def.id)
            );
          }
        }

        // Bulk insert active chores
        if (choresToInsert.length > 0) {
          await supabase.from("active_chores").insert(choresToInsert);
        }
        
        // Concurrent update of rotation indices
        if (defUpdates.length > 0) {
          await Promise.all(defUpdates);
        }
      }

      return { flatId, status: "success", allocated: allocatedCount };
    } catch (err: unknown) {
      return { flatId, status: "error", error: err instanceof Error ? err.message : "Failed processing flat" };
    }
  }));

  return NextResponse.json({ success: true, results });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

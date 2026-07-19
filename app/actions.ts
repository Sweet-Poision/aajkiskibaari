"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "./utils/supabase/server";
import { hashPassword } from "./utils/crypto";

// 1. Flat authentication & creation
export async function loginAction(formData: FormData) {
  const flatId = (formData.get("flat_id") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!flatId || !password) {
    return { error: "Flat ID and Password are required" };
  }

  const supabase = await createClient();
  const hashed = hashPassword(password);

  // Validate flat existence and password hash
  const { data: flat, error } = await supabase
    .from("flats")
    .select("custom_flat_id, password_hash")
    .eq("custom_flat_id", flatId)
    .single();

  if (error || !flat || flat.password_hash !== hashed) {
    return { error: "Invalid Flat ID or Password" };
  }

  const cookieStore = await cookies();
  cookieStore.set("flat_session", flatId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  redirect("/profiles");
}

export async function registerAction(formData: FormData) {
  const flatId = (formData.get("flat_id") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!flatId || !password || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  // Basic regex validation for flat ID to keep it clean
  if (!/^[a-z0-9-_]+$/.test(flatId)) {
    return { error: "Flat ID can only contain letters, numbers, hyphens, and underscores" };
  }

  const supabase = await createClient();
  const hashed = hashPassword(password);

  // Insert new flat
  const { error: insertError } = await supabase
    .from("flats")
    .insert({ custom_flat_id: flatId, password_hash: hashed });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Flat ID already exists. Try a different one." };
    }
    return { error: insertError.message || "Failed to create flat." };
  }

  const cookieStore = await cookies();
  cookieStore.set("flat_session", flatId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/profiles");
}

export async function selectProfileAction(memberId: string, providedPin?: string) {
  const supabase = await createClient();
  
  let member: { pin?: string | null } | null = null;
  try {
    const res = await supabase.from("members").select("pin").eq("id", memberId).single();
    member = res.data;
  } catch {
    // Ignore error if column doesn't exist yet
  }

  if (member?.pin && member.pin !== providedPin) {
    if (!providedPin) return { requirePin: true };
    return { error: "Incorrect PIN" };
  }

  const cookieStore = await cookies();
  cookieStore.set("profile_member_id", memberId, {
    httpOnly: false, // client-readable for active actor tracking
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("flat_session");
  cookieStore.delete("profile_member_id");
  redirect("/login");
}

export async function switchProfileAction() {
  const cookieStore = await cookies();
  cookieStore.delete("profile_member_id");
  redirect("/profiles");
}

// 2. Member Management CRUD
export async function addMemberAction(name: string, pin: string | null = null) {
  const cookieStore = await cookies();
  const flatId = cookieStore.get("flat_session")?.value;

  if (!flatId) {
    return { error: "Not authenticated to a flat" };
  }

  const cleanName = name.trim();
  if (!cleanName) {
    return { error: "Name is required" };
  }

  const supabase = await createClient();

  const insertData: Record<string, string | boolean | null> = {
    flat_id: flatId,
    name: cleanName,
    email: null,
    is_verified: false,
    presence_status: "in",
  };
  
  if (pin && pin.length === 4) {
    insertData.pin = pin;
  }

  const { error } = await supabase.from("members").insert(insertData);

  if (error) {
    if (error.code === "23505") {
      return { error: "A member with this name already exists in your flat." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function editMemberAction(id: string, name: string, pin: string | null = null, oldPin?: string) {
  const cookieStore = await cookies();
  const flatId = cookieStore.get("flat_session")?.value;

  if (!flatId) {
    return { error: "Not authenticated to a flat" };
  }

  const cleanName = name.trim();
  if (!cleanName) {
    return { error: "Name is required" };
  }

  const supabase = await createClient();
  
  // Verify current PIN if it exists
  const { data: currentMember } = await supabase.from("members").select("pin").eq("id", id).eq("flat_id", flatId).single();
  if (currentMember?.pin) {
    if (currentMember.pin !== oldPin) {
      return { error: "Incorrect Current PIN. You must enter the correct PIN to make changes." };
    }
  }

  const updateData: Record<string, string | null> = {
    name: cleanName,
  };
  
  if (pin && pin.length === 4) {
    updateData.pin = pin;
  } else if (pin === "") {
    // Allows clearing the pin
    updateData.pin = null;
  }

  const { error } = await supabase
    .from("members")
    .update(updateData)
    .eq("id", id)
    .eq("flat_id", flatId); // Extra safety check

  if (error) {
    if (error.code === "23505") {
      return { error: "A member with this name already exists in your flat." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteMemberAction(memberId: string, oldPin?: string) {
  const cookieStore = await cookies();
  const flatId = cookieStore.get("flat_session")?.value;

  if (!flatId) return { error: "Not authenticated" };

  const supabase = await createClient();

  // Verify current PIN if it exists
  const { data: currentMember } = await supabase.from("members").select("pin").eq("id", memberId).eq("flat_id", flatId).single();
  if (currentMember?.pin) {
    if (currentMember.pin !== oldPin) {
      return { error: "This profile is protected by a PIN. Please use the Edit button to provide the PIN and delete it." };
    }
  }

  // First delete any active chores assigned to them to prevent FK constraint errors
  await supabase.from("active_chores").delete().eq("assigned_member_id", memberId).eq("flat_id", flatId);
  
  const { error } = await supabase.from("members").delete().eq("id", memberId).eq("flat_id", flatId);

  if (error) return { error: "Failed to delete member" };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteChoreDefinitionAction(choreId: string) {
  const cookieStore = await cookies();
  const flatId = cookieStore.get("flat_session")?.value;

  if (!flatId) return { error: "Not authenticated" };

  const supabase = await createClient();

  // Active chores automatically cascade delete or we can delete them
  await supabase.from("active_chores").delete().eq("chore_definition_id", choreId).eq("flat_id", flatId);
  
  const { error } = await supabase.from("chore_definitions").delete().eq("id", choreId).eq("flat_id", flatId);

  if (error) return { error: "Failed to delete task template" };

  revalidatePath("/dashboard");
  return { success: true };
}

// 3. Chore Definition CRUD
export async function addChoreAction(
  name: string, 
  eligibleMemberIds: string[], 
  rotationIndex: number, 
  daysOfWeek: number[] = [0,1,2,3,4,5,6],
  freqType: string = 'weekly',
  daysOfMonth: number[] = [1],
  deadlineHours: number[] = [23]
) {
  const cookieStore = await cookies();
  const flatId = cookieStore.get("flat_session")?.value;

  if (!flatId) {
    return { error: "Not authenticated to a flat" };
  }

  if (!name.trim()) {
    return { error: "Chore name is required" };
  }

  if (!eligibleMemberIds || eligibleMemberIds.length === 0) {
    return { error: "At least one eligible member must be selected" };
  }

  const supabase = await createClient();

  // Insert Chore Definition
  const { data: newChore, error } = await supabase
    .from("chore_definitions")
    .insert({
      flat_id: flatId,
      name: name.trim(),
      eligible_member_ids: eligibleMemberIds,
      rotation_index: rotationIndex,
      days_of_week: daysOfWeek,
      freq_type: freqType,
      days_of_month: daysOfMonth,
      deadline_hours: deadlineHours,
    })
    .select()
    .single();

  if (error || !newChore) {
    return { error: error?.message || "Failed to define chore template." };
  }

  // Trigger immediate allocation for today:
  // Fetch active present (IN) members in this flat
  const { data: presentMembers, error: memError } = await supabase
    .from("members")
    .select("id")
    .eq("flat_id", flatId)
    .eq("presence_status", "in");

  if (!memError && presentMembers) {
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const todayDate = today.getDate();
    
    let isScheduled = false;
    if (freqType === 'weekly') {
      isScheduled = daysOfWeek.includes(todayDayOfWeek);
    } else if (freqType === 'monthly') {
      isScheduled = daysOfMonth.includes(todayDate);
    }

    if (isScheduled) {
      const presentIds = presentMembers.map((m) => m.id);
      const eligibleIn = eligibleMemberIds.filter((id) => presentIds.includes(id));

      if (eligibleIn.length > 0) {
        let currentIndex = rotationIndex;
        const currentHour = today.getHours();
        const choresToInsert = [];

        for (const hour of deadlineHours) {
          // Only create immediate same-day assignments for upcoming deadlines
          if (hour <= currentHour) continue;

          const assignedIdx = currentIndex % eligibleIn.length;
          const assignedMemberId = eligibleIn[assignedIdx];

          choresToInsert.push({
            flat_id: flatId,
            chore_definition_id: newChore.id,
            assigned_member_id: assignedMemberId,
            state: "assigned",
            deadline_hour: hour,
          });

          currentIndex++;
        }
        
        if (choresToInsert.length > 0) {
          await supabase.from("active_chores").insert(choresToInsert);
        }

        // Update rotation index in DB if we assigned anything
        if (currentIndex > rotationIndex) {
          await supabase
            .from("chore_definitions")
            .update({ rotation_index: currentIndex })
            .eq("id", newChore.id);
        }
      }
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// 4. Chore State Machine State Transitions
export async function submitChoreAction(choreId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("active_chores")
    .update({ state: "pending_verification" })
    .eq("id", choreId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function approveChoreAction(choreId: string, assignedToId: string) {
  const cookieStore = await cookies();
  const activeProfileId = cookieStore.get("profile_member_id")?.value;

  if (!activeProfileId) {
    return { error: "No active profile selected" };
  }

  // State Integrity: The "Mark as Done" / verify function prevents the assigned user from verifying their own task
  if (activeProfileId === assignedToId) {
    return { error: "Security Violation: You cannot verify your own chore!" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("active_chores")
    .update({ state: "completed" })
    .eq("id", choreId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function disputeChoreAction(choreId: string, assignedToId: string) {
  const cookieStore = await cookies();
  const activeProfileId = cookieStore.get("profile_member_id")?.value;

  if (!activeProfileId) {
    return { error: "No active profile selected" };
  }

  if (activeProfileId === assignedToId) {
    return { error: "Security Violation: You cannot dispute your own chore!" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("active_chores")
    .update({ state: "disputed" })
    .eq("id", choreId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function markFailedChoreAction(choreId: string, assignedToId: string) {
  const cookieStore = await cookies();
  const activeProfileId = cookieStore.get("profile_member_id")?.value;

  if (!activeProfileId) {
    return { error: "No active profile selected" };
  }

  if (activeProfileId === assignedToId) {
    return { error: "Security Violation: You cannot mark your own chore as failed!" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("active_chores")
    .update({ state: "failed" })
    .eq("id", choreId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

// 5. Voting & Presence Request Management
export async function togglePresenceAction(memberId: string, currentPresence: "in" | "out") {
  const cookieStore = await cookies();
  const flatId = cookieStore.get("flat_session")?.value;
  const activeProfileId = cookieStore.get("profile_member_id")?.value;

  if (!flatId || !activeProfileId) {
    return { error: "Authentication credentials missing" };
  }

  const target: "in" | "out" = currentPresence === "in" ? "out" : "in";
  const supabase = await createClient();

  // Check for any existing pending requests for this member
  const { data: existing } = await supabase
    .from("presence_requests")
    .select("id")
    .eq("member_id", memberId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "There is already a pending status change request for this member." };
  }

  // Get total members to calculate majority threshold
  const { count, error: countErr } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true })
    .eq("flat_id", flatId);

  if (countErr || count === null) {
    return { error: "Failed to calculate flat member count." };
  }

  // Instant IN Logic
  if (target === "in") {
    const { error: updateErr } = await supabase
      .from("members")
      .update({ presence_status: "in" })
      .eq("id", memberId);
    
    if (updateErr) return { error: updateErr.message };

    // Clean up any pending OUT requests for this user, just in case
    await supabase
      .from("presence_requests")
      .update({ status: "rejected" })
      .eq("member_id", memberId)
      .eq("status", "pending");

    revalidatePath("/dashboard");
    return { success: true, instantApproval: true };
  }

  // OUT Logic requires voting
  const threshold = Math.floor(count / 2) + 1;
  
  // You cannot approve your own OUT request
  const approvedBy = activeProfileId === memberId ? [] : [activeProfileId];
  let status: "pending" | "approved" | "rejected" = "pending";

  if (approvedBy.length >= threshold) {
    status = "approved";
    await supabase
      .from("members")
      .update({ presence_status: target })
      .eq("id", memberId);
  }

  const { error: insertErr } = await supabase
    .from("presence_requests")
    .insert({
      flat_id: flatId,
      member_id: memberId,
      target_presence: target,
      approved_by: approvedBy,
      status: status,
    });

  if (insertErr) {
    return { error: insertErr.message };
  }

  revalidatePath("/dashboard");
  return { success: true, instantApproval: status === "approved" };
}

export async function votePresenceRequestAction(requestId: string) {
  const cookieStore = await cookies();
  const flatId = cookieStore.get("flat_session")?.value;
  const activeProfileId = cookieStore.get("profile_member_id")?.value;

  if (!flatId || !activeProfileId) {
    return { error: "Authentication credentials missing" };
  }

  const supabase = await createClient();

  // Fetch the request
  const { data: req, error: fetchErr } = await supabase
    .from("presence_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchErr || !req) {
    return { error: "Request not found." };
  }

  if (req.status !== "pending") {
    return { error: "This request has already been finalized." };
  }

  // Security Check: You cannot vote on your own request to leave
  if (req.member_id === activeProfileId) {
    return { error: "Security Violation: You cannot approve your own request to leave!" };
  }

  if (req.approved_by.includes(activeProfileId)) {
    return { error: "You have already voted on this request!" };
  }

  const updatedApprovals = [...req.approved_by, activeProfileId];

  // Fetch total members to verify majority
  const { count, error: countErr } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true })
    .eq("flat_id", flatId);

  if (countErr || count === null) {
    return { error: "Failed to calculate flat member count." };
  }

  const threshold = Math.floor(count / 2) + 1;
  let newStatus: "pending" | "approved" | "rejected" = "pending";

  if (updatedApprovals.length >= threshold) {
    newStatus = "approved";
    // Execute presence status update
    await supabase
      .from("members")
      .update({ presence_status: req.target_presence })
      .eq("id", req.member_id);
  }

  const { error: updateErr } = await supabase
    .from("presence_requests")
    .update({
      approved_by: updatedApprovals,
      status: newStatus,
    })
    .eq("id", requestId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  revalidatePath("/dashboard");
  return { success: true, approved: newStatus === "approved" };
}

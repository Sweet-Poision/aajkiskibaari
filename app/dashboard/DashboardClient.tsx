"use client";

import React, { useState, useTransition } from "react";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import StatsBar from "../components/StatsBar";
import Scoreboard from "../components/Scoreboard";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import {
  switchProfileAction,
  logoutAction,
  addMemberAction,
  addChoreAction,
  togglePresenceAction,
  votePresenceRequestAction,
  submitChoreAction,
  approveChoreAction,
  disputeChoreAction,
  markFailedChoreAction,
  deleteMemberAction,
  deleteChoreDefinitionAction,
  editMemberAction,
} from "../actions";

interface DBReference {
  id: string;
}

interface Member extends DBReference {
  name: string;
  presence_status: "in" | "out";
  is_verified: boolean;
  email: string | null;
}

interface ChoreDefinition extends DBReference {
  name: string;
  eligible_member_ids: string[];
  rotation_index: number;
  days_of_week?: number[];
  freq_type?: 'weekly' | 'monthly';
  days_of_month?: number[];
  deadline_hours?: number[];
}

interface ActiveChore extends DBReference {
  chore_definition_id: string;
  name: string;
  assigned_member_id: string;
  state: "assigned" | "pending_verification" | "completed" | "disputed" | "failed";
  deadline_hour?: number;
}

interface PresenceRequest extends DBReference {
  member_id: string;
  target_presence: "in" | "out";
  approved_by: string[];
  status: "pending" | "approved" | "rejected";
}

interface DashboardClientProps {
  flatSession: string;
  activeProfileId: string;
  initialMembers: Member[];
  initialChores: ChoreDefinition[];
  initialActiveChores: ActiveChore[];
  initialPresenceRequests: PresenceRequest[];
  initialStats: any;
}

const AVATAR_COLORS = [
  "bg-red-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-slate-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-orange-500",
];

export default function DashboardClient({
  flatSession,
  activeProfileId,
  initialMembers,
  initialChores,
  initialActiveChores,
  initialPresenceRequests,
  initialStats,
}: DashboardClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'engine'>('overview');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: "danger" | "warning";
  } | null>(null);

  useAutoRefresh(30000); // 30s auto-refresh polling

  // Modals state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showChoreModal, setShowChoreModal] = useState(false);

  // New member form fields
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPin, setNewMemberPin] = useState("");

  // Edit member form fields
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberPin, setEditMemberPin] = useState("");
  const [editMemberOldPin, setEditMemberOldPin] = useState("");

  // New chore form fields
  const [newChoreName, setNewChoreName] = useState("");
  const [newChoreEligible, setNewChoreEligible] = useState<string[]>([]);
  const [newChoreRotation, setNewChoreRotation] = useState("0");
  const [newChoreDaysOfWeek, setNewChoreDaysOfWeek] = useState<number[]>([0,1,2,3,4,5,6]);
  const [newChoreFreqType, setNewChoreFreqType] = useState<"weekly" | "monthly">("weekly");
  const [newChoreDaysOfMonth, setNewChoreDaysOfMonth] = useState<string>("1");
  const [newChoreDeadlineHours, setNewChoreDeadlineHours] = useState<number[]>([23]);

  // Helper functions
  const getMember = (id: string) => {
    return initialMembers.find((m) => m.id === id);
  };

  const getMemberColor = (id: string) => {
    const idx = initialMembers.findIndex((m) => m.id === id);
    return idx === -1 ? "bg-zinc-400" : AVATAR_COLORS[idx % AVATAR_COLORS.length];
  };

  const getMajorityThreshold = () => {
    return Math.floor(initialMembers.length / 2) + 1;
  };

  // Active Member Profile
  const activeMember = initialMembers.find((m) => m.id === activeProfileId) || {
    id: activeProfileId,
    name: "Unknown Member",
    presence_status: "in",
    is_verified: false,
  };

  // UI Handlers mapped to Database Server Actions
  const handleRequestPresenceToggle = async (memberId: string, currentPresence: "in" | "out") => {
    startTransition(async () => {
      const res = await togglePresenceAction(memberId, currentPresence);
      if (res?.error) {
        toast(res.error, "error");
      } else if (res?.instantApproval) {
        toast("Presence updated successfully!", "success");
      } else {
        toast("Presence change request submitted! Other members must vote to approve.", "info");
      }
    });
  };

  const handleVoteRequest = async (requestId: string) => {
    startTransition(async () => {
      const res = await votePresenceRequestAction(requestId);
      if (res?.error) {
        toast(res.error, "error");
      } else if (res?.approved) {
        toast("Status vote approved and presence updated!", "success");
      } else {
        toast("Vote registered successfully.", "success");
      }
    });
  };

  const handleSubmitChore = async (choreId: string) => {
    startTransition(async () => {
      const res = await submitChoreAction(choreId);
      if (res?.error) toast(res.error, "error");
      else toast("Chore submitted for verification.", "info");
    });
  };

  const handleApproveChore = async (choreId: string, assignedToId: string) => {
    startTransition(async () => {
      const res = await approveChoreAction(choreId, assignedToId);
      if (res?.error) toast(res.error, "error");
    });
  };

  const handleDisputeChore = async (choreId: string, assignedToId: string) => {
    startTransition(async () => {
      const res = await disputeChoreAction(choreId, assignedToId);
      if (res?.error) toast(res.error, "error");
    });
  };

  const handleMarkFailedChore = async (choreId: string, assignedToId: string) => {
    startTransition(async () => {
      const res = await markFailedChoreAction(choreId, assignedToId);
      if (res?.error) toast(res.error, "error");
    });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    
    if (newMemberPin && newMemberPin.length !== 4) {
      toast("PIN must be exactly 4 digits.", "error");
      return;
    }

    startTransition(async () => {
      const res = await addMemberAction(newMemberName, newMemberPin || null);
      if (res?.error) {
        toast(res.error, "error");
      } else {
        toast("Member added.", "success");
        setNewMemberName("");
        setNewMemberPin("");
        setShowMemberModal(false);
      }
    });
  };

  const handleDeleteMember = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Member",
      message: "Are you sure you want to completely remove this member? This will wipe their chores forever.",
      variant: "danger",
      onConfirm: () => {
        setConfirmDialog(null);
        startTransition(async () => {
          const res = await deleteMemberAction(id);
          if (res?.error) {
            toast(res.error, "error");
          } else {
            toast("Member removed.", "success");
          }
        });
      }
    });
  };

  const handleEditMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMemberId || !editMemberName.trim()) return;
    startTransition(async () => {
      const res = await editMemberAction(editMemberId, editMemberName, editMemberPin === "" ? null : editMemberPin, editMemberOldPin);
      if (res?.error) {
        toast(res.error, "error");
      } else {
        toast("Member updated.", "success");
        setShowEditMemberModal(false);
      }
    });
  };

  const handleDeleteChoreDef = async (choreId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Chore",
      message: "Are you sure you want to delete this chore template? All pending chores for this template will be removed.",
      variant: "danger",
      onConfirm: () => {
        setConfirmDialog(null);
        startTransition(async () => {
          const res = await deleteChoreDefinitionAction(choreId);
          if (res?.error) toast(res.error, "error");
          else toast("Chore definition deleted.", "success");
        });
      }
    });
  };

  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChoreName.trim() || newChoreEligible.length === 0) {
      toast("Please enter a name and select at least one eligible member.", "error");
      return;
    }

    startTransition(async () => {
      const rot = parseInt(newChoreRotation, 10) || 0;
      
      const parsedDaysOfMonth = newChoreDaysOfMonth
        .split(",")
        .map((d) => parseInt(d.trim(), 10))
        .filter((d) => !isNaN(d) && d >= 1 && d <= 31);
      
      const res = await addChoreAction(
        newChoreName, 
        newChoreEligible, 
        rot, 
        newChoreDaysOfWeek,
        newChoreFreqType,
        parsedDaysOfMonth.length ? parsedDaysOfMonth : [1],
        newChoreDeadlineHours.length ? newChoreDeadlineHours : [23]
      );

      if (res?.error) {
        toast(res.error, "error");
      } else {
        toast("Chore defined.", "success");
        setNewChoreName("");
        setNewChoreEligible([]);
        setNewChoreRotation("0");
        setNewChoreDaysOfWeek([0,1,2,3,4,5,6]);
        setNewChoreFreqType("weekly");
        setNewChoreDaysOfMonth("1");
        setNewChoreDeadlineHours([23]);
        setShowChoreModal(false);
      }
    });
  };

  const toggleEligibleMember = (id: string) => {
    if (newChoreEligible.includes(id)) {
      setNewChoreEligible(newChoreEligible.filter((mId) => mId !== id));
    } else {
      setNewChoreEligible([...newChoreEligible, id]);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen bg-transparent transition-colors duration-200`}>
      
      {/* Header Banner */}
      <header className="w-full skeuo-panel rounded-none border-x-0 border-t-0 shadow-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary text-white font-black text-lg shadow-inner drop-shadow-sm">
              A
            </span>
            <span className="font-black text-xl tracking-tight text-zinc-800 uppercase drop-shadow-sm">
              aaj<span className="text-primary">kiski</span>bari
            </span>
            <span className="text-[9px] skeuo-inset text-zinc-500 uppercase tracking-widest font-black px-3 py-1">
              Flat: {flatSession}
            </span>
          </div>

          {/* Active Profile Info */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 skeuo-inset px-4 py-2">
              <span className={`w-6 h-6 rounded-md ${getMemberColor(activeMember.id)} flex items-center justify-center text-[10px] font-black text-white shadow-inner ring-1 ring-black/10`}>
                {activeMember.name.substring(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-black uppercase tracking-widest text-zinc-800 drop-shadow-sm">
                {activeMember.name}
              </span>
              <span
                className={`inline-flex items-center rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-widest border transition-all ${
                  activeMember.presence_status === "in"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-inner"
                    : "bg-zinc-200 text-zinc-500 border-zinc-300 shadow-inner"
                }`}
              >
                {activeMember.presence_status.toUpperCase()}
              </span>
            </div>

            {/* Quick Toggle Presence Button */}
            <button
              id="btn-toggle-presence"
              onClick={() => handleRequestPresenceToggle(activeMember.id, activeMember.presence_status)}
              disabled={isPending}
              className="text-[9px] uppercase tracking-widest font-black skeuo-button px-4 py-2 disabled:opacity-50"
            >
              {activeMember.presence_status === "in" ? "Mark Out" : "Back In"}
            </button>

            {/* Profile Switcher & Logout */}
            <div className="flex items-center gap-3 border-l border-zinc-300 pl-4">
              <button
                id="btn-switch-profile"
                onClick={() => startTransition(() => switchProfileAction())}
                disabled={isPending}
                className="text-[10px] uppercase tracking-widest font-black text-primary drop-shadow-sm hover:text-primary-hover cursor-pointer disabled:opacity-50 transition-colors"
              >
                Switch Profile
              </button>
              <span className="text-zinc-300">|</span>
              <button
                id="btn-logout"
                onClick={() => startTransition(() => logoutAction())}
                disabled={isPending}
                className="text-[10px] uppercase tracking-widest font-black text-zinc-500 hover:text-zinc-800 cursor-pointer disabled:opacity-50 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="w-full bg-zinc-300 border-b border-zinc-400 shadow-inner pt-2 px-4 relative z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all skeuo-tab ${
                activeTab === 'overview'
                  ? 'skeuo-tab-active'
                  : ''
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all skeuo-tab ${
                activeTab === 'members'
                  ? 'skeuo-tab-active'
                  : ''
              }`}
            >
              Flatmates
            </button>
            <button
              onClick={() => setActiveTab('engine')}
              className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all skeuo-tab ${
                activeTab === 'engine'
                  ? 'skeuo-tab-active'
                  : ''
              }`}
            >
              Chore Engine
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-6 space-y-12 relative z-10">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {initialStats && <StatsBar stats={initialStats} />}
            {/* Section 1: Today's Chore Wheel & Rotation */}
            <section id="section-chores-wheel" className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-300 pb-4">
            <h2 className="text-3xl font-black text-zinc-800 uppercase tracking-tight drop-shadow-sm">
              Today&apos;s Chore Assignments
            </h2>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] skeuo-inset text-primary px-3 py-1.5 rounded-full">
              Allocated at 23:59 Daily
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {initialActiveChores.length === 0 ? (
              <div className="col-span-full skeuo-panel rounded-2xl p-12 text-center text-zinc-500">
                <p className="font-black text-lg uppercase tracking-wider text-zinc-800">No active chores allocated for today.</p>
                <p className="text-sm mt-2 font-bold">Define chores below to begin daily deterministic rotation assignments.</p>
              </div>
            ) : (
              initialActiveChores.map((chore, index) => {
                const assignedUser = getMember(chore.assigned_member_id);
                const isAssignedToMe = chore.assigned_member_id === activeProfileId;

                const stateColors: Record<string, string> = {
                  assigned: "bg-blue-100 text-blue-800 border-blue-300 shadow-inner",
                  pending_verification: "bg-amber-100 text-amber-800 border-amber-300 shadow-inner",
                  completed: "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-inner",
                  disputed: "bg-orange-100 text-orange-800 border-orange-300 shadow-inner",
                  failed: "bg-red-100 text-red-800 border-red-300 shadow-inner",
                };

                return (
                  <div
                    key={chore.id}
                    className={`paper-sheet rounded-sm p-6 flex flex-col justify-between space-y-6 transform transition-transform hover:rotate-0 ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'} ${index % 2 !== 0 ? 'tape-alt' : ''} ${index % 3 === 1 ? 'paper-v2' : index % 3 === 2 ? 'paper-v3' : ''}`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full border ${stateColors[chore.state]}`}>
                          {chore.state.replace(/_/g, " ").toUpperCase()}
                        </span>
                        {isAssignedToMe && (
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white bg-primary px-3 py-1 rounded-full shadow-inner">
                            My Task
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-end">
                        <h3 className="text-2xl font-black text-zinc-800 leading-tight uppercase tracking-tight drop-shadow-sm">
                          {chore.name}
                        </h3>
                        {chore.deadline_hour !== undefined && (
                          <span className="text-[10px] font-bold text-zinc-500 skeuo-inset px-2 py-1 rounded-md whitespace-nowrap ml-2 uppercase tracking-wider">
                            Due {chore.deadline_hour.toString().padStart(2, '0')}:00
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assignee Row */}
                    <div className={`flex items-center gap-4 paper-sheet p-4 rounded-xl transform transition-transform hover:rotate-0 ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}>
                      <span className={`w-10 h-10 rounded-full ${getMemberColor(chore.assigned_member_id)} flex items-center justify-center font-black text-white text-sm shadow-inner ring-1 ring-black/10`}>
                        {assignedUser?.name.substring(0, 1).toUpperCase() || "?"}
                      </span>
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Assigned To</p>
                        <p className="text-base font-black text-zinc-800">{assignedUser?.name || "Unassigned"}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2">
                      {chore.state === "assigned" && isAssignedToMe && (
                        <button
                          onClick={() => handleSubmitChore(chore.id)}
                          disabled={isPending}
                          className="w-full skeuo-button-primary text-[11px] uppercase tracking-widest font-black py-3 rounded-xl disabled:opacity-50"
                        >
                          Submit for Verification
                        </button>
                      )}

                      {chore.state === "assigned" && !isAssignedToMe && (
                        <p className="text-xs text-zinc-500 italic text-center font-bold">
                          Awaiting completion by {assignedUser?.name}
                        </p>
                      )}

                      {chore.state === "pending_verification" && !isAssignedToMe && (
                        <div className="flex gap-4 mt-2">
                          <button
                            onClick={() => handleApproveChore(chore.id, chore.assigned_member_id)}
                            disabled={isPending}
                            className="flex-1 skeuo-button-success text-[10px] uppercase tracking-widest font-black py-2.5 rounded-xl disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDisputeChore(chore.id, chore.assigned_member_id)}
                            disabled={isPending}
                            className="flex-1 skeuo-button-danger text-[10px] uppercase tracking-widest font-black py-2.5 rounded-xl disabled:opacity-50"
                          >
                            Dispute
                          </button>
                        </div>
                      )}

                      {chore.state === "pending_verification" && isAssignedToMe && (
                        <div className="p-3 skeuo-inset border border-amber-300 rounded-xl text-center">
                          <p className="text-[10px] uppercase tracking-widest text-amber-700 font-black leading-tight drop-shadow-sm">
                            Verification Blocked
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 font-bold">
                            Another member must verify this chore.
                          </p>
                        </div>
                      )}

                      {chore.state === "disputed" && !isAssignedToMe && (
                        <div className="flex gap-4 mt-2">
                          <button
                            onClick={() => handleApproveChore(chore.id, chore.assigned_member_id)}
                            disabled={isPending}
                            className="flex-1 skeuo-button-success text-[10px] uppercase tracking-widest font-black py-2.5 rounded-xl disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleMarkFailedChore(chore.id, chore.assigned_member_id)}
                            disabled={isPending}
                            className="flex-1 skeuo-button-danger text-[10px] uppercase tracking-widest font-black py-2.5 rounded-xl disabled:opacity-50"
                          >
                            Mark Failed
                          </button>
                        </div>
                      )}

                      {chore.state === "disputed" && isAssignedToMe && (
                        <p className="text-xs text-orange-700 italic text-center font-bold">
                          Chore disputed! Awaiting resolution.
                        </p>
                      )}

                      {chore.state === "completed" && (
                        <p className="text-xs text-emerald-700 text-center font-bold">
                          ✓ Verified & Completed
                        </p>
                      )}

                      {chore.state === "failed" && (
                        <p className="text-xs text-red-700 text-center font-bold">
                          ✗ Failed (Dispute Resolved)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </section>

          {/* Section 2: Voting & Presence Requests */}
          <section id="section-status-voting" className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-4">
              <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight drop-shadow-sm">
                Presence Status Votes
              </h2>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 skeuo-inset px-3 py-1 rounded-full">
                Majority Threshold: {getMajorityThreshold()}
              </span>
            </div>

            <div className="skeuo-panel rounded-2xl p-6 space-y-6">
              {initialPresenceRequests.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                  <p className="text-[11px] font-black uppercase tracking-widest text-zinc-800">No pending presence status votes.</p>
                  <p className="text-[10px] mt-2 font-bold">When a member requests to go IN or OUT, it will show up here.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-300">
                  {initialPresenceRequests.map((req) => {
                    const requestingMember = getMember(req.member_id);
                    const currentVotes = req.approved_by.length;
                    const threshold = getMajorityThreshold();
                    const hasVoted = req.approved_by.includes(activeProfileId);

                    return (
                      <div key={req.id} className="py-6 first:pt-0 last:pb-0 space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full ${getMemberColor(req.member_id)} flex items-center justify-center font-black text-white text-xs shadow-inner ring-1 ring-black/10`}>
                              {requestingMember?.name.substring(0, 1).toUpperCase() || "?"}
                            </span>
                            <span className="text-sm font-black text-zinc-800 uppercase tracking-wider drop-shadow-sm">
                              {requestingMember?.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                              wants to go
                            </span>
                            <span className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-full ${
                              req.target_presence === "in"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-inner"
                                : "bg-red-100 text-red-800 border border-red-300 shadow-inner"
                            }`}>
                              {req.target_presence.toUpperCase()}
                            </span>
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {currentVotes} / {threshold} Approvals
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full skeuo-inset h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500 shadow-inner"
                            style={{ width: `${(currentVotes / threshold) * 100}%` }}
                          />
                        </div>

                        {/* Vote buttons */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex flex-wrap gap-1 text-[10px] text-zinc-500">
                            <span className="font-black uppercase tracking-widest">Voted:</span>{" "}
                            {req.approved_by
                              .map((id) => <span key={id} className="font-bold">{getMember(id)?.name || "Unknown"}</span>)
                              .reduce((prev, curr) => [prev, ", ", curr] as any) || "None"}
                          </div>

                          <button
                            onClick={() => handleVoteRequest(req.id)}
                            disabled={hasVoted || isPending}
                            className={`text-[10px] uppercase tracking-widest font-black px-4 py-2 disabled:opacity-50 ${
                              hasVoted
                                ? "skeuo-inset text-zinc-400"
                                : "skeuo-button-primary"
                            }`}
                          >
                            {hasVoted ? "✓ Approved" : "Approve Status"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {initialStats && initialStats.leaderboard && (
            <Scoreboard leaderboard={initialStats.leaderboard} />
          )}
        </>
        )}

        {/* TAB: MEMBERS */}
        {activeTab === 'members' && (
          <>
            {/* Section 3: Flat Members Directory */}
            <section id="section-members-directory" className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-4">
              <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight drop-shadow-sm">
                Flat Members Directory
              </h2>
              <button
                onClick={() => setShowMemberModal(true)}
                className="text-[11px] font-black uppercase tracking-widest text-primary hover:text-primary-hover transition-colors flex items-center gap-2 cursor-pointer drop-shadow-sm"
              >
                + Add Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initialMembers.map((member, index) => {
                return (
                  <div
                    key={member.id}
                    className={`paper-sheet rounded-sm p-5 flex flex-col gap-5 justify-between transform transition-transform hover:rotate-0 ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'} ${index % 2 !== 0 ? 'tape-alt' : ''} ${index % 3 === 1 ? 'paper-v2' : index % 3 === 2 ? 'paper-v3' : ''}`}
                  >
                    {/* Top: Avatar and Info */}
                    <div className="flex items-center gap-4 w-full">
                      <span className={`flex-shrink-0 w-14 h-14 rounded-2xl ${getMemberColor(member.id)} flex items-center justify-center font-black text-white text-xl shadow-inner ring-1 ring-black/10`}>
                        {member.name.substring(0, 2).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-black text-lg text-zinc-800 uppercase tracking-wider truncate drop-shadow-sm">
                            {member.name}
                          </p>
                          {member.is_verified ? (
                            <span className="flex-shrink-0 text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-emerald-300 shadow-inner">
                              Verified
                            </span>
                          ) : (
                            <span className="flex-shrink-0 text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-amber-300 shadow-inner">
                              Unverified
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                          {member.id === activeProfileId ? "Acting Profile" : "Flatmate"}
                        </p>
                      </div>
                    </div>

                    {/* Bottom: Actions in a row */}
                    <div className="flex items-center gap-2 w-full border-t border-zinc-300 pt-4">
                      <button
                        onClick={() => {
                          setEditMemberId(member.id);
                          setEditMemberName(member.name);
                          setEditMemberPin(""); 
                          setEditMemberOldPin(""); 
                          setShowEditMemberModal(true);
                        }}
                        disabled={isPending}
                        className="flex-1 text-[10px] uppercase tracking-widest font-black py-2.5 rounded-xl border border-zinc-300 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50 skeuo-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        disabled={isPending}
                        className="flex-1 text-[10px] uppercase tracking-widest font-black py-2.5 rounded-xl border text-red-600 hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer disabled:opacity-50 skeuo-button-danger"
                        title="Remove member"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleRequestPresenceToggle(member.id, member.presence_status)}
                        disabled={isPending}
                        className={`flex-1 text-[10px] uppercase tracking-widest font-black py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
                          member.presence_status === "in"
                            ? "skeuo-button-success"
                            : "skeuo-button"
                        }`}
                      >
                        {member.presence_status === "in" ? "Mark Out" : "Back In"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          </>
        )}

        {/* TAB: CHORE ENGINE */}
        {activeTab === 'engine' && (
          <>
            {/* Section 4: Chore Definitions */}
            <section id="section-chore-definitions" className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-300 pb-4">
            <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight drop-shadow-sm">
              Chore Definitions
            </h2>
            <button
              onClick={() => setShowChoreModal(true)}
              className="text-[11px] font-black uppercase tracking-widest text-primary hover:text-primary-hover transition-colors flex items-center gap-2 cursor-pointer drop-shadow-sm"
            >
              + Define Chore
            </button>
          </div>

          <div className="skeuo-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-200 text-[10px] uppercase tracking-widest font-black text-zinc-500 border-b border-zinc-300">
                    <th className="px-8 py-5">Chore Name</th>
                    <th className="px-8 py-5">Schedule</th>
                    <th className="px-8 py-5">Eligible Flatmates</th>
                    <th className="px-8 py-5">Rotation Index</th>
                    <th className="px-8 py-5">Rotation Queue Order</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-300 text-sm text-zinc-800">
                  {initialChores.map((chore) => {
                    const elList = chore.eligible_member_ids.map((id) => getMember(id)).filter(Boolean) as Member[];
                    const elIn = elList.filter((m) => m.presence_status === "in");

                    return (
                      <tr key={chore.id} className="hover:bg-zinc-200/50 transition-colors">
                        <td className="px-8 py-6 font-black uppercase tracking-wide text-zinc-800">
                          {chore.name}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1.5">
                            {(!chore.freq_type || chore.freq_type === 'weekly') ? (
                              <div className="flex gap-0.5">
                                {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => {
                                  const isActive = (chore.days_of_week || [0,1,2,3,4,5,6]).includes(idx);
                                  return (
                                    <span
                                      key={idx}
                                      className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black tracking-widest ${
                                        isActive
                                          ? "bg-primary text-white shadow-inner"
                                          : "skeuo-inset text-zinc-400"
                                      }`}
                                    >
                                      {day}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs font-bold text-red-700">
                                Monthly on: {(chore.days_of_month || [1]).join(", ")}
                              </div>
                            )}
                            <div className="text-[10px] text-zinc-500 font-semibold">
                              Due at: {(chore.deadline_hours || [23]).map(h => `${h.toString().padStart(2, '0')}:00`).join(", ")}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {elList.map((el) => {
                              const isIn = el.presence_status === "in";
                              return (
                                <span
                                  key={el.id}
                                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                    isIn
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-inner"
                                      : "bg-zinc-200 text-zinc-400 border-zinc-300 shadow-inner line-through"
                                  }`}
                                  title={isIn ? `${el.name} is present` : `${el.name} is absent`}
                                >
                                  <span className={`led-indicator ${isIn ? "led-indicator-green" : "led-indicator-red"}`} />
                                  {el.name}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-8 py-6 font-mono font-black text-zinc-500 text-lg">
                          {chore.rotation_index}
                        </td>
                        <td className="px-8 py-6 text-[10px] uppercase tracking-widest font-bold">
                          {elIn.length === 0 ? (
                            <span className="text-primary font-black drop-shadow-sm">No eligible members are present (IN)</span>
                          ) : (
                            <div className="flex items-center gap-2 text-zinc-500">
                              {elIn.map((el, index) => {
                                const isNext = index === chore.rotation_index % elIn.length;
                                return (
                                  <React.Fragment key={el.id}>
                                    {index > 0 && <span>→</span>}
                                    <span className={`font-black ${isNext ? "text-primary drop-shadow-sm underline underline-offset-4" : "text-zinc-400"}`}>
                                      {el.name} {isNext && "(next)"}
                                    </span>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => handleDeleteChoreDef(chore.id)}
                            disabled={isPending}
                            className="text-red-500 hover:text-red-700 p-2 rounded-xl hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center skeuo-button-danger"
                            title="Delete Chore"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 skeuo-panel rounded-none border-x-0 border-b-0 py-8 px-6 text-center text-[10px] uppercase tracking-widest font-bold text-zinc-500 shadow-md">
        <p className="font-black text-zinc-800 mb-3 drop-shadow-sm text-xs">aajkiskibari — Flat Chore & Presence Manager</p>
        <p className="flex items-center justify-center gap-6 normal-case tracking-normal text-zinc-500">
          <span>Questions or issues?</span>
          <a
            href="mailto:ur.dev6@gmail.com"
            className="text-primary hover:text-primary-hover underline underline-offset-2 font-black transition-colors"
          >
            ur.dev6@gmail.com
          </a>
          <span className="text-zinc-300">·</span>
          <a
            href="https://github.com/Sweet-poision"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-hover underline underline-offset-2 font-black transition-colors"
          >
            github / Sweet-poision
          </a>
        </p>
      </footer>

      {/* Modal: Add Member */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="skeuo-panel w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl my-4 sm:my-auto">
            <h2 className="text-2xl font-black text-zinc-800 mb-6 uppercase tracking-tight">Add Flat Member</h2>
            <form onSubmit={handleAddMember}>
              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                    Member Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full rounded-xl skeuo-inset px-5 py-4 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                    placeholder="e.g. Shashi"
                    maxLength={15}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                    Optional PIN <span className="text-[9px] text-zinc-400 lowercase normal-case ml-1 font-bold">(4 digits to secure profile)</span>
                  </label>
                  <input
                    type="password"
                    value={newMemberPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setNewMemberPin(val);
                    }}
                    className="w-full rounded-xl skeuo-inset px-5 py-4 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold text-center tracking-[0.5em] font-mono text-xl"
                    placeholder="••••"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>

              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 skeuo-button py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 skeuo-button-primary py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Creating..." : "Create Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Define Chore */}
      {showChoreModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="skeuo-panel w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl my-4 sm:my-auto">
            <h2 className="text-2xl font-black text-zinc-800 mb-6 uppercase tracking-tight">Define Chore</h2>
            <form onSubmit={handleAddChore}>
              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                    Chore Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newChoreName}
                    onChange={(e) => setNewChoreName(e.target.value)}
                    className="w-full rounded-xl skeuo-inset px-5 py-4 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                    placeholder="e.g. Bathroom Scrubbing"
                    maxLength={30}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                    Starting Rotation Index
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newChoreRotation}
                    onChange={(e) => setNewChoreRotation(e.target.value)}
                    className="w-full rounded-xl skeuo-inset px-5 py-4 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold font-mono"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                    Frequency Schedule
                  </label>
                  
                  <div className="flex gap-2 mb-4 skeuo-inset p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewChoreFreqType("weekly")}
                      className={`flex-1 text-[10px] uppercase tracking-widest font-black py-2.5 rounded-lg transition-all ${
                        newChoreFreqType === "weekly" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewChoreFreqType("monthly")}
                      className={`flex-1 text-[10px] uppercase tracking-widest font-black py-2.5 rounded-lg transition-all ${
                        newChoreFreqType === "monthly" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      Monthly
                    </button>
                  </div>

                  {newChoreFreqType === "weekly" ? (
                    <div className="flex justify-between items-center skeuo-inset rounded-xl p-3 px-5">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => {
                        const isActive = newChoreDaysOfWeek.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (isActive) {
                                setNewChoreDaysOfWeek(newChoreDaysOfWeek.filter(d => d !== idx));
                              } else {
                                setNewChoreDaysOfWeek([...newChoreDaysOfWeek, idx].sort());
                              }
                            }}
                            className={`w-10 h-10 rounded-full text-[10px] font-black tracking-widest transition-all skeuo-button ${
                              isActive
                                ? "skeuo-button-primary scale-110"
                                : "text-zinc-500 hover:text-zinc-800"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={newChoreDaysOfMonth}
                      onChange={(e) => setNewChoreDaysOfMonth(e.target.value)}
                      className="w-full rounded-xl skeuo-inset px-5 py-4 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                      placeholder="e.g. 1, 15, 28"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                    Deadlines (Intraday)
                  </label>
                  <div className="grid grid-cols-6 gap-2 skeuo-inset rounded-xl p-4">
                    {[9, 12, 14, 17, 20, 23].map((hour) => {
                      const isActive = newChoreDeadlineHours.includes(hour);
                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setNewChoreDeadlineHours(newChoreDeadlineHours.filter(h => h !== hour));
                            } else {
                              setNewChoreDeadlineHours([...newChoreDeadlineHours, hour].sort((a,b) => a-b));
                            }
                          }}
                          className={`py-2 rounded-lg text-[10px] font-black tracking-widest transition-all skeuo-button ${
                            isActive
                              ? "skeuo-button-primary"
                              : "text-zinc-500 hover:text-zinc-800"
                          }`}
                        >
                          {hour.toString().padStart(2, '0')}:00
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mt-3 text-center">Select multiple times for chores that repeat in a single day.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                    Eligible Members
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-2 skeuo-inset rounded-xl p-4 custom-scrollbar">
                    {initialMembers.map((m) => {
                      const isChecked = newChoreEligible.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleEligibleMember(m.id)}
                          className="flex items-center gap-4 p-2 hover:bg-zinc-200/50 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isChecked ? 'bg-primary border-primary shadow-sm' : 'bg-zinc-200 border-zinc-400 shadow-inner'}`}>
                            {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <span className="text-sm font-black uppercase tracking-widest text-zinc-800">{m.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowChoreModal(false)}
                  className="flex-1 skeuo-button py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 skeuo-button-primary py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Defining..." : "Define Chore"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowEditMemberModal(false); }}>
          <div className="skeuo-panel w-full max-w-md p-8 rounded-3xl shadow-2xl relative">
            <h2 className="text-2xl font-black text-zinc-800 mb-2 uppercase tracking-tight">Edit Flatmate</h2>
            <p className="text-[10px] text-zinc-500 mb-8 uppercase tracking-widest font-bold">Update their name or PIN.</p>
            
            <form onSubmit={handleEditMemberSubmit}>
              <div className="mb-6">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  className="w-full rounded-xl skeuo-inset px-5 py-4 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                  maxLength={15}
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                  Current PIN <span className="text-[9px] text-zinc-400 lowercase normal-case ml-1 font-bold">(Required if you already have one)</span>
                </label>
                <input
                  type="password"
                  value={editMemberOldPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setEditMemberOldPin(val);
                  }}
                  className="w-full rounded-xl skeuo-inset px-5 py-4 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold text-center tracking-[0.5em] font-mono text-xl"
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              <div className="mb-8">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 drop-shadow-sm">
                  New PIN <span className="text-[9px] text-zinc-400 lowercase normal-case ml-1 font-bold">(Leave blank to remove)</span>
                </label>
                <input
                  type="password"
                  value={editMemberPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setEditMemberPin(val);
                  }}
                  className="w-full rounded-xl skeuo-inset px-5 py-4 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold text-center tracking-[0.5em] font-mono text-xl"
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowEditMemberModal(false)}
                  className="flex-1 skeuo-button py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 skeuo-button-primary py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          isPending={isPending}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel || (() => setConfirmDialog(null))}
        />
      )}
    </div>
  );
}

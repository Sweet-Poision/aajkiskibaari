"use client";

import { useTransition, useState } from "react";
import { selectProfileAction, addMemberAction, deleteMemberAction, editMemberAction } from "../actions";

interface Member {
  id: string;
  name: string;
}

interface ProfilesClientProps {
  flatSession: string;
  initialMembers: Member[];
}

const AVATAR_STYLES = [
  "group-hover:border-red-500 group-hover:text-red-700",
  "group-hover:border-amber-500 group-hover:text-amber-700",
  "group-hover:border-indigo-500 group-hover:text-indigo-700",
  "group-hover:border-emerald-500 group-hover:text-emerald-700",
  "group-hover:border-cyan-500 group-hover:text-cyan-700",
  "group-hover:border-slate-500 group-hover:text-slate-700",
  "group-hover:border-teal-500 group-hover:text-teal-700",
  "group-hover:border-sky-500 group-hover:text-sky-700",
  "group-hover:border-orange-500 group-hover:text-orange-700",
];

export default function ProfilesClient({
  flatSession,
  initialMembers,
}: ProfilesClientProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPin, setNewMemberPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  
  // Login PIN states
  const [showPinModal, setShowPinModal] = useState(false);
  const [loginPin, setLoginPin] = useState("");
  const [pendingLoginId, setPendingLoginId] = useState<string | null>(null);

  // Edit Profile states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberPin, setEditMemberPin] = useState("");
  const [editMemberOldPin, setEditMemberOldPin] = useState("");

  const handleSelectProfile = (id: string, pin?: string) => {
    setSelectedId(id);
    setError(null);
    startTransition(async () => {
      const res = await selectProfileAction(id, pin);
      if (res?.requirePin) {
        setPendingLoginId(id);
        setShowPinModal(true);
      } else if (res?.error) {
        setError(res.error);
        setSelectedId(null);
      }
    });
  };
  
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingLoginId && loginPin) {
      handleSelectProfile(pendingLoginId, loginPin);
    }
  };

  const handleDeleteProfile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this profile? This will also remove all their active chores.")) return;
    
    startTransition(async () => {
      // If we're deleting from the edit modal, pass the oldPin to authorize it
      const pinToPass = id === editMemberId ? editMemberOldPin : undefined;
      const res = await deleteMemberAction(id, pinToPass);
      if (res?.error) {
        setError(res.error);
      } else {
        setMembers(members.filter(m => m.id !== id));
        setShowEditModal(false);
      }
    });
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setError(null);

    try {
      const res = await addMemberAction(newMemberName, newMemberPin || null);
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      // Refresh window to get server-side UUIDs
      window.location.reload();
    } catch {
      setError("An error occurred while creating flat member.");
    }
  };

  const openEditModal = (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditMemberId(member.id);
    setEditMemberName(member.name);
    setEditMemberPin(""); // We don't expose the existing pin, they just enter a new one if they want
    setEditMemberOldPin(""); // Reset old PIN input
    setError(null);
    setShowEditModal(true);
  };

  const handleEditMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMemberId || !editMemberName.trim()) return;
    setError(null);

    try {
      const res = await editMemberAction(
        editMemberId, 
        editMemberName, 
        editMemberPin === "" ? null : editMemberPin, 
        editMemberOldPin
      );
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      setMembers(members.map(m => m.id === editMemberId ? { ...m, name: editMemberName } : m));
      setShowEditModal(false);
    } catch {
      setError("An error occurred while updating profile.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl text-center z-10">
        {/* Header */}
        <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-4 uppercase drop-shadow-md text-zinc-800">
          Who&apos;s using aaj<span className="text-primary">kiski</span>bari?
        </h1>
        <p className="text-sm text-zinc-500 mb-12 font-bold">
          Active Flat: <span className="text-primary font-black">{flatSession}</span>
        </p>

        {/* Profile List */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-14 mb-16">
          {members.map((member, index) => {
            const initials = member.name.substring(0, 2).toUpperCase();
            const isActive = selectedId === member.id;
            const glowStyle = AVATAR_STYLES[index % AVATAR_STYLES.length];
            return (
              <button
                key={member.id}
                onClick={(e) => {
                  if (isManaging) {
                    openEditModal(member, e);
                  } else {
                    handleSelectProfile(member.id);
                  }
                }}
                disabled={isPending}
                className="group flex flex-col items-center focus:outline-none disabled:opacity-50 relative"
              >
                {/* Edit Badge (Pencil) */}
                {isManaging && (
                  <div className="absolute -top-2 -right-2 z-10 w-8 h-8 skeuo-button border-2 border-white rounded-full flex items-center justify-center shadow-md text-zinc-500 group-hover:text-zinc-800 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                )}
                
                {/* Profile Box */}
                <div
                  className={`paper-sheet transition-all duration-300 w-28 h-28 md:w-40 md:h-40 rounded-sm flex items-center justify-center text-4xl md:text-6xl font-black text-zinc-400 cursor-pointer 
                  transform hover:rotate-0 ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}
                  group-active:scale-95 group-active:shadow-inner group-active:bg-zinc-200
                  ${glowStyle}
                  ${isActive ? "scale-105 border-primary text-primary" : ""}
                  ${isManaging ? "opacity-75" : ""}`}
                >
                  <span className="drop-shadow-sm">{initials}</span>
                </div>
                {/* Name */}
                <span className="mt-5 text-zinc-500 group-hover:text-zinc-800 font-black tracking-widest uppercase text-sm md:text-sm transition-colors drop-shadow-sm">
                  {member.name}
                </span>
              </button>
            );
          })}

          {/* Add Profile Button */}
          <button
            onClick={() => {
              setError(null);
              setShowAddModal(true);
            }}
            disabled={isPending}
            className="group flex flex-col items-center focus:outline-none"
          >
            <div
              className="skeuo-inset w-28 h-28 md:w-40 md:h-40 rounded-2xl flex items-center justify-center text-5xl md:text-7xl font-light text-zinc-400 border-dashed border-2 border-zinc-300 transition-all duration-300 cursor-pointer
              group-active:scale-95 group-hover:text-zinc-600 group-hover:border-zinc-400 group-hover:bg-zinc-200"
            >
              +
            </div>
            <span className="mt-5 text-zinc-500 group-hover:text-zinc-800 font-black tracking-widest uppercase text-sm transition-colors drop-shadow-sm">
              Add Member
            </span>
          </button>
        </div>

        {/* Bottom Actions */}
        <button
          onClick={() => {
            setIsManaging(!isManaging);
            setError(null);
            setShowEditModal(false);
          }}
          className={`skeuo-button font-black uppercase tracking-[0.2em] text-xs px-8 py-3 rounded-full transition-all duration-300 focus:outline-none ${
            isManaging ? "bg-zinc-300 shadow-inner" : ""
          }`}
        >
          {isManaging ? "Done" : "Manage Profiles"}
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="skeuo-panel w-full max-w-md p-8 rounded-3xl shadow-2xl">
            <h2 className="text-2xl font-black text-zinc-800 mb-2 uppercase tracking-tight">Edit Profile</h2>
            <p className="text-[10px] text-zinc-500 mb-8 uppercase tracking-widest font-bold">Update name or PIN.</p>
            
            {error && (
              <div className="mb-6 p-4 skeuo-inset border-red-500 rounded-xl text-[10px] uppercase tracking-widest font-black text-red-600 text-center">
                {error}
              </div>
            )}

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

              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 skeuo-button py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 skeuo-button-primary py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Save Changes
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-zinc-300">
                <button
                  type="button"
                  onClick={(e) => {
                    if (editMemberId) handleDeleteProfile(editMemberId, e);
                  }}
                  className="w-full skeuo-button-danger py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Delete Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="skeuo-panel w-full max-w-md p-8 rounded-3xl shadow-2xl">
            <h2 className="text-2xl font-black text-zinc-800 mb-2 uppercase tracking-tight">Add Flat Member</h2>
            <p className="text-[10px] text-zinc-500 mb-8 uppercase tracking-widest font-bold">Create a profile to represent yourself in the chore rotation.</p>
            
            {error && (
              <div className="mb-6 p-4 skeuo-inset border border-red-500 rounded-xl text-[10px] uppercase tracking-widest font-black text-red-600 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleAddMemberSubmit}>
              <div className="mb-6">
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

              <div className="mb-8">
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

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 skeuo-button py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 skeuo-button-primary py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="skeuo-panel w-full max-w-sm p-8 rounded-3xl shadow-2xl">
            <h2 className="text-2xl font-black text-zinc-800 mb-2 uppercase tracking-tight text-center">Enter PIN</h2>
            <p className="text-[10px] text-zinc-500 mb-8 uppercase tracking-widest font-bold text-center">This profile requires a 4-digit PIN to access.</p>
            
            {error && (
              <div className="mb-6 p-4 skeuo-inset border border-red-500 rounded-xl text-[10px] uppercase tracking-widest font-black text-red-600 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handlePinSubmit}>
              <div className="mb-8">
                <input
                  type="password"
                  required
                  value={loginPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setLoginPin(val);
                    setError(null);
                  }}
                  className="w-full rounded-xl skeuo-inset px-5 py-5 text-center tracking-[0.7em] text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-2xl transition-all font-mono font-bold"
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setLoginPin("");
                    setPendingLoginId(null);
                    setSelectedId(null);
                    setError(null);
                  }}
                  className="flex-1 skeuo-button py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginPin.length !== 4 || isPending}
                  className="flex-1 skeuo-button-primary py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Unlocking..." : "Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

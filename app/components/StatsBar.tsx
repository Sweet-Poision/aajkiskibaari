import React, { useEffect, useState } from "react";

interface StatsBarProps {
  stats: {
    today: { completed: number; total: number };
    streak: number;
    leaderboard: Array<{ id: string; name: string; completed: number; failed: number }>;
  };
}

export default function StatsBar({ stats }: StatsBarProps) {
  const [fillPct, setFillPct] = useState("0%");
  
  useEffect(() => {
    // Delay setting the fill to trigger the CSS transition on mount
    const timeout = setTimeout(() => {
      if (stats.today.total === 0) setFillPct("100%");
      else setFillPct(`${Math.round((stats.today.completed / stats.today.total) * 100)}%`);
    }, 100);
    return () => clearTimeout(timeout);
  }, [stats.today.completed, stats.today.total]);

  const topPerformer = stats.leaderboard.length > 0 && stats.leaderboard[0].completed > 0 
    ? stats.leaderboard[0].name 
    : "No one yet";
    
  // Find slacker: person with most fails
  const slackerCandidate = [...stats.leaderboard].sort((a, b) => b.failed - a.failed)[0];
  const slacker = slackerCandidate && slackerCandidate.failed > 0 
    ? slackerCandidate.name 
    : "None (Great job!)";

  return (
    <div className="machine-casing w-full p-4 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
      
      {/* Streak Gauge */}
      <div className="skeuo-inset p-3 flex flex-col justify-center h-full">
        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
          Active Streak
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-mono tracking-tighter text-zinc-800 drop-shadow-sm font-black">
            {stats.streak}
          </span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase">
            Days
          </span>
          <span className="led-indicator led-indicator-green ml-auto" />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="skeuo-inset p-3 flex flex-col justify-center h-full col-span-1 md:col-span-1">
        <div className="flex justify-between items-end mb-1.5">
          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
            Today's Progress
          </div>
          <div className="text-[10px] font-mono font-bold text-zinc-700">
            {stats.today.completed} / {stats.today.total}
          </div>
        </div>
        <div className="h-2 w-full bg-zinc-300 rounded-full overflow-hidden shadow-inner border border-zinc-400">
          <div 
            className="h-full gauge-fill bg-gradient-to-r from-emerald-500 to-green-400"
            style={{ "--fill-pct": fillPct } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Top Performer */}
      <div className="skeuo-inset p-3 flex flex-col justify-center h-full">
        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
          Top Performer
        </div>
        <div className="flex items-center gap-2 text-zinc-800 font-bold truncate">
          <span className="text-sm">🏆</span>
          <span className="truncate text-sm uppercase tracking-wide">{topPerformer}</span>
        </div>
      </div>

      {/* Slacker Alert */}
      <div className="skeuo-inset p-3 flex flex-col justify-center h-full bg-[#fdf5f5]">
        <div className="text-[9px] font-black text-red-500/70 uppercase tracking-widest mb-1">
          Slacker Alert
        </div>
        <div className="flex items-center gap-2 text-red-800 font-bold truncate">
          <span className="text-sm">⚠️</span>
          <span className="truncate text-sm uppercase tracking-wide">{slacker}</span>
        </div>
      </div>

    </div>
  );
}

import React from "react";

interface ScoreboardProps {
  leaderboard: Array<{ id: string; name: string; completed: number; failed: number }>;
}

export default function Scoreboard({ leaderboard }: ScoreboardProps) {
  if (leaderboard.length === 0) return null;

  return (
    <div className="paper-sheet paper-v2 tape-alt w-full p-6 mt-8 mb-8 transform -rotate-1">
      <div className="border-b-2 border-zinc-300 pb-3 mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-black text-zinc-800 uppercase tracking-tight" style={{ fontFamily: 'monospace' }}>
            Scoreboard
          </h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
            All-Time Completion Stats
          </p>
        </div>
        <div className="text-[10px] font-bold text-zinc-400">
          Updated Today
        </div>
      </div>

      <div className="space-y-3">
        {leaderboard.map((member, index) => {
          let medal = "";
          if (index === 0 && member.completed > 0) medal = "🥇";
          else if (index === 1 && member.completed > 0) medal = "🥈";
          else if (index === 2 && member.completed > 0) medal = "🥉";

          const total = member.completed + member.failed;
          const rate = total > 0 ? Math.round((member.completed / total) * 100) : 0;

          return (
            <div 
              key={member.id} 
              className={`flex items-center justify-between p-3 rounded border border-zinc-200/50 ${index === 0 && member.completed > 0 ? 'bg-yellow-50/50 border-yellow-200' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 text-center text-lg">{medal || <span className="text-zinc-300 text-xs font-bold">{index + 1}</span>}</div>
                <div className="font-bold text-zinc-700 uppercase tracking-wide text-sm">
                  {member.name}
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rate</span>
                  <span className={`font-mono font-bold text-sm ${rate >= 80 ? 'text-green-600' : rate < 50 && total > 0 ? 'text-red-600' : 'text-zinc-600'}`}>
                    {total > 0 ? `${rate}%` : '-'}
                  </span>
                </div>
                
                <div className="flex flex-col items-end w-16">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Done</span>
                  <span className="font-mono font-bold text-zinc-800 text-sm">
                    {member.completed}
                  </span>
                </div>
                
                <div className="flex flex-col items-end w-16">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Failed</span>
                  <span className={`font-mono font-bold text-sm ${member.failed > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                    {member.failed}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import StatCard from "@/components/StatCard";

const STATUS_STYLE = {
  PROGRESSED: { bg: "bg-green-900/40", border: "border-green-700/40", dot: "bg-green-500", label: "New solve" },
  PRACTICED:  { bg: "bg-yellow-900/30", border: "border-yellow-700/40", dot: "bg-yellow-500", label: "Practiced" },
  INACTIVE:   { bg: "bg-gray-800/60",   border: "border-gray-700/30",   dot: "bg-gray-700",  label: "Inactive" },
};

function computeStreaks(logs: Array<{ status: string }>) {
  let progressStreak = 0, showUpStreak = 0, inactiveRun = 0;
  for (const log of logs) {
    if (log.status === "PROGRESSED") {
      progressStreak++; showUpStreak++; inactiveRun = 0;
    } else if (log.status === "PRACTICED") {
      if (progressStreak > 0) progressStreak = 0;
      showUpStreak++; inactiveRun = 0;
    } else {
      if (progressStreak > 0 || showUpStreak > 0) break;
      inactiveRun++;
    }
  }
  return { progressStreak, showUpStreak, inactiveRun };
}

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const student = await prisma.user.findUnique({
    where: { id },
    include: {
      stats: true,
      dailyLogs: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  if (!student || !student.leetcodeUsername) notFound();

  // Class rank
  const allUsers = await prisma.user.findMany({
    where: { leetcodeUsername: { not: null } },
    select: { id: true, stats: { select: { totalSolved: true } } },
    orderBy: { stats: { totalSolved: "desc" } },
  });
  const classRank = allUsers.findIndex((u) => u.id === student.id) + 1;
  const classSize = allUsers.length;

  const stats = student.stats;
  const logs = student.dailyLogs;
  const { progressStreak, showUpStreak, inactiveRun } = computeStreaks(logs);

  const solvedLogs = logs.filter((l) => l.status === "PROGRESSED").slice(0, 14);
  const totalEasy = solvedLogs.reduce((s, l) => s + l.easySolved, 0);
  const totalMedium = solvedLogs.reduce((s, l) => s + l.mediumSolved, 0);
  const totalHard = solvedLogs.reduce((s, l) => s + l.hardSolved, 0);
  const diffTotal = totalEasy + totalMedium + totalHard || 1;

  const rankingLogs = logs.filter((l) => l.rankingSnapshot != null).slice(0, 7).reverse();
  const last30 = logs.slice(0, 30).reverse();

  const isMe = session!.user.id === student.id;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/leaderboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-400 transition-colors">
        ← Back to Leaderboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {student.name}
            {isMe && <span className="ml-2 text-sm text-orange-500 font-normal">(you)</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            @{student.leetcodeUsername} · Class rank #{classRank} of {classSize}
          </p>
          {stats?.lastSyncedAt && (
            <p className="text-xs text-gray-600 mt-1">
              Last synced {new Date(stats.lastSyncedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <a
          href={`https://leetcode.com/${student.leetcodeUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-orange-400 hover:border-orange-500/50 transition-colors"
        >
          LeetCode ↗
        </a>
      </div>

      {/* Solve counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Solved" value={stats?.totalSolved ?? 0} color="text-orange-400" />
        <StatCard label="Easy"   value={stats?.easySolved   ?? 0} color="text-green-400" />
        <StatCard label="Medium" value={stats?.mediumSolved ?? 0} color="text-yellow-400" />
        <StatCard label="Hard"   value={stats?.hardSolved   ?? 0} color="text-red-400" />
      </div>

      {/* Streak & activity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Progress Streak" value={progressStreak} sub="new solves in a row"   color="text-green-400" />
        <StatCard label="Show-up Streak"  value={showUpStreak}  sub="days active in a row"   color="text-yellow-400" />
        <StatCard label="Inactive Run"    value={inactiveRun}   sub="days without LC"         color={inactiveRun > 2 ? "text-red-400" : "text-gray-400"} />
        <StatCard label="LeetCode Rank"   value={stats?.ranking ? `#${stats.ranking.toLocaleString()}` : "—"} sub="global" />
      </div>

      {/* 30-day calendar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Last 30 Days</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-600 inline-block" /> New solve</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-700 inline-block" /> Practiced</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-800 inline-block" /> Inactive</span>
          </div>
        </div>
        {last30.length === 0 ? (
          <p className="text-gray-600 text-sm">No logs yet.</p>
        ) : (
          <div className="grid grid-cols-10 gap-1.5">
            {last30.map((log) => {
              const s = STATUS_STYLE[log.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.INACTIVE;
              return (
                <div
                  key={log.id}
                  title={`${new Date(log.date).toLocaleDateString()} — ${s.label}${log.solved > 0 ? ` (${log.solved} new)` : ""}`}
                  className={`rounded h-8 flex items-center justify-center ${s.bg} border ${s.border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Difficulty trend */}
      {solvedLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Difficulty Trend (last 14 progress days)
          </h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
            {[
              { label: "Easy",   count: totalEasy,   color: "bg-green-500" },
              { label: "Medium", count: totalMedium, color: "bg-yellow-500" },
              { label: "Hard",   count: totalHard,   color: "bg-red-500" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-14">{label}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.round((count / diffTotal) * 100)}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking trajectory */}
      {rankingLogs.length > 1 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Ranking Trajectory</h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex items-end gap-2 h-16">
              {rankingLogs.map((log, i) => {
                const rank = log.rankingSnapshot!;
                const maxRank = Math.max(...rankingLogs.map((l) => l.rankingSnapshot!));
                const minRank = Math.min(...rankingLogs.map((l) => l.rankingSnapshot!));
                const range = maxRank - minRank || 1;
                const height = Math.round(((maxRank - rank) / range) * 48 + 8);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm bg-orange-500/60" style={{ height: `${height}px` }} title={`#${rank.toLocaleString()}`} />
                    <span className="text-[9px] text-gray-600">
                      {new Date(log.date).toLocaleDateString("en", { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
            {(() => {
              const first = rankingLogs[0]?.rankingSnapshot;
              const last = rankingLogs[rankingLogs.length - 1]?.rankingSnapshot;
              if (!first || !last) return null;
              const improved = last < first;
              const delta = Math.abs(last - first);
              return (
                <p className="text-xs mt-2 text-gray-500">
                  {improved ? `↑ Improved by ${delta.toLocaleString()} spots.` : delta === 0 ? "Rank stable." : `↓ Dropped ${delta.toLocaleString()} spots.`}
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Acceptance Rate" value={`${stats?.acceptanceRate ?? 0}%`} sub="accepted / total" />
        <StatCard label="LeetCode Streak" value={stats?.streak ?? 0} sub="days (from LC)" />
        <StatCard label="Contributions"   value={stats?.contributionPoints ?? 0} sub="points" />
      </div>
    </div>
  );
}

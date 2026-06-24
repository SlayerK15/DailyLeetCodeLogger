import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const session = await auth();

  const users = await prisma.user.findMany({
    where: { leetcodeUsername: { not: null } },
    select: {
      id: true,
      name: true,
      leetcodeUsername: true,
      stats: {
        select: {
          totalSolved: true,
          easySolved: true,
          mediumSolved: true,
          hardSolved: true,
          ranking: true,
          streak: true,
          lastSyncedAt: true,
        },
      },
      dailyLogs: {
        where: {
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { solved: true, status: true },
      },
    },
    orderBy: { stats: { totalSolved: "desc" } },
  });

  const leaderboard = users.map((u, i) => ({
    rank: i + 1,
    ...u,
    totalSolved: u.stats?.totalSolved ?? 0,
    easySolved: u.stats?.easySolved ?? 0,
    mediumSolved: u.stats?.mediumSolved ?? 0,
    hardSolved: u.stats?.hardSolved ?? 0,
    weeklySolved: u.dailyLogs.reduce((sum, l) => sum + l.solved, 0),
    streak: u.stats?.streak ?? 0,
    ranking: u.stats?.ranking ?? null,
    lastSyncedAt: u.stats?.lastSyncedAt ?? null,
    todayStatus: u.dailyLogs.find((l) => {
      const d = new Date(); d.setHours(0,0,0,0);
      return true; // most recent log
    })?.status ?? "INACTIVE",
    isMe: u.id === session!.user.id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Leaderboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {leaderboard.length} students linked · sorted by total solved · click a row to view profile
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-green-600 uppercase tracking-wider">Easy</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-yellow-600 uppercase tracking-wider">Med</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-red-600 uppercase tracking-wider">Hard</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-orange-500 uppercase tracking-wider">Total</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">7d</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Streak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {leaderboard.map((u) => (
              <tr
                key={u.id}
                className={`transition-colors group ${
                  u.isMe
                    ? "bg-orange-500/5 border-l-2 border-l-orange-500"
                    : "hover:bg-gray-900/60 cursor-pointer"
                }`}
              >
                <td className="px-4 py-3 text-gray-500 font-mono">
                  {u.rank <= 3 ? ["🥇", "🥈", "🥉"][u.rank - 1] : u.rank}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/students/${u.id}`} className="flex items-center gap-3 w-full">
                    <div className="flex flex-col">
                      <span className={`font-medium group-hover:text-orange-300 transition-colors ${u.isMe ? "text-orange-300" : "text-gray-200"}`}>
                        {u.name} {u.isMe && <span className="text-xs text-orange-500">(you)</span>}
                      </span>
                      <span className="text-xs text-gray-600">@{u.leetcodeUsername}</span>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-green-500 font-medium">{u.easySolved}</td>
                <td className="px-4 py-3 text-right text-yellow-500 font-medium">{u.mediumSolved}</td>
                <td className="px-4 py-3 text-right text-red-500 font-medium">{u.hardSolved}</td>
                <td className="px-4 py-3 text-right text-orange-400 font-bold">{u.totalSolved}</td>
                <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                  {u.weeklySolved > 0 ? `+${u.weeklySolved}` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 hidden md:table-cell">
                  {u.streak > 0 ? `🔥 ${u.streak}d` : "—"}
                </td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-600">
                  No students have linked a LeetCode account yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

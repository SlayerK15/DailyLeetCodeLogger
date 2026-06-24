import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StatCard from "@/components/StatCard";
import SyncButton from "@/components/SyncButton";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: {
      stats: true,
      dailyLogs: {
        orderBy: { date: "desc" },
        take: 14,
      },
    },
  });

  const hasLeetCode = !!user?.leetcodeUsername;
  const stats = user?.stats;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            Hey, {user?.name?.split(" ")[0]} 👋
          </h1>
          {hasLeetCode ? (
            <p className="text-sm text-gray-500 mt-0.5">
              @{user.leetcodeUsername} ·{" "}
              {stats?.lastSyncedAt
                ? `Last synced ${new Date(stats.lastSyncedAt).toLocaleDateString()}`
                : "Never synced"}
            </p>
          ) : (
            <p className="text-sm text-orange-400 mt-0.5">
              <Link href="/profile" className="underline underline-offset-2">
                Link your LeetCode username
              </Link>{" "}
              to start tracking
            </p>
          )}
        </div>
        {hasLeetCode && <SyncButton />}
      </div>

      {!hasLeetCode && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-6 text-center">
          <p className="text-gray-300 mb-3">
            Connect your LeetCode account to see your stats here.
          </p>
          <Link
            href="/profile"
            className="inline-block px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
          >
            Go to Profile
          </Link>
        </div>
      )}

      {hasLeetCode && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Solved" value={stats?.totalSolved ?? 0} color="text-orange-400" />
            <StatCard label="Easy" value={stats?.easySolved ?? 0} color="text-green-400" />
            <StatCard label="Medium" value={stats?.mediumSolved ?? 0} color="text-yellow-400" />
            <StatCard label="Hard" value={stats?.hardSolved ?? 0} color="text-red-400" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              label="Acceptance Rate"
              value={`${stats?.acceptanceRate ?? 0}%`}
              sub="accepted / total"
            />
            <StatCard
              label="LeetCode Rank"
              value={stats?.ranking ? `#${stats.ranking.toLocaleString()}` : "—"}
              sub="global ranking"
            />
            <StatCard
              label="Contributions"
              value={stats?.contributionPoints ?? 0}
              sub="points"
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Last 14 Days
            </h2>
            {user.dailyLogs.length === 0 ? (
              <p className="text-gray-600 text-sm">
                No daily logs yet. Sync your stats to log today&apos;s progress.
              </p>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {user.dailyLogs.slice(0, 14).reverse().map((log) => (
                  <div
                    key={log.id}
                    title={`${new Date(log.date).toLocaleDateString()}: ${log.solved} solved`}
                    className={`rounded-md h-12 flex flex-col items-center justify-center text-xs ${
                      log.solved === 0
                        ? "bg-gray-800 text-gray-600"
                        : log.solved < 3
                        ? "bg-green-900/50 text-green-400"
                        : "bg-green-700/60 text-green-300"
                    }`}
                  >
                    <span className="font-bold">{log.solved}</span>
                    <span className="text-gray-500 text-[10px]">
                      {new Date(log.date).toLocaleDateString("en", { weekday: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
          streak: true,
          ranking: true,
          lastSyncedAt: true,
        },
      },
      dailyLogs: {
        where: {
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: { solved: true, date: true },
        orderBy: { date: "desc" },
      },
    },
    orderBy: {
      stats: { totalSolved: "desc" },
    },
  });

  const leaderboard = users.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    name: u.name,
    leetcodeUsername: u.leetcodeUsername,
    totalSolved: u.stats?.totalSolved ?? 0,
    easySolved: u.stats?.easySolved ?? 0,
    mediumSolved: u.stats?.mediumSolved ?? 0,
    hardSolved: u.stats?.hardSolved ?? 0,
    streak: u.stats?.streak ?? 0,
    ranking: u.stats?.ranking ?? null,
    lastSyncedAt: u.stats?.lastSyncedAt ?? null,
    weeklyActivity: u.dailyLogs,
    isCurrentUser: u.id === session.user.id,
  }));

  return NextResponse.json({ leaderboard });
}

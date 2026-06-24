import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchLeetCodeStats } from "@/lib/leetcode";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { leetcodeUsername: true, stats: true },
  });

  if (!user?.leetcodeUsername) {
    return NextResponse.json({ error: "No LeetCode username linked" }, { status: 400 });
  }

  const stats = await fetchLeetCodeStats(user.leetcodeUsername);
  if (!stats) {
    return NextResponse.json({ error: "Failed to fetch LeetCode data" }, { status: 502 });
  }

  const prevSolved = user.stats?.totalSolved ?? 0;
  const todaySolved = Math.max(0, stats.totalSolved - prevSolved);

  const updated = await prisma.leetCodeStats.upsert({
    where: { userId: session.user.id },
    update: { ...stats, lastSyncedAt: new Date() },
    create: { userId: session.user.id, ...stats },
  });

  // Log today's progress delta
  if (todaySolved > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.dailyLog.upsert({
      where: { userId_date: { userId: session.user.id, date: today } },
      update: {
        solved: todaySolved,
        easySolved: Math.max(0, stats.easySolved - (user.stats?.easySolved ?? 0)),
        mediumSolved: Math.max(0, stats.mediumSolved - (user.stats?.mediumSolved ?? 0)),
        hardSolved: Math.max(0, stats.hardSolved - (user.stats?.hardSolved ?? 0)),
      },
      create: {
        userId: session.user.id,
        date: today,
        solved: todaySolved,
        easySolved: Math.max(0, stats.easySolved - (user.stats?.easySolved ?? 0)),
        mediumSolved: Math.max(0, stats.mediumSolved - (user.stats?.mediumSolved ?? 0)),
        hardSolved: Math.max(0, stats.hardSolved - (user.stats?.hardSolved ?? 0)),
      },
    });
  }

  return NextResponse.json({ stats: updated });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchLeetCodeStats,
  fetchSubmissionCalendar,
  hasActivityOnDate,
} from "@/lib/leetcode";
import { DayStatus } from "@prisma/client";

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

  // Fetch stats and calendar in parallel
  const [stats, calendarData] = await Promise.all([
    fetchLeetCodeStats(user.leetcodeUsername),
    fetchSubmissionCalendar(user.leetcodeUsername),
  ]);

  if (!stats) {
    return NextResponse.json({ error: "Failed to fetch LeetCode data" }, { status: 502 });
  }

  const prevSolved = user.stats?.totalSolved ?? 0;
  const todaySolved = Math.max(0, stats.totalSolved - prevSolved);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 3-state determination:
  // PROGRESSED  → solved a new unique problem today (totalSolved went up)
  // PRACTICED   → submitted something but no new unique solve
  // INACTIVE    → no submissions at all today
  let status: DayStatus;
  if (todaySolved > 0) {
    status = DayStatus.PROGRESSED;
  } else if (calendarData && hasActivityOnDate(calendarData.calendar, today)) {
    status = DayStatus.PRACTICED;
  } else {
    status = DayStatus.INACTIVE;
  }

  // Use LeetCode's authoritative streak from the calendar
  const streak = calendarData?.streak ?? user.stats?.streak ?? 0;

  const updatedStats = { ...stats, streak, lastSyncedAt: new Date() };

  const updated = await prisma.leetCodeStats.upsert({
    where: { userId: session.user.id },
    update: updatedStats,
    create: { userId: session.user.id, ...updatedStats },
  });

  // Always write a DailyLog entry — even for INACTIVE and PRACTICED days
  const logData = {
    solved: todaySolved,
    easySolved: Math.max(0, stats.easySolved - (user.stats?.easySolved ?? 0)),
    mediumSolved: Math.max(0, stats.mediumSolved - (user.stats?.mediumSolved ?? 0)),
    hardSolved: Math.max(0, stats.hardSolved - (user.stats?.hardSolved ?? 0)),
    status,
    rankingSnapshot: stats.ranking,
  };

  await prisma.dailyLog.upsert({
    where: { userId_date: { userId: session.user.id, date: today } },
    update: logData,
    create: { userId: session.user.id, date: today, ...logData },
  });

  return NextResponse.json({ stats: updated, status });
}

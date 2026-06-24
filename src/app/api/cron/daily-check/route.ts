import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchLeetCodeStats,
  fetchSubmissionCalendar,
  hasActivityOnDate,
} from "@/lib/leetcode";
import { generateReminderMessage, type DayStatusType } from "@/lib/agent";
import { sendReminderEmail } from "@/lib/email";
import { DayStatus } from "@prisma/client";

function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  return secret === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    where: { leetcodeUsername: { not: null } },
    select: { id: true, name: true, email: true, leetcodeUsername: true, stats: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ message: "No users to process" });
  }

  type UserResult = {
    userId: string;
    name: string;
    status: DayStatusType;
    emailSent: boolean;
    error?: string;
  };
  const results: UserResult[] = [];

  // Phase 1: sync every user, determine status via calendar
  const syncedStats = new Map<string, { totalSolved: number; status: DayStatusType; ranking: number | null }>();

  for (const user of users) {
    if (!user.leetcodeUsername) continue;

    try {
      const [stats, calendarData] = await Promise.all([
        fetchLeetCodeStats(user.leetcodeUsername),
        fetchSubmissionCalendar(user.leetcodeUsername),
      ]);

      if (!stats) {
        results.push({ userId: user.id, name: user.name, status: "INACTIVE", emailSent: false, error: "LC fetch failed" });
        continue;
      }

      const prevSolved = user.stats?.totalSolved ?? 0;
      const todaySolved = Math.max(0, stats.totalSolved - prevSolved);

      let status: DayStatusType;
      if (todaySolved > 0) {
        status = "PROGRESSED";
      } else if (calendarData && hasActivityOnDate(calendarData.calendar, today)) {
        status = "PRACTICED";
      } else {
        status = "INACTIVE";
      }

      const streak = calendarData?.streak ?? user.stats?.streak ?? 0;
      const updatedStats = { ...stats, streak, lastSyncedAt: new Date() };

      await prisma.leetCodeStats.upsert({
        where: { userId: user.id },
        update: updatedStats,
        create: { userId: user.id, ...updatedStats },
      });

      const logData = {
        solved: todaySolved,
        easySolved: Math.max(0, stats.easySolved - (user.stats?.easySolved ?? 0)),
        mediumSolved: Math.max(0, stats.mediumSolved - (user.stats?.mediumSolved ?? 0)),
        hardSolved: Math.max(0, stats.hardSolved - (user.stats?.hardSolved ?? 0)),
        status: DayStatus[status],
        rankingSnapshot: stats.ranking,
      };

      await prisma.dailyLog.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        update: logData,
        create: { userId: user.id, date: today, ...logData },
      });

      syncedStats.set(user.id, { totalSolved: stats.totalSolved, status, ranking: stats.ranking });
    } catch (err) {
      results.push({ userId: user.id, name: user.name, status: "INACTIVE", emailSent: false, error: String(err) });
    }
  }

  // Phase 2: compute class rankings (by totalSolved), then send personalized emails
  const rankedUsers = users
    .map((u) => ({ ...u, totalSolved: syncedStats.get(u.id)?.totalSolved ?? u.stats?.totalSolved ?? 0 }))
    .sort((a, b) => b.totalSolved - a.totalSolved);

  const topSolved = rankedUsers[0]?.totalSolved ?? 0;

  for (let i = 0; i < rankedUsers.length; i++) {
    const user = rankedUsers[i];
    const synced = syncedStats.get(user.id);
    if (!synced) continue;

    try {
      const message = await generateReminderMessage({
        name: user.name,
        streak: user.stats?.streak ?? 0,
        totalSolved: synced.totalSolved,
        ranking: synced.ranking,
        classRank: i + 1,
        classSize: users.length,
        status: synced.status,
        topStudentSolved: topSolved,
      });

      await sendReminderEmail(user.email, user.name, message, synced.status);
      results.push({ userId: user.id, name: user.name, status: synced.status, emailSent: true });
    } catch (err) {
      results.push({ userId: user.id, name: user.name, status: synced.status, emailSent: false, error: String(err) });
    }
  }

  const summary = {
    PROGRESSED: results.filter((r) => r.status === "PROGRESSED").length,
    PRACTICED: results.filter((r) => r.status === "PRACTICED").length,
    INACTIVE: results.filter((r) => r.status === "INACTIVE").length,
    errors: results.filter((r) => r.error).length,
  };

  return NextResponse.json({
    date: today.toISOString().split("T")[0],
    total: users.length,
    summary,
    results,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyLeetCodeUsername, fetchLeetCodeStats } from "@/lib/leetcode";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      stats: true,
      dailyLogs: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leetcodeUsername, name } = await req.json();

  if (leetcodeUsername) {
    const valid = await verifyLeetCodeUsername(leetcodeUsername);
    if (!valid) {
      return NextResponse.json({ error: "LeetCode username not found" }, { status: 400 });
    }

    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: { leetcodeUsername, NOT: { id: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "This LeetCode username is already linked by another account" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name && { name }),
      ...(leetcodeUsername !== undefined && { leetcodeUsername }),
    },
    select: { id: true, name: true, email: true, leetcodeUsername: true },
  });

  // Immediately sync stats after linking
  if (leetcodeUsername) {
    const stats = await fetchLeetCodeStats(leetcodeUsername);
    if (stats) {
      await prisma.leetCodeStats.upsert({
        where: { userId: session.user.id },
        update: { ...stats, lastSyncedAt: new Date() },
        create: { userId: session.user.id, ...stats },
      });
    }
  }

  return NextResponse.json({ user: updated });
}

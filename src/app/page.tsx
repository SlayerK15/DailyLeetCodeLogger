import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl w-full">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 text-sm text-orange-400">
          Track · Compare · Improve
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
          Daily LeetCode Logger
        </h1>
        <p className="text-gray-400 text-lg mb-10">
          Link your LeetCode profile, auto-sync your stats, and compete on the
          leaderboard with your classmates.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            {
              icon: "⚡",
              title: "Auto-Sync",
              desc: "Pull your LeetCode stats with one click — no manual entry",
            },
            {
              icon: "📊",
              title: "Dashboard",
              desc: "See easy / medium / hard breakdown and 30-day activity",
            },
            {
              icon: "🏆",
              title: "Leaderboard",
              desc: "Compare total solved, streaks, and weekly progress with classmates",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-gray-100 mb-1">{f.title}</div>
              <div className="text-sm text-gray-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

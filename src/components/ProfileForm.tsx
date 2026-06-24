"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  initialName: string;
  initialLeetcode: string;
  email: string;
}

export default function ProfileForm({ initialName, initialLeetcode, email }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [leetcode, setLeetcode] = useState(initialLeetcode);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, leetcodeUsername: leetcode || null }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      setStatus("error");
      return;
    }

    setStatus("success");
    router.refresh();
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Account</h2>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2.5 rounded-lg bg-gray-800/50 border border-gray-800 text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">LeetCode Account</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Enter your public LeetCode username to auto-sync your stats
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">LeetCode username</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">
                leetcode.com/u/
              </span>
              <input
                type="text"
                value={leetcode}
                onChange={(e) => setLeetcode(e.target.value.trim())}
                className="w-full pl-32 pr-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="your-username"
              />
            </div>
          </div>
          {leetcode && (
            <p className="text-xs text-gray-600 mt-1">
              Profile: leetcode.com/u/{leetcode}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {status === "saving"
          ? "Saving…"
          : status === "success"
          ? "Saved!"
          : "Save changes"}
      </button>
    </form>
  );
}

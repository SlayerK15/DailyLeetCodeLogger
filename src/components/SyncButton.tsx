"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function sync() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Sync failed");
    } else {
      setMsg("Synced!");
      router.refresh();
    }
    setLoading(false);
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div className="flex items-center gap-3">
      {msg && (
        <span className={`text-sm ${msg === "Synced!" ? "text-green-400" : "text-red-400"}`}>
          {msg}
        </span>
      )}
      <button
        onClick={sync}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-200 font-medium transition-colors flex items-center gap-2"
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          "⟳"
        )}
        Sync Stats
      </button>
    </div>
  );
}

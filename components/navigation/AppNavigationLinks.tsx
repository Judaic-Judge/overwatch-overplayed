"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navClass(isActive: boolean) {
  if (isActive) {
    return "rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400";
  }

  return "rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100";
}

export default function AppNavigationLinks() {
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";
  const isSessions = pathname.startsWith("/sessions");
  const isPlanner = pathname.startsWith("/planner");
  const isLive = pathname.startsWith("/live");

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/dashboard" className={navClass(isDashboard)}>
        Dashboard
      </Link>

      <Link href="/sessions" className={navClass(isSessions)}>
        Sessions & Reviews
      </Link>

      <span
        className={
          isPlanner
            ? "rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-100"
            : "rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-500"
        }
      >
        Planner
      </span>

      <span
        className={
          isLive
            ? "rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-zinc-950"
            : "rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-500"
        }
      >
        Live Room
      </span>
    </div>
  );
}
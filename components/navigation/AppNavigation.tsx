import { Suspense } from "react";
import AppNavigationLinks from "@/components/navigation/AppNavigationLinks";

type AppNavigationProps = {
  children: React.ReactNode;
};

function NavigationLinksFallback() {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href="/dashboard"
        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
      >
        Dashboard
      </a>

      <a
        href="/sessions"
        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
      >
        Sessions & Reviews
      </a>

      <a
        href="/help"
        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
      >
        Help / FAQ
      </a>

      <span className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-500">
        Planner
      </span>

      <span className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-500">
        Live Room
      </span>
    </div>
  );
}

export default function AppNavigation({ children }: AppNavigationProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <a
            href="/dashboard"
            className="font-semibold text-zinc-100 hover:text-cyan-300"
          >
            Overwatch Overplayed
          </a>

          <Suspense fallback={<NavigationLinksFallback />}>
            <AppNavigationLinks />
          </Suspense>
        </div>
      </nav>

      {children}
    </div>
  );
}
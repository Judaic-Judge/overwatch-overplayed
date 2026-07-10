import { Suspense } from "react";
import AppNavigation from "@/components/navigation/AppNavigation";

type LiveLayoutProps = {
  children: React.ReactNode;
};

export default function LiveLayout({ children }: LiveLayoutProps) {
  return (
    <AppNavigation>
      <Suspense
        fallback={
          <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
            <div className="mx-auto max-w-7xl">
              <p className="text-zinc-400">Loading live room...</p>
            </div>
          </main>
        }
      >
        {children}
      </Suspense>
    </AppNavigation>
  );
}
import { Suspense } from "react";
import AppNavigation from "@/components/navigation/AppNavigation";

type HelpLayoutProps = {
  children: React.ReactNode;
};

export default function HelpLayout({ children }: HelpLayoutProps) {
  return (
    <AppNavigation>
      <Suspense
        fallback={
          <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
            <div className="mx-auto max-w-5xl">
              <p className="text-zinc-400">Loading help...</p>
            </div>
          </main>
        }
      >
        {children}
      </Suspense>
    </AppNavigation>
  );
}
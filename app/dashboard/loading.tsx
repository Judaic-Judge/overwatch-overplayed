export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-cyan-400">Overwatch Overplayed</p>
          <h1 className="mt-2 text-3xl font-bold">Loading Dashboard...</h1>
          <p className="mt-2 text-zinc-400">
            Fetching your teams, plans, sessions, and roles.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        </div>

        <div className="h-64 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
      </div>
    </main>
  );
}
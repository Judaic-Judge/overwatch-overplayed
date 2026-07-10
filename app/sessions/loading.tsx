export default function SessionsLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-cyan-400">Session History</p>
          <h1 className="mt-2 text-3xl font-bold">Loading Sessions...</h1>
          <p className="mt-2 text-zinc-400">
            Fetching active sessions, completed sessions, and AAR records.
          </p>
        </div>

        <div className="h-52 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
      </div>
    </main>
  );
}
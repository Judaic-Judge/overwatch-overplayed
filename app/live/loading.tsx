export default function LiveRoomLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-green-400">Live Room</p>
          <h1 className="mt-2 text-3xl font-bold">Loading Live Room...</h1>
          <p className="mt-2 text-zinc-400">
            Checking room access, team membership, plan data, and live session state.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="h-[620px] animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="h-[620px] animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
        </div>
      </div>
    </main>
  );
}
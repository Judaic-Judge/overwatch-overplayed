import Link from "next/link";

export default function LiveRoomNotFound() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center">
        <section className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-cyan-400">Live Room Access</p>

          <h1 className="mt-2 text-3xl font-bold">
            You do not have access to this live room
          </h1>

          <p className="mt-3 text-zinc-400">
            This room may not exist, may have ended, or your account may not be assigned to the team presenting it.
          </p>

          <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            <p className="font-semibold text-zinc-200">What to check:</p>
            <p className="mt-2">
              Make sure you are signed into the correct account and that a coach has added you to the correct team.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Return to Dashboard
            </Link>

            <Link
              href="/sign-in"
              className="rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              Switch Account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
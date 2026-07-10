"use client";

import Link from "next/link";

type LiveRoomErrorProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function LiveRoomError({ error, reset }: LiveRoomErrorProps) {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center">
        <section className="w-full rounded-xl border border-red-900 bg-zinc-900 p-6">
          <p className="text-sm text-red-400">Live Room Error</p>

          <h1 className="mt-2 text-3xl font-bold">
            Something went wrong loading the live room
          </h1>

          <p className="mt-3 text-zinc-400">
            This can happen if the room ended, the code is invalid, your account is not on the presenting team, or realtime failed to connect.
          </p>

          <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            <p className="font-semibold text-zinc-200">Error details:</p>
            <p className="mt-2 break-words">
              {error.message || "Unknown live room error."}
            </p>

            {error.digest ? (
              <p className="mt-2 text-xs text-zinc-500">
                Digest: {error.digest}
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Try Again
            </button>

            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              Return to Dashboard
            </Link>

            <Link
              href="/sessions"
              className="rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              Sessions & Reviews
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
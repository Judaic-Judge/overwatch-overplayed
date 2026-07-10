import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import LiveRoomClient from "@/components/live/LiveRoomClient";
import type { PlanData } from "@/components/planner/PlannerCanvas";

type LiveRoomPageProps = {
  params: Promise<{
    roomCode: string;
  }>;
};

type LiveSession = {
  id: string;
  scheduled_session_id: string | null;
  plan_id: string;
  coach_id: string;
  room_code: string;
  status: "scheduled" | "live" | "ended";
  current_state: {
    currentStep?: number;
    payloadProgress?: number | null;
    coachMessage?: string;
    highlightedIconId?: string | null;
    camera?: {
      x: number;
      y: number;
      zoom: number;
    };
  };
  started_at: string;
  ended_at: string | null;
};

type Plan = {
  id: string;
  title: string;
  map_id: string;
  game_mode: string;
  plan_data: PlanData;
};

async function endLiveSession(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const liveSessionId = String(formData.get("liveSessionId") || "").trim();

  if (!liveSessionId) {
    return;
  }

  const { data: liveSession, error: liveSessionError } = await supabase
    .from("live_sessions")
    .select("id, scheduled_session_id, coach_id, room_code, status")
    .eq("id", liveSessionId)
    .single();

  if (liveSessionError || !liveSession) {
    throw new Error(liveSessionError?.message || "Live session not found.");
  }

  let canEndSession = liveSession.coach_id === user.id;

  if (liveSession.scheduled_session_id) {
    const { data: scheduledSession, error: scheduledSessionError } =
      await supabase
        .from("scheduled_sessions")
        .select("id, team_id")
        .eq("id", liveSession.scheduled_session_id)
        .single();

    if (scheduledSessionError || !scheduledSession) {
      throw new Error(
        scheduledSessionError?.message || "Scheduled session not found.",
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", scheduledSession.team_id)
      .eq("user_id", user.id)
      .single();

    if (!membershipError && membership) {
      canEndSession =
        membership.role === "coach" || membership.role === "assistant_coach";
    }
  }

  if (!canEndSession) {
    throw new Error("Only a Coach can end this live session.");
  }

  const endedAt = new Date().toISOString();

  const { error: updateLiveError } = await supabase
    .from("live_sessions")
    .update({
      status: "ended",
      ended_at: endedAt,
    })
    .eq("id", liveSession.id);

  if (updateLiveError) {
    throw new Error(updateLiveError.message);
  }

  if (liveSession.scheduled_session_id) {
    const { error: updateScheduledError } = await supabase
      .from("scheduled_sessions")
      .update({
        status: "ended",
      })
      .eq("id", liveSession.scheduled_session_id);

    if (updateScheduledError) {
      throw new Error(updateScheduledError.message);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/live/${liveSession.room_code}`);

  redirect("/dashboard");
}

export default function LiveRoomPage(props: LiveRoomPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
          <div className="mx-auto max-w-7xl">
            <p className="text-zinc-400">Loading live room...</p>
          </div>
        </main>
      }
    >
      <LiveRoomContent params={props.params} />
    </Suspense>
  );
}

async function LiveRoomContent({ params }: LiveRoomPageProps) {
  const { roomCode } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: liveSession, error: liveSessionError } = await supabase
    .from("live_sessions")
    .select(
      "id, scheduled_session_id, plan_id, coach_id, room_code, status, current_state, started_at, ended_at",
    )
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (liveSessionError || !liveSession) {
    notFound();
  }

  const typedLiveSession = liveSession as LiveSession;

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, title, map_id, game_mode, plan_data")
    .eq("id", typedLiveSession.plan_id)
    .single();

  if (planError || !plan) {
    notFound();
  }

  const typedPlan = plan as Plan;

  let isCoach = typedLiveSession.coach_id === user.id;

  if (typedLiveSession.scheduled_session_id) {
    const { data: scheduledSession } = await supabase
      .from("scheduled_sessions")
      .select("id, team_id")
      .eq("id", typedLiveSession.scheduled_session_id)
      .single();

    if (scheduledSession) {
      const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", scheduledSession.team_id)
        .eq("user_id", user.id)
        .single();

      if (membership) {
        isCoach =
          membership.role === "coach" || membership.role === "assistant_coach";
      }
    }
  }

  const isSessionLive = typedLiveSession.status === "live";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-block text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Dashboard
          </Link>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-cyan-400">Live Coaching Room</p>
              <h1 className="text-3xl font-bold">{typedPlan.title}</h1>
              <p className="text-zinc-400">
                Players can view this room during the Discord call without
                screen share.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Room Code
              </p>
              <p className="text-2xl font-bold text-cyan-400">
                {typedLiveSession.room_code}
              </p>
              <p className="text-sm text-zinc-500">
                Status: {typedLiveSession.status}
              </p>
            </div>
          </div>

          {typedLiveSession.status === "ended" ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="font-semibold text-zinc-200">
                This live session has ended.
              </p>
              {typedLiveSession.ended_at ? (
                <p className="text-sm text-zinc-400">
                  Ended {new Date(typedLiveSession.ended_at).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : null}

          {isCoach && isSessionLive ? (
            <form action={endLiveSession}>
              <input
                type="hidden"
                name="liveSessionId"
                value={typedLiveSession.id}
              />

              <button
                type="submit"
                className="rounded-lg border border-red-900 bg-red-950 px-4 py-2 font-semibold text-red-200 hover:bg-red-900"
              >
                End Session
              </button>
            </form>
          ) : null}
        </header>

        <LiveRoomClient
          liveSessionId={typedLiveSession.id}
          roomCode={typedLiveSession.room_code}
          isCoach={isCoach && isSessionLive}
          initialCurrentState={typedLiveSession.current_state || {}}
          planTitle={typedPlan.title}
          mapId={typedPlan.map_id}
          gameMode={typedPlan.game_mode}
          planData={typedPlan.plan_data || {}}
          startedAt={typedLiveSession.started_at}
          status={typedLiveSession.status}
        />
      </div>
    </main>
  );
}
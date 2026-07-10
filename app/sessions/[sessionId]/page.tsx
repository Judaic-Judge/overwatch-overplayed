import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { PlanData } from "@/components/planner/PlannerCanvas";

type SessionReviewPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

type AppRole = "coach" | "assistant_coach" | "player";

type ScheduledSession = {
  id: string;
  team_id: string;
  plan_id: string;
  coach_id: string;
  title: string;
  scheduled_start: string;
  status: "scheduled" | "live" | "ended";
  created_at: string;
};

type Team = {
  id: string;
  name: string;
};

type Plan = {
  id: string;
  title: string;
  map_id: string;
  game_mode: string;
  plan_data: PlanData;
};

type LiveSession = {
  scheduled_session_id: string | null;
  room_code: string;
  status: "scheduled" | "live" | "ended";
  current_state: {
    currentStep?: number;
    payloadProgress?: number | null;
    coachMessage?: string;
  } | null;
  started_at: string | null;
  ended_at: string | null;
};

type SessionReview = {
  id: string;
  scheduled_session_id: string;
  team_id: string;
  plan_id: string;
  coach_id: string;
  summary: string;
  went_well: string;
  needs_improvement: string;
  next_steps: string;
  replay_url: string;
  private_notes: string;
  created_at: string;
  updated_at: string;
};

type Profile = {
  display_name: string | null;
};

function formatRole(role: AppRole) {
  if (role === "assistant_coach") return "Assistant Coach";
  if (role === "coach") return "Coach";
  return "Player";
}

function getStepTitle(planData: PlanData, stepIndex: number | null) {
  if (stepIndex === null || stepIndex < 0) return null;

  const steps = Array.isArray(planData.steps) ? planData.steps : [];
  const step = steps[stepIndex] as { title?: string } | undefined;

  return step?.title || `Step ${stepIndex + 1}`;
}

async function saveSessionReview(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const sessionId = String(formData.get("sessionId") || "").trim();

  if (!sessionId) {
    return;
  }

  const summary = String(formData.get("summary") || "").trim();
  const wentWell = String(formData.get("wentWell") || "").trim();
  const needsImprovement = String(formData.get("needsImprovement") || "").trim();
  const nextSteps = String(formData.get("nextSteps") || "").trim();
  const replayUrl = String(formData.get("replayUrl") || "").trim();
  const privateNotes = String(formData.get("privateNotes") || "").trim();

  const { data: session, error: sessionError } = await supabase
    .from("scheduled_sessions")
    .select("id, team_id, plan_id, coach_id, title, scheduled_start, status, created_at")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message || "Session not found.");
  }

  const typedSession = session as ScheduledSession;

  if (typedSession.status !== "ended") {
    throw new Error("AAR notes can only be saved after the session has ended.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", typedSession.team_id)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error("You are not a member of this team.");
  }

  if (
    membership.role !== "coach" &&
    membership.role !== "assistant_coach"
  ) {
    throw new Error("Only Coaches can edit the AAR for this session.");
  }

  const { error } = await supabase.from("session_reviews").upsert(
    {
      scheduled_session_id: typedSession.id,
      team_id: typedSession.team_id,
      plan_id: typedSession.plan_id,
      coach_id: user.id,
      summary,
      went_well: wentWell,
      needs_improvement: needsImprovement,
      next_steps: nextSteps,
      replay_url: replayUrl,
      private_notes: privateNotes,
    },
    {
      onConflict: "scheduled_session_id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/sessions");
  revalidatePath(`/sessions/${sessionId}`);
}

export default function SessionReviewPage(props: SessionReviewPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
          <div className="mx-auto max-w-5xl">
            <p className="text-zinc-400">Loading session review...</p>
          </div>
        </main>
      }
    >
      <SessionReviewContent params={props.params} />
    </Suspense>
  );
}

async function SessionReviewContent({ params }: SessionReviewPageProps) {
  const { sessionId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: session, error: sessionError } = await supabase
    .from("scheduled_sessions")
    .select("id, team_id, plan_id, coach_id, title, scheduled_start, status, created_at")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    notFound();
  }

  const typedSession = session as ScheduledSession;

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", typedSession.team_id)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    notFound();
  }

  const role = membership.role as AppRole;
  const canEditReview = role === "coach" || role === "assistant_coach";

  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", typedSession.team_id)
    .single();

  const { data: plan } = await supabase
    .from("plans")
    .select("id, title, map_id, game_mode, plan_data")
    .eq("id", typedSession.plan_id)
    .single();

  const { data: liveSession } = await supabase
    .from("live_sessions")
    .select("scheduled_session_id, room_code, status, current_state, started_at, ended_at")
    .eq("scheduled_session_id", typedSession.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: review } = await supabase
    .from("session_reviews")
    .select(
      "id, scheduled_session_id, team_id, plan_id, coach_id, summary, went_well, needs_improvement, next_steps, replay_url, private_notes, created_at, updated_at",
    )
    .eq("scheduled_session_id", typedSession.id)
    .maybeSingle();

  const { data: coachProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", typedSession.coach_id)
    .maybeSingle();

  const typedTeam = team as Team | null;
  const typedPlan = plan as Plan | null;
  const typedLiveSession = liveSession as LiveSession | null;
  const typedReview = review as SessionReview | null;
  const typedCoachProfile = coachProfile as Profile | null;

  const currentStep =
    typeof typedLiveSession?.current_state?.currentStep === "number"
      ? typedLiveSession.current_state.currentStep
      : null;

  const finalStepTitle = typedPlan
    ? getStepTitle(typedPlan.plan_data || {}, currentStep)
    : null;

  const stepsCount =
    typedPlan && Array.isArray(typedPlan.plan_data?.steps)
      ? typedPlan.plan_data.steps.length
      : 0;

  const isEnded = typedSession.status === "ended";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sessions"
              className="inline-block text-sm text-cyan-400 hover:text-cyan-300"
            >
              ← Back to Sessions
            </Link>

            <Link
              href="/dashboard"
              className="inline-block text-sm text-zinc-400 hover:text-zinc-300"
            >
              Dashboard
            </Link>
          </div>

          <div>
            <p className="text-sm text-cyan-400">Session Review / AAR</p>
            <h1 className="text-3xl font-bold">{typedSession.title}</h1>
            <p className="text-zinc-400">
              {typedTeam?.name || "Unknown Team"} · {formatRole(role)}
            </p>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">Plan</p>
            <h2 className="mt-1 font-semibold">
              {typedPlan?.title || "Unknown Plan"}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {typedPlan
                ? `${typedPlan.map_id} · ${typedPlan.game_mode}`
                : "No plan details"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">Session Status</p>
            <h2 className="mt-1 font-semibold">{typedSession.status}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Scheduled {new Date(typedSession.scheduled_start).toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">Coach</p>
            <h2 className="mt-1 font-semibold">
              {typedCoachProfile?.display_name || "Coach"}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Room {typedLiveSession?.room_code || "N/A"}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-xl font-semibold">Session Timeline</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Started</p>
              <p className="mt-1 font-semibold">
                {typedLiveSession?.started_at
                  ? new Date(typedLiveSession.started_at).toLocaleString()
                  : "Not recorded"}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Ended</p>
              <p className="mt-1 font-semibold">
                {typedLiveSession?.ended_at
                  ? new Date(typedLiveSession.ended_at).toLocaleString()
                  : "Not recorded"}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Final Step Reached</p>
              <p className="mt-1 font-semibold">
                {currentStep !== null
                  ? `${currentStep + 1}${stepsCount ? ` of ${stepsCount}` : ""}`
                  : "Not recorded"}
              </p>
              {finalStepTitle ? (
                <p className="mt-1 text-sm text-zinc-400">{finalStepTitle}</p>
              ) : null}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">Final Coach Message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">
                {typedLiveSession?.current_state?.coachMessage || "No final message recorded."}
              </p>
            </div>
          </div>
        </section>

        {!isEnded ? (
          <section className="rounded-xl border border-yellow-900 bg-yellow-950 p-5">
            <h2 className="text-xl font-semibold text-yellow-100">
              Session Not Ended Yet
            </h2>
            <p className="mt-2 text-yellow-200">
              AAR notes become editable after the live session is ended.
            </p>
          </section>
        ) : null}

        {isEnded && canEditReview ? (
          <section className="rounded-xl border border-cyan-900 bg-zinc-900 p-5">
            <div>
              <p className="text-sm text-cyan-400">Coach AAR Editor</p>
              <h2 className="text-xl font-semibold">After Action Review</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Players can see the summary, what went well, needs improvement, next steps, and replay link. Private coach notes stay hidden.
              </p>
            </div>

            <form action={saveSessionReview} className="mt-5 space-y-4">
              <input type="hidden" name="sessionId" value={typedSession.id} />

              <div>
                <label className="block text-sm text-zinc-300" htmlFor="summary">
                  Public Summary
                </label>
                <textarea
                  id="summary"
                  name="summary"
                  rows={4}
                  defaultValue={typedReview?.summary || ""}
                  placeholder="Summarize what this session covered."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-300" htmlFor="wentWell">
                  What Went Well
                </label>
                <textarea
                  id="wentWell"
                  name="wentWell"
                  rows={4}
                  defaultValue={typedReview?.went_well || ""}
                  placeholder="List strengths, improvements, good rotations, good comms, etc."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label
                  className="block text-sm text-zinc-300"
                  htmlFor="needsImprovement"
                >
                  Needs Improvement
                </label>
                <textarea
                  id="needsImprovement"
                  name="needsImprovement"
                  rows={4}
                  defaultValue={typedReview?.needs_improvement || ""}
                  placeholder="List problems, missed rotations, ult economy issues, positioning issues, etc."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-300" htmlFor="nextSteps">
                  Next Session Goals
                </label>
                <textarea
                  id="nextSteps"
                  name="nextSteps"
                  rows={4}
                  defaultValue={typedReview?.next_steps || ""}
                  placeholder="What should the team focus on next?"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-300" htmlFor="replayUrl">
                  Replay / VOD Link
                </label>
                <input
                  id="replayUrl"
                  name="replayUrl"
                  type="url"
                  defaultValue={typedReview?.replay_url || ""}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label
                  className="block text-sm text-zinc-300"
                  htmlFor="privateNotes"
                >
                  Private Coach Notes
                </label>
                <textarea
                  id="privateNotes"
                  name="privateNotes"
                  rows={5}
                  defaultValue={typedReview?.private_notes || ""}
                  placeholder="Notes only coaches should see."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
              >
                Save AAR
              </button>
            </form>
          </section>
        ) : null}

        {isEnded && !canEditReview ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-green-400">Player Review</p>
            <h2 className="text-xl font-semibold">Session Summary</h2>

            {typedReview ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <h3 className="font-semibold">Summary</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                    {typedReview.summary || "No summary posted yet."}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <h3 className="font-semibold">What Went Well</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                    {typedReview.went_well || "No notes posted yet."}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <h3 className="font-semibold">Needs Improvement</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                    {typedReview.needs_improvement || "No notes posted yet."}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <h3 className="font-semibold">Next Session Goals</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                    {typedReview.next_steps || "No goals posted yet."}
                  </p>
                </div>

                {typedReview.replay_url ? (
                  <Link
                    href={typedReview.replay_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
                  >
                    Open Replay / VOD
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-zinc-400">
                The coach has not posted an AAR for this session yet.
              </p>
            )}
          </section>
        ) : null}

        {isEnded && canEditReview && typedReview ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-xl font-semibold">Player-Facing Preview</h2>
            <p className="mt-1 text-sm text-zinc-400">
              This is what players can see. Private coach notes are not included.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <h3 className="font-semibold">Summary</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                  {typedReview.summary || "No summary posted yet."}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <h3 className="font-semibold">What Went Well</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                  {typedReview.went_well || "No notes posted yet."}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <h3 className="font-semibold">Needs Improvement</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                  {typedReview.needs_improvement || "No notes posted yet."}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <h3 className="font-semibold">Next Session Goals</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                  {typedReview.next_steps || "No goals posted yet."}
                </p>
              </div>

              {typedReview.replay_url ? (
                <Link
                  href={typedReview.replay_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
                >
                  Open Replay / VOD
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
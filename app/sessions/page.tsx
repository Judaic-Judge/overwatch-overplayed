import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type AppRole = "coach" | "assistant_coach" | "player";

type TeamMember = {
  team_id: string;
  user_id: string;
  role: AppRole;
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
};

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

type LiveSession = {
  scheduled_session_id: string | null;
  room_code: string;
  status: "scheduled" | "live" | "ended";
  started_at: string | null;
  ended_at: string | null;
};

function formatRole(role: AppRole) {
  if (role === "assistant_coach") return "Assistant Coach";
  if (role === "coach") return "Coach";
  return "Player";
}

export default function SessionsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
          <div className="mx-auto max-w-6xl">
            <p className="text-zinc-400">Loading sessions...</p>
          </div>
        </main>
      }
    >
      <SessionsContent />
    </Suspense>
  );
}

async function SessionsContent() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("team_members")
    .select("team_id, user_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const safeMemberships = (memberships || []) as TeamMember[];
  const teamIds = safeMemberships.map((membership) => membership.team_id);

  let sessions: ScheduledSession[] = [];
  let teams: Team[] = [];
  let plans: Plan[] = [];
  let liveSessions: LiveSession[] = [];

  if (teamIds.length > 0) {
    const { data: sessionData, error: sessionsError } = await supabase
      .from("scheduled_sessions")
      .select("id, team_id, plan_id, coach_id, title, scheduled_start, status, created_at")
      .in("team_id", teamIds)
      .order("scheduled_start", { ascending: false });

    if (sessionsError) {
      throw new Error(sessionsError.message);
    }

    sessions = (sessionData || []) as ScheduledSession[];

    const planIds = Array.from(new Set(sessions.map((session) => session.plan_id)));
    const sessionIds = sessions.map((session) => session.id);

    const { data: teamData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    if (teamsError) {
      throw new Error(teamsError.message);
    }

    teams = (teamData || []) as Team[];

    if (planIds.length > 0) {
      const { data: planData, error: plansError } = await supabase
        .from("plans")
        .select("id, title, map_id, game_mode")
        .in("id", planIds);

      if (plansError) {
        throw new Error(plansError.message);
      }

      plans = (planData || []) as Plan[];
    }

    if (sessionIds.length > 0) {
      const { data: liveData, error: liveError } = await supabase
        .from("live_sessions")
        .select("scheduled_session_id, room_code, status, started_at, ended_at")
        .in("scheduled_session_id", sessionIds)
        .order("started_at", { ascending: false });

      if (liveError) {
        throw new Error(liveError.message);
      }

      liveSessions = (liveData || []) as LiveSession[];
    }
  }

  const activeSessions = sessions.filter((session) => session.status !== "ended");
  const endedSessions = sessions.filter((session) => session.status === "ended");

  function getTeamName(teamId: string) {
    return teams.find((team) => team.id === teamId)?.name || "Unknown Team";
  }

  function getPlan(planId: string) {
    return plans.find((plan) => plan.id === planId);
  }

  function getLiveSession(sessionId: string) {
    return liveSessions.find(
      (liveSession) => liveSession.scheduled_session_id === sessionId,
    );
  }

  function getMyRole(teamId: string) {
    return safeMemberships.find((membership) => membership.team_id === teamId)?.role;
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-block text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Dashboard
          </Link>

          <div>
            <p className="text-sm text-cyan-400">Session History</p>
            <h1 className="text-3xl font-bold">Sessions & Reviews</h1>
            <p className="text-zinc-400">
              Review completed sessions, view AARs, and join live sessions for your teams.
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-xl font-semibold">Active / Upcoming Sessions</h2>

          {activeSessions.length > 0 ? (
            <div className="grid gap-3">
              {activeSessions.map((session) => {
                const plan = getPlan(session.plan_id);
                const liveSession = getLiveSession(session.id);
                const role = getMyRole(session.team_id);

                return (
                  <div
                    key={session.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-semibold">{session.title}</h3>
                        <p className="text-sm text-zinc-500">
                          {getTeamName(session.team_id)} ·{" "}
                          {role ? formatRole(role) : "Member"}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {plan
                            ? `${plan.title} · ${plan.map_id} · ${plan.game_mode}`
                            : "Unknown plan"}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {new Date(session.scheduled_start).toLocaleString()} ·{" "}
                          {session.status}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {liveSession?.room_code && liveSession.status === "live" ? (
                          <Link
                            href={`/live/${liveSession.room_code}`}
                            className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-green-400"
                          >
                            Join Live Room
                          </Link>
                        ) : (
                          <span className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400">
                            Waiting
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-400">
              No active or upcoming sessions found.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-xl font-semibold">Completed Sessions</h2>

          {endedSessions.length > 0 ? (
            <div className="grid gap-3">
              {endedSessions.map((session) => {
                const plan = getPlan(session.plan_id);
                const liveSession = getLiveSession(session.id);
                const role = getMyRole(session.team_id);

                return (
                  <div
                    key={session.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-semibold">{session.title}</h3>
                        <p className="text-sm text-zinc-500">
                          {getTeamName(session.team_id)} ·{" "}
                          {role ? formatRole(role) : "Member"}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {plan
                            ? `${plan.title} · ${plan.map_id} · ${plan.game_mode}`
                            : "Unknown plan"}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Ended{" "}
                          {liveSession?.ended_at
                            ? new Date(liveSession.ended_at).toLocaleString()
                            : "recently"}
                        </p>
                      </div>

                      <Link
                        href={`/sessions/${session.id}`}
                        className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
                      >
                        View Review
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-400">
              No completed sessions yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
import Link from "next/link";

type CoachGuidanceTeam = {
  id: string;
  name: string;
  roleLabel: string;
  rosterCount: number;
  activePlanCount: number;
  scheduledSessionCount: number;
  liveSessionCount: number;
  hasInvite: boolean;
};

type PlayerGuidanceTeam = {
  id: string;
  name: string;
  liveSessionCount: number;
  upcomingSessionCount: number;
};

type DashboardGuidanceProps = {
  hasAnyTeams: boolean;
  coachTeams: CoachGuidanceTeam[];
  playerTeams: PlayerGuidanceTeam[];
  activeEditablePlanCount: number;
  livePlayerSessionCount: number;
  upcomingPlayerSessionCount: number;
};

export default function DashboardGuidance({
  hasAnyTeams,
  coachTeams,
  playerTeams,
  activeEditablePlanCount,
  livePlayerSessionCount,
  upcomingPlayerSessionCount,
}: DashboardGuidanceProps) {
  const hasCoachTeams = coachTeams.length > 0;
  const hasPlayerTeams = playerTeams.length > 0;

  return (
    <section className="rounded-xl border border-cyan-900 bg-zinc-900 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-cyan-400">Getting Started</p>
          <h2 className="mt-1 text-xl font-semibold">What should I do next?</h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-400">
            Your role depends on the team. This panel changes based on whether
            you coach a team, play for a team, or have not joined any teams yet.
          </p>
        </div>

        <Link
          href="/help"
          className="rounded-lg border border-cyan-700 px-3 py-1.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-950"
        >
          Open Help / FAQ
        </Link>
      </div>

      {!hasAnyTeams ? (
        <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="font-semibold text-zinc-100">
            You are not on any teams yet.
          </h3>

          <p className="mt-2 text-sm text-zinc-400">
            If you are organizing practices, create a team below. If you are
            joining someone else&apos;s team, ask them for an invite link.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="#create-team"
              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Create Team
            </a>

            <Link
              href="/help#player-guide"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
            >
              How invites work
            </Link>
          </div>
        </div>
      ) : null}

      {hasCoachTeams ? (
        <div className="mt-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-cyan-300">
              Coach Workspace Guidance
            </p>
            <p className="text-sm text-zinc-500">
              These suggestions apply only to teams where you are a Coach or
              Assistant Coach.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {coachTeams.map((team) => {
              const needsFirstPlan = activeEditablePlanCount === 0;
              const needsTeamPlan =
                activeEditablePlanCount > 0 && team.activePlanCount === 0;
              const needsInvite = !team.hasInvite || team.rosterCount <= 1;
              const needsSession = team.scheduledSessionCount === 0;
              const hasLiveSession = team.liveSessionCount > 0;

              return (
                <div
                  key={team.id}
                  className="rounded-lg border border-cyan-900 bg-zinc-950 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-100">
                        {team.name}
                      </h3>
                      <p className="text-sm text-zinc-500">{team.roleLabel}</p>
                    </div>

                    {hasLiveSession ? (
                      <span className="rounded-lg bg-green-500 px-2 py-1 text-xs font-semibold text-zinc-950">
                        Live Now
                      </span>
                    ) : (
                      <span className="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-400">
                        Setup
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    {needsFirstPlan ? (
                      <GuidanceItem
                        title="Create your first plan."
                        detail="Use the Create Plan section below. A plan is required before you can schedule a session."
                      />
                    ) : null}

                    {needsTeamPlan ? (
                      <GuidanceItem
                        title="Assign or schedule a plan for this team."
                        detail="You have active plans, but this team does not have one attached yet. Scheduling a session will attach the selected plan to the team."
                      />
                    ) : null}

                    {needsInvite ? (
                      <GuidanceItem
                        title="Create an invite link."
                        detail="Use Player Invite Links below so players can join this team."
                      />
                    ) : null}

                    {needsSession ? (
                      <GuidanceItem
                        title="Schedule the first session."
                        detail="Once a plan exists, schedule a session so the team has something to attend."
                      />
                    ) : null}

                    {hasLiveSession ? (
                      <GuidanceItem
                        title="A session is live."
                        detail="Use Coach Sessions below to rejoin the live room and control the presentation."
                      />
                    ) : null}

                    {!needsFirstPlan &&
                    !needsTeamPlan &&
                    !needsInvite &&
                    !needsSession &&
                    !hasLiveSession ? (
                      <GuidanceItem
                        title="This team is ready."
                        detail="Run the next live session, then complete the AAR from Sessions & Reviews."
                      />
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href="#create-plan"
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      Create Plan
                    </a>

                    <a
                      href="#schedule-session"
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      Schedule
                    </a>

                    <a
                      href="#player-invites"
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      Invites
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasPlayerTeams ? (
        <div className="mt-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-green-300">
              Player Workspace Guidance
            </p>
            <p className="text-sm text-zinc-500">
              These suggestions apply to teams where you are a Player.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {playerTeams.map((team) => {
              return (
                <div
                  key={team.id}
                  className="rounded-lg border border-green-900 bg-zinc-950 p-4"
                >
                  <h3 className="font-semibold text-zinc-100">{team.name}</h3>
                  <p className="text-sm text-zinc-500">Player</p>

                  <div className="mt-4 space-y-2 text-sm">
                    {team.liveSessionCount > 0 ? (
                      <GuidanceItem
                        title="A live room is available."
                        detail="Use the Live Now section below to join the coach-controlled presentation."
                      />
                    ) : team.upcomingSessionCount > 0 ? (
                      <GuidanceItem
                        title="You have an upcoming session."
                        detail="Wait for your coach to start the live room. It will appear when it is live."
                      />
                    ) : (
                      <GuidanceItem
                        title="No active player sessions right now."
                        detail="Wait for your coach to schedule or start a session, or check Sessions & Reviews for completed sessions."
                      />
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href="#player-sessions"
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      Player Sessions
                    </a>

                    <Link
                      href="/sessions"
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                    >
                      Reviews
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            You currently have {livePlayerSessionCount} live player session
            {livePlayerSessionCount === 1 ? "" : "s"} and{" "}
            {upcomingPlayerSessionCount} upcoming player session
            {upcomingPlayerSessionCount === 1 ? "" : "s"}.
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GuidanceItem({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="font-semibold text-zinc-100">{title}</p>
      <p className="mt-1 text-zinc-400">{detail}</p>
    </div>
  );
}
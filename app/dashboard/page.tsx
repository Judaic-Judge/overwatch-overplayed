import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import DashboardGuidance from "@/components/dashboard/DashboardGuidance";

type AppRole = "coach" | "assistant_coach" | "player";

type Team = {
  id: string;
  name: string;
  owner_id: string;
  archived_at: string | null;
  created_at: string;
};

type Plan = {
  id: string;
  team_id: string | null;
  title: string;
  map_id: string;
  game_mode: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type TeamMember = {
  team_id: string;
  user_id: string;
  role: AppRole;
};

type TeamRosterMember = {
  team_id: string;
  user_id: string;
  display_name: string | null;
  role: AppRole;
  is_owner: boolean;
};

type TeamInvite = {
  id: string;
  team_id: string;
  invite_code: string;
  role: AppRole;
  expires_at: string;
  created_at: string;
};

type ScheduledSession = {
  id: string;
  team_id: string;
  plan_id: string;
  title: string;
  scheduled_start: string;
  status: "scheduled" | "live" | "ended";
  created_at: string;
};

type LiveSession = {
  scheduled_session_id: string | null;
  room_code: string;
  status: "scheduled" | "live" | "ended";
};

type Profile = {
  display_name: string | null;
};

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  return Array.from({ length: 8 }, () => {
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }).join("");
}

function createInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  return Array.from({ length: 10 }, () => {
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }).join("");
}

function formatRole(role: AppRole) {
  if (role === "assistant_coach") return "Assistant Coach";
  if (role === "coach") return "Coach";
  return "Player";
}

function fallbackDisplayName(email?: string | null) {
  if (!email) return "Player";
  return email.split("@")[0] || "Player";
}

async function updateDisplayName(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const displayName = String(formData.get("displayName") || "").trim();

  if (!displayName) {
    return;
  }

  const { error } = await supabase.rpc("update_my_display_name", {
    display_name_input: displayName,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

async function createTeam(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const name = String(formData.get("teamName") || "").trim();

  if (!name) {
    return;
  }

  const { error } = await supabase.from("teams").insert({
    name,
    owner_id: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

async function archiveTeam(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const teamId = String(formData.get("teamId") || "").trim();

  if (!teamId) {
    return;
  }

  const { data: liveTeamSession, error: liveTeamSessionError } = await supabase
    .from("scheduled_sessions")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "live")
    .limit(1)
    .maybeSingle();

  if (liveTeamSessionError) {
    throw new Error(liveTeamSessionError.message);
  }

  if (liveTeamSession) {
    throw new Error("End the live session before archiving this team.");
  }

  const { error } = await supabase.rpc("archive_team", {
    team_id_input: teamId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

async function restoreTeam(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const teamId = String(formData.get("teamId") || "").trim();

  if (!teamId) {
    return;
  }

  const { error } = await supabase.rpc("restore_team", {
    team_id_input: teamId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

async function createStarterPlan(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const title = String(formData.get("planTitle") || "").trim();
  const mapId = String(formData.get("mapId") || "").trim();
  const gameMode = String(formData.get("gameMode") || "").trim();

  if (!title || !mapId || !gameMode) {
    return;
  }

  const emptyPlanData = {
    version: 1,
    mapId,
    gameMode,
    layers: [],
    icons: [],
    drawings: [],
    playerPaths: [],
    payload: {
      route: [],
      progress: 0,
    },
    capturePoints: [],
    steps: [],
  };

  const { error } = await supabase.from("plans").insert({
    owner_id: user.id,
    team_id: null,
    title,
    map_id: mapId,
    game_mode: gameMode,
    plan_data: emptyPlanData,
    archived_at: null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

async function createScheduledSession(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const title = String(formData.get("sessionTitle") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim();
  const planId = String(formData.get("planId") || "").trim();
  const scheduledStart = String(formData.get("scheduledStart") || "").trim();

  if (!title || !teamId || !planId || !scheduledStart) {
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error("You are not a member of this team.");
  }

  if (membership.role !== "coach" && membership.role !== "assistant_coach") {
    throw new Error("Only Coaches can schedule sessions.");
  }

  const { data: selectedTeam, error: selectedTeamError } = await supabase
    .from("teams")
    .select("id, archived_at")
    .eq("id", teamId)
    .single();

  if (selectedTeamError || !selectedTeam) {
    throw new Error("Team not found.");
  }

  if (selectedTeam.archived_at) {
    throw new Error("Archived teams cannot be scheduled. Restore the team first.");
  }

  const { data: selectedPlan, error: selectedPlanError } = await supabase
    .from("plans")
    .select("id, archived_at")
    .eq("id", planId)
    .single();

  if (selectedPlanError || !selectedPlan) {
    throw new Error("Plan not found.");
  }

  if (selectedPlan.archived_at) {
    throw new Error(
      "Archived plans cannot be scheduled. Restore or duplicate the plan first.",
    );
  }

  const date = new Date(scheduledStart);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid session date/time.");
  }

  const { error } = await supabase.from("scheduled_sessions").insert({
    team_id: teamId,
    plan_id: planId,
    coach_id: user.id,
    title,
    scheduled_start: date.toISOString(),
    status: "scheduled",
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("plans")
    .update({
      team_id: teamId,
    })
    .eq("id", planId);

  revalidatePath("/dashboard");
}

async function createTeamInvite(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const teamId = String(formData.get("teamId") || "").trim();

  if (!teamId) {
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error("You are not a member of this team.");
  }

  if (membership.role !== "coach" && membership.role !== "assistant_coach") {
    throw new Error("Only Coaches can create invite links.");
  }

  let lastError: string | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode();

    const { error } = await supabase.from("team_invites").insert({
      team_id: teamId,
      created_by: user.id,
      invite_code: inviteCode,
      role: "player",
    });

    if (!error) {
      revalidatePath("/dashboard");
      return;
    }

    lastError = error.message;
  }

  throw new Error(lastError || "Could not create invite.");
}

async function revokeTeamInvite(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const inviteId = String(formData.get("inviteId") || "").trim();

  if (!inviteId) {
    return;
  }

  const { error } = await supabase
    .from("team_invites")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("id", inviteId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

async function updateTeamMemberRole(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const teamId = String(formData.get("teamId") || "").trim();
  const memberUserId = String(formData.get("memberUserId") || "").trim();
  const role = String(formData.get("role") || "").trim() as AppRole;

  if (!teamId || !memberUserId || !role) {
    return;
  }

  if (role !== "assistant_coach" && role !== "player") {
    throw new Error("Invalid role selected.");
  }

  const { error } = await supabase.rpc("update_team_member_role", {
    team_id_input: teamId,
    member_user_id_input: memberUserId,
    role_input: role,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

async function removeTeamMember(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const teamId = String(formData.get("teamId") || "").trim();
  const memberUserId = String(formData.get("memberUserId") || "").trim();

  if (!teamId || !memberUserId) {
    return;
  }

  const { error } = await supabase.rpc("remove_team_member", {
    team_id_input: teamId,
    member_user_id_input: memberUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

async function startLiveSession(formData: FormData) {
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

  const { data: scheduledSession, error: scheduledSessionError } = await supabase
    .from("scheduled_sessions")
    .select("id, team_id, plan_id, coach_id, title, status")
    .eq("id", sessionId)
    .single();

  if (scheduledSessionError || !scheduledSession) {
    throw new Error(scheduledSessionError?.message || "Session not found.");
  }

  if (scheduledSession.status === "ended") {
    throw new Error("This session has already ended.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", scheduledSession.team_id)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error("You are not a member of this team.");
  }

  if (membership.role !== "coach" && membership.role !== "assistant_coach") {
    throw new Error("Only Coaches can start a live room.");
  }

  const { data: existingLiveSession, error: existingLiveSessionError } =
    await supabase
      .from("live_sessions")
      .select("room_code")
      .eq("scheduled_session_id", sessionId)
      .eq("status", "live")
      .maybeSingle();

  if (existingLiveSessionError) {
    throw new Error(existingLiveSessionError.message);
  }

  if (existingLiveSession?.room_code) {
    redirect(`/live/${existingLiveSession.room_code}`);
  }

  await supabase
    .from("plans")
    .update({
      team_id: scheduledSession.team_id,
    })
    .eq("id", scheduledSession.plan_id);

  const roomCode = createRoomCode();

  const { error: liveSessionError } = await supabase.from("live_sessions").insert({
    scheduled_session_id: scheduledSession.id,
    plan_id: scheduledSession.plan_id,
    coach_id: user.id,
    room_code: roomCode,
    status: "live",
    current_state: {
      currentStep: 0,
      payloadProgress: null,
      coachMessage: "",
      highlightedIconId: null,
      camera: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
  });

  if (liveSessionError) {
    throw new Error(liveSessionError.message);
  }

  const { error: updateSessionError } = await supabase
    .from("scheduled_sessions")
    .update({
      status: "live",
    })
    .eq("id", scheduledSession.id);

  if (updateSessionError) {
    throw new Error(updateSessionError.message);
  }

  revalidatePath("/dashboard");

  redirect(`/live/${roomCode}`);
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
          <div className="mx-auto max-w-6xl">
            <p className="text-zinc-400">Loading dashboard...</p>
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const currentProfile = (profile || {}) as Profile;

  const currentDisplayName =
    currentProfile.display_name || fallbackDisplayName(user.email);

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, owner_id, archived_at, created_at")
    .order("created_at", { ascending: false });

  const { data: teamMembers, error: teamMembersError } = await supabase
    .from("team_members")
    .select("team_id, user_id, role");

  const { data: plans, error: plansError } = await supabase
    .from("plans")
    .select("id, team_id, title, map_id, game_mode, archived_at, created_at, updated_at")
    .order("updated_at", { ascending: false });

  const { data: sessions, error: sessionsError } = await supabase
    .from("scheduled_sessions")
    .select("id, team_id, plan_id, title, scheduled_start, status, created_at")
    .order("scheduled_start", { ascending: true });

  const { data: liveSessions, error: liveSessionsError } = await supabase
    .from("live_sessions")
    .select("scheduled_session_id, room_code, status")
    .eq("status", "live");

  const { data: invites, error: invitesError } = await supabase
    .from("team_invites")
    .select("id, team_id, invite_code, role, expires_at, created_at")
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (teamsError) throw new Error(teamsError.message);
  if (teamMembersError) throw new Error(teamMembersError.message);
  if (plansError) throw new Error(plansError.message);
  if (sessionsError) throw new Error(sessionsError.message);
  if (liveSessionsError) throw new Error(liveSessionsError.message);
  if (invitesError) throw new Error(invitesError.message);

  const safeTeams = (teams || []) as Team[];
  const safeTeamMembers = (teamMembers || []) as TeamMember[];
  const safePlans = (plans || []) as Plan[];
  const safeSessions = (sessions || []) as ScheduledSession[];
  const safeLiveSessions = (liveSessions || []) as LiveSession[];
  const safeInvites = (invites || []) as TeamInvite[];

  const myMemberships = safeTeamMembers.filter(
    (member) => member.user_id === user.id,
  );

  const coachMemberships = myMemberships.filter(
    (member) => member.role === "coach" || member.role === "assistant_coach",
  );

  const playerMemberships = myMemberships.filter(
    (member) => member.role === "player",
  );

  const myTeamIds = new Set(myMemberships.map((member) => member.team_id));
  const coachTeamIds = new Set(coachMemberships.map((member) => member.team_id));
  const playerTeamIds = new Set(playerMemberships.map((member) => member.team_id));

  const activeTeams = safeTeams.filter((team) => !team.archived_at);
  const archivedTeams = safeTeams.filter((team) => team.archived_at);
  const archivedTeamIds = new Set(archivedTeams.map((team) => team.id));

  const myTeams = activeTeams.filter((team) => myTeamIds.has(team.id));
  const coachTeams = activeTeams.filter((team) => coachTeamIds.has(team.id));
  const playerTeams = activeTeams.filter((team) => playerTeamIds.has(team.id));

  const archivedMyTeams = archivedTeams.filter((team) => myTeamIds.has(team.id));

  const playerSessions = safeSessions.filter(
    (session) =>
      playerTeamIds.has(session.team_id) &&
      !archivedTeamIds.has(session.team_id),
  );

  const coachSessions = safeSessions.filter(
    (session) =>
      coachTeamIds.has(session.team_id) &&
      !archivedTeamIds.has(session.team_id),
  );

  const livePlayerSessions = playerSessions.filter((session) =>
    Boolean(
      safeLiveSessions.find(
        (liveSession) =>
          liveSession.scheduled_session_id === session.id &&
          liveSession.status === "live",
      ),
    ),
  );

  const upcomingPlayerSessions = playerSessions.filter(
    (session) => session.status !== "ended",
  );

  const editablePlans = safePlans.filter(
    (plan) => plan.team_id === null || coachTeamIds.has(plan.team_id),
  );

  const activeEditablePlans = editablePlans.filter(
    (plan) =>
      !plan.archived_at &&
      (plan.team_id === null || !archivedTeamIds.has(plan.team_id)),
  );
  const archivedEditablePlans = editablePlans.filter(
    (plan) =>
      Boolean(plan.archived_at) ||
      (plan.team_id !== null && archivedTeamIds.has(plan.team_id)),
  );

  const sharedPlayerPlans = safePlans.filter(
    (plan) =>
      plan.team_id !== null &&
      playerTeamIds.has(plan.team_id) &&
      !coachTeamIds.has(plan.team_id),
  );

  const activeSharedPlayerPlans = sharedPlayerPlans.filter(
    (plan) =>
      !plan.archived_at &&
      plan.team_id !== null &&
      !archivedTeamIds.has(plan.team_id),
  );
  const archivedSharedPlayerPlans = sharedPlayerPlans.filter(
    (plan) =>
      Boolean(plan.archived_at) ||
      (plan.team_id !== null && archivedTeamIds.has(plan.team_id)),
  );

  const rosterResults = await Promise.all(
    coachTeams.map(async (team) => {
      const { data, error } = await supabase.rpc("get_team_roster", {
        team_id_input: team.id,
      });

      if (error) {
        return {
          teamId: team.id,
          members: [] as TeamRosterMember[],
        };
      }

      return {
        teamId: team.id,
        members: (data || []) as TeamRosterMember[],
      };
    }),
  );

  const rosterByTeamId = new Map<string, TeamRosterMember[]>();

  for (const result of rosterResults) {
    rosterByTeamId.set(result.teamId, result.members);
  }

  function isCoachForTeam(teamId: string) {
    return coachTeamIds.has(teamId);
  }

  function getMyMembershipForTeam(teamId: string) {
    return myMemberships.find((member) => member.team_id === teamId);
  }

  function getTeamName(teamId: string) {
    return safeTeams.find((team) => team.id === teamId)?.name || "Unknown Team";
  }

  function isArchivedTeam(teamId: string | null) {
    if (!teamId) return false;
    return archivedTeamIds.has(teamId);
  }

  function getPlanTitle(planId: string) {
    return safePlans.find((plan) => plan.id === planId)?.title || "Unknown Plan";
  }

  function getLiveRoomCode(sessionId: string) {
    return safeLiveSessions.find(
      (liveSession) => liveSession.scheduled_session_id === sessionId,
    )?.room_code;
  }

  function getInviteForTeam(teamId: string) {
    return safeInvites.find((invite) => invite.team_id === teamId);
  }

  function getRosterForTeam(teamId: string) {
    return rosterByTeamId.get(teamId) || [];
  }

  const coachGuidanceTeams = coachTeams.map((team) => {
    const membership = getMyMembershipForTeam(team.id);
    const roster = getRosterForTeam(team.id);
    const invite = getInviteForTeam(team.id);

    const teamActivePlans = activeEditablePlans.filter(
      (plan) => plan.team_id === team.id,
    );

    const teamCoachSessions = coachSessions.filter(
      (session) => session.team_id === team.id && session.status !== "ended",
    );

    const teamLiveSessions = teamCoachSessions.filter(
      (session) =>
        session.status === "live" || Boolean(getLiveRoomCode(session.id)),
    );

    return {
      id: team.id,
      name: team.name,
      roleLabel: membership ? formatRole(membership.role) : "Coach",
      rosterCount: roster.length,
      activePlanCount: teamActivePlans.length,
      scheduledSessionCount: teamCoachSessions.length,
      liveSessionCount: teamLiveSessions.length,
      hasInvite: Boolean(invite),
    };
  });

  const playerGuidanceTeams = playerTeams.map((team) => {
    const teamPlayerSessions = playerSessions.filter(
      (session) => session.team_id === team.id,
    );

    const teamLivePlayerSessions = teamPlayerSessions.filter(
      (session) =>
        session.status === "live" || Boolean(getLiveRoomCode(session.id)),
    );

    const teamUpcomingPlayerSessions = teamPlayerSessions.filter(
      (session) => session.status !== "ended",
    );

    return {
      id: team.id,
      name: team.name,
      liveSessionCount: teamLivePlayerSessions.length,
      upcomingSessionCount: teamUpcomingPlayerSessions.length,
    };
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-cyan-400">Overwatch Overplayed</p>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-zinc-400">
            Roles are team-specific. You can be a Player on one team and a Coach on another.
          </p>
          <p className="text-sm text-zinc-500">
            Signed in as {currentDisplayName}
          </p>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-xl font-semibold">My Display Name</h2>

          <form
            action={updateDisplayName}
            className="flex flex-col gap-3 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <label className="block text-sm text-zinc-300" htmlFor="displayName">
                Visible Username
              </label>

              <input
                id="displayName"
                name="displayName"
                required
                minLength={2}
                maxLength={32}
                defaultValue={currentDisplayName}
                placeholder="Example: TankMainRalph"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
              />

              <p className="mt-1 text-xs text-zinc-500">
                This is what other team members see on rosters.
              </p>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Save Name
            </button>
          </form>
        </section>

        <DashboardGuidance
          hasAnyTeams={myTeams.length > 0}
          coachTeams={coachGuidanceTeams}
          playerTeams={playerGuidanceTeams}
          activeEditablePlanCount={activeEditablePlans.length}
          livePlayerSessionCount={livePlayerSessions.length}
          upcomingPlayerSessionCount={upcomingPlayerSessions.length}
        />

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-cyan-900 bg-cyan-950 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">
              My Coaching Roles
            </h2>

            {coachTeams.length > 0 ? (
              <div className="mt-3 space-y-2">
                {coachTeams.map((team) => {
                  const membership = getMyMembershipForTeam(team.id);

                  return (
                    <div
                      key={team.id}
                      className="rounded-lg border border-cyan-900 bg-zinc-950 p-3"
                    >
                      <p className="font-semibold">{team.name}</p>
                      <p className="text-sm text-zinc-500">
                        {membership ? formatRole(membership.role) : "Coach"}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-cyan-200">
                You are not currently a Coach for any team.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-green-900 bg-green-950 p-5">
            <h2 className="text-lg font-semibold text-green-100">
              My Player Roles
            </h2>

            {playerTeams.length > 0 ? (
              <div className="mt-3 space-y-2">
                {playerTeams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-lg border border-green-900 bg-zinc-950 p-3"
                  >
                    <p className="font-semibold">{team.name}</p>
                    <p className="text-sm text-zinc-500">Player</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-green-200">
                You are not currently a Player for any team.
              </p>
            )}
          </div>

          <section
            id="create-team"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <h2 className="text-lg font-semibold">Create a New Team</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Creating a team makes you the Coach/owner of that new team. It does not change your role on other teams.
            </p>

            <form action={createTeam} className="mt-4 space-y-3">
              <label className="block text-sm text-zinc-300" htmlFor="teamName">
                Team Name
              </label>

              <input
                id="teamName"
                name="teamName"
                required
                placeholder="Example: Gremlins"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
              />

              <button
                type="submit"
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
              >
                Create Coaching Team
              </button>
            </form>
          </section>
        </section>

        {playerTeams.length > 0 ? (
          <section
            id="player-sessions"
            className="space-y-6 rounded-xl border border-green-900 bg-zinc-900 p-5"
          >
            <div>
              <p className="text-sm text-green-400">Player Workspace</p>
              <h2 className="text-xl font-semibold">Sessions for Teams Where I Am a Player</h2>
              <p className="mt-1 text-sm text-zinc-400">
                These are sessions you attend as a player.
              </p>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">Live Now</h3>

              {livePlayerSessions.length > 0 ? (
                <div className="grid gap-3">
                  {livePlayerSessions.map((session) => {
                    const liveRoomCode = getLiveRoomCode(session.id);

                    return (
                      <div
                        key={session.id}
                        className="rounded-lg border border-green-900 bg-green-950 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h4 className="font-semibold text-green-100">
                              {session.title}
                            </h4>
                            <p className="text-sm text-green-300">
                              {getTeamName(session.team_id)} ·{" "}
                              {getPlanTitle(session.plan_id)}
                            </p>
                          </div>

                          {liveRoomCode ? (
                            <Link
                              href={`/live/${liveRoomCode}`}
                              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-green-400"
                            >
                              Join Live Room
                            </Link>
                          ) : (
                            <span className="rounded-lg border border-green-800 px-4 py-2 text-sm text-green-300">
                              Live room loading
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">
                  No live player sessions right now.
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-3 font-semibold">My Player Sessions</h3>

              {upcomingPlayerSessions.length > 0 ? (
                <div className="grid gap-3">
                  {upcomingPlayerSessions.map((session) => {
                    const liveRoomCode = getLiveRoomCode(session.id);

                    return (
                      <div
                        key={session.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h4 className="font-semibold">{session.title}</h4>
                            <p className="text-sm text-zinc-500">
                              {getTeamName(session.team_id)} ·{" "}
                              {getPlanTitle(session.plan_id)}
                            </p>
                            <p className="text-sm text-zinc-500">
                              {new Date(session.scheduled_start).toLocaleString()} ·{" "}
                              {session.status}
                            </p>
                          </div>

                          {liveRoomCode ? (
                            <Link
                              href={`/live/${liveRoomCode}`}
                              className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-green-400"
                            >
                              Join Live Room
                            </Link>
                          ) : (
                            <span className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400">
                              Waiting for Coach
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">
                  No upcoming player sessions.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {coachTeams.length > 0 ? (
          <section className="space-y-6 rounded-xl border border-cyan-900 bg-zinc-900 p-5">
            <div>
              <p className="text-sm text-cyan-400">Coach Workspace</p>
              <h2 className="text-xl font-semibold">Tools for Teams Where I Am a Coach</h2>
              <p className="mt-1 text-sm text-zinc-400">
                These controls only apply to teams where your role is Coach or Assistant Coach.
              </p>
            </div>

            <section className="grid gap-6 lg:grid-cols-2">
              <div
                id="create-plan"
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <h3 className="mb-4 text-lg font-semibold">Create Plan</h3>

                <form action={createStarterPlan} className="space-y-3">
                  <div>
                    <label className="block text-sm text-zinc-300" htmlFor="planTitle">
                      Plan Title
                    </label>

                    <input
                      id="planTitle"
                      name="planTitle"
                      required
                      placeholder="King's Row - Attack First Point"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-300" htmlFor="mapId">
                      Map
                    </label>

                    <select
                      id="mapId"
                      name="mapId"
                      defaultValue="kingsrow"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                    >
                      <option value="kingsrow">King&apos;s Row</option>
                      <option value="watchpointgibraltar">Watchpoint: Gibraltar</option>
                      <option value="dorado">Dorado</option>
                      <option value="route66">Route 66</option>
                      <option value="eichenwalde">Eichenwalde</option>
                      <option value="hollywood">Hollywood</option>
                      <option value="blizzardworld">Blizzard World</option>
                      <option value="junkertown">Junkertown</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-300" htmlFor="gameMode">
                      Game Mode
                    </label>

                    <select
                      id="gameMode"
                      name="gameMode"
                      defaultValue="hybrid"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                    >
                      <option value="hybrid">Hybrid</option>
                      <option value="escort">Escort</option>
                      <option value="control">Control</option>
                      <option value="push">Push</option>
                      <option value="flashpoint">Flashpoint</option>
                      <option value="clash">Clash</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
                  >
                    Create Plan
                  </button>
                </form>
              </div>

              <div
                id="schedule-session"
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <h3 className="mb-4 text-lg font-semibold">Schedule Session</h3>

                {activeEditablePlans.length > 0 ? (
                  <form action={createScheduledSession} className="space-y-3">
                    <div>
                      <label
                        className="block text-sm text-zinc-300"
                        htmlFor="sessionTitle"
                      >
                        Session Title
                      </label>

                      <input
                        id="sessionTitle"
                        name="sessionTitle"
                        required
                        placeholder="Saturday King's Row Review"
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-300" htmlFor="teamId">
                        Present as Coach for Team
                      </label>

                      <select
                        id="teamId"
                        name="teamId"
                        required
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                      >
                        {coachTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-300" htmlFor="planId">
                        Active Plan
                      </label>

                      <select
                        id="planId"
                        name="planId"
                        required
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                      >
                        {activeEditablePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.title}
                          </option>
                        ))}
                      </select>

                      <p className="mt-1 text-xs text-zinc-500">
                        Archived plans are hidden from scheduling. Restore or duplicate an archived plan first.
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-sm text-zinc-300"
                        htmlFor="scheduledStart"
                      >
                        Date / Time
                      </label>

                      <input
                        id="scheduledStart"
                        name="scheduledStart"
                        type="datetime-local"
                        required
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
                    >
                      Schedule Session
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-zinc-400">
                    Create or restore at least one active plan before scheduling.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="mb-4 text-lg font-semibold">Coach Sessions</h3>

              {coachSessions.length > 0 ? (
                <div className="grid gap-3">
                  {coachSessions.map((session) => {
                    const liveRoomCode = getLiveRoomCode(session.id);
                    const canCoachSession = isCoachForTeam(session.team_id);
                    const isEnded = session.status === "ended";

                    return (
                      <div
                        key={session.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h4 className="font-semibold">{session.title}</h4>
                            <p className="text-sm text-zinc-500">
                              {getTeamName(session.team_id)} ·{" "}
                              {getPlanTitle(session.plan_id)}
                            </p>
                            <p className="text-sm text-zinc-500">
                              {new Date(session.scheduled_start).toLocaleString()} ·{" "}
                              {session.status}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/planner/${session.plan_id}`}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                            >
                              Open Plan
                            </Link>

                            {isEnded ? (
                              <span className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400">
                                Session Ended
                              </span>
                            ) : liveRoomCode ? (
                              <Link
                                href={`/live/${liveRoomCode}`}
                                className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-green-400"
                              >
                                Join Live Room
                              </Link>
                            ) : canCoachSession ? (
                              <form action={startLiveSession}>
                                <input
                                  type="hidden"
                                  name="sessionId"
                                  value={session.id}
                                />

                                <button
                                  type="submit"
                                  className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-green-400"
                                >
                                  Start Live Room
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">
                  No coach sessions scheduled yet.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="mb-4 text-lg font-semibold">Team Rosters</h3>

              <div className="space-y-4">
                {coachTeams.map((team) => {
                  const roster = getRosterForTeam(team.id);

                  return (
                    <div
                      key={team.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                    >
                      <div className="mb-4">
                        <h4 className="font-semibold">{team.name}</h4>
                        <p className="text-sm text-zinc-500">
                          Manage players and assistant coaches for this team.
                        </p>
                      </div>

                      {roster.length > 0 ? (
                        <div className="space-y-3">
                          {roster.map((member) => {
                            const isCurrentUser = member.user_id === user.id;
                            const canManageMember =
                              !member.is_owner && !isCurrentUser;

                            return (
                              <div
                                key={`${member.team_id}-${member.user_id}`}
                                className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div>
                                    <p className="font-semibold">
                                      {member.display_name || "Unnamed Player"}
                                    </p>
                                    <p className="text-sm text-zinc-500">
                                      Role: {formatRole(member.role)}
                                      {member.is_owner ? " · Team Owner" : ""}
                                      {isCurrentUser ? " · You" : ""}
                                    </p>
                                  </div>

                                  {canManageMember ? (
                                    <div className="flex flex-wrap gap-2">
                                      <form
                                        action={updateTeamMemberRole}
                                        className="flex flex-wrap gap-2"
                                      >
                                        <input
                                          type="hidden"
                                          name="teamId"
                                          value={team.id}
                                        />
                                        <input
                                          type="hidden"
                                          name="memberUserId"
                                          value={member.user_id}
                                        />

                                        <select
                                          name="role"
                                          defaultValue={member.role}
                                          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-cyan-500"
                                        >
                                          <option value="player">Player</option>
                                          <option value="assistant_coach">
                                            Assistant Coach
                                          </option>
                                        </select>

                                        <button
                                          type="submit"
                                          className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
                                        >
                                          Update Role
                                        </button>
                                      </form>

                                      <form action={removeTeamMember}>
                                        <input
                                          type="hidden"
                                          name="teamId"
                                          value={team.id}
                                        />
                                        <input
                                          type="hidden"
                                          name="memberUserId"
                                          value={member.user_id}
                                        />

                                        <button
                                          type="submit"
                                          className="rounded-lg border border-red-900 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-950"
                                        >
                                          Remove
                                        </button>
                                      </form>
                                    </div>
                                  ) : (
                                    <span className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-500">
                                      Protected
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">
                          No roster members found.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              id="player-invites"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <h3 className="mb-4 text-lg font-semibold">Player Invite Links</h3>

              <div className="grid gap-3">
                {coachTeams.map((team) => {
                  const invite = getInviteForTeam(team.id);

                  return (
                    <div
                      key={team.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h4 className="font-semibold">{team.name}</h4>

                          {invite ? (
                            <div className="mt-1 space-y-1 text-sm text-zinc-400">
                              <p>
                                Invite code:{" "}
                                <span className="font-mono text-cyan-400">
                                  {invite.invite_code}
                                </span>
                              </p>
                              <p>
                                Link:{" "}
                                <span className="font-mono text-cyan-400">
                                  /join/{invite.invite_code}
                                </span>
                              </p>
                              <p>
                                Expires{" "}
                                {new Date(invite.expires_at).toLocaleString()}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-500">
                              No active invite link.
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <form action={createTeamInvite}>
                            <input type="hidden" name="teamId" value={team.id} />

                            <button
                              type="submit"
                              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
                            >
                              Create Invite
                            </button>
                          </form>

                          {invite ? (
                            <>
                              <Link
                                href={`/join/${invite.invite_code}`}
                                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                              >
                                Test Link
                              </Link>

                              <form action={revokeTeamInvite}>
                                <input
                                  type="hidden"
                                  name="inviteId"
                                  value={invite.id}
                                />

                                <button
                                  type="submit"
                                  className="rounded-lg border border-red-900 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-950"
                                >
                                  Revoke
                                </button>
                              </form>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </section>
        ) : null}

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-xl font-semibold">Active Teams</h2>

          {myTeams.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {myTeams.map((team) => {
                const membership = getMyMembershipForTeam(team.id);
                const isOwner = team.owner_id === user.id;

                return (
                  <div
                    key={team.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        <p className="text-sm text-zinc-500">
                          Role: {membership ? formatRole(membership.role) : "Member"}
                          {isOwner ? " · Owner" : ""}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Created {new Date(team.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {isOwner ? (
                        <form action={archiveTeam}>
                          <input type="hidden" name="teamId" value={team.id} />

                          <button
                            type="submit"
                            className="rounded-lg border border-yellow-900 px-3 py-1.5 text-sm font-semibold text-yellow-300 hover:bg-yellow-950"
                          >
                            Archive Team
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-400">
              No active teams. Join with an invite link, create your first coaching team, or restore an archived team.
            </p>
          )}
        </section>

        {archivedMyTeams.length > 0 ? (
          <section className="rounded-xl border border-yellow-900 bg-zinc-900 p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-yellow-100">
                Archived Teams
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Archived teams are hidden from active coaching, player, invite, and scheduling sections. Sessions and history are preserved.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {archivedMyTeams.map((team) => {
                const membership = getMyMembershipForTeam(team.id);
                const isOwner = team.owner_id === user.id;

                return (
                  <div
                    key={team.id}
                    className="rounded-lg border border-yellow-900 bg-yellow-950 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="font-semibold text-yellow-100">
                          {team.name}
                        </h3>
                        <p className="text-sm text-yellow-300">
                          Role: {membership ? formatRole(membership.role) : "Member"}
                          {isOwner ? " · Owner" : ""}
                        </p>
                        <p className="text-xs text-yellow-400">
                          Archived{" "}
                          {team.archived_at
                            ? new Date(team.archived_at).toLocaleDateString()
                            : ""}
                        </p>
                      </div>

                      {isOwner ? (
                        <form action={restoreTeam}>
                          <input type="hidden" name="teamId" value={team.id} />

                          <button
                            type="submit"
                            className="rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-yellow-400"
                          >
                            Restore Team
                          </button>
                        </form>
                      ) : (
                        <span className="rounded-lg border border-yellow-800 px-3 py-1.5 text-sm text-yellow-300">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeEditablePlans.length > 0 ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Active Coach Plans</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Active plans can be edited, duplicated, assigned to teams, and scheduled.
              </p>
            </div>

            <div className="grid gap-3">
              {activeEditablePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold">{plan.title}</h3>
                      <p className="text-sm text-zinc-500">
                        {plan.map_id} · {plan.game_mode}
                        {plan.team_id
                          ? ` · ${getTeamName(plan.team_id)}${
                              isArchivedTeam(plan.team_id) ? " · Archived Team" : ""
                            }`
                          : " · Personal Draft"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-sm text-zinc-500">
                        Updated {new Date(plan.updated_at).toLocaleDateString()}
                      </p>

                      <Link
                        href={`/planner/${plan.id}`}
                        className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {archivedEditablePlans.length > 0 ? (
          <section className="rounded-xl border border-yellow-900 bg-zinc-900 p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-yellow-100">
                Archived Coach Plans
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Archived plans are hidden from scheduling. Open one to restore or duplicate it.
              </p>
            </div>

            <div className="grid gap-3">
              {archivedEditablePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-yellow-900 bg-yellow-950 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-yellow-100">
                        {plan.title}
                      </h3>
                      <p className="text-sm text-yellow-300">
                        {plan.map_id} · {plan.game_mode}
                        {plan.team_id
                          ? ` · ${getTeamName(plan.team_id)}${
                              isArchivedTeam(plan.team_id) ? " · Archived Team" : ""
                            }`
                          : " · Personal Draft"}
                      </p>
                      <p className="text-xs text-yellow-400">
                        Archived{" "}
                        {plan.archived_at
                          ? new Date(plan.archived_at).toLocaleDateString()
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-sm text-yellow-300">
                        Updated {new Date(plan.updated_at).toLocaleDateString()}
                      </p>

                      <Link
                        href={`/planner/${plan.id}`}
                        className="rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-yellow-400"
                      >
                        Open Archived
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeSharedPlayerPlans.length > 0 ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Shared Player Plans</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Plans from teams where you are a player.
              </p>
            </div>

            <div className="grid gap-3">
              {activeSharedPlayerPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold">{plan.title}</h3>
                      <p className="text-sm text-zinc-500">
                        {plan.map_id} · {plan.game_mode}
                        {plan.team_id
                          ? ` · ${getTeamName(plan.team_id)}${
                              isArchivedTeam(plan.team_id) ? " · Archived Team" : ""
                            }`
                          : ""}
                      </p>
                    </div>

                    <span className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-500">
                      Player View
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {archivedSharedPlayerPlans.length > 0 ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-zinc-300">
                Archived Shared Plans
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Old or retired plans from teams where you are a player.
              </p>
            </div>

            <div className="grid gap-3">
              {archivedSharedPlayerPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 opacity-80"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-300">{plan.title}</h3>
                      <p className="text-sm text-zinc-500">
                        {plan.map_id} · {plan.game_mode}
                        {plan.team_id
                          ? ` · ${getTeamName(plan.team_id)}${
                              isArchivedTeam(plan.team_id) ? " · Archived Team" : ""
                            }`
                          : ""}
                      </p>
                    </div>

                    <span className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-500">
                      Archived
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
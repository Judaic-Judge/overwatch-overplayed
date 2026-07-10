import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import PlannerCanvas from "@/components/planner/PlannerCanvas";
import PresentationStepsEditor from "@/components/planner/PresentationStepsEditor";
import PlanManagementPanel from "@/components/planner/PlanManagementPanel";
import type { PlanData } from "@/components/planner/PlannerCanvas";

type PlannerPageProps = {
  params: Promise<{
    planId: string;
  }>;
};

type Plan = {
  id: string;
  owner_id: string;
  team_id: string | null;
  title: string;
  map_id: string;
  game_mode: string;
  plan_data: PlanData;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type TeamOption = {
  id: string;
  name: string;
};

type ManagePlanResult = {
  plan: Plan;
  canManage: boolean;
};

async function getCurrentUserOrRedirect() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  return {
    supabase,
    user,
  };
}

async function getManageablePlan(
  planId: string,
): Promise<ManagePlanResult> {
  const { supabase, user } = await getCurrentUserOrRedirect();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select(
      "id, owner_id, team_id, title, map_id, game_mode, plan_data, archived_at, created_at, updated_at",
    )
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    throw new Error(planError?.message || "Plan not found.");
  }

  const typedPlan = plan as Plan;

  if (typedPlan.owner_id === user.id) {
    return {
      plan: typedPlan,
      canManage: true,
    };
  }

  if (!typedPlan.team_id) {
    return {
      plan: typedPlan,
      canManage: false,
    };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", typedPlan.team_id)
    .eq("user_id", user.id)
    .single();

  const canManage =
    membership?.role === "coach" || membership?.role === "assistant_coach";

  return {
    plan: typedPlan,
    canManage,
  };
}

async function savePlanData(formData: FormData) {
  "use server";

  const { supabase } = await getCurrentUserOrRedirect();

  const planId = String(formData.get("planId") || "").trim();
  const rawPlanData = String(formData.get("planData") || "").trim();

  if (!planId || !rawPlanData) {
    return;
  }

  const { canManage } = await getManageablePlan(planId);

  if (!canManage) {
    throw new Error("You do not have permission to edit this plan.");
  }

  let planData: PlanData;

  try {
    planData = JSON.parse(rawPlanData) as PlanData;
  } catch {
    throw new Error("Could not save. Plan data was not valid JSON.");
  }

  const { error } = await supabase
    .from("plans")
    .update({
      plan_data: planData,
      map_id: planData.mapId || "kingsrow",
      game_mode: planData.gameMode || "hybrid",
    })
    .eq("id", planId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/planner/${planId}`);
  revalidatePath(`/planner/${planId}/canvas`);
}

async function renamePlan(formData: FormData) {
  "use server";

  const { supabase } = await getCurrentUserOrRedirect();

  const planId = String(formData.get("planId") || "").trim();
  const title = String(formData.get("planTitle") || "").trim();

  if (!planId || !title) {
    return;
  }

  const { canManage } = await getManageablePlan(planId);

  if (!canManage) {
    throw new Error("You do not have permission to rename this plan.");
  }

  const { error } = await supabase
    .from("plans")
    .update({
      title,
    })
    .eq("id", planId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/planner/${planId}`);
}

async function duplicatePlan(formData: FormData) {
  "use server";

  const { supabase, user } = await getCurrentUserOrRedirect();

  const planId = String(formData.get("planId") || "").trim();

  if (!planId) {
    return;
  }

  const { plan, canManage } = await getManageablePlan(planId);

  if (!canManage) {
    throw new Error("You do not have permission to duplicate this plan.");
  }

  const duplicatedPlanData = JSON.parse(
    JSON.stringify(plan.plan_data || {}),
  ) as PlanData;

  const { data: newPlan, error } = await supabase
    .from("plans")
    .insert({
      owner_id: user.id,
      team_id: plan.team_id,
      title: `${plan.title} Copy`,
      map_id: plan.map_id,
      game_mode: plan.game_mode,
      plan_data: duplicatedPlanData,
      archived_at: null,
    })
    .select("id")
    .single();

  if (error || !newPlan) {
    throw new Error(error?.message || "Could not duplicate plan.");
  }

  revalidatePath("/dashboard");

  redirect(`/planner/${newPlan.id}`);
}

async function archivePlan(formData: FormData) {
  "use server";

  const { supabase } = await getCurrentUserOrRedirect();

  const planId = String(formData.get("planId") || "").trim();

  if (!planId) {
    return;
  }

  const { canManage } = await getManageablePlan(planId);

  if (!canManage) {
    throw new Error("You do not have permission to archive this plan.");
  }

  const { error } = await supabase
    .from("plans")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/planner/${planId}`);
}

async function restorePlan(formData: FormData) {
  "use server";

  const { supabase } = await getCurrentUserOrRedirect();

  const planId = String(formData.get("planId") || "").trim();

  if (!planId) {
    return;
  }

  const { canManage } = await getManageablePlan(planId);

  if (!canManage) {
    throw new Error("You do not have permission to restore this plan.");
  }

  const { error } = await supabase
    .from("plans")
    .update({
      archived_at: null,
    })
    .eq("id", planId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/planner/${planId}`);
}

async function movePlan(formData: FormData) {
  "use server";

  const { supabase, user } = await getCurrentUserOrRedirect();

  const planId = String(formData.get("planId") || "").trim();
  const teamIdInput = String(formData.get("teamId") || "").trim();

  if (!planId || !teamIdInput) {
    return;
  }

  const { plan, canManage } = await getManageablePlan(planId);

  if (!canManage) {
    throw new Error("You do not have permission to move this plan.");
  }

  let nextTeamId: string | null = null;

  if (teamIdInput !== "__personal") {
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamIdInput)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      throw new Error("You are not a member of that team.");
    }

    if (
      membership.role !== "coach" &&
      membership.role !== "assistant_coach"
    ) {
      throw new Error("You can only move plans to teams where you are a Coach.");
    }

    nextTeamId = teamIdInput;
  } else if (plan.owner_id !== user.id) {
    throw new Error("Only the plan owner can move a plan back to personal drafts.");
  }

  const { error } = await supabase
    .from("plans")
    .update({
      team_id: nextTeamId,
    })
    .eq("id", planId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/planner/${planId}`);
}

async function deletePlan(formData: FormData) {
  "use server";

  const { supabase } = await getCurrentUserOrRedirect();

  const planId = String(formData.get("planId") || "").trim();

  if (!planId) {
    return;
  }

  const { canManage } = await getManageablePlan(planId);

  if (!canManage) {
    throw new Error("You do not have permission to delete this plan.");
  }

  const { count: scheduledCount, error: scheduledError } = await supabase
    .from("scheduled_sessions")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("plan_id", planId);

  if (scheduledError) {
    throw new Error(scheduledError.message);
  }

  const { count: liveCount, error: liveError } = await supabase
    .from("live_sessions")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("plan_id", planId);

  if (liveError) {
    throw new Error(liveError.message);
  }

  if ((scheduledCount || 0) > 0 || (liveCount || 0) > 0) {
    throw new Error(
      "This plan has already been used in a session. Archive it instead of deleting it.",
    );
  }

  const { error } = await supabase.from("plans").delete().eq("id", planId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");

  redirect("/dashboard");
}

export default function PlannerPage(props: PlannerPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
          <div className="mx-auto max-w-7xl">
            <p className="text-zinc-400">Loading planner...</p>
          </div>
        </main>
      }
    >
      <PlannerContent params={props.params} />
    </Suspense>
  );
}

async function PlannerContent({ params }: PlannerPageProps) {
  const { planId } = await params;

  const { supabase, user } = await getCurrentUserOrRedirect();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select(
      "id, owner_id, team_id, title, map_id, game_mode, plan_data, archived_at, created_at, updated_at",
    )
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    notFound();
  }

  const typedPlan = plan as Plan;

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .in("role", ["coach", "assistant_coach"]);

  const coachTeamIds = (memberships || []).map((membership) =>
    String(membership.team_id),
  );

  let coachTeams: TeamOption[] = [];

  if (coachTeamIds.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", coachTeamIds)
      .order("name", { ascending: true });

    coachTeams = (teams || []) as TeamOption[];
  }

  const planData = typedPlan.plan_data || {};

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

          <div>
            <p className="text-sm text-cyan-400">Plan Editor</p>
            <h1 className="text-3xl font-bold">{typedPlan.title}</h1>
            <p className="text-zinc-400">
              {typedPlan.map_id} · {typedPlan.game_mode}
            </p>
          </div>
        </header>

        <PlanManagementPanel
          planId={typedPlan.id}
          title={typedPlan.title}
          currentTeamId={typedPlan.team_id}
          archivedAt={typedPlan.archived_at}
          coachTeams={coachTeams}
          renamePlanAction={renamePlan}
          duplicatePlanAction={duplicatePlan}
          archivePlanAction={archivePlan}
          restorePlanAction={restorePlan}
          deletePlanAction={deletePlan}
          movePlanAction={movePlan}
        />

        <PlannerCanvas
          planId={typedPlan.id}
          mapId={typedPlan.map_id}
          gameMode={typedPlan.game_mode}
          initialPlanData={planData}
          saveCanvasAction={savePlanData}
        />

        <PresentationStepsEditor
          planId={typedPlan.id}
          initialPlanData={planData}
          savePlanDataAction={savePlanData}
        />
      </div>
    </main>
  );
}
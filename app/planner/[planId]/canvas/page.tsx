import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import TacticalCanvasEditor from "@/components/planner/TacticalCanvasEditor";
import type { PlanData } from "@/components/planner/PlannerCanvas";

type CanvasEditorPageProps = {
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
  created_at: string;
  updated_at: string;
};

async function saveCanvasPlanData(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const planId = String(formData.get("planId") || "").trim();
  const rawPlanData = String(formData.get("planData") || "").trim();

  if (!planId || !rawPlanData) {
    return;
  }

  let incomingPlanData: PlanData;

  try {
    incomingPlanData = JSON.parse(rawPlanData) as PlanData;
  } catch {
    throw new Error("Could not save canvas. Plan data was not valid JSON.");
  }

  const { data: existingPlan, error: existingPlanError } = await supabase
    .from("plans")
    .select("plan_data")
    .eq("id", planId)
    .single();

  if (existingPlanError || !existingPlan) {
    throw new Error(existingPlanError?.message || "Plan not found.");
  }

  const existingPlanData = (existingPlan.plan_data || {}) as PlanData;

  const mergedPlanData: PlanData = {
    ...existingPlanData,
    ...incomingPlanData,
    icons: incomingPlanData.icons || [],
    drawings: incomingPlanData.drawings || [],
    payload: incomingPlanData.payload || {
      route: [],
      progress: 0,
    },
    steps: existingPlanData.steps || incomingPlanData.steps || [],
  };

  const { error } = await supabase
    .from("plans")
    .update({
      plan_data: mergedPlanData,
      map_id: mergedPlanData.mapId || "kingsrow",
      game_mode: mergedPlanData.gameMode || "hybrid",
    })
    .eq("id", planId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/planner/${planId}`);
  revalidatePath(`/planner/${planId}/canvas`);
}

export default async function CanvasEditorPage({
  params,
}: CanvasEditorPageProps) {
  const { planId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select(
      "id, owner_id, team_id, title, map_id, game_mode, plan_data, created_at, updated_at",
    )
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    notFound();
  }

  const typedPlan = plan as Plan;

  return (
    <TacticalCanvasEditor
      planId={typedPlan.id}
      mapId={typedPlan.map_id}
      gameMode={typedPlan.game_mode}
      initialPlanData={typedPlan.plan_data || {}}
      saveCanvasAction={saveCanvasPlanData}
    />
  );
}
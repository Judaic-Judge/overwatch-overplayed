"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import PlanViewerCanvas from "@/components/planner/PlanViewerCanvas";
import type { PlanData } from "@/components/planner/PlannerCanvas";

type CurrentState = {
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

type PresentationStep = {
  id: string;
  title: string;
  notes: string;
  payloadProgress: number | null;
  canvasSnapshot?: {
    mapId?: string;
    gameMode?: string;
    icons?: PlanData["icons"];
    drawings?: PlanData["drawings"];
    payload?: PlanData["payload"];
  };
};

type LiveRoomClientProps = {
  liveSessionId: string;
  roomCode: string;
  isCoach: boolean;
  initialCurrentState: CurrentState;
  planTitle: string;
  mapId: string;
  gameMode: string;
  planData: PlanData;
  startedAt: string;
  status: "scheduled" | "live" | "ended";
};

function normalizeSteps(rawSteps: unknown): PresentationStep[] {
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps.map((step, index) => {
    const item = step as Partial<PresentationStep>;

    return {
      id: item.id || `step-${index + 1}`,
      title: item.title || `Step ${index + 1}`,
      notes: item.notes || "",
      payloadProgress:
        typeof item.payloadProgress === "number" ? item.payloadProgress : null,
      canvasSnapshot: item.canvasSnapshot,
    };
  });
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

export default function LiveRoomClient({
  liveSessionId,
  roomCode,
  isCoach,
  initialCurrentState,
  planTitle,
  mapId,
  gameMode,
  planData,
  startedAt,
  status,
}: LiveRoomClientProps) {
  const supabase = useMemo(() => createClient(), []);

  const [liveStatus, setLiveStatus] = useState(status);
  const [currentState, setCurrentState] = useState<CurrentState>(
    initialCurrentState || {},
  );
  const [coachMessageDraft, setCoachMessageDraft] = useState(
    initialCurrentState.coachMessage || "",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const steps = useMemo(() => normalizeSteps(planData.steps), [planData.steps]);

  const currentStepIndex = clampIndex(currentState.currentStep || 0, steps.length);
  const activeStep = steps[currentStepIndex] || null;

  const activePlanData = useMemo<PlanData>(() => {
    const snapshot = activeStep?.canvasSnapshot;

    if (!snapshot) {
      return {
        ...planData,
        mapId: planData.mapId || mapId,
        gameMode: planData.gameMode || gameMode,
        icons: planData.icons || [],
        drawings: planData.drawings || [],
        payload: planData.payload || {
          route: [],
          progress: 0,
        },
        steps: planData.steps || [],
      };
    }

    const snapshotPayload = snapshot.payload || {
      route: [],
      progress: 0,
    };

    const progress =
      typeof currentState.payloadProgress === "number"
        ? currentState.payloadProgress
        : typeof activeStep.payloadProgress === "number"
          ? activeStep.payloadProgress
          : typeof snapshotPayload.progress === "number"
            ? snapshotPayload.progress
            : 0;

    return {
      ...planData,
      mapId: snapshot.mapId || planData.mapId || mapId,
      gameMode: snapshot.gameMode || planData.gameMode || gameMode,
      icons: snapshot.icons || [],
      drawings: snapshot.drawings || [],
      payload: {
        ...snapshotPayload,
        progress,
      },
      steps: planData.steps || [],
    };
  }, [
    activeStep,
    currentState.payloadProgress,
    gameMode,
    mapId,
    planData,
  ]);

  const activeMapId = activePlanData.mapId || mapId;
  const activeGameMode = activePlanData.gameMode || gameMode;

  const activePayloadProgress =
    typeof activePlanData.payload?.progress === "number"
      ? activePlanData.payload.progress
      : 0;

  async function updateLiveState(patch: Partial<CurrentState>) {
    if (!isCoach || liveStatus !== "live") {
      return;
    }

    setErrorMessage("");

    const nextState = {
      ...currentState,
      ...patch,
    };

    setCurrentState(nextState);

    const { error } = await supabase
      .from("live_sessions")
      .update({
        current_state: nextState,
      })
      .eq("id", liveSessionId);

    if (error) {
      setErrorMessage(error.message);
      setCurrentState(currentState);
    }
  }

  function goToStep(index: number) {
    if (steps.length === 0) return;

    const nextIndex = clampIndex(index, steps.length);
    const nextStep = steps[nextIndex];

    const nextPayloadProgress =
      typeof nextStep.payloadProgress === "number"
        ? nextStep.payloadProgress
        : typeof nextStep.canvasSnapshot?.payload?.progress === "number"
          ? nextStep.canvasSnapshot.payload.progress
          : null;

    void updateLiveState({
      currentStep: nextIndex,
      payloadProgress: nextPayloadProgress,
    });
  }

  function sendCoachMessage() {
    void updateLiveState({
      coachMessage: coachMessageDraft,
    });
  }

  function clearCoachMessage() {
    setCoachMessageDraft("");

    void updateLiveState({
      coachMessage: "",
    });
  }

  useEffect(() => {
    const channel = supabase
      .channel(`live-room-${liveSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${liveSessionId}`,
        },
        (payload) => {
          const nextRow = payload.new as {
            current_state?: CurrentState;
            status?: "scheduled" | "live" | "ended";
          };

          if (nextRow.current_state) {
            setCurrentState(nextRow.current_state);
            setCoachMessageDraft(nextRow.current_state.coachMessage || "");
          }

          if (nextRow.status) {
            setLiveStatus(nextRow.status);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [liveSessionId, supabase]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <PlanViewerCanvas
            mapId={activeMapId}
            gameMode={activeGameMode}
            planData={activePlanData}
          />

          {currentState.coachMessage ? (
            <div className="rounded-xl border border-cyan-900 bg-cyan-950 p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-400">
                Coach Message
              </p>
              <p className="mt-1 text-lg font-semibold text-cyan-100">
                {currentState.coachMessage}
              </p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <p className="text-sm text-cyan-400">Live Room</p>
            <h2 className="text-xl font-bold">{planTitle}</h2>
            <p className="text-sm text-zinc-500">Room: {roomCode}</p>
            <p className="text-sm text-zinc-500">
              Started {new Date(startedAt).toLocaleString()}
            </p>
            <p className="text-sm text-zinc-500">Status: {liveStatus}</p>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-sm font-semibold text-zinc-200">Active Step</p>

            {activeStep ? (
              <div className="mt-2">
                <p className="font-semibold text-cyan-300">
                  {currentStepIndex + 1}. {activeStep.title}
                </p>

                {activeStep.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                    {activeStep.notes}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    No notes for this step.
                  </p>
                )}

                <p className="mt-2 text-xs text-zinc-500">
                  Snapshot: {activeStep.canvasSnapshot?.icons?.length || 0} icons ·{" "}
                  {activeStep.canvasSnapshot?.drawings?.length || 0} drawings ·{" "}
                  {activeStep.canvasSnapshot?.payload?.route?.length || 0} payload
                  points
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                No presentation steps saved for this plan.
              </p>
            )}
          </div>

          {isCoach ? (
            <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="font-semibold text-zinc-200">Coach Controls</p>

              {steps.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => goToStep(currentStepIndex - 1)}
                      disabled={currentStepIndex <= 0}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() => goToStep(currentStepIndex + 1)}
                      disabled={currentStepIndex >= steps.length - 1}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>

                  <div className="space-y-2">
                    {steps.map((step, index) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => goToStep(index)}
                        className={
                          index === currentStepIndex
                            ? "w-full rounded-lg border border-cyan-500 bg-cyan-950 p-2 text-left text-sm"
                            : "w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-left text-sm hover:bg-zinc-800"
                        }
                      >
                        {index + 1}. {step.title}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500">
                  Add presentation steps in the planner first.
                </p>
              )}

              <div>
                <label className="block text-sm text-zinc-300">
                  Payload Progress: {Math.round(activePayloadProgress * 100)}%
                </label>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activePayloadProgress}
                  onChange={(event) =>
                    void updateLiveState({
                      payloadProgress: Number(event.target.value),
                    })
                  }
                  className="mt-1 w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-300">
                  Coach Message
                </label>

                <textarea
                  value={coachMessageDraft}
                  onChange={(event) => setCoachMessageDraft(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={sendCoachMessage}
                    className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
                  >
                    Send Message
                  </button>

                  <button
                    type="button"
                    onClick={clearCoachMessage}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
              Player view is read-only. The coach controls the active step.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
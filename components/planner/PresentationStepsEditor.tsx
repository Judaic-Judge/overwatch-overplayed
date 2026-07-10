"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanData } from "@/components/planner/PlannerCanvas";

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

type PresentationStepsEditorProps = {
  planId: string;
  initialPlanData: PlanData;
  savePlanDataAction: (formData: FormData) => void | Promise<void>;
};

function createStepId() {
  return `step-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSteps(rawSteps: unknown): PresentationStep[] {
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps.map((step, index) => {
    const item = step as Partial<PresentationStep>;

    return {
      id: item.id || createStepId(),
      title: item.title || `Step ${index + 1}`,
      notes: item.notes || "",
      payloadProgress:
        typeof item.payloadProgress === "number" ? item.payloadProgress : null,
      canvasSnapshot: item.canvasSnapshot
        ? deepClone(item.canvasSnapshot)
        : undefined,
    };
  });
}

function createCanvasSnapshot(planData: PlanData) {
  return deepClone({
    mapId: planData.mapId,
    gameMode: planData.gameMode,
    icons: planData.icons || [],
    drawings: planData.drawings || [],
    payload: planData.payload || {
      route: [],
      progress: 0,
    },
  });
}

export default function PresentationStepsEditor({
  planId,
  initialPlanData,
  savePlanDataAction,
}: PresentationStepsEditorProps) {
  const [currentCanvasDraft, setCurrentCanvasDraft] =
    useState<PlanData>(initialPlanData);

  const [steps, setSteps] = useState<PresentationStep[]>(() =>
    normalizeSteps(initialPlanData.steps),
  );

  const [selectedStepId, setSelectedStepId] = useState<string | null>(() => {
    const initialSteps = normalizeSteps(initialPlanData.steps);
    return initialSteps[0]?.id || null;
  });

  const selectedStep =
    steps.find((step) => step.id === selectedStepId) || steps[0] || null;

  const planDataToSave = useMemo<PlanData>(() => {
    return {
      ...currentCanvasDraft,
      steps: deepClone(steps),
    };
  }, [currentCanvasDraft, steps]);

  function addStepFromCurrentCanvas() {
    const nextStepNumber = steps.length + 1;
    const snapshot = createCanvasSnapshot(currentCanvasDraft);

    const newStep: PresentationStep = {
      id: createStepId(),
      title: `Step ${nextStepNumber}`,
      notes: "",
      payloadProgress:
        typeof snapshot.payload?.progress === "number"
          ? snapshot.payload.progress
          : 0,
      canvasSnapshot: snapshot,
    };

    setSteps((previous) => [...previous, newStep]);
    setSelectedStepId(newStep.id);
  }

  function updateStep(
    stepId: string,
    updates: Partial<Omit<PresentationStep, "id">>,
  ) {
    setSteps((previous) =>
      previous.map((step) =>
        step.id === stepId
          ? {
              ...step,
              ...updates,
            }
          : step,
      ),
    );
  }

  function captureCurrentCanvasForStep(stepId: string) {
    const snapshot = createCanvasSnapshot(currentCanvasDraft);

    setSteps((previous) =>
      previous.map((step) =>
        step.id === stepId
          ? {
              ...step,
              payloadProgress:
                typeof snapshot.payload?.progress === "number"
                  ? snapshot.payload.progress
                  : step.payloadProgress,
              canvasSnapshot: snapshot,
            }
          : step,
      ),
    );
  }

  function deleteStep(stepId: string) {
    setSteps((previous) => {
      const nextSteps = previous.filter((step) => step.id !== stepId);

      if (selectedStepId === stepId) {
        setSelectedStepId(nextSteps[0]?.id || null);
      }

      return nextSteps;
    });
  }

  function moveStep(stepId: string, direction: "up" | "down") {
    setSteps((previous) => {
      const index = previous.findIndex((step) => step.id === stepId);

      if (index === -1) return previous;

      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= previous.length) return previous;

      const nextSteps = [...previous];
      const [removed] = nextSteps.splice(index, 1);
      nextSteps.splice(nextIndex, 0, removed);

      return nextSteps;
    });
  }

  function previewStepSnapshot(step: PresentationStep) {
    if (typeof window === "undefined") return;
    if (!step.canvasSnapshot) return;

    const channel = new BroadcastChannel(`planner-${planId}`);

    channel.postMessage({
      type: "plan-draft",
      planData: {
        ...currentCanvasDraft,
        mapId: step.canvasSnapshot.mapId || currentCanvasDraft.mapId,
        gameMode: step.canvasSnapshot.gameMode || currentCanvasDraft.gameMode,
        icons: step.canvasSnapshot.icons || [],
        drawings: step.canvasSnapshot.drawings || [],
        payload: {
          ...(step.canvasSnapshot.payload || {
            route: [],
            progress: 0,
          }),
          progress:
            typeof step.payloadProgress === "number"
              ? step.payloadProgress
              : step.canvasSnapshot.payload?.progress || 0,
        },
        steps,
      },
    });

    channel.close();
  }

  useEffect(() => {
    setCurrentCanvasDraft(initialPlanData);
    setSteps(normalizeSteps(initialPlanData.steps));

    const normalized = normalizeSteps(initialPlanData.steps);
    setSelectedStepId(normalized[0]?.id || null);
  }, [initialPlanData]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = new BroadcastChannel(`planner-${planId}`);

    channel.onmessage = (event) => {
      if (event.data?.type === "plan-draft" && event.data.planData) {
        const incomingPlanData = event.data.planData as PlanData;

        setCurrentCanvasDraft((previous) => ({
          ...previous,
          ...incomingPlanData,
          steps,
        }));
      }
    };

    return () => {
      channel.close();
    };
  }, [planId, steps]);

  const currentIconsCount = currentCanvasDraft.icons?.length || 0;
  const currentDrawingsCount = currentCanvasDraft.drawings?.length || 0;
  const currentPayloadPoints = currentCanvasDraft.payload?.route?.length || 0;

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Presentation Steps</h2>
          <p className="text-sm text-zinc-400">
            Each step stores its own isolated canvas snapshot.
          </p>
        </div>

        <form action={savePlanDataAction}>
          <input type="hidden" name="planId" value={planId} />
          <input
            type="hidden"
            name="planData"
            value={JSON.stringify(planDataToSave)}
          />

          <button
            type="submit"
            className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-green-400"
          >
            Save Steps
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
        <p>
          Current canvas draft:{" "}
          <span className="text-zinc-200">{currentIconsCount}</span> icons ·{" "}
          <span className="text-zinc-200">{currentDrawingsCount}</span> drawings ·{" "}
          <span className="text-zinc-200">{currentPayloadPoints}</span> payload
          points
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Edit in the pop-out, then capture the current canvas into the specific
          presentation step.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <button
            type="button"
            onClick={addStepFromCurrentCanvas}
            className="w-full rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
          >
            Add Step From Current Canvas
          </button>

          {steps.length > 0 ? (
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isSelected = selectedStep?.id === step.id;
                const snapshotIcons = step.canvasSnapshot?.icons?.length || 0;
                const snapshotDrawings =
                  step.canvasSnapshot?.drawings?.length || 0;
                const snapshotPayload =
                  step.canvasSnapshot?.payload?.route?.length || 0;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setSelectedStepId(step.id)}
                    className={
                      isSelected
                        ? "w-full rounded-lg border border-cyan-500 bg-cyan-950 p-3 text-left"
                        : "w-full rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left hover:bg-zinc-800"
                    }
                  >
                    <p className="font-semibold">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Snapshot: {snapshotIcons} icons · {snapshotDrawings} drawings ·{" "}
                      {snapshotPayload} payload
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              No steps yet. Add a step from the current canvas.
            </p>
          )}
        </aside>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          {selectedStep ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-300" htmlFor="stepTitle">
                  Step Title
                </label>

                <input
                  id="stepTitle"
                  value={selectedStep.title}
                  onChange={(event) =>
                    updateStep(selectedStep.id, {
                      title: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-300" htmlFor="stepNotes">
                  Step Notes
                </label>

                <textarea
                  id="stepNotes"
                  value={selectedStep.notes}
                  onChange={(event) =>
                    updateStep(selectedStep.id, {
                      notes: event.target.value,
                    })
                  }
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label
                  className="block text-sm text-zinc-300"
                  htmlFor="stepPayloadProgress"
                >
                  Step Payload Progress:{" "}
                  {Math.round((selectedStep.payloadProgress || 0) * 100)}%
                </label>

                <input
                  id="stepPayloadProgress"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedStep.payloadProgress || 0}
                  onChange={(event) =>
                    updateStep(selectedStep.id, {
                      payloadProgress: Number(event.target.value),
                    })
                  }
                  className="mt-1 w-full"
                />
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
                <p>
                  Saved snapshot for this step:{" "}
                  <span className="text-zinc-200">
                    {selectedStep.canvasSnapshot?.icons?.length || 0}
                  </span>{" "}
                  icons ·{" "}
                  <span className="text-zinc-200">
                    {selectedStep.canvasSnapshot?.drawings?.length || 0}
                  </span>{" "}
                  drawings ·{" "}
                  <span className="text-zinc-200">
                    {selectedStep.canvasSnapshot?.payload?.route?.length || 0}
                  </span>{" "}
                  payload points
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => captureCurrentCanvasForStep(selectedStep.id)}
                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
                >
                  Capture Current Canvas
                </button>

                <button
                  type="button"
                  onClick={() => previewStepSnapshot(selectedStep)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                >
                  Preview This Step
                </button>

                <button
                  type="button"
                  onClick={() => moveStep(selectedStep.id, "up")}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                >
                  Move Up
                </button>

                <button
                  type="button"
                  onClick={() => moveStep(selectedStep.id, "down")}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                >
                  Move Down
                </button>

                <button
                  type="button"
                  onClick={() => deleteStep(selectedStep.id)}
                  className="rounded-lg border border-red-900 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-950"
                >
                  Delete Step
                </button>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500">
              Select a step or add one from the current canvas.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
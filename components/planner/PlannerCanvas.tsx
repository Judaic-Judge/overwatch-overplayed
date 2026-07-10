"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type HeroFov = {
  enabled: boolean;
  direction: number;
  angle: number;
  length: number;
};

type PlannerIcon = {
  id: string;
  iconId: string;
  x: number;
  y: number;
  fov?: HeroFov;
};

type DrawingLine = {
  id: string;
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lineStyle?: "solid" | "dotted";
  arrowEnd?: boolean;
};

type FreeDrawing = {
  id: string;
  type: "free";
  points: Point[];
  color: string;
  width: number;
  lineStyle?: "solid" | "dotted";
};

type DrawingItem = DrawingLine | FreeDrawing;

export type PlanData = {
  version?: number;
  mapId?: string;
  gameMode?: string;
  notes?: string;
  layers?: unknown[];
  icons?: PlannerIcon[];
  drawings?: DrawingItem[];
  playerPaths?: unknown[];
  payload?: {
    route?: Point[];
    progress?: number;
  };
  capturePoints?: unknown[];
  steps?: unknown[];
};

type PlannerCanvasProps = {
  planId: string;
  mapId: string;
  gameMode: string;
  initialPlanData: PlanData;
  saveCanvasAction: (formData: FormData) => void | Promise<void>;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function interpolateRoute(points: Point[], progress: number): Point | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];

  const clamped = clamp(progress, 0, 1);
  const scaled = clamped * (points.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;

  const current = points[index];
  const next = points[Math.min(index + 1, points.length - 1)];

  return {
    x: current.x + (next.x - current.x) * fraction,
    y: current.y + (next.y - current.y) * fraction,
  };
}

export default function PlannerCanvas({
  planId,
  mapId,
  gameMode,
  initialPlanData,
}: PlannerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const iconImageCache = useRef<Record<string, HTMLImageElement>>({});

  const [previewPlanData, setPreviewPlanData] = useState<PlanData>(
    initialPlanData || {},
  );

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapSize, setMapSize] = useState({
    width: 1600,
    height: 900,
  });

  const icons = useMemo(
    () => (previewPlanData.icons || []) as PlannerIcon[],
    [previewPlanData.icons],
  );

  const drawings = useMemo(
    () => (previewPlanData.drawings || []) as DrawingItem[],
    [previewPlanData.drawings],
  );

  const payloadRoute = useMemo(
    () => (previewPlanData.payload?.route || []) as Point[],
    [previewPlanData.payload?.route],
  );

  const payloadProgress = previewPlanData.payload?.progress || 0;

  function openPopOutEditor() {
    const popup = window.open(
      `/planner/${planId}/canvas`,
      `planner-canvas-${planId}`,
      "width=1600,height=950,left=60,top=40,resizable=yes,scrollbars=yes",
    );

    popup?.focus();
  }

  function loadIcon(iconId: string) {
    if (iconImageCache.current[iconId]) {
      return iconImageCache.current[iconId];
    }

    const img = new Image();
    img.src = `/textures/icons/${iconId}.png`;
    img.onload = drawCanvas;
    iconImageCache.current[iconId] = img;

    return img;
  }

  function drawArrowHead(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    color: string,
  ) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 18;

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - size * Math.cos(angle - Math.PI / 6),
      to.y - size * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      to.x - size * Math.cos(angle + Math.PI / 6),
      to.y - size * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFov(ctx: CanvasRenderingContext2D, icon: PlannerIcon) {
    if (!icon.fov?.enabled) return;

    const directionRadians = (icon.fov.direction * Math.PI) / 180;
    const halfAngleRadians = ((icon.fov.angle || 90) * Math.PI) / 180 / 2;
    const length = icon.fov.length || 220;

    const leftAngle = directionRadians - halfAngleRadians;
    const rightAngle = directionRadians + halfAngleRadians;

    ctx.save();
    ctx.fillStyle = "rgba(34, 211, 238, 0.18)";
    ctx.strokeStyle = "rgba(34, 211, 238, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(icon.x, icon.y);
    ctx.lineTo(
      icon.x + Math.cos(leftAngle) * length,
      icon.y + Math.sin(leftAngle) * length,
    );
    ctx.arc(icon.x, icon.y, length, leftAngle, rightAngle);
    ctx.lineTo(icon.x, icon.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawLine(ctx: CanvasRenderingContext2D, line: DrawingLine) {
    ctx.save();
    ctx.strokeStyle = line.color || "#00ff66";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (line.lineStyle === "dotted") {
      ctx.setLineDash([4, 10]);
    }

    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (line.arrowEnd) {
      drawArrowHead(
        ctx,
        {
          x: line.x1,
          y: line.y1,
        },
        {
          x: line.x2,
          y: line.y2,
        },
        line.color || "#00ff66",
      );
    }

    ctx.restore();
  }

  function drawFree(ctx: CanvasRenderingContext2D, free: FreeDrawing) {
    if (free.points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = free.color || "#00ff66";
    ctx.lineWidth = free.width || 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (free.lineStyle === "dotted") {
      ctx.setLineDash([4, 10]);
    }

    ctx.beginPath();
    ctx.moveTo(free.points[0].x, free.points[0].y);

    for (let index = 1; index < free.points.length; index += 1) {
      ctx.lineTo(free.points[index].x, free.points[index].y);
    }

    ctx.stroke();
    ctx.restore();
  }

  function drawPayloadRoute(ctx: CanvasRenderingContext2D) {
    if (payloadRoute.length < 2) {
      for (const point of payloadRoute) {
        ctx.save();
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      return;
    }

    ctx.save();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 5;
    ctx.setLineDash([12, 8]);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(payloadRoute[0].x, payloadRoute[0].y);

    for (let index = 1; index < payloadRoute.length; index += 1) {
      ctx.lineTo(payloadRoute[index].x, payloadRoute[index].y);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    const payloadPosition = interpolateRoute(payloadRoute, payloadProgress);

    if (payloadPosition) {
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(payloadPosition.x - 20, payloadPosition.y - 13, 40, 26);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PAY", payloadPosition.x, payloadPosition.y);
    }

    ctx.restore();
  }

  function drawIcon(ctx: CanvasRenderingContext2D, icon: PlannerIcon) {
    const img = loadIcon(icon.iconId);

    ctx.save();

    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, icon.x - 22, icon.y - 22, 44, 44);
    } else {
      ctx.fillStyle = "#06b6d4";
      ctx.beginPath();
      ctx.arc(icon.x, icon.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#020617";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon.iconId.slice(0, 3).toUpperCase(), icon.x, icon.y);
    }

    ctx.restore();
  }

  function drawCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const mapImage = mapImageRef.current;

    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mapImage && mapLoaded) {
      ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "24px sans-serif";
      ctx.fillText("Map loading...", 40, 60);
    }

    for (const icon of icons) {
      drawFov(ctx, icon);
    }

    for (const drawing of drawings) {
      if (drawing.type === "line") {
        drawLine(ctx, drawing);
      } else {
        drawFree(ctx, drawing);
      }
    }

    drawPayloadRoute(ctx);

    for (const icon of icons) {
      drawIcon(ctx, icon);
    }
  }

  useEffect(() => {
    setPreviewPlanData(initialPlanData || {});
  }, [initialPlanData]);

  useEffect(() => {
    const img = new Image();

    setMapLoaded(false);
    setMapError("");

    img.onload = () => {
      mapImageRef.current = img;

      const nextMapSize = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };

      setMapSize(nextMapSize);

      const canvas = canvasRef.current;

      if (canvas) {
        canvas.width = nextMapSize.width;
        canvas.height = nextMapSize.height;
      }

      setMapLoaded(true);
    };

    img.onerror = () => {
      setMapError(`Could not load /Maps/${mapId}.png`);
      setMapLoaded(false);
    };

    img.src = `/Maps/${mapId}.png`;
  }, [mapId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = new BroadcastChannel(`planner-${planId}`);

    channel.onmessage = (event) => {
      if (event.data?.type === "plan-draft" && event.data.planData) {
        setPreviewPlanData(event.data.planData as PlanData);
      }
    };

    return () => {
      channel.close();
    };
  }, [planId]);

  useEffect(() => {
    drawCanvas();
  });

  const previewAspectRatio =
    mapSize.width > 0 && mapSize.height > 0
      ? `${mapSize.width} / ${mapSize.height}`
      : "16 / 9";

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tactical Canvas Preview</h2>
          <p className="text-sm text-zinc-400">
            The full editor opens in a separate browser window. This preview updates
            live while you edit.
          </p>
        </div>

        <button
          type="button"
          onClick={openPopOutEditor}
          className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          Open Pop-Out Editor
        </button>
      </div>

      {mapError ? (
        <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-red-200">
          {mapError}
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-800 bg-black p-3">
        <div
          className="mx-auto max-h-[620px] max-w-full overflow-hidden rounded-lg bg-black"
          style={{
            aspectRatio: previewAspectRatio,
          }}
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{
              imageRendering: "auto",
            }}
          />
        </div>
      </div>

      <div className="grid gap-3 text-sm text-zinc-400 md:grid-cols-5">
        <p>
          <span className="text-zinc-200">Map:</span> {mapId}
        </p>
        <p>
          <span className="text-zinc-200">Mode:</span> {gameMode}
        </p>
        <p>
          <span className="text-zinc-200">Icons:</span> {icons.length}
        </p>
        <p>
          <span className="text-zinc-200">Drawings:</span> {drawings.length}
        </p>
        <p>
          <span className="text-zinc-200">Payload:</span>{" "}
          {payloadRoute.length} pts
        </p>
      </div>
    </section>
  );
}
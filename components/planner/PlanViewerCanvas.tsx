"use client";

import { useEffect, useRef, useState } from "react";
import type { PlanData } from "@/components/planner/PlannerCanvas";

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

type ViewerIcon = {
  id: string;
  iconId: string;
  x: number;
  y: number;
  fov?: HeroFov;
};

type ViewerLine = {
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

type ViewerFree = {
  id: string;
  type: "free";
  points: Point[];
  color: string;
  width: number;
  lineStyle?: "solid" | "dotted";
};

type ViewerDrawing = ViewerLine | ViewerFree;

type PlanViewerCanvasProps = {
  mapId: string;
  gameMode: string;
  planData: PlanData;
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

export default function PlanViewerCanvas({
  mapId,
  gameMode,
  planData,
}: PlanViewerCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const iconImageCache = useRef<Record<string, HTMLImageElement>>({});

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState("");
  const [mapSize, setMapSize] = useState({
    width: 1600,
    height: 900,
  });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({
    x: 0,
    y: 0,
  });

  const [draggingPan, setDraggingPan] = useState<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const icons = (planData.icons || []) as ViewerIcon[];
  const drawings = (planData.drawings || []) as ViewerDrawing[];
  const payloadRoute = (planData.payload?.route || []) as Point[];
  const payloadProgress = planData.payload?.progress || 0;

  function resetView() {
    const viewport = viewportRef.current;

    if (!viewport || !mapSize.width || !mapSize.height) return;

    const rect = viewport.getBoundingClientRect();
    const fitZoom = Math.min(
      rect.width / mapSize.width,
      rect.height / mapSize.height,
      1,
    );

    const nextZoom = Math.max(fitZoom * 0.96, 0.05);

    setZoom(nextZoom);
    setPan({
      x: (rect.width - mapSize.width * nextZoom) / 2,
      y: (rect.height - mapSize.height * nextZoom) / 2,
    });
  }

  function getWorldPoint(clientX: number, clientY: number): Point {
    const viewport = viewportRef.current;

    if (!viewport) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect = viewport.getBoundingClientRect();

    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }

  function zoomAtCenter(multiplier: number) {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const centerClientX = rect.left + rect.width / 2;
    const centerClientY = rect.top + rect.height / 2;
    const centerWorld = getWorldPoint(centerClientX, centerClientY);
    const nextZoom = clamp(zoom * multiplier, 0.05, 5);

    setZoom(nextZoom);
    setPan({
      x: rect.width / 2 - centerWorld.x * nextZoom,
      y: rect.height / 2 - centerWorld.y * nextZoom,
    });
  }

  function loadIcon(iconId: string) {
    if (iconImageCache.current[iconId]) {
      return iconImageCache.current[iconId];
    }

    const img = new Image();
    img.src = `/textures/icons/${iconId}.png`;
    iconImageCache.current[iconId] = img;
    img.onload = drawCanvas;

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

  function drawLine(ctx: CanvasRenderingContext2D, line: ViewerLine) {
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

  function drawFree(ctx: CanvasRenderingContext2D, free: ViewerFree) {
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

  function drawFov(ctx: CanvasRenderingContext2D, icon: ViewerIcon) {
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

    for (const point of payloadRoute) {
      ctx.fillStyle = "#22c55e";
      ctx.strokeStyle = "#052e16";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

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

  function drawIcon(ctx: CanvasRenderingContext2D, icon: ViewerIcon) {
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

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);

    setDraggingPan({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!draggingPan) return;

    setPan({
      x: draggingPan.startPanX + (event.clientX - draggingPan.startClientX),
      y: draggingPan.startPanY + (event.clientY - draggingPan.startClientY),
    });
  }

  function handlePointerUp() {
    setDraggingPan(null);
  }

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
    if (mapLoaded) {
      resetView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, mapSize.width, mapSize.height]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const observer = new ResizeObserver(() => {
      resetView();
    });

    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, mapSize.width, mapSize.height]);

  useEffect(() => {
    drawCanvas();
  });

  return (
    <div className="space-y-4">
      {mapError ? (
        <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-red-200">
          {mapError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div>
          <p className="font-semibold text-zinc-200">Plan Viewer</p>
          <p className="text-sm text-zinc-400">
            Drag to pan. Use the buttons to zoom. Mouse wheel scrolls the page normally.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => zoomAtCenter(1.2)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            Zoom +
          </button>

          <button
            type="button"
            onClick={() => zoomAtCenter(0.8)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            Zoom -
          </button>

          <button
            type="button"
            onClick={resetView}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            Fit
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative h-[76vh] min-h-[520px] overflow-hidden rounded-xl border border-zinc-800 bg-black"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute left-0 top-0 touch-none cursor-grab"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
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
          <span className="text-zinc-200">Payload Route Points:</span>{" "}
          {payloadRoute.length}
        </p>
      </div>
    </div>
  );
}
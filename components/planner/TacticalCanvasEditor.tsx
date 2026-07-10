"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type TacticalCanvasEditorProps = {
  planId: string;
  mapId: string;
  gameMode: string;
  initialPlanData: PlanData;
  saveCanvasAction: (formData: FormData) => void | Promise<void>;
};

type ToolMode = "select" | "pan" | "hero" | "line" | "free" | "payload" | "erase";

type SelectedObject =
  | {
      kind: "icon";
      id: string;
    }
  | {
      kind: "payload-point";
      index: number;
    }
  | null;

type DragState =
  | {
      kind: "pan";
      startClientX: number;
      startClientY: number;
      startPanX: number;
      startPanY: number;
    }
  | {
      kind: "icon";
      id: string;
    }
  | {
      kind: "payload-point";
      index: number;
    }
  | null;

const HEROES = [
  "ana",
  "ashe",
  "baptiste",
  "bastion",
  "brig",
  "cassidy",
  "dva",
  "doomfist",
  "echo",
  "genji",
  "hanzo",
  "junkrat",
  "lucio",
  "mei",
  "mercy",
  "moira",
  "orisa",
  "pharah",
  "reaper",
  "reinhardt",
  "roadhog",
  "sigma",
  "soldier76",
  "sombra",
  "symmetra",
  "torbjorn",
  "tracer",
  "widowmaker",
  "winston",
  "wreckingball",
  "zarya",
  "zenyatta",
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return distance(point, start);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );

  const projected = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };

  return distance(point, projected);
}

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

export default function TacticalCanvasEditor({
  planId,
  mapId,
  gameMode,
  initialPlanData,
  saveCanvasAction,
}: TacticalCanvasEditorProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const saveFormRef = useRef<HTMLFormElement | null>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const iconImageCache = useRef<Record<string, HTMLImageElement>>({});
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const spaceHoldPreviousToolRef = useRef<ToolMode | null>(null);

  const [tool, setTool] = useState<ToolMode>("select");
  const [selectedHero, setSelectedHero] = useState("reinhardt");
  const [lineColor, setLineColor] = useState("#00ff66");
  const [lineStyle, setLineStyle] = useState<"solid" | "dotted">("solid");
  const [arrowEnd, setArrowEnd] = useState(false);
  const [freeWidth, setFreeWidth] = useState(4);

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

  const [icons, setIcons] = useState<PlannerIcon[]>(() =>
    ((initialPlanData.icons || []) as PlannerIcon[]).map((icon) => ({
      ...icon,
      fov: icon.fov || {
        enabled: false,
        direction: 0,
        angle: 90,
        length: 220,
      },
    })),
  );

  const [drawings, setDrawings] = useState<DrawingItem[]>(
    () => (initialPlanData.drawings || []) as DrawingItem[],
  );

  const [payloadRoute, setPayloadRoute] = useState<Point[]>(
    () => initialPlanData.payload?.route || [],
  );

  const [payloadProgress, setPayloadProgress] = useState(
    () => initialPlanData.payload?.progress || 0,
  );

  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [draftLine, setDraftLine] = useState<{
    start: Point;
    end: Point;
  } | null>(null);
  const [draftFree, setDraftFree] = useState<Point[] | null>(null);

  const selectedIcon =
    selectedObject?.kind === "icon"
      ? icons.find((icon) => icon.id === selectedObject.id) || null
      : null;

  const currentPlanData = useMemo<PlanData>(() => {
    return {
      ...initialPlanData,
      version: 1,
      mapId,
      gameMode,
      layers: initialPlanData.layers || [],
      icons,
      drawings,
      playerPaths: initialPlanData.playerPaths || [],
      payload: {
        route: payloadRoute,
        progress: payloadProgress,
      },
      capturePoints: initialPlanData.capturePoints || [],
      steps: initialPlanData.steps || [],
    };
  }, [
    initialPlanData,
    mapId,
    gameMode,
    icons,
    drawings,
    payloadRoute,
    payloadProgress,
  ]);

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

  function findIconAt(point: Point) {
    for (let index = icons.length - 1; index >= 0; index -= 1) {
      const icon = icons[index];

      if (distance(point, icon) <= 24) {
        return icon;
      }
    }

    return null;
  }

  function findPayloadPointAt(point: Point) {
    for (let index = payloadRoute.length - 1; index >= 0; index -= 1) {
      if (distance(point, payloadRoute[index]) <= 12) {
        return index;
      }
    }

    return null;
  }

  function findDrawingAt(point: Point) {
    for (let index = drawings.length - 1; index >= 0; index -= 1) {
      const drawing = drawings[index];

      if (drawing.type === "line") {
        const hit = distanceToSegment(
          point,
          {
            x: drawing.x1,
            y: drawing.y1,
          },
          {
            x: drawing.x2,
            y: drawing.y2,
          },
        );

        if (hit <= 10) {
          return drawing;
        }
      }

      if (drawing.type === "free") {
        for (let p = 1; p < drawing.points.length; p += 1) {
          if (
            distanceToSegment(point, drawing.points[p - 1], drawing.points[p]) <=
            10
          ) {
            return drawing;
          }
        }
      }
    }

    return null;
  }

  function eraseAt(point: Point) {
    const icon = findIconAt(point);

    if (icon) {
      setIcons((previous) => previous.filter((item) => item.id !== icon.id));
      setSelectedObject(null);
      return;
    }

    const payloadIndex = findPayloadPointAt(point);

    if (payloadIndex !== null) {
      setPayloadRoute((previous) =>
        previous.filter((_, index) => index !== payloadIndex),
      );
      setSelectedObject(null);
      return;
    }

    const drawing = findDrawingAt(point);

    if (drawing) {
      setDrawings((previous) => previous.filter((item) => item.id !== drawing.id));
      setSelectedObject(null);
    }
  }

  function deleteSelectedObject() {
    if (!selectedObject) return;

    if (selectedObject.kind === "icon") {
      setIcons((previous) =>
        previous.filter((icon) => icon.id !== selectedObject.id),
      );
      setSelectedObject(null);
      return;
    }

    if (selectedObject.kind === "payload-point") {
      setPayloadRoute((previous) =>
        previous.filter((_, index) => index !== selectedObject.index),
      );
      setSelectedObject(null);
    }
  }

  function cancelCurrentAction() {
    setDraftLine(null);
    setDraftFree(null);
    setDragState(null);
    setSelectedObject(null);
  }

  function updateSelectedIconFov(updates: Partial<HeroFov>) {
    if (!selectedIcon) return;

    setIcons((previous) =>
      previous.map((icon) => {
        if (icon.id !== selectedIcon.id) return icon;

        return {
          ...icon,
          fov: {
            enabled: icon.fov?.enabled ?? false,
            direction: icon.fov?.direction ?? 0,
            angle: icon.fov?.angle ?? 90,
            length: icon.fov?.length ?? 220,
            ...updates,
          },
        };
      }),
    );
  }

  function loadIconImage(iconId: string) {
    if (iconImageCache.current[iconId]) {
      return iconImageCache.current[iconId];
    }

    const img = new Image();
    img.src = `/textures/icons/${iconId}.png`;
    img.onload = () => drawCanvas();
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
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(payloadRoute[0].x, payloadRoute[0].y);

    for (let index = 1; index < payloadRoute.length; index += 1) {
      ctx.lineTo(payloadRoute[index].x, payloadRoute[index].y);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    payloadRoute.forEach((point, index) => {
      const selected =
        selectedObject?.kind === "payload-point" && selectedObject.index === index;

      ctx.fillStyle = selected ? "#22d3ee" : "#22c55e";
      ctx.strokeStyle = "#052e16";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, selected ? 10 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

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

  function drawIcon(ctx: CanvasRenderingContext2D, icon: PlannerIcon) {
    const selected = selectedObject?.kind === "icon" && selectedObject.id === icon.id;
    const img = loadIconImage(icon.iconId);

    ctx.save();

    if (selected) {
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(icon.x, icon.y, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

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

    if (draftLine) {
      drawLine(ctx, {
        id: "draft-line",
        type: "line",
        x1: draftLine.start.x,
        y1: draftLine.start.y,
        x2: draftLine.end.x,
        y2: draftLine.end.y,
        color: lineColor,
        lineStyle,
        arrowEnd,
      });
    }

    if (draftFree && draftFree.length > 1) {
      drawFree(ctx, {
        id: "draft-free",
        type: "free",
        points: draftFree,
        color: lineColor,
        width: freeWidth,
        lineStyle,
      });
    }

    drawPayloadRoute(ctx);

    for (const icon of icons) {
      drawIcon(ctx, icon);
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);

    const point = getWorldPoint(event.clientX, event.clientY);

    if (tool === "pan" || event.button === 1 || event.altKey) {
      setDragState({
        kind: "pan",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      });
      return;
    }

    if (tool === "hero") {
      const newIcon: PlannerIcon = {
        id: createId("icon"),
        iconId: selectedHero,
        x: point.x,
        y: point.y,
        fov: {
          enabled: false,
          direction: 0,
          angle: 90,
          length: 220,
        },
      };

      setIcons((previous) => [...previous, newIcon]);
      setSelectedObject({
        kind: "icon",
        id: newIcon.id,
      });
      setTool("select");
      return;
    }

    if (tool === "line") {
      setDraftLine({
        start: point,
        end: point,
      });
      return;
    }

    if (tool === "free") {
      setDraftFree([point]);
      return;
    }

    if (tool === "payload") {
      const existingPointIndex = findPayloadPointAt(point);

      if (existingPointIndex !== null) {
        setSelectedObject({
          kind: "payload-point",
          index: existingPointIndex,
        });
        setDragState({
          kind: "payload-point",
          index: existingPointIndex,
        });
        return;
      }

      const nextIndex = payloadRoute.length;

      setPayloadRoute((previous) => [...previous, point]);
      setSelectedObject({
        kind: "payload-point",
        index: nextIndex,
      });
      setDragState({
        kind: "payload-point",
        index: nextIndex,
      });
      return;
    }

    if (tool === "erase") {
      eraseAt(point);
      return;
    }

    const icon = findIconAt(point);

    if (icon) {
      setSelectedObject({
        kind: "icon",
        id: icon.id,
      });
      setDragState({
        kind: "icon",
        id: icon.id,
      });
      return;
    }

    const payloadPointIndex = findPayloadPointAt(point);

    if (payloadPointIndex !== null) {
      setSelectedObject({
        kind: "payload-point",
        index: payloadPointIndex,
      });
      setDragState({
        kind: "payload-point",
        index: payloadPointIndex,
      });
      return;
    }

    setSelectedObject(null);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = getWorldPoint(event.clientX, event.clientY);

    if (dragState?.kind === "pan") {
      setPan({
        x: dragState.startPanX + (event.clientX - dragState.startClientX),
        y: dragState.startPanY + (event.clientY - dragState.startClientY),
      });
      return;
    }

    if (dragState?.kind === "icon") {
      setIcons((previous) =>
        previous.map((icon) =>
          icon.id === dragState.id
            ? {
                ...icon,
                x: point.x,
                y: point.y,
              }
            : icon,
        ),
      );
      return;
    }

    if (dragState?.kind === "payload-point") {
      setPayloadRoute((previous) =>
        previous.map((routePoint, index) =>
          index === dragState.index
            ? {
                x: point.x,
                y: point.y,
              }
            : routePoint,
        ),
      );
      return;
    }

    if (draftLine) {
      setDraftLine({
        ...draftLine,
        end: point,
      });
      return;
    }

    if (draftFree) {
      const lastPoint = draftFree[draftFree.length - 1];

      if (!lastPoint || distance(lastPoint, point) >= 3) {
        setDraftFree((previous) => [...(previous || []), point]);
      }
    }
  }

  function handlePointerUp() {
    if (draftLine) {
      if (distance(draftLine.start, draftLine.end) >= 8) {
        setDrawings((previous) => [
          ...previous,
          {
            id: createId("line"),
            type: "line",
            x1: draftLine.start.x,
            y1: draftLine.start.y,
            x2: draftLine.end.x,
            y2: draftLine.end.y,
            color: lineColor,
            lineStyle,
            arrowEnd,
          },
        ]);
      }

      setDraftLine(null);
    }

    if (draftFree) {
      if (draftFree.length >= 2) {
        setDrawings((previous) => [
          ...previous,
          {
            id: createId("free"),
            type: "free",
            points: draftFree,
            color: lineColor,
            width: freeWidth,
            lineStyle,
          },
        ]);
      }

      setDraftFree(null);
    }

    setDragState(null);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();

    const viewport = viewportRef.current;

    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const worldPoint = getWorldPoint(event.clientX, event.clientY);
    const multiplier = event.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = clamp(zoom * multiplier, 0.05, 5);

    setZoom(nextZoom);
    setPan({
      x: event.clientX - rect.left - worldPoint.x * nextZoom,
      y: event.clientY - rect.top - worldPoint.y * nextZoom,
    });
  }

  function clearDrawings() {
    setDrawings([]);
    setDraftLine(null);
    setDraftFree(null);
  }

  function clearIcons() {
    setIcons([]);
    setSelectedObject(null);
  }

  function clearPayloadRoute() {
    setPayloadRoute([]);
    setPayloadProgress(0);
    setSelectedObject(null);
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = new BroadcastChannel(`planner-${planId}`);
    broadcastRef.current = channel;

    return () => {
      channel.close();
      broadcastRef.current = null;
    };
  }, [planId]);

  useEffect(() => {
    broadcastRef.current?.postMessage({
      type: "plan-draft",
      planData: currentPlanData,
    });
  }, [currentPlanData]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;

      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const isTyping = isTypingTarget(event.target);
      const isSaveShortcut = (event.ctrlKey || event.metaKey) && key === "s";

      if (isSaveShortcut) {
        event.preventDefault();
        saveFormRef.current?.requestSubmit();
        return;
      }

      if (isTyping) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();

        if (!event.repeat && spaceHoldPreviousToolRef.current === null) {
          spaceHoldPreviousToolRef.current = tool;
          setTool("pan");
        }

        return;
      }

      if (key === "+" || key === "=" || event.code === "NumpadAdd") {
        event.preventDefault();
        zoomAtCenter(1.2);
        return;
      }

      if (key === "-" || event.code === "NumpadSubtract") {
        event.preventDefault();
        zoomAtCenter(0.8);
        return;
      }

      if (key === "0" || event.code === "Numpad0") {
        event.preventDefault();
        resetView();
        return;
      }

      if (key === "escape") {
        event.preventDefault();
        cancelCurrentAction();
        return;
      }

      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        deleteSelectedObject();
        return;
      }

      if (key === "1" || key === "v") {
        setTool("select");
        return;
      }

      if (key === "2" || key === "p") {
        setTool("pan");
        return;
      }

      if (key === "3" || key === "h") {
        setTool("hero");
        return;
      }

      if (key === "4" || key === "l") {
        setTool("line");
        return;
      }

      if (key === "5" || key === "f") {
        setTool("free");
        return;
      }

      if (key === "6" || key === "r") {
        setTool("payload");
        return;
      }

      if (key === "7" || key === "e") {
        setTool("erase");
        return;
      }

      if (key === "d") {
        setLineStyle((previous) =>
          previous === "solid" ? "dotted" : "solid",
        );
        return;
      }

      if (key === "a") {
        setArrowEnd((previous) => !previous);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space" && spaceHoldPreviousToolRef.current !== null) {
        event.preventDefault();
        setTool(spaceHoldPreviousToolRef.current);
        spaceHoldPreviousToolRef.current = null;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [tool, zoom, pan, selectedObject, draftLine, draftFree]);

  const toolButtonClass = (buttonTool: ToolMode) =>
    tool === buttonTool
      ? "rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950"
      : "rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800";

  const hotkeyItemClass =
    "flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs";

  const keyClass =
    "rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-cyan-300";

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 p-4 text-zinc-100">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-cyan-400">Pop-Out Tactical Editor</p>
          <h1 className="text-2xl font-bold">Canvas Editor</h1>
          <p className="text-sm text-zinc-400">
            Full editor window. Changes appear on the planner page preview.
          </p>
        </div>

        <form ref={saveFormRef} action={saveCanvasAction}>
          <input type="hidden" name="planId" value={planId} />
          <input
            type="hidden"
            name="planData"
            value={JSON.stringify(currentPlanData)}
          />

          <button
            type="submit"
            className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-green-400"
          >
            Save Canvas
          </button>
        </form>
      </div>

      {mapError ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-red-200">
          {mapError}
        </div>
      ) : null}

      <div className="grid h-[calc(100vh-100px)] gap-4 overflow-hidden 2xl:grid-cols-[290px_1fr_280px]">
        <aside className="overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div>
            <h3 className="mb-2 font-semibold">Tools</h3>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTool("select")} className={toolButtonClass("select")}>1 Select</button>
              <button type="button" onClick={() => setTool("pan")} className={toolButtonClass("pan")}>2 Pan</button>
              <button type="button" onClick={() => setTool("hero")} className={toolButtonClass("hero")}>3 Hero</button>
              <button type="button" onClick={() => setTool("line")} className={toolButtonClass("line")}>4 Line</button>
              <button type="button" onClick={() => setTool("free")} className={toolButtonClass("free")}>5 Free</button>
              <button type="button" onClick={() => setTool("payload")} className={toolButtonClass("payload")}>6 Payload</button>
              <button type="button" onClick={() => setTool("erase")} className={toolButtonClass("erase")}>7 Erase</button>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-zinc-300" htmlFor="selectedHero">
              Hero Icon
            </label>

            <select
              id="selectedHero"
              value={selectedHero}
              onChange={(event) => setSelectedHero(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
            >
              {HEROES.map((hero) => (
                <option key={hero} value={hero}>
                  {hero}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-3">
            <h3 className="font-semibold">Drawing Style</h3>

            <div>
              <label className="block text-sm text-zinc-300" htmlFor="lineColor">
                Color
              </label>

              <input
                id="lineColor"
                type="color"
                value={lineColor}
                onChange={(event) => setLineColor(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-300" htmlFor="lineStyle">
                Style
              </label>

              <select
                id="lineStyle"
                value={lineStyle}
                onChange={(event) =>
                  setLineStyle(event.target.value as "solid" | "dotted")
                }
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-cyan-500"
              >
                <option value="solid">Solid</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={arrowEnd}
                onChange={(event) => setArrowEnd(event.target.checked)}
              />
              Arrow end for lines
            </label>

            <div>
              <label className="block text-sm text-zinc-300" htmlFor="freeWidth">
                Free Draw Width: {freeWidth}
              </label>

              <input
                id="freeWidth"
                type="range"
                min="2"
                max="14"
                step="1"
                value={freeWidth}
                onChange={(event) => setFreeWidth(Number(event.target.value))}
                className="mt-1 w-full"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="font-semibold">View</h3>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => zoomAtCenter(1.2)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800">
                Zoom +
              </button>

              <button type="button" onClick={() => zoomAtCenter(0.8)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800">
                Zoom -
              </button>

              <button type="button" onClick={resetView} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-800">
                Fit
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Zoom: {Math.round(zoom * 100)}%
            </p>
            <p className="text-xs text-zinc-500">
              Mouse zoom: Ctrl + Wheel
            </p>
          </div>
        </aside>

        <div
          ref={viewportRef}
          onWheel={handleWheel}
          className="relative h-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
        >
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-300 shadow-lg">
            <span className="text-zinc-500">Tool:</span>{" "}
            <span className="font-semibold text-cyan-400">{tool}</span>
            <span className="mx-2 text-zinc-700">|</span>
            <span className="text-zinc-500">Zoom:</span>{" "}
            <span className="font-semibold text-cyan-400">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute left-0 top-0 touch-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              cursor:
                tool === "pan"
                  ? "grab"
                  : tool === "erase"
                    ? "not-allowed"
                    : tool === "hero"
                      ? "crosshair"
                      : tool === "line" || tool === "free" || tool === "payload"
                        ? "crosshair"
                        : "default",
            }}
          />
        </div>

        <aside className="overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div>
            <h3 className="font-semibold">Hotkeys</h3>

            <div className="mt-2 space-y-1 text-zinc-400">
              <div className={hotkeyItemClass}><span>Select</span><span><span className={keyClass}>1</span> <span className={keyClass}>V</span></span></div>
              <div className={hotkeyItemClass}><span>Pan</span><span><span className={keyClass}>2</span> <span className={keyClass}>P</span></span></div>
              <div className={hotkeyItemClass}><span>Temporary Pan</span><span className={keyClass}>Hold Space</span></div>
              <div className={hotkeyItemClass}><span>Hero</span><span><span className={keyClass}>3</span> <span className={keyClass}>H</span></span></div>
              <div className={hotkeyItemClass}><span>Line</span><span><span className={keyClass}>4</span> <span className={keyClass}>L</span></span></div>
              <div className={hotkeyItemClass}><span>Free Draw</span><span><span className={keyClass}>5</span> <span className={keyClass}>F</span></span></div>
              <div className={hotkeyItemClass}><span>Payload</span><span><span className={keyClass}>6</span> <span className={keyClass}>R</span></span></div>
              <div className={hotkeyItemClass}><span>Erase</span><span><span className={keyClass}>7</span> <span className={keyClass}>E</span></span></div>
              <div className={hotkeyItemClass}><span>Zoom</span><span><span className={keyClass}>+</span> <span className={keyClass}>-</span></span></div>
              <div className={hotkeyItemClass}><span>Fit</span><span className={keyClass}>0</span></div>
              <div className={hotkeyItemClass}><span>Dotted</span><span className={keyClass}>D</span></div>
              <div className={hotkeyItemClass}><span>Arrow</span><span className={keyClass}>A</span></div>
              <div className={hotkeyItemClass}><span>Delete</span><span className={keyClass}>Del</span></div>
              <div className={hotkeyItemClass}><span>Cancel</span><span className={keyClass}>Esc</span></div>
              <div className={hotkeyItemClass}><span>Save</span><span className={keyClass}>Ctrl+S</span></div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold">Canvas Stats</h3>
            <div className="mt-2 space-y-1 text-sm text-zinc-400">
              <p>Map: {mapId}</p>
              <p>Mode: {gameMode}</p>
              <p>Map Size: {mapSize.width} × {mapSize.height}</p>
              <p>Icons: {icons.length}</p>
              <p>Drawings: {drawings.length}</p>
              <p>Payload Points: {payloadRoute.length}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="font-semibold">Payload</h3>

            <label className="block text-sm text-zinc-300">
              Progress: {Math.round(payloadProgress * 100)}%
            </label>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={payloadProgress}
              onChange={(event) => setPayloadProgress(Number(event.target.value))}
              className="w-full"
            />

            <button
              type="button"
              onClick={clearPayloadRoute}
              className="rounded-lg border border-red-900 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-950"
            >
              Clear Payload
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="font-semibold">Selected Hero FOV</h3>

            {selectedIcon ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Selected:{" "}
                  <span className="font-semibold text-zinc-200">
                    {selectedIcon.iconId}
                  </span>
                </p>

                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={selectedIcon.fov?.enabled || false}
                    onChange={(event) =>
                      updateSelectedIconFov({
                        enabled: event.target.checked,
                      })
                    }
                  />
                  Show FOV cone
                </label>

                <div>
                  <label className="block text-sm text-zinc-300">
                    Direction: {Math.round(selectedIcon.fov?.direction || 0)}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={selectedIcon.fov?.direction || 0}
                    onChange={(event) =>
                      updateSelectedIconFov({
                        direction: Number(event.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-300">
                    Angle: {Math.round(selectedIcon.fov?.angle || 90)}°
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="140"
                    step="1"
                    value={selectedIcon.fov?.angle || 90}
                    onChange={(event) =>
                      updateSelectedIconFov({
                        angle: Number(event.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-300">
                    Length: {Math.round(selectedIcon.fov?.length || 220)}
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="700"
                    step="10"
                    value={selectedIcon.fov?.length || 220}
                    onChange={(event) =>
                      updateSelectedIconFov({
                        length: Number(event.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Select a hero icon to edit its FOV cone.
              </p>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="font-semibold">Clear</h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearDrawings}
                className="rounded-lg border border-red-900 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-950"
              >
                Clear Drawings
              </button>

              <button
                type="button"
                onClick={clearIcons}
                className="rounded-lg border border-red-900 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-950"
              >
                Clear Icons
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
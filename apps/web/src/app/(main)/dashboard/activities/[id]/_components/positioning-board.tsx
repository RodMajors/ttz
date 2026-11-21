"use client";

import { useMutation } from "@tanstack/react-query";
import { activityStrategyPositioningSaveSchema, type PositioningCanvas, positioningCanvasSchema } from "@ttz/contracts";
import type Konva from "konva";
import { ArrowDownToLine, Circle, Eye, EyeOff, Lock, MoveRight, Save, Square, Trash2, Type } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Arrow,
  Circle as KonvaCircle,
  Image as KonvaImage,
  Text as KonvaText,
  Layer,
  Line,
  Rect,
  Stage,
} from "react-konva";
import { z } from "zod";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from "@/lib/api-client";

type Target = NonNullable<NonNullable<import("@ttz/contracts").ActivityDetail["raid"]>["targets"][number]>;
type Activity = import("@ttz/contracts").ActivityDetail;
type CanvasShape = PositioningCanvas["shapes"][number];
type Color = PositioningCanvas["shapes"][number]["color"];

const saveResultSchema = z.object({ snapshotId: z.string(), revision: z.number().int(), updated: z.boolean() });
const colors: Color[] = ["red", "orange", "yellow", "green", "blue", "purple", "white", "black"];
const emptyCanvas: PositioningCanvas = {
  schemaVersion: 1,
  width: 1000,
  height: 700,
  background: "CIRCLE_ARENA",
  imageUrl: null,
  shapes: [],
};

export function PositioningBoard({
  activity,
  target,
  onChanged,
}: {
  activity: Activity;
  target: Target;
  onChanged: () => Promise<void>;
}) {
  const block = target.blocks.find((entry) => entry.type === "POSITIONING");
  const initialCanvas = positioningCanvasSchema.safeParse(block?.config);
  const [canvas, setCanvas] = useState<PositioningCanvas>(initialCanvas.success ? initialCanvas.data : emptyCanvas);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedColor, setSelectedColor] = useState<Color>("yellow");
  const [slotToPlace, setSlotToPlace] = useState<string>("__none__");
  const [viewMode, setViewMode] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState<string>();
  const [error, setError] = useState<string>();
  const stageRef = useRef<Konva.Stage>(null);
  const currentRevision = target.snapshot?.revision ?? 1;
  const slots = target.snapshot?.slots ?? [];
  const canEdit = activity.canManage && !activity.rosterLockedAt && target.snapshot?.status === "EDITING" && !viewMode;

  useEffect(() => {
    const parsed = positioningCanvasSchema.safeParse(block?.config);
    setCanvas(parsed.success ? parsed.data : emptyCanvas);
    setSelectedId(undefined);
    setError(undefined);
  }, [block?.config]);

  useEffect(() => {
    if (canvas.background !== "CUSTOM_IMAGE" || !canvas.imageUrl) {
      setImage(null);
      setImageError(undefined);
      return;
    }
    const element = new window.Image();
    element.crossOrigin = "anonymous";
    element.onload = () => {
      setImage(element);
      setImageError(undefined);
    };
    element.onerror = () => {
      setImage(null);
      setImageError("背景图片加载失败；请检查图片地址和跨域设置。");
    };
    element.src = canvas.imageUrl;
  }, [canvas.background, canvas.imageUrl]);

  const save = useMutation({
    mutationFn: () => {
      const body = activityStrategyPositioningSaveSchema.parse({ revision: currentRevision, canvas });
      return apiRequest(
        `/raid-progress/activities/${activity.id}/snapshots/${target.snapshot?.id}/positioning`,
        saveResultSchema,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      );
    },
    onSuccess: async () => {
      setError(undefined);
      await onChanged();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "保存站位画板失败"),
  });

  const selectedShape = canvas.shapes.find((shape) => shape.id === selectedId);
  const slotLabels = useMemo(() => new Map(slots.map((slot) => [slot.slotKey, slot])), [slots]);
  const boundSlotText = (slotKey: string) => {
    const slot = slotLabels.get(slotKey);
    if (!slot) return slotKey;
    const signup = slot.signupId ? activity.signups.find((entry) => entry.id === slot.signupId) : undefined;
    return signup?.character.name ?? slot.characterName ?? slot.label;
  };

  const addShape = (type: "circle" | "rect" | "arrow" | "line" | "text") => {
    const id = crypto.randomUUID();
    let shape: CanvasShape;
    if (type === "circle") shape = { id, type, x: 500, y: 350, radius: 36, color: selectedColor, fill: false };
    else if (type === "rect")
      shape = { id, type, x: 430, y: 300, width: 140, height: 100, color: selectedColor, fill: false };
    else if (type === "line" || type === "arrow")
      shape = { id, type, points: [380, 350, 620, 350], color: selectedColor, strokeWidth: 4 };
    else shape = { id, type: "text", x: 440, y: 320, text: "机制说明", color: selectedColor, fontSize: 24 };
    setCanvas((current) => ({ ...current, shapes: [...current.shapes, shape] }));
    setSelectedId(id);
  };

  const updateShape = (id: string, patch: Record<string, unknown>) => {
    setCanvas((current) => ({
      ...current,
      shapes: current.shapes.map((shape) => (shape.id === id ? ({ ...shape, ...patch } as CanvasShape) : shape)),
    }));
  };

  const addSlotAtPointer = () => {
    if (slotToPlace === "__none__") return;
    const stage = stageRef.current;
    const position = stage?.getPointerPosition();
    if (!position) return;
    const slot = slotLabels.get(slotToPlace);
    if (!slot) return;
    const shape: CanvasShape = {
      id: crypto.randomUUID(),
      type: "slot",
      x: position.x,
      y: position.y,
      slotKey: slot.slotKey,
      color: selectedColor,
    };
    setCanvas((current) => ({ ...current, shapes: [...current.shapes, shape] }));
    setSelectedId(shape.id);
    setSlotToPlace("__none__");
  };

  const exportPng = () => {
    try {
      const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
      if (!dataUrl) throw new Error("画板还未就绪");
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `${target.bossName}-站位图.png`;
      anchor.click();
    } catch {
      setError("导出失败。若使用外部地图图片，请确认图片服务器允许跨域导出；也可切换内置场地图后重试。");
    }
  };

  const handleDragEnd = (shape: CanvasShape, event: Konva.KonvaEventObject<DragEvent>) => {
    if (shape.type === "arrow" || shape.type === "line") {
      const dx = event.target.x();
      const dy = event.target.y();
      const points = shape.points.map((value, index) => value + (index % 2 === 0 ? dx : dy));
      event.target.position({ x: 0, y: 0 });
      updateShape(shape.id, { points });
      return;
    }
    updateShape(shape.id, { x: event.target.x(), y: event.target.y() });
  };

  const pointerToPlace = canEdit && slotToPlace !== "__none__";
  const selectedSlot = selectedShape?.type === "slot" ? slotLabels.get(selectedShape.slotKey) : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          站位画板
          <Badge variant={target.snapshot?.status === "LOCKED" ? "default" : "outline"}>
            {target.snapshot?.status === "LOCKED" ? "已锁定" : "编辑中"}
          </Badge>
          <Badge variant="secondary">修订 {currentRevision}</Badge>
        </CardTitle>
        <CardDescription>
          画布使用固定逻辑坐标，可添加场地图、形状、连线和本场槽位标记；PNG 导出用于分享。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => addShape("circle")}>
                <Circle data-icon="inline-start" />
                圆形
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addShape("rect")}>
                <Square data-icon="inline-start" />
                矩形
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addShape("arrow")}>
                <MoveRight data-icon="inline-start" />
                箭头
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addShape("line")}>
                <MoveRight data-icon="inline-start" />
                连线
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addShape("text")}>
                <Type data-icon="inline-start" />
                文字
              </Button>
              <fieldset className="flex items-center gap-1" aria-label="形状颜色">
                <legend className="sr-only">形状颜色</legend>
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`${color}颜色`}
                    aria-pressed={selectedColor === color}
                    className={`size-6 rounded-full border-2 ${selectedColor === color ? "border-primary" : "border-border"}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setSelectedColor(color);
                      if (selectedId) updateShape(selectedId, { color });
                    }}
                  />
                ))}
              </fieldset>
              <Select
                value={canvas.background}
                onValueChange={(value) =>
                  setCanvas((current) => ({ ...current, background: value as PositioningCanvas["background"] }))
                }
              >
                <SelectTrigger className="w-44" aria-label="场地图">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="CIRCLE_ARENA">圆形竞技场</SelectItem>
                    <SelectItem value="SQUARE_ARENA">方形场地</SelectItem>
                    <SelectItem value="HEX_ARENA">六边形场地</SelectItem>
                    <SelectItem value="PLAIN">纯色底图</SelectItem>
                    <SelectItem value="CUSTOM_IMAGE">自定义地图图片</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {canvas.background === "CUSTOM_IMAGE" ? (
                <Input
                  aria-label="地图图片地址"
                  className="w-56"
                  value={canvas.imageUrl ?? ""}
                  onChange={(event) => setCanvas((current) => ({ ...current, imageUrl: event.target.value || null }))}
                  placeholder="https://.../map.png"
                />
              ) : null}
              <Select value={slotToPlace} onValueChange={setSlotToPlace}>
                <SelectTrigger className="w-48" aria-label="选择槽位标记">
                  <SelectValue placeholder="选择槽位标记" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none__">不放置槽位</SelectItem>
                    {slots.map((slot) => (
                      <SelectItem key={slot.slotKey} value={slot.slotKey}>
                        {slot.label}
                        {slot.signupId ? ` · ${boundSlotText(slot.slotKey)}` : " · 空位"}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {slotToPlace !== "__none__" ? <Badge variant="secondary">点击画布放置标记</Badge> : null}
            </>
          ) : null}
          {canEdit && selectedShape && (selectedShape.type === "circle" || selectedShape.type === "rect") ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => updateShape(selectedShape.id, { fill: !selectedShape.fill })}
            >
              {selectedShape.fill ? "切换为空心" : "切换为实心"}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={exportPng}>
            <ArrowDownToLine data-icon="inline-start" />
            导出 PNG
          </Button>
          {activity.canManage && !activity.rosterLockedAt && target.snapshot?.status === "EDITING" ? (
            <Button
              type="button"
              size="sm"
              variant={viewMode ? "secondary" : "outline"}
              onClick={() => setViewMode((current) => !current)}
            >
              {viewMode ? <Eye data-icon="inline-start" /> : <EyeOff data-icon="inline-start" />}
              {viewMode ? "退出查看模式" : "查看模式"}
            </Button>
          ) : null}
          {canEdit ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!selectedId}
                onClick={() => {
                  setCanvas((current) => ({
                    ...current,
                    shapes: current.shapes.filter((shape) => shape.id !== selectedId),
                  }));
                  setSelectedId(undefined);
                }}
              >
                <Trash2 data-icon="inline-start" />
                删除选中
              </Button>
              <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}保存画板
              </Button>
            </>
          ) : (
            <Badge variant="outline">
              <Lock data-icon="inline-start" />
              只读
            </Badge>
          )}
        </div>
        {imageError || error ? (
          <p role="alert" className="text-sm text-destructive">
            {error ?? imageError}
          </p>
        ) : null}
        {selectedShape?.type === "text" && canEdit ? (
          <Field className="max-w-sm">
            <FieldLabel htmlFor={`shape-text-${selectedShape.id}`}>选中文字</FieldLabel>
            <Input
              id={`shape-text-${selectedShape.id}`}
              value={selectedShape.text}
              onChange={(event) => updateShape(selectedShape.id, { text: event.target.value })}
            />
          </Field>
        ) : null}
        {selectedSlot ? (
          <p className="text-sm text-muted-foreground">
            选中槽位：{selectedSlot.label} · {boundSlotText(selectedSlot.slotKey)}
          </p>
        ) : null}
        <div className="w-full overflow-auto rounded-lg border bg-black">
          <Stage
            ref={stageRef}
            width={canvas.width}
            height={canvas.height}
            onMouseDown={(event) => {
              if (event.target === event.target.getStage()) {
                setSelectedId(undefined);
                if (pointerToPlace) addSlotAtPointer();
              }
            }}
            className={pointerToPlace ? "cursor-crosshair" : "cursor-default"}
          >
            <Layer>
              <ArenaBackground canvas={canvas} image={image} />
              {canvas.shapes.map((shape) => {
                const select = () => setSelectedId(shape.id);
                const drag = (event: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(shape, event);
                const isSelected = selectedId === shape.id;
                if (shape.type === "circle")
                  return (
                    <KonvaCircle
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      radius={shape.radius}
                      stroke={shape.color}
                      strokeWidth={isSelected ? 5 : 3}
                      fill={shape.fill ? shape.color : undefined}
                      draggable={canEdit}
                      onClick={select}
                      onTap={select}
                      onDragEnd={drag}
                    />
                  );
                if (shape.type === "rect")
                  return (
                    <Rect
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      stroke={shape.color}
                      strokeWidth={isSelected ? 5 : 3}
                      fill={shape.fill ? shape.color : undefined}
                      draggable={canEdit}
                      onClick={select}
                      onTap={select}
                      onDragEnd={drag}
                    />
                  );
                if (shape.type === "line")
                  return (
                    <Line
                      key={shape.id}
                      points={shape.points}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      draggable={canEdit}
                      onClick={select}
                      onTap={select}
                      onDragEnd={drag}
                    />
                  );
                if (shape.type === "arrow")
                  return (
                    <Arrow
                      key={shape.id}
                      points={shape.points}
                      stroke={shape.color}
                      fill={shape.color}
                      strokeWidth={shape.strokeWidth}
                      pointerLength={12}
                      pointerWidth={12}
                      draggable={canEdit}
                      onClick={select}
                      onTap={select}
                      onDragEnd={drag}
                    />
                  );
                if (shape.type === "text")
                  return (
                    <KonvaText
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      text={shape.text}
                      fontSize={shape.fontSize}
                      fill={shape.color}
                      draggable={canEdit}
                      onClick={select}
                      onTap={select}
                      onDragEnd={drag}
                    />
                  );
                return (
                  <SlotMarker
                    key={shape.id}
                    shape={shape}
                    label={boundSlotText(shape.slotKey)}
                    canEdit={canEdit}
                    selected={isSelected}
                    onSelect={select}
                    onDragEnd={drag}
                  />
                );
              })}
            </Layer>
          </Stage>
        </div>
      </CardContent>
    </Card>
  );
}

function ArenaBackground({ canvas, image }: { canvas: PositioningCanvas; image: HTMLImageElement | null }) {
  const width = canvas.width;
  const height = canvas.height;
  if (canvas.background === "CUSTOM_IMAGE" && image)
    return <KonvaImage image={image} width={width} height={height} listening={false} />;
  if (canvas.background === "SQUARE_ARENA")
    return (
      <>
        <Rect width={width} height={height} fill="black" listening={false} />
        <Rect
          x={110}
          y={85}
          width={780}
          height={530}
          fill="darkslategray"
          stroke="silver"
          strokeWidth={5}
          listening={false}
        />
        <Line points={[500, 85, 500, 615]} stroke="gray" strokeWidth={2} dash={[12, 10]} listening={false} />
        <KonvaCircle x={500} y={350} radius={110} stroke="gray" strokeWidth={3} listening={false} />
      </>
    );
  if (canvas.background === "HEX_ARENA")
    return (
      <>
        <Rect width={width} height={height} fill="black" listening={false} />
        <Line
          points={[260, 95, 740, 95, 900, 350, 740, 605, 260, 605, 100, 350]}
          closed
          fill="darkslategray"
          stroke="silver"
          strokeWidth={5}
        />
        <KonvaCircle x={500} y={350} radius={125} stroke="gray" strokeWidth={3} listening={false} />
      </>
    );
  if (canvas.background === "PLAIN") return <Rect width={width} height={height} fill="black" listening={false} />;
  return (
    <>
      <Rect width={width} height={height} fill="black" listening={false} />
      <KonvaCircle
        x={500}
        y={350}
        radius={270}
        fill="darkslategray"
        stroke="silver"
        strokeWidth={5}
        listening={false}
      />
      {[85, 165, 230].map((radius) => (
        <KonvaCircle
          key={radius}
          x={500}
          y={350}
          radius={radius}
          stroke="gray"
          strokeWidth={2}
          dash={[10, 9]}
          listening={false}
        />
      ))}
      <Line points={[230, 350, 770, 350]} stroke="gray" strokeWidth={2} dash={[10, 10]} listening={false} />
      <Line points={[500, 80, 500, 620]} stroke="gray" strokeWidth={2} dash={[10, 10]} listening={false} />
    </>
  );
}

function SlotMarker({
  shape,
  label,
  canEdit,
  selected,
  onSelect,
  onDragEnd,
}: {
  shape: Extract<CanvasShape, { type: "slot" }>;
  label: string;
  canEdit: boolean;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const text = label.length > 10 ? `${label.slice(0, 9)}…` : label;
  return (
    <>
      <KonvaCircle
        x={shape.x}
        y={shape.y}
        radius={25}
        fill={shape.color}
        stroke={selected ? "white" : "black"}
        strokeWidth={selected ? 4 : 2}
        draggable={canEdit}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
      />
      <KonvaText
        x={shape.x - 36}
        y={shape.y + 30}
        width={72}
        align="center"
        text={text}
        fontSize={13}
        fill="white"
        listening={false}
      />
    </>
  );
}

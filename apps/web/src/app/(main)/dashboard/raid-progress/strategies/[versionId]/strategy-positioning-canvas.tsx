"use client";

import { type PositioningCanvas, positioningCanvasSchema } from "@ttz/contracts";
import type Konva from "konva";
import { ArrowDownToLine, Circle as CircleIcon, MoveRight, Square, Trash2, Type } from "lucide-react";
import { useRef, useState } from "react";
import { Arrow, Text as CanvasText, Circle, Layer, Line, Rect, Stage } from "react-konva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Shape = PositioningCanvas["shapes"][number];
type Color = Shape["color"];
const colors: Color[] = ["red", "orange", "yellow", "green", "blue", "purple", "white", "black"];
const blankCanvas: PositioningCanvas = {
  schemaVersion: 1,
  width: 1000,
  height: 700,
  background: "CIRCLE_ARENA",
  imageUrl: null,
  shapes: [],
};

export function StrategyPositioningCanvas({
  value,
  slotOptions,
  readOnly,
  onChange,
}: {
  value: unknown;
  slotOptions: Array<{ slotKey: string; label: string }>;
  readOnly: boolean;
  onChange: (canvas: PositioningCanvas) => void;
}) {
  const parsed = positioningCanvasSchema.safeParse(value);
  const [canvas, setCanvas] = useState<PositioningCanvas>(parsed.success ? parsed.data : blankCanvas);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedColor, setSelectedColor] = useState<Color>("yellow");
  const [slotKey, setSlotKey] = useState("__none__");
  const stageRef = useRef<Konva.Stage>(null);
  const selected = canvas.shapes.find((shape) => shape.id === selectedId);
  const commit = (next: PositioningCanvas) => {
    setCanvas(next);
    onChange(next);
  };
  const addShape = (type: "circle" | "rect" | "arrow" | "line" | "text") => {
    const id = crypto.randomUUID();
    let shape: Shape;
    if (type === "circle") shape = { id, type, x: 500, y: 350, radius: 34, color: selectedColor, fill: false };
    else if (type === "rect")
      shape = { id, type, x: 430, y: 300, width: 140, height: 90, color: selectedColor, fill: false };
    else if (type === "arrow" || type === "line")
      shape = { id, type, points: [350, 350, 650, 350], color: selectedColor, strokeWidth: 4 };
    else shape = { id, type: "text", x: 420, y: 320, text: "机制说明", color: selectedColor, fontSize: 24 };
    commit({ ...canvas, shapes: [...canvas.shapes, shape] });
    setSelectedId(id);
  };
  const updateShape = (id: string, patch: Record<string, unknown>) =>
    commit({
      ...canvas,
      shapes: canvas.shapes.map((shape) => (shape.id === id ? ({ ...shape, ...patch } as Shape) : shape)),
    });
  const placeSlot = () => {
    const point = stageRef.current?.getPointerPosition();
    const slot = slotOptions.find((entry) => entry.slotKey === slotKey);
    if (!point || !slot) return;
    const shape: Shape = {
      id: crypto.randomUUID(),
      type: "slot",
      x: point.x,
      y: point.y,
      slotKey: slot.slotKey,
      color: selectedColor,
    };
    commit({ ...canvas, shapes: [...canvas.shapes, shape] });
    setSelectedId(shape.id);
    setSlotKey("__none__");
  };
  const exportPng = () => {
    const data = stageRef.current?.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    if (!data) return;
    const link = document.createElement("a");
    link.href = data;
    link.download = "boss-positioning.png";
    link.click();
  };
  const dragEnd = (shape: Shape, event: Konva.KonvaEventObject<DragEvent>) => {
    if (shape.type === "line" || shape.type === "arrow") {
      const points = shape.points.map((value, index) => value + (index % 2 ? event.target.y() : event.target.x()));
      event.target.position({ x: 0, y: 0 });
      updateShape(shape.id, { points });
    } else updateShape(shape.id, { x: event.target.x(), y: event.target.y() });
  };
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">站位画板 · 固定逻辑坐标</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!parsed.success ? (
          <p className="text-xs text-muted-foreground">
            此区块还没有新版画板数据；当前为预设场地，首次保存后会转为 Konva 画布。
          </p>
        ) : null}
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => addShape("circle")}>
              <CircleIcon data-icon="inline-start" />
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
            <fieldset className="flex items-center gap-1">
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
              onValueChange={(value) => commit({ ...canvas, background: value as PositioningCanvas["background"] })}
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
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={slotKey} onValueChange={setSlotKey}>
              <SelectTrigger className="w-48" aria-label="选择站位槽位">
                <SelectValue placeholder="选槽位后点击画布" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">不放置槽位</SelectItem>
                  {slotOptions.map((slot) => (
                    <SelectItem key={slot.slotKey} value={slot.slotKey}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {slotKey !== "__none__" ? <Badge variant="secondary">点击画布放置</Badge> : null}
            {selected && (selected.type === "circle" || selected.type === "rect") ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateShape(selected.id, { fill: !selected.fill })}
              >
                {selected.fill ? "切换为空心" : "切换为实心"}
              </Button>
            ) : null}
            {selected?.type === "text" ? (
              <Input
                aria-label="选中文字"
                className="w-48"
                value={selected.text}
                onChange={(event) => updateShape(selected.id, { text: event.target.value })}
              />
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!selectedId}
              onClick={() => {
                commit({ ...canvas, shapes: canvas.shapes.filter((shape) => shape.id !== selectedId) });
                setSelectedId(undefined);
              }}
            >
              <Trash2 data-icon="inline-start" />
              删除选中
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportPng}>
              <ArrowDownToLine data-icon="inline-start" />
              导出 PNG
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={exportPng}>
              <ArrowDownToLine data-icon="inline-start" />
              导出 PNG
            </Button>
          </div>
        )}
        <div className="w-full overflow-auto rounded-lg border bg-black">
          <Stage
            ref={stageRef}
            width={canvas.width}
            height={canvas.height}
            onMouseDown={(event) => {
              if (event.target === event.target.getStage()) {
                setSelectedId(undefined);
                if (!readOnly && slotKey !== "__none__") placeSlot();
              }
            }}
            className={!readOnly && slotKey !== "__none__" ? "cursor-crosshair" : "cursor-default"}
          >
            <Layer>
              <TemplateArena canvas={canvas} />
              {canvas.shapes.map((shape) => {
                const select = () => setSelectedId(shape.id);
                const onDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => dragEnd(shape, event);
                const isSelected = selectedId === shape.id;
                const draggable = !readOnly;
                if (shape.type === "circle")
                  return (
                    <Circle
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      radius={shape.radius}
                      stroke={shape.color}
                      strokeWidth={isSelected ? 5 : 3}
                      fill={shape.fill ? shape.color : undefined}
                      draggable={draggable}
                      onClick={select}
                      onTap={select}
                      onDragEnd={onDragEnd}
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
                      draggable={draggable}
                      onClick={select}
                      onTap={select}
                      onDragEnd={onDragEnd}
                    />
                  );
                if (shape.type === "line")
                  return (
                    <Line
                      key={shape.id}
                      points={shape.points}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      draggable={draggable}
                      onClick={select}
                      onTap={select}
                      onDragEnd={onDragEnd}
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
                      draggable={draggable}
                      onClick={select}
                      onTap={select}
                      onDragEnd={onDragEnd}
                    />
                  );
                if (shape.type === "text")
                  return (
                    <CanvasText
                      key={shape.id}
                      x={shape.x}
                      y={shape.y}
                      text={shape.text}
                      fontSize={shape.fontSize}
                      fill={shape.color}
                      draggable={draggable}
                      onClick={select}
                      onTap={select}
                      onDragEnd={onDragEnd}
                    />
                  );
                return (
                  <>
                    <Circle
                      key={`${shape.id}-marker`}
                      x={shape.x}
                      y={shape.y}
                      radius={25}
                      fill={shape.color}
                      stroke={isSelected ? "white" : "black"}
                      strokeWidth={isSelected ? 4 : 2}
                      draggable={draggable}
                      onClick={select}
                      onTap={select}
                      onDragEnd={onDragEnd}
                    />
                    <CanvasText
                      key={`${shape.id}-label`}
                      x={shape.x - 35}
                      y={shape.y + 30}
                      width={70}
                      align="center"
                      text={slotOptions.find((slot) => slot.slotKey === shape.slotKey)?.label ?? shape.slotKey}
                      fontSize={13}
                      fill="white"
                      listening={false}
                    />
                  </>
                );
              })}
            </Layer>
          </Stage>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateArena({ canvas }: { canvas: PositioningCanvas }) {
  const width = canvas.width;
  const height = canvas.height;
  if (canvas.background === "PLAIN") return <Rect width={width} height={height} fill="black" listening={false} />;
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
        <Circle x={500} y={350} radius={110} stroke="gray" strokeWidth={3} listening={false} />
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
          listening={false}
        />
        <Circle x={500} y={350} radius={125} stroke="gray" strokeWidth={3} listening={false} />
      </>
    );
  return (
    <>
      <Rect width={width} height={height} fill="black" listening={false} />
      <Circle x={500} y={350} radius={270} fill="darkslategray" stroke="silver" strokeWidth={5} listening={false} />
      {[85, 165, 230].map((radius) => (
        <Circle
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
    </>
  );
}

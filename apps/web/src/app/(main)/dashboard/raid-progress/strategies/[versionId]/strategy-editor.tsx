"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { strategyVersionDtoSchema } from "@ttz/contracts";
import { ArrowLeft, Plus, Save, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";

const blockTypes = ["POSITIONING", "RAID_GROUPS", "SEQUENCE", "TIMELINE", "NOTES"] as const;
type BlockType = (typeof blockTypes)[number];
type EditableBlock = {
  key: string;
  type: BlockType;
  title: string;
  configText: string;
  markdown: string;
};
const savedSchema = strategyVersionDtoSchema;
const publishedSchema = z.object({ id: z.string(), versionNo: z.number(), status: z.string() });

export function StrategyEditor({ versionId }: { versionId: string }) {
  const client = useQueryClient();
  const [blocks, setBlocks] = useState<EditableBlock[]>();
  const [slotsText, setSlotsText] = useState<string>();
  const [error, setError] = useState<string>();
  const [changeSummary, setChangeSummary] = useState("");
  const query = useQuery({
    queryKey: ["strategy-version", versionId],
    queryFn: () =>
      apiRequest(`/raid-progress/strategy-versions/${encodeURIComponent(versionId)}`, strategyVersionDtoSchema),
  });
  const currentBlocks =
    blocks ??
    query.data?.blocks.map((block) => ({
      key: block.id,
      type: block.type as BlockType,
      title: block.title,
      configText: block.config ? JSON.stringify(block.config, null, 2) : "{}",
      markdown: block.markdown ?? "",
    })) ??
    [];
  const currentSlotsText =
    slotsText ??
    query.data?.slots
      .map((slot) => [slot.slotKey, slot.label, slot.isRequired ? "true" : "false"].join(" | "))
      .join("\n") ??
    "";
  const save = useMutation({
    mutationFn: (body: unknown) =>
      apiRequest(`/raid-progress/strategy-versions/${encodeURIComponent(versionId)}`, savedSchema, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: async (data) => {
      setBlocks(undefined);
      setChangeSummary(data.changeSummary ?? "");
      await client.invalidateQueries({ queryKey: ["strategy-version", versionId] });
    },
    onError: (reason) => setError(reason.message),
  });
  const publish = useMutation({
    mutationFn: () =>
      apiRequest(`/raid-progress/strategy-versions/${encodeURIComponent(versionId)}/publish`, publishedSchema, {
        method: "POST",
        body: JSON.stringify({ makeDefault: true }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["strategy-version", versionId] }),
    onError: (reason) => setError(reason.message),
  });
  if (query.isPending) return <Skeleton className="h-[36rem] w-full" />;
  if (query.isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>战术版本不可用</AlertTitle>
        <AlertDescription>{query.error.message}</AlertDescription>
      </Alert>
    );
  const version = query.data;
  const editable = version.status === "DRAFT";
  function update(key: string, patch: Partial<EditableBlock>) {
    setBlocks(currentBlocks.map((block) => (block.key === key ? { ...block, ...patch } : block)));
  }
  function submit() {
    try {
      const body = {
        changeSummary: changeSummary || null,
        slots: parseSlots(currentSlotsText),
        blocks: currentBlocks.map((block, orderIndex) => ({
          type: block.type,
          title: block.title,
          orderIndex,
          config: block.type === "NOTES" ? {} : JSON.parse(block.configText || "{}"),
          markdown: block.type === "NOTES" ? block.markdown : null,
        })),
      };
      setError(undefined);
      save.mutate(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "结构化 JSON 格式错误");
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/raid-progress">
          <ArrowLeft data-icon="inline-start" />
          返回团本进度
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {version.bossName} · {version.strategyName}
            <Badge variant={editable ? "secondary" : "default"}>
              v{version.versionNo} {editable ? "草稿" : "已发布"}
            </Badge>
          </CardTitle>
          <CardDescription>区块类型固定为站位、团队分组、顺序、时序和战术笔记；已发布版本不可修改。</CardDescription>
          {editable ? (
            <CardAction className="flex gap-2">
              <Button variant="outline" disabled={save.isPending} onClick={submit}>
                {save.isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}保存
              </Button>
              <Button disabled={publish.isPending} onClick={() => publish.mutate()}>
                {publish.isPending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
                发布并设为默认
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="changeSummary">版本说明</FieldLabel>
            <Input
              id="changeSummary"
              value={changeSummary || version.changeSummary || ""}
              disabled={!editable}
              onChange={(event) => setChangeSummary(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="participantSlots">版本参与者槽位</FieldLabel>
            <Textarea
              id="participantSlots"
              value={currentSlotsText}
              disabled={!editable}
              onChange={(event) => setSlotsText(event.target.value)}
              placeholder="每行：slot_key | 显示名 | 是否必填(true/false)"
            />
          </Field>
          {editable ? (
            <Button
              variant="outline"
              className="w-fit"
              onClick={() =>
                setBlocks([
                  ...currentBlocks,
                  {
                    key: crypto.randomUUID(),
                    type: "NOTES",
                    title: "战术笔记",
                    configText: "{}",
                    markdown: "",
                  },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              添加区块
            </Button>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>操作失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {currentBlocks.length ? (
            currentBlocks.map((block) => (
              <BlockEditor
                key={block.key}
                block={block}
                editable={editable}
                onChange={(patch) => update(block.key, patch)}
                onRemove={() => setBlocks(currentBlocks.filter((item) => item.key !== block.key))}
              />
            ))
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>还没有战术区块</EmptyTitle>
                <EmptyDescription>添加一个战术笔记或结构化区块开始编写。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BlockEditor({
  block,
  editable,
  onChange,
  onRemove,
}: {
  block: EditableBlock;
  editable: boolean;
  onChange: (patch: Partial<EditableBlock>) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{block.title || "未命名区块"}</CardTitle>
        <CardDescription>{block.type}</CardDescription>
        {editable ? (
          <CardAction>
            <Button variant="ghost" size="icon" aria-label="删除区块" onClick={onRemove}>
              <Trash2 />
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>区块类型</FieldLabel>
              <Select
                value={block.type}
                isDisabled={!editable}
                onValueChange={(value) => onChange({ type: value as BlockType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {blockTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>标题</FieldLabel>
              <Input
                value={block.title}
                disabled={!editable}
                onChange={(event) => onChange({ title: event.target.value })}
              />
            </Field>
          </div>
          {block.type === "NOTES" ? (
            <Field>
              <FieldLabel>Markdown 战术笔记</FieldLabel>
              <Textarea
                className="min-h-64 font-mono"
                value={block.markdown}
                disabled={!editable}
                onChange={(event) => onChange({ markdown: event.target.value })}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel>结构化 JSON</FieldLabel>
              <Textarea
                className="min-h-64 font-mono"
                value={block.configText}
                disabled={!editable}
                onChange={(event) => onChange({ configText: event.target.value })}
              />
            </Field>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function parseSlots(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, orderIndex) => {
      const [slotKey, label, required] = line.split("|").map((part) => part.trim());
      if (!slotKey || !label) throw new Error("槽位格式应为：slot_key | 显示名 | true/false");
      return { slotKey, label, roleConstraint: null, isRequired: required === "true", orderIndex };
    });
}

"use client";

import type { strategyRequirementSchema, strategyTaskCatalogSchema } from "@ttz/contracts";
import type { z } from "zod";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type Requirement = z.infer<typeof strategyRequirementSchema>;
export type TaskCatalog = z.infer<typeof strategyTaskCatalogSchema>;
export type Choice = { value: string; label: string };

export function TaskChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Choice[];
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select aria-label={label} value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function RequirementFields({
  id,
  task,
  catalog,
  onChange,
}: {
  id: string;
  task: Requirement;
  catalog: TaskCatalog;
  onChange: (patch: Partial<Requirement>) => void;
}) {
  const types = catalog.taskTypes.map((item) => ({ value: String(item.id), label: item.label }));
  if (!types.some((item) => item.value === String(task.taskTypeId)))
    types.push({ value: String(task.taskTypeId), label: "原任务类型（不可用）" });
  return (
    <FieldGroup>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-label`}>任务名称</FieldLabel>
          <Input
            id={`${id}-label`}
            value={task.label}
            maxLength={128}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </Field>
        <TaskChoice
          label="任务类型"
          value={String(task.taskTypeId)}
          options={types}
          onChange={(value) => onChange({ taskTypeId: Number(value) })}
        />
        {(["ENCOUNTER", "PLAYER"] as const).map((kind) => {
          const field = kind === "ENCOUNTER" ? "encounterSpellId" : "playerSpellId";
          const value = task[field] == null ? "none" : String(task[field]);
          const options = [
            { value: "none", label: "不指定" },
            ...catalog.spells
              .filter((spell) => spell.sourceType === kind && spell.isActive)
              .map((spell) => ({ value: String(spell.id), label: spell.name })),
          ];
          if (!options.some((item) => item.value === value)) options.push({ value, label: "原技能（不可用）" });
          return (
            <TaskChoice
              key={kind}
              label={kind === "ENCOUNTER" ? "机制技能" : "玩家技能"}
              value={value}
              options={options}
              onChange={(next) => onChange({ [field]: next === "none" ? null : Number(next) })}
            />
          );
        })}
      </div>
      <Field>
        <FieldLabel htmlFor={`${id}-notes`}>任务说明（Markdown）</FieldLabel>
        <Textarea
          id={`${id}-notes`}
          maxLength={1000}
          value={task.notes ?? ""}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </Field>
    </FieldGroup>
  );
}

export function taskOrder<T extends { kind: Requirement["kind"]; orderIndex: number }>(rows: T[]): T[] {
  const order = { SEQUENCE: 0, TIMELINE: 0 };
  return rows.map((row) => ({ ...row, orderIndex: order[row.kind]++ }));
}

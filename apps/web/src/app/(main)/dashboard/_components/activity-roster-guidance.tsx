"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ActivityRosterGuidance({
  initialMaxPlayers = null,
  initialTankSlots = null,
  initialHealerSlots = null,
  initialMeleeSlots = null,
  initialRangedSlots = null,
}: {
  initialMaxPlayers?: number | null;
  initialTankSlots?: number | null;
  initialHealerSlots?: number | null;
  initialMeleeSlots?: number | null;
  initialRangedSlots?: number | null;
}) {
  const [enabled, setEnabled] = useState(
    initialMaxPlayers != null ||
      initialTankSlots != null ||
      initialHealerSlots != null ||
      initialMeleeSlots != null ||
      initialRangedSlots != null,
  );

  return (
    <FieldGroup>
      <input type="hidden" name="rosterGuidanceEnabled" value={enabled ? "1" : "0"} />
      <Field orientation="horizontal">
        <Checkbox
          id="rosterGuidance"
          checked={enabled}
          className="cursor-pointer"
          onCheckedChange={(checked) => setEnabled(checked === true)}
        />
        <FieldLabel htmlFor="rosterGuidance" className="cursor-pointer">
          设置建议人数与职责构成
        </FieldLabel>
      </Field>
      {enabled ? (
        <>
          <FieldDescription>仅展示活动建议，不会限制成员报名或管理员确认人数。</FieldDescription>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id="maxPlayers" name="maxPlayers" label="建议人数" value={initialMaxPlayers} max={100} />
            <NumberField id="tankSlots" name="tankSlots" label="坦克" value={initialTankSlots} max={100} />
            <NumberField id="healerSlots" name="healerSlots" label="治疗" value={initialHealerSlots} max={100} />
            <NumberField id="meleeSlots" name="meleeSlots" label="近战" value={initialMeleeSlots} max={100} />
            <NumberField id="rangedSlots" name="rangedSlots" label="远程" value={initialRangedSlots} max={100} />
          </div>
        </>
      ) : null}
    </FieldGroup>
  );
}

function NumberField({
  id,
  name,
  label,
  value,
  max,
}: {
  id: string;
  name: string;
  label: string;
  value: number | null;
  max: number;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} name={name} type="number" min={0} max={max} defaultValue={value ?? ""} />
    </Field>
  );
}

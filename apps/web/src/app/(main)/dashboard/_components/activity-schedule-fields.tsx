"use client";

import { zhCN } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ActivityScheduleFields({
  initialBeginAt = "",
  initialSignupDeadline = "",
  initialTeamUpAt = "",
  initialDurationMinutes = 120,
}: {
  initialBeginAt?: string;
  initialSignupDeadline?: string;
  initialTeamUpAt?: string;
  initialDurationMinutes?: number;
}) {
  const [beginAt, setBeginAt] = useState(initialBeginAt);
  const [manualDeadline, setManualDeadline] = useState(initialSignupDeadline);
  const [manualTeamUp, setManualTeamUp] = useState(initialTeamUpAt);
  const [followsDeadline, setFollowsDeadline] = useState(
    !initialSignupDeadline || initialSignupDeadline === shiftLocalDateTime(initialBeginAt, -60),
  );
  const [followsTeamUp, setFollowsTeamUp] = useState(
    !initialTeamUpAt || initialTeamUpAt === shiftLocalDateTime(initialBeginAt, -20),
  );
  const [durationMinutes, setDurationMinutes] = useState(String(initialDurationMinutes));
  const signupDeadline = followsDeadline ? shiftLocalDateTime(beginAt, -60) : manualDeadline;
  const teamUpAt = followsTeamUp ? shiftLocalDateTime(beginAt, -20) : manualTeamUp;

  return (
    <FieldGroup>
      <input type="hidden" name="beginAt" value={beginAt} />
      <input type="hidden" name="signupDeadline" value={signupDeadline} />
      <input type="hidden" name="teamUpAt" value={teamUpAt} />
      <input type="hidden" name="durationMinutes" value={durationMinutes} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="beginAt-date">开始时间</FieldLabel>
          <DateTimePicker id="beginAt-date" label="开始时间" value={beginAt} onChange={setBeginAt} />
        </Field>
        <Field>
          <FieldLabel htmlFor="durationMinutes">持续时间</FieldLabel>
          <Select value={durationMinutes} onValueChange={setDurationMinutes}>
            <SelectTrigger id="durationMinutes" className="cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="60">1 小时</SelectItem>
                <SelectItem value="90">1.5 小时</SelectItem>
                <SelectItem value="120">2 小时</SelectItem>
                <SelectItem value="180">3 小时</SelectItem>
                <SelectItem value="240">4 小时</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="signupDeadline-date">报名截止时间</FieldLabel>
            <DateTimePicker
              id="signupDeadline-date"
              label="报名截止时间"
              value={signupDeadline}
              onChange={(value) => {
                setManualDeadline(value);
                setFollowsDeadline(false);
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="teamUpAt-date">集合时间</FieldLabel>
            <DateTimePicker
              id="teamUpAt-date"
              label="集合时间"
              value={teamUpAt}
              onChange={(value) => {
                setManualTeamUp(value);
                setFollowsTeamUp(false);
              }}
            />
          </Field>
        </div>
      </FieldGroup>
    </FieldGroup>
  );
}

function DateTimePicker({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [datePart, timePart = "21:00"] = value.split("T");
  const selectedDate = parseLocalDate(datePart);
  const triggerLabel = selectedDate
    ? selectedDate.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : "选择日期";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 text-left font-normal cursor-pointer"
            aria-label={`${label}日期，${triggerLabel}`}
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className={selectedDate ? undefined : "text-muted-foreground"}>{triggerLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-1">
          <Calendar
            mode="single"
            locale={zhCN}
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(`${formatLocalDate(date)}T${timePart || "21:00"}`);
            }}
            className="[&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed"
          />
        </PopoverContent>
      </Popover>
      <Input
        aria-label={`${label}时间`}
        type="time"
        step={60}
        value={selectedDate ? timePart : ""}
        disabled={!selectedDate}
        onChange={(event) => {
          if (!selectedDate || !event.target.value) return;
          onChange(`${datePart}T${event.target.value}`);
        }}
      />
    </div>
  );
}

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatLocalDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftLocalDateTime(value: string, minutes: number) {
  if (!value) return "";
  const [datePart, timePart = "21:00"] = value.split("T");
  const date = parseLocalDate(datePart);
  if (!date) return "";
  const [hours, mins] = timePart.split(":").map(Number);
  date.setHours(hours ?? 21, mins ?? 0, 0, 0);
  date.setMinutes(date.getMinutes() + minutes);
  return `${formatLocalDate(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

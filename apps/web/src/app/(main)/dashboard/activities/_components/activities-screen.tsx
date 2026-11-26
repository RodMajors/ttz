"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type ActivityLifecycleStatus,
  type ActivityStatus,
  activityListQuerySchema,
  activityListSchema,
  raidCatalogSchema,
} from "@ttz/contracts";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { GameIcon } from "@/components/game-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserIdentity } from "@/components/user-identity";
import { apiRequest } from "@/lib/api-client";

const lifecycleLabels: Record<ActivityLifecycleStatus, string> = {
  DRAFT: "草稿",
  SIGNUP_OPEN: "报名中",
  PREPARATION: "战前准备中",
  GATHERING: "集合中",
  IN_PROGRESS: "进行中",
  COMPLETED: "已结束",
  CANCELLED: "已取消",
};
const lifecycleColors: Record<ActivityLifecycleStatus, string> = {
  DRAFT: "border-muted-foreground/30 bg-muted text-muted-foreground",
  SIGNUP_OPEN: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  PREPARATION: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  GATHERING: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  IN_PROGRESS: "border-primary/30 bg-primary/10 text-primary",
  COMPLETED: "border-muted-foreground/30 bg-muted text-muted-foreground",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function ActivitiesScreen() {
  const [status, setStatus] = useState<ActivityStatus | "">("PUBLISHED");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [raidId, setRaidId] = useState("");
  const [bossId, setBossId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const hasNonDefaultFilter = Boolean(startDate || endDate || raidId || bossId || search) || status !== "PUBLISHED";
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const catalog = useQuery({
    queryKey: ["raid-progress", "catalog"],
    queryFn: () => apiRequest("/raid-progress/catalog", raidCatalogSchema),
  });
  const queryParametersResult = activityListQuerySchema.safeParse({
    page,
    pageSize: 20,
    status: status || undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    raidId: raidId || undefined,
    bossId: bossId || undefined,
  });
  const queryParameters = queryParametersResult.success ? queryParametersResult.data : null;

  const query = useQuery({
    queryKey: ["activities", queryParameters ?? { startDate, endDate, page }],
    enabled: Boolean(queryParameters),
    queryFn: () => {
      if (!queryParameters) throw new Error("日期范围无效");
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParameters)) {
        if (value !== undefined && value !== null) params.set(key, String(value));
      }
      return apiRequest(`/activities?${params}`, activityListSchema);
    },
  });
  const visible = query.data?.items ?? [];
  const selectedRaid = catalog.data?.find((raid) => raid.id === raidId);
  const bosses = (selectedRaid ? selectedRaid.bosses : catalog.data?.flatMap((raid) => raid.bosses)) ?? [];

  function resetFilters() {
    setStatus("PUBLISHED");
    setStartDate("");
    setEndDate("");
    setRaidId("");
    setBossId("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>活动列表</CardTitle>
        <CardAction>
          <Button asChild>
            <Link href="/dashboard/activities/new">
              <Plus data-icon="inline-start" />
              创建活动
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <FilterField label="活动名" id="filter-search" className="min-w-56 flex-1">
              <Input
                id="filter-search"
                className="w-full"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="搜索活动名称"
              />
            </FilterField>
            <FilterField label="团本" id="filter-raid" className="w-72 shrink-0">
              <SearchableSelect
                id="filter-raid"
                value={raidId}
                placeholder="全部团本"
                options={(catalog.data ?? []).map((raid) => ({
                  value: raid.id,
                  label: raid.name,
                  icon: raid.icon,
                }))}
                onValueChange={(value) => {
                  updateFilter(setRaidId, value);
                  setBossId("");
                }}
              />
            </FilterField>
            <FilterField label="Boss" id="filter-boss" className="w-72 shrink-0">
              <SearchableSelect
                id="filter-boss"
                value={bossId}
                placeholder="全部 Boss"
                options={bosses.map((boss) => ({
                  value: boss.id,
                  label: boss.name,
                  icon: boss.icon,
                }))}
                onValueChange={(value) => updateFilter(setBossId, value)}
              />
            </FilterField>
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <FilterField label="日期范围" id="filter-date-range">
              <ActivityDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(from, to) => {
                  updateFilter(setStartDate, from);
                  setEndDate(to);
                }}
              />
            </FilterField>
            <FilterField label="状态" id="filter-status">
              <Select
                value={status || "all"}
                onValueChange={(value) => updateFilter(setStatus, value === "all" ? "" : (value as ActivityStatus))}
              >
                <SelectTrigger id="filter-status" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="PUBLISHED">已发布</SelectItem>
                    <SelectItem value="DRAFT">草稿</SelectItem>
                    <SelectItem value="FINISHED">已结束</SelectItem>
                    <SelectItem value="CANCELLED">已取消</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FilterField>
            {hasNonDefaultFilter ? (
              <Button variant="ghost" onClick={resetFilters} className="text-muted-foreground">
                <X data-icon="inline-start" />
                重置
              </Button>
            ) : null}
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {query.isPending ? "加载中…" : `共 ${query.data?.pagination.total ?? 0} 个活动`}
            </span>
          </div>
        </div>

        {query.isPending ? (
          <div className="flex flex-col gap-3" role="status" aria-label="正在加载活动">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}
        {!queryParametersResult.success ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>日期范围无效</AlertTitle>
            <AlertDescription>{queryParametersResult.error.issues[0]?.message}</AlertDescription>
          </Alert>
        ) : null}
        {query.isError ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>活动数据暂时不可用</AlertTitle>
            <AlertDescription>{query.error.message}。请确认 API、数据库和本地调试用户配置。</AlertDescription>
          </Alert>
        ) : null}
        {query.data && visible.length === 0 ? (
          <Empty className="min-h-56 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays />
              </EmptyMedia>
              <EmptyTitle>还没有活动</EmptyTitle>
              <EmptyDescription>创建第一场活动后，成员即可在截止时间前报名。</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href="/dashboard/activities/new">创建活动</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
        {visible.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>活动</TableHead>
                <TableHead>团本</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>报名</TableHead>
                <TableHead>负责人</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((activity) => (
                <TableRow
                  key={activity.id}
                  className="cursor-pointer"
                  onClick={() => {
                    router.push(`/dashboard/activities/${activity.id}`);
                  }}
                >
                  <TableCell>
                    {activity.name}
                    <p className="text-xs text-muted-foreground">{activity.typeName}</p>
                  </TableCell>
                  <TableCell>
                    {activity.raidName ? (
                      <span className="flex items-center gap-2">
                        <GameIcon src={activity.raidIcon} alt="" className="size-6 rounded object-contain" />
                        {activity.raidName}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{formatDate(activity.beginAt)}</TableCell>
                  <TableCell>
                    <Badge className={lifecycleColors[activity.lifecycleStatus]}>
                      {lifecycleLabels[activity.lifecycleStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {activity.confirmedCount} 已确认 / {activity.signupCount} 已报名
                  </TableCell>
                  <TableCell>
                    <UserIdentity user={activity.creator} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {query.data && query.data.pagination.total > query.data.pagination.pageSize ? (
          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground tabular-nums">第 {page} 页</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="上一页"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="下一页"
                disabled={page * 20 >= query.data.pagination.total || query.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SearchableSelect({
  id,
  value,
  placeholder,
  options,
  onValueChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string; icon?: string | null }>;
  onValueChange: (value: string) => void;
}) {
  const items = [{ value: "", label: placeholder, icon: null }, ...options];
  return (
    <Select
      aria-label={placeholder}
      value={value || "all"}
      onValueChange={(next) => onValueChange(next === "all" ? "" : next)}
    >
      <SelectTrigger id={id} className="w-full cursor-pointer">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem
              key={item.value || "all"}
              value={item.value || "all"}
              textValue={item.label}
              className="cursor-pointer"
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon ? (
                  <GameIcon src={item.icon} alt="" className="w-10 max-h-6 shrink-0 rounded-sm object-contain" />
                ) : null}
                <span className="truncate">{item.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function ActivityDateRangePicker({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}) {
  const selected: DateRange | undefined = startDate
    ? {
        from: parseLocalDate(startDate),
        to: endDate ? parseLocalDate(endDate) : undefined,
      }
    : undefined;
  const label = selected?.from
    ? selected.to
      ? `${format(selected.from, "yyyy年M月d日", { locale: zhCN })} – ${format(selected.to, "yyyy年M月d日", { locale: zhCN })}`
      : `${format(selected.from, "yyyy年M月d日", { locale: zhCN })} – 选择结束日期`
    : "选择日期范围";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button id="filter-date-range" type="button" variant="outline" className="w-64 justify-start gap-2 font-normal">
          <CalendarDays className="text-muted-foreground" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) => {
            onChange(
              range?.from ? format(range.from, "yyyy-MM-dd") : "",
              range?.to ? format(range.to, "yyyy-MM-dd") : "",
            );
          }}
          defaultMonth={selected?.from}
          numberOfMonths={2}
          locale={zhCN}
          weekStartsOn={1}
          className="[&_button:not(:disabled)]:cursor-pointer"
        />
        {(startDate || endDate) && (
          <div className="border-t p-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("", "")}>
              <X data-icon="inline-start" />
              清除日期
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1);
}

function FilterField({
  label,
  id,
  children,
  className,
}: {
  label: string;
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Label htmlFor={id} className="whitespace-nowrap text-sm text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

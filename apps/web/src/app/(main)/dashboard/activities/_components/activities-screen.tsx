"use client";

import { useQuery } from "@tanstack/react-query";
import { type ActivityStatus, activityListQuerySchema, activityListSchema, raidCatalogSchema } from "@ttz/contracts";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/app-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserIdentity } from "@/components/user-identity";
import { apiRequest } from "@/lib/api-client";

const labels: Record<ActivityStatus, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  FINISHED: "已结束",
  CANCELLED: "已取消",
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
        <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
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
          <FilterField label="开始日期" id="filter-start-date">
            <Input
              id="filter-start-date"
              className="w-36"
              type="date"
              value={startDate}
              onChange={(event) => updateFilter(setStartDate, event.target.value)}
            />
          </FilterField>
          <FilterField label="结束日期" id="filter-end-date">
            <Input
              id="filter-end-date"
              className="w-36"
              type="date"
              value={endDate}
              onChange={(event) => updateFilter(setEndDate, event.target.value)}
            />
          </FilterField>
          <FilterField label="团本" id="filter-raid">
            <SearchableSelect
              id="filter-raid"
              value={raidId}
              placeholder="全部团本"
              options={(catalog.data ?? []).map((raid) => ({ value: raid.id, label: raid.name }))}
              onValueChange={(value) => {
                updateFilter(setRaidId, value);
                setBossId("");
              }}
            />
          </FilterField>
          <FilterField label="Boss" id="filter-boss">
            <SearchableSelect
              id="filter-boss"
              value={bossId}
              placeholder="全部 Boss"
              options={bosses.map((boss) => ({
                value: boss.id,
                label: selectedRaid
                  ? boss.name
                  : `${boss.name} · ${catalog.data?.find((raid) => raid.id === boss.raidId)?.name ?? ""}`,
              }))}
              onValueChange={(value) => updateFilter(setBossId, value)}
            />
          </FilterField>
          <FilterField label="活动名" id="filter-search">
            <Input
              id="filter-search"
              className="w-44"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="搜索活动名称"
            />
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
                  <TableCell>{activity.raidName ?? "—"}</TableCell>
                  <TableCell>{formatDate(activity.beginAt)}</TableCell>
                  <TableCell>
                    <Badge variant={activity.status === "PUBLISHED" ? "default" : "secondary"}>
                      {labels[activity.status]}
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
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  const items = [{ value: "", label: placeholder }, ...options];
  const labelForValue = (item: string) => items.find((option) => option.value === item)?.label ?? "";
  return (
    <Combobox
      items={items.map((item) => item.value)}
      value={value}
      onValueChange={(next) => onValueChange(next ?? "")}
      itemToStringLabel={labelForValue}
      itemToStringValue={(item) => item}
    >
      <ComboboxInput id={id} className="w-48" placeholder={placeholder} showClear />
      <ComboboxContent>
        <ComboboxList>
          {items.map((item) => (
            <ComboboxItem key={item.value || "all"} value={item.value}>
              {item.label}
            </ComboboxItem>
          ))}
          <ComboboxEmpty>没有匹配结果</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function FilterField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="whitespace-nowrap text-sm text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AttendanceStatus,
  applyWclSuggestionsSchema,
  attendanceBatchSchema,
  attendanceRecordListSchema,
  registerWclReportSchema,
  wclActorMappingSchema,
  wclReportDetailSchema,
  wclReportListSchema,
} from "@ttz/contracts";
import { ArrowLeft, Check, CircleAlert, Download, FileSearch, RefreshCw, Save, Upload } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api-client";
import { AttendanceStatusBadge } from "../../_components/attendance-status";

const savedSchema = z.array(z.object({ id: z.string() }).passthrough());
const registeredSchema = z.object({ reportId: z.string(), jobId: z.string() });
const updateResultSchema = z.object({ updated: z.number() });
const applyResultSchema = z.object({ applied: z.number() });
const statuses: AttendanceStatus[] = [
  "UNKNOWN",
  "PRESENT",
  "LATE",
  "EXCUSED_ABSENCE",
  "UNEXCUSED_ABSENCE",
  "BENCH",
  "NOT_SIGNED_UP",
];
const statusLabels: Record<AttendanceStatus, string> = {
  UNKNOWN: "待记录",
  PRESENT: "正常出勤",
  LATE: "迟到",
  EXCUSED_ABSENCE: "请假",
  UNEXCUSED_ABSENCE: "缺席",
  BENCH: "替补",
  NOT_SIGNED_UP: "未报名",
};

export function AttendanceDetailScreen({ activityId }: { activityId: string }) {
  const client = useQueryClient();
  const key = ["attendance", activityId];
  const query = useQuery({
    queryKey: key,
    queryFn: () => apiRequest(`/activities/${activityId}/attendance`, attendanceRecordListSchema),
  });
  const [drafts, setDrafts] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});
  useEffect(() => {
    if (query.data) {
      setDrafts(
        Object.fromEntries(
          query.data.records.map((record) => [record.userId, { status: record.status, note: record.note ?? "" }]),
        ),
      );
    }
  }, [query.data]);
  const save = useMutation({
    mutationFn: () => {
      const records =
        query.data?.records.map((record) => ({
          userId: record.userId,
          characterId: record.characterId,
          status: drafts[record.userId]?.status ?? record.status,
          note: drafts[record.userId]?.note || null,
        })) ?? [];
      const parsed = attendanceBatchSchema.parse({ records });
      return apiRequest(`/activities/${activityId}/attendance`, savedSchema, {
        method: "PUT",
        body: JSON.stringify(parsed),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: ["attendance-summary"] }),
      ]);
    },
  });
  if (query.isPending)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  if (query.isError)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>无法加载出勤</AlertTitle>
        <AlertDescription>{query.error.message}</AlertDescription>
      </Alert>
    );
  const data = query.data;
  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/attendance">
          <ArrowLeft data-icon="inline-start" />
          返回出勤统计
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{data.activityName}</CardTitle>
          <CardDescription>{formatDate(data.beginAt)} · 正常出勤和迟到计入有效出勤，不设置早退状态。</CardDescription>
          <CardAction className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportCsv(data)}>
              <Download data-icon="inline-start" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => void exportXlsx(data)}>
              <Download data-icon="inline-start" />
              XLSX
            </Button>
            {data.canManage ? (
              <Button onClick={() => save.mutate()} disabled={save.isPending || !data.records.length}>
                {save.isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}保存人工确认
              </Button>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>成员</TableHead>
                <TableHead>出战角色</TableHead>
                <TableHead>状态</TableHead>
                {data.canManage ? <TableHead>备注</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.records.map((record) => (
                <TableRow key={record.userId}>
                  <TableCell className="font-medium">{record.memberName}</TableCell>
                  <TableCell>
                    {record.characterName
                      ? `${record.characterName}${record.realm ? ` · ${record.realm}` : ""}`
                      : "未记录"}
                  </TableCell>
                  <TableCell>
                    {data.canManage ? (
                      <Select
                        value={drafts[record.userId]?.status ?? record.status}
                        onValueChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [record.userId]: {
                              status: value as AttendanceStatus,
                              note: current[record.userId]?.note ?? "",
                            },
                          }))
                        }
                      >
                        <SelectTrigger aria-label={`${record.memberName} 出勤状态`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {statuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {statusLabels[status]}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    ) : (
                      <AttendanceStatusBadge status={record.status} />
                    )}
                  </TableCell>
                  {data.canManage ? (
                    <TableCell>
                      <Input
                        value={drafts[record.userId]?.note ?? ""}
                        maxLength={255}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [record.userId]: {
                              status: current[record.userId]?.status ?? record.status,
                              note: event.target.value,
                            },
                          }))
                        }
                        aria-label={`${record.memberName} 出勤备注`}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {save.isError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>保存失败</AlertTitle>
              <AlertDescription>{save.error.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      {data.canManage ? <WclPanel activityId={activityId} /> : null}
    </div>
  );
}

function WclPanel({ activityId }: { activityId: string }) {
  const client = useQueryClient();
  const reports = useQuery({
    queryKey: ["wcl-reports", activityId],
    queryFn: () => apiRequest(`/activities/${activityId}/wcl-reports`, wclReportListSchema),
    refetchInterval: (query) => (query.state.data?.some((report) => report.status < 2) ? 3_000 : false),
  });
  const [selectedReportId, setSelectedReportId] = useState<string>();
  useEffect(() => {
    if (!selectedReportId && reports.data?.[0]) setSelectedReportId(reports.data[0].id);
  }, [reports.data, selectedReportId]);
  const register = useMutation({
    mutationFn: (reportCode: string) =>
      apiRequest(`/activities/${activityId}/wcl-reports`, registeredSchema, {
        method: "POST",
        body: JSON.stringify(registerWclReportSchema.parse({ reportCode })),
      }),
    onSuccess: async (result) => {
      setSelectedReportId(result.reportId);
      await client.invalidateQueries({ queryKey: ["wcl-reports", activityId] });
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    register.mutate(String(data.get("reportCode")));
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Warcraft Logs 辅助核对</CardTitle>
        <CardDescription>仅支持 CN 区公开报告；WCL 结果是建议，人工确认的出勤不会被覆盖。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form onSubmit={submit}>
          <FieldGroup>
            <Field orientation="horizontal">
              <div className="flex-1">
                <FieldLabel htmlFor="reportCode">报告代码</FieldLabel>
                <Input
                  id="reportCode"
                  name="reportCode"
                  required
                  minLength={8}
                  maxLength={32}
                  placeholder="Warcraft Logs report code"
                />
              </div>
              <Button type="submit" disabled={register.isPending}>
                {register.isPending ? <Spinner data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
                登记并导入
              </Button>
            </Field>
            {register.isError ? (
              <Alert variant="destructive">
                <AlertTitle>无法登记报告</AlertTitle>
                <AlertDescription>{register.error.message}</AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </form>
        {reports.data?.length ? (
          <div className="flex flex-wrap gap-2">
            {reports.data.map((report) => (
              <Button
                key={report.id}
                size="sm"
                variant={selectedReportId === report.id ? "default" : "outline"}
                onClick={() => setSelectedReportId(report.id)}
              >
                <ReportStatus status={report.status} />
                {report.reportCode}
              </Button>
            ))}
          </div>
        ) : null}
        {selectedReportId ? (
          <WclReport reportId={selectedReportId} activityId={activityId} />
        ) : (
          <p className="text-sm text-muted-foreground">还没有登记 WCL 报告。</p>
        )}
      </CardContent>
    </Card>
  );
}

function WclReport({ reportId, activityId }: { reportId: string; activityId: string }) {
  const client = useQueryClient();
  const report = useQuery({
    queryKey: ["wcl-report", reportId],
    queryFn: () => apiRequest(`/wcl-reports/${reportId}`, wclReportDetailSchema),
    refetchInterval: (query) => ((query.state.data?.status ?? 0) < 2 ? 3_000 : false),
  });
  const members = useQuery({
    queryKey: ["members", "wcl-map"],
    queryFn: () => apiRequest("/members?page=1&pageSize=100", membersForMappingSchema),
    enabled: report.data?.status === 2,
  });
  const characters = useMemo(
    () =>
      members.data?.items.flatMap((member) =>
        member.characters.map((character) => ({
          ...character,
          label: `${member.name ?? member.guildNickname ?? "成员"} · ${character.name} · ${character.realm}`,
        })),
      ) ?? [],
    [members.data],
  );
  const mapActor = useMutation({
    mutationFn: ({ actorId, value }: { actorId: string; value: string }) =>
      apiRequest(`/wcl-reports/${reportId}/actor-mappings`, updateResultSchema, {
        method: "PUT",
        body: JSON.stringify(
          wclActorMappingSchema.parse({
            mappings: [
              { actorId, characterId: value === "ignore" ? null : value || null, ignored: value === "ignore" },
            ],
          }),
        ),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["wcl-report", reportId] });
    },
  });
  const apply = useMutation({
    mutationFn: () =>
      apiRequest(`/wcl-reports/${reportId}/apply-attendance-suggestions`, applyResultSchema, {
        method: "POST",
        body: JSON.stringify(
          applyWclSuggestionsSchema.parse({
            statuses:
              report.data?.suggestions
                .filter((item) => !item.appliedAt)
                .map((item) => ({
                  userId: item.userId,
                  status: item.status === "UNKNOWN" ? "PRESENT" : item.status,
                })) ?? [],
          }),
        ),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["wcl-report", reportId] }),
        client.invalidateQueries({ queryKey: ["attendance", activityId] }),
        client.invalidateQueries({ queryKey: ["attendance-summary"] }),
      ]);
    },
  });
  if (report.isPending) return <Skeleton className="h-40 w-full" />;
  if (report.isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>报告加载失败</AlertTitle>
        <AlertDescription>{report.error.message}</AlertDescription>
      </Alert>
    );
  if (report.data.status === 0 || report.data.status === 1)
    return (
      <Alert>
        <RefreshCw />
        <AlertTitle>报告正在导入</AlertTitle>
        <AlertDescription>Worker 正在读取公开报告和匹配本站角色，页面会自动刷新。</AlertDescription>
      </Alert>
    );
  if (report.data.status === 3)
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>WCL 导入失败</AlertTitle>
        <AlertDescription>{report.data.errorMessage ?? "请检查报告公开状态和 WCL 配置。"}</AlertDescription>
      </Alert>
    );
  const pendingActors = report.data.actors.filter((actor) => actor.matchStatus === 0);
  const pendingSuggestions = report.data.suggestions.filter((item) => !item.appliedAt);
  return (
    <div className="flex flex-col gap-4">
      {pendingActors.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">待匹配角色</h3>
          {pendingActors.map((actor) => (
            <div key={actor.actorId} className="grid items-center gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_2fr]">
              <div>
                <p className="font-medium">{actor.actorName}</p>
                <p className="text-xs text-muted-foreground">{actor.realmName ?? "未知服务器"}</p>
              </div>
              <Select onValueChange={(value) => mapActor.mutate({ actorId: actor.actorId, value })}>
                <SelectTrigger aria-label={`匹配 ${actor.actorName}`}>
                  <SelectValue placeholder="选择本站角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ignore">忽略外部角色</SelectItem>
                    {characters.map((character) => (
                      <SelectItem key={character.id} value={character.id}>
                        {character.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      ) : (
        <Alert>
          <Check />
          <AlertTitle>角色匹配已处理</AlertTitle>
          <AlertDescription>没有待处理的 WCL 角色。</AlertDescription>
        </Alert>
      )}
      {pendingSuggestions.length ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="font-medium">{pendingSuggestions.length} 条出勤建议待确认</p>
            <p className="text-xs text-muted-foreground">默认把 WCL 中匹配到的成员建议为正常出勤。</p>
          </div>
          <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
            {apply.isPending ? <Spinner data-icon="inline-start" /> : <FileSearch data-icon="inline-start" />}应用建议
          </Button>
        </div>
      ) : null}
      {mapActor.isError || apply.isError ? (
        <Alert variant="destructive">
          <AlertTitle>WCL 操作失败</AlertTitle>
          <AlertDescription>{mapActor.error?.message ?? apply.error?.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

const membersForMappingSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().nullable(),
      guildNickname: z.string().nullable(),
      characters: z.array(z.object({ id: z.string(), name: z.string(), realm: z.string() })),
    }),
  ),
});
function ReportStatus({ status }: { status: number }) {
  return (
    <Badge variant={status === 2 ? "default" : status === 3 ? "destructive" : "secondary"}>
      {["待导入", "导入中", "已完成", "失败"][status]}
    </Badge>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(
    new Date(value),
  );
}

function exportRows(data: z.infer<typeof attendanceRecordListSchema>) {
  return data.records.map((record) => ({
    活动: data.activityName,
    活动时间: new Date(data.beginAt),
    成员: record.memberName,
    角色: record.characterName ?? "",
    服务器: record.realm ?? "",
    状态: statusLabels[record.status],
    备注: record.note ?? "",
  }));
}

function exportCsv(data: z.infer<typeof attendanceRecordListSchema>) {
  const columns = ["活动", "活动时间", "成员", "角色", "服务器", "状态", "备注"] as const;
  const rows = exportRows(data).map((row) => ({ ...row, 活动时间: formatDate(row.活动时间.toISOString()) }));
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(String(row[column]))).join(",")),
  ].join("\r\n");
  download(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), `${safeName(data.activityName)}-出勤.csv`);
}

async function exportXlsx(data: z.infer<typeof attendanceRecordListSchema>) {
  const xlsx = await import("xlsx");
  const worksheet = xlsx.utils.json_to_sheet(exportRows(data), { dateNF: "yyyy-mm-dd hh:mm" });
  worksheet["!cols"] = [{ wch: 24 }, { wch: 19 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 32 }];
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "出勤记录");
  xlsx.writeFile(workbook, `${safeName(data.activityName)}-出勤.xlsx`, { compression: true, cellDates: true });
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
function safeName(value: string) {
  return value.replace(/[<>:"/\\|?*]/g, "_").slice(0, 80) || "TTZ";
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

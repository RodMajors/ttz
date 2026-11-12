"use client";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api-client";

const membersSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      guildNickname: z.string().nullable(),
      privilege: z.number(),
      characters: z.array(z.object({ id: z.string(), name: z.string(), realm: z.string(), isMain: z.number() })),
      groups: z.array(z.object({ id: z.string(), name: z.string(), code: z.string() })),
    }),
  ),
  pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
});

export function MembersScreen() {
  const query = useQuery({
    queryKey: ["members"],
    queryFn: () => apiRequest("/members?page=1&pageSize=50", membersSchema),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>成员列表</CardTitle>
        <CardDescription>身份组只用于展示和筛选，权限由审核状态与 privilege 决定。</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isPending ? <Skeleton className="h-44 w-full" /> : null}
        {query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>成员数据暂时不可用</AlertTitle>
            <AlertDescription>{query.error.message}</AlertDescription>
          </Alert>
        ) : null}
        {query.data?.items.length === 0 ? (
          <Empty className="min-h-52 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>暂无已审核成员</EmptyTitle>
              <EmptyDescription>成员通过微信登录并完成管理员审核后会出现在这里。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {query.data?.items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>成员</TableHead>
                <TableHead>主角色</TableHead>
                <TableHead>身份组</TableHead>
                <TableHead>权限</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((member) => {
                const main = member.characters.find((character) => character.isMain === 1);
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name ?? member.guildNickname ?? "未设置昵称"}</TableCell>
                    <TableCell>{main ? `${main.name} - ${main.realm}` : "未设置"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.groups.length ? (
                          member.groups.map((group) => (
                            <Badge key={group.id} variant="secondary">
                              {group.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">无</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{["成员", "管理员", "超级管理员"][member.privilege] ?? "成员"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}

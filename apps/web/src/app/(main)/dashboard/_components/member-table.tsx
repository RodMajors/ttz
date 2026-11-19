import type { memberListSchema } from "@ttz/contracts";
import type { ReactNode } from "react";
import type { z } from "zod";
import { ClassAccent } from "@/components/class-accent";
import { GameIcon } from "@/components/game-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getInitials } from "@/lib/utils";

export type MemberListItem = z.infer<typeof memberListSchema>["items"][number];

export function MemberTable({
  members,
  renderActions,
}: {
  members: MemberListItem[];
  renderActions?: (member: MemberListItem) => ReactNode;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>成员</TableHead>
          <TableHead>主角色</TableHead>
          <TableHead>职业</TableHead>
          <TableHead>身份组</TableHead>
          <TableHead>权限</TableHead>
          {renderActions ? <TableHead className="text-right">操作</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const main = member.characters.find((character) => character.isMain);
          return (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarImage src={member.avatar ?? undefined} alt="" />
                    <AvatarFallback>{getInitials(member.name ?? member.guildNickname ?? "TTZ")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.name ?? member.guildNickname ?? "未设置昵称"}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.wxNickname ?? "未设置微信名"}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {main ? (
                  <div className="flex items-center gap-2">
                    <GameIcon src={main.classIconUrl} alt="" className="size-6 rounded" />
                    <ClassAccent color={main.classColor}>
                      {main.name} - {main.realm}
                    </ClassAccent>
                    {main.verificationStatus === "VERIFIED" ? null : <Badge variant="secondary">未验证</Badge>}
                  </div>
                ) : (
                  "未设置"
                )}
              </TableCell>
              <TableCell>
                {main ? <ClassAccent color={main.classColor}>{main.className}</ClassAccent> : "未设置"}
              </TableCell>
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
              <TableCell>{["成员", "管理员", "超级管理员"][member.privilege]}</TableCell>
              {renderActions ? <TableCell className="text-right">{renderActions(member)}</TableCell> : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

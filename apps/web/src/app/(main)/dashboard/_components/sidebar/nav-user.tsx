"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { AuthUserDto } from "@ttz/contracts";
import { Bell, CircleUser, EllipsisVertical, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { apiRequest } from "@/lib/api-client";
import { getInitials } from "@/lib/utils";

const loggedOutSchema = z.object({ loggedOut: z.boolean() });

export function NavUser({ user }: { readonly user: AuthUserDto }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const client = useQueryClient();
  const role = ["普通成员", "管理员", "超级管理员"][user.privilege];
  async function logout() {
    await apiRequest("/auth/logout", loggedOutSchema, { method: "POST" });
    client.clear();
    router.replace("/login");
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          onClick={() => router.push("/dashboard/profile")}
        >
          <Avatar className="h-8 w-8 rounded-lg grayscale">
            <AvatarImage alt={user.name} />
            <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">{role}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

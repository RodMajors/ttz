import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  ScrollText,
  Settings2,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "updated" | "soon";
export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}
interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
  minPrivilege?: 1 | 2;
}
export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}
export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}
export type NavMainItem = NavMainLinkItem | NavMainParentItem;
export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "公会工作台",
    items: [
      { id: "dashboard", title: "首页", url: "/dashboard/default", icon: LayoutDashboard },
      { id: "activities", title: "活动", url: "/dashboard/activities", icon: CalendarDays },
      { id: "raid-progress", title: "团本进度", url: "/dashboard/raid-progress", icon: ClipboardCheck },
      {
        id: "raid-strategy-management",
        title: "战术方案",
        url: "/dashboard/raid-progress/strategies",
        icon: ScrollText,
        minPrivilege: 1,
      },
      { id: "members", title: "成员", url: "/dashboard/members", icon: Users },
      { id: "attendance", title: "出勤统计", url: "/dashboard/attendance", icon: BarChart3 },
    ],
  },
  {
    id: 2,
    label: "内容与工具",
    items: [
      { id: "announcements", title: "公告", url: "/dashboard/announcements", icon: FileText },
      { id: "tools", title: "常用工具", url: "/dashboard/tools", icon: Link2 },
      { id: "system", title: "系统设置", url: "/dashboard/system", icon: Settings2, minPrivilege: 1 },
    ],
  },
  { id: 3, label: "快捷入口", items: [{ id: "progress", title: "公开进度", url: "/progress", icon: ClipboardCheck }] },
];

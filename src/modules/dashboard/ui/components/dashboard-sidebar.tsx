// components/dashboard/dashboard-sidebar.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  MessageSquare,
  Users,
  FileText,
  ChevronDown,
} from "lucide-react";
import DashboardUserButton from "@/modules/dashboard/ui/components/dashboard-user-button";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function DashboardSidebar({
  userName,
  userEmail,
}: {
  userName?: string | undefined;
  userEmail?: string | undefined;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["Meetings"])
  );

  const navGroups: NavGroup[] = [
    {
      label: "Meetings",
      items: [
        {
          icon: <MessageSquare className="w-5 h-5" />,
          label: "Meetings",
          href: "/dashboard/meetings",
        },
        {
          icon: <Users className="w-5 h-5" />,
          label: "Agents",
          href: "/dashboard/agents",
        },
        {
          icon: <FileText className="w-5 h-5" />,
          label: "Transcripts",
          href: "/dashboard/transcripts",
          badge: "12",
        },
      ],
    },
  ];

  const toggleGroup = (groupLabel: string) => {
    const newGroups = new Set(expandedGroups);
    if (newGroups.has(groupLabel)) {
      newGroups.delete(groupLabel);
    } else {
      newGroups.add(groupLabel);
    }
    setExpandedGroups(newGroups);
  };

  const isActive = (href: string) => pathname === href;

  return (
    <aside className="w-64 h-screen bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-linear-to-b from-slate-900/95 to-slate-900/80 backdrop-blur-sm border-b border-slate-800/50 px-4 py-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Meet.AI Logo" width={28} height={28} className="w-8 h-8" />
            <h1 className="text-white font-bold text-lg leading-tight">
              Meet.AI
            </h1>
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <button
              onClick={() => toggleGroup(group.label)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-300 uppercase tracking-wider transition-colors duration-200 group"
            >
              <span>{group.label}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ${
                  expandedGroups.has(group.label) ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className={`space-y-2 overflow-hidden transition-all duration-300 ${
                expandedGroups.has(group.label)
                  ? "max-h-96 opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group/item overflow-hidden ${
                      active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    {/* Hover Background Animation */}
                    <div
                      className={`absolute inset-0 transition-all duration-300 ${
                        active
                          ? "bg-emerald-500/10"
                          : "bg-slate-700/0 group-hover/item:bg-slate-700/30"
                      }`}
                    />

                    {/* Icon with Animation */}
                    <div className="relative z-10 shrink-0">
                      <div
                        className={`transition-all duration-300 ${
                          active
                            ? "text-emerald-400 scale-110"
                            : "group-hover/item:scale-110 group-hover/item:text-emerald-400"
                        }`}
                      >
                        {item.icon}
                      </div>
                    </div>

                    {/* Label and Badge */}
                    <div className="relative z-10 flex-1 flex items-center justify-between min-w-0">
                      <span className="text-sm font-medium truncate group-hover/item:translate-x-0.5 transition-transform duration-200">
                        {item.label}
                      </span>

                      {/* Badge with Animation */}
                      {item.badge && (
                        <span
                          className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 transition-all duration-200 ${
                            active
                              ? "bg-emerald-500 text-white scale-100"
                              : "bg-slate-700 text-slate-300 group-hover/item:bg-slate-600 group-hover/item:scale-105"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Active Indicator */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-400 rounded-r-full animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sticky bottom-0 border-t border-slate-800/50 bg-linear-to-t from-slate-950 to-slate-900/80 backdrop-blur-sm px-3 py-4">
        <div className="flex items-center">
          <DashboardUserButton userName={userName} userEmail={userEmail} placement="sidebar" />
        </div>
      </div>
    </aside>
  );
}
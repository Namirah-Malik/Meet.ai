// app/dashboard/layout.tsx

"use client";

import { useState, useEffect } from "react";
import DashboardSidebar from "@/modules/dashboard/ui/components/dashboard-sidebar";
import DashboardUserButton from "@/modules/dashboard/ui/components/dashboard-user-button";
import { Search, Bell } from "lucide-react";
import { DashboardCommand } from "@/modules/dashboard/ui/components/dashboard-command";
import { authClient } from "@/lib/auth-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = authClient.useSession();
  const [userName, setUserName] = useState<string | undefined>(
    session?.user?.name || "User"
  );
  const [userEmail, setUserEmail] = useState<string | undefined>(
    session?.user?.email || ""
  );

  const [open, setOpen] = useState(false);

  // Keep state synced if session changes
  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.name || "User");
      setUserEmail(session.user.email || "");
    }
  }, [session]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <DashboardSidebar userName={userName} userEmail={userEmail} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 px-6 py-3 flex items-center gap-4">
          {/* Left - small square / branding */}
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-md bg-slate-800 text-white flex items-center justify-center font-bold">M</div>
          </div>

          {/* Center - search */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-3 w-full max-w-2xl bg-slate-800 border border-slate-700 shadow-sm rounded-xl px-4 py-2 hover:shadow-md transition"
            >
              <Search className="h-4 w-4 text-slate-300" />
              <span className="text-sm text-slate-300">Find a meeting or agent</span>
              <span className="ml-auto flex items-center gap-1">
                <kbd className="text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-700">⌘</kbd>
                <kbd className="text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-700">K</kbd>
              </span>
            </button>
          </div>

          {/* Right - icons */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-800 rounded-lg transition">
              <Bell className="h-5 w-5 text-slate-300" />
            </button>

            <DashboardUserButton
              userName={userName}
              userEmail={userEmail}
            />
          </div>
        </nav>

        {/* Command Dialog */}
        {/* DashboardCommand is controlled by `open` state which we need to add */}

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </div>
      </main>
      <DashboardCommand open={open} setOpen={setOpen} />
    </div>
  );
}
// app/dashboard/layout.tsx

"use client";

import { useState, useEffect } from "react";
import DashboardSidebar from "@/modules/dashboard/ui/components/dashboard-sidebar";
import DashboardUserButton from "@/modules/dashboard/ui/components/dashboard-user-button";
import { Bell } from "lucide-react";
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
        <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50 px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Dashboard</h2>

          {/* Right side - Notification & User Button */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors duration-200 relative group">
              <Bell className="w-5 h-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full" />
            </button>

            <span className="hidden md:inline text-sm text-slate-200 mr-2 truncate max-w-40">{userName}</span>
            <DashboardUserButton
              userName={userName}
              userEmail={userEmail}
            />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
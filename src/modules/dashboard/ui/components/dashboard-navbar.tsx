"use client";

import { useState } from "react";
import { Search, Bell } from "lucide-react";
import { DashboardCommand } from "./dashboard-command";

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Meet.AI</h1>
        </div>

        <nav className="space-y-6">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase text-slate-400">Meetings</h2>
            <ul className="space-y-2">
              <li>
                <button className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm hover:bg-slate-800">
                  📋 Meetings
                </button>
              </li>
              <li>
                <button className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm hover:bg-slate-800">
                  🤖 Agents
                </button>
              </li>
              <li>
                <button className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm hover:bg-slate-800">
                  📝 Transcripts <span className="ml-auto text-xs bg-slate-700 px-2 py-1 rounded">12</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* User Button at Bottom */}
        <div className="absolute bottom-6 left-6">
          <button className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">N</div>
            <span>User</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white px-6 py-3 flex items-center gap-4">
          {/* Left - small square / branding */}
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-md bg-slate-950 text-white flex items-center justify-center font-bold">M</div>
          </div>

          {/* Center - search */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-3 w-full max-w-2xl bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 hover:shadow-md transition"
            >
              <Search className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500">Find a meeting or agent</span>
              <span className="ml-auto flex items-center gap-1">
                <kbd className="text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200">⌘</kbd>
                <kbd className="text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200">K</kbd>
              </span>
            </button>
          </div>

          {/* Right - icons */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition">
              <Bell className="h-5 w-5 text-slate-700" />
            </button>

            <button className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 transition">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">N</div>
            </button>
          </div>
        </nav>

        {/* Page Content */}
        <div className="flex-1 p-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-slate-400 mb-8">Welcome to your dashboard</p>
          {children}
        </div>
      </main>

      {/* Command Dialog */}
      <DashboardCommand open={open} setOpen={setOpen} />
    </div>
  );
};
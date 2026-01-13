// components/dashboard/dashboard-user-button.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ChevronDown, LogOut, CreditCard } from "lucide-react";

interface UserButtonProps {
  userName?: string;
  userEmail?: string;
  userImage?: string;
  placement?: "topbar" | "sidebar";
}

export default function DashboardUserButton({
  userName = "User",
  userEmail = "user@example.com",
  userImage,
  placement = "topbar",
}: UserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const dropdownClass =
    placement === "sidebar"
      ? "absolute left-3 bottom-full mb-2 w-64 bg-slate-900/95 border border-slate-700/50 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
      : "absolute right-0 mt-2 w-72 bg-slate-900/95 border border-slate-700/50 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 1);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/sign-in"),
      },
    });
    setIsOpen(false);
  }; 

  return (
    <div className="relative">
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 group"
      >
        {/* Avatar (svg/logo could be used) */}
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0 shadow-lg font-semibold text-white text-sm">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* User Name */}
        <span className="text-sm font-medium text-slate-300 hidden sm:block">
          {userName}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className={dropdownClass}>
            {/* User Info Section */}
            <div className="px-4 py-4 border-b border-slate-700/50 bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0 shadow-lg font-semibold text-white text-lg">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{userName}</p>
                  <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* Billing Option */}
              <button className="w-full px-4 py-3 text-sm text-slate-300 hover:bg-slate-800/70 transition-colors duration-200 text-left flex items-center justify-between group/item">
                <span className="font-medium">Billing</span>
                <CreditCard className="w-4 h-4 text-slate-400 group-hover/item:text-blue-400 transition-colors" />
              </button>

              <div className="my-2 border-t border-slate-700/50" />

              {/* Logout Button */}
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-sm text-red-400 bg-transparent hover:bg-red-500/10 hover:text-red-300 transition-colors duration-200 text-left flex items-center gap-3 font-medium group/item"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 group-hover/item:bg-red-500/20 transition-colors">
                  <LogOut className="w-4 h-4 text-red-400 group-hover/item:text-red-300 transition-colors" />
                </span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import { LogOut, UserCheck } from "lucide-react";

export default function GhostModeEscape() {
  const [ghostRole, setGhostRole] = useState<string | null>(null);

  // Helper to read cookie on the client
  const getGhostSession = () => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ghost_session=`);
    if (parts.length === 2) {
      try {
        const cookieVal = parts.pop()?.split(";").shift();
        if (cookieVal) {
          return JSON.parse(decodeURIComponent(cookieVal));
        }
      } catch (e) {
        console.error("Error reading ghost session cookie:", e);
      }
    }
    return null;
  };

  useEffect(() => {
    const session = getGhostSession();
    if (session && session.role) {
      setGhostRole(session.role);
    } else {
      setGhostRole(null);
    }

    // Set up a periodic check to handle cookie changes dynamically
    const interval = setInterval(() => {
      const s = getGhostSession();
      if (s && s.role) {
        setGhostRole(s.role);
      } else {
        setGhostRole(null);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = () => {
    // Clear the impersonation cookie
    document.cookie = "ghost_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
    
    // Redirect securely back to developer dashboard
    window.location.href = "/developer/dashboard";
  };

  if (!ghostRole) return null;

  // Capitalize role for display
  const displayRole = ghostRole.charAt(0).toUpperCase() + ghostRole.slice(1);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-bounce-subtle">
      <button
        onClick={handleDisconnect}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#ffedd5] border border-orange-200 text-orange-950 text-xs font-bold shadow-lg hover:bg-[#ffedd5]/90 hover:border-orange-300 transition-all duration-200 cursor-pointer select-none whitespace-nowrap active:scale-95"
      >
        <UserCheck className="w-4 h-4 text-orange-800 animate-pulse" />
        <span>Active in Ghost Mode: Impersonating {displayRole}. Click to Disconnect.</span>
        <LogOut className="w-3.5 h-3.5 text-orange-700 ml-1" />
      </button>
    </div>
  );
}

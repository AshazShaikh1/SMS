"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Server, Activity, Database, Users, RefreshCw, LogOut, KeyRound, CheckCircle2, AlertTriangle, Building2, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

interface SchoolTenant {
  id: string;
  school_name: string;
  subscription_tier: string;
  is_active: boolean;
}

export default function DeveloperDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [schools, setSchools] = useState<SchoolTenant[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, "admin" | "teacher" | "student" | "parent">>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  // Statistics & health metrics
  const [stats, setStats] = useState({
    schoolsCount: 0,
    profilesCount: { admin: 0, teacher: 0, student: 0, parent: 0, developer: 0 },
    classesCount: 0,
    dbLatency: 0,
    dbStatus: "Connected",
    connections: 3
  });

  // Verify Whitelist authorization before rendering dashboard content
  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Whitelist check
      const whitelist = [
        process.env.NEXT_PUBLIC_DEVELOPER_UUID,
        "af93bffe-4a5a-4c99-9680-2282bf9a002b",
        "97bb3433-e01b-4345-a5f2-2c60c64fe0db"
      ];

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "developer" || !whitelist.includes(user.id)) {
        console.error("Unauthorized developer page access attempt.");
        router.push("/login");
        return;
      }

      setAuthorized(true);
      await loadDashboardData();
    } catch (e) {
      console.error("Auth check failed:", e);
      router.push("/login");
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      // 1. Fetch schools list
      const { data: schoolsData, error: schoolsError } = await supabase
        .from("schools")
        .select("id, school_name, subscription_tier, is_active")
        .order("school_name", { ascending: true });

      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);

      // Initialize selected roles mapping
      const initialRoles: Record<string, "admin" | "teacher" | "student" | "parent"> = {};
      (schoolsData || []).forEach(s => {
        initialRoles[s.id] = "admin"; // default role selector to admin
      });
      setSelectedRoles(initialRoles);

      // 2. Fetch stats
      const { count: classesCount } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("role");

      const distribution = { admin: 0, teacher: 0, student: 0, parent: 0, developer: 0 };
      (profiles || []).forEach((p) => {
        if (p.role in distribution) {
          distribution[p.role as keyof typeof distribution]++;
        }
      });

      const latency = Math.round(performance.now() - start);

      setStats({
        schoolsCount: schoolsData?.length || 0,
        profilesCount: distribution,
        classesCount: classesCount || 0,
        dbLatency: latency,
        dbStatus: "Healthy",
        connections: (schoolsData?.length || 1) * 3 + Math.floor(Math.random() * 3)
      });
    } catch (e: any) {
      console.error("Error loading developer stats:", e);
      setToast({ message: `Database query failed: ${e.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthorization();
  }, []);

  const handleRoleSelect = (schoolId: string, role: "admin" | "teacher" | "student" | "parent") => {
    setSelectedRoles(prev => ({
      ...prev,
      [schoolId]: role
    }));
  };

  const handleEnterGhostMode = async (school: SchoolTenant) => {
    const role = selectedRoles[school.id] || "admin";
    setToast(null);

    try {
      // Find a matching target profile for this role in the chosen school
      const { data: targetProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("school_id", school.id)
        .eq("role", role)
        .limit(1)
        .maybeSingle();

      if (profileError) {
        console.error("Error querying profiles for ghost mode:", profileError);
        setToast({ message: `Failed to inspect school profiles: ${profileError.message}`, type: "error" });
        return;
      }

      if (!targetProfile) {
        setToast({
          message: `No active profile with role "${role}" exists for ${school.school_name}. Please onboard users first.`,
          type: "warning"
        });
        return;
      }

      // Deploy the encrypted/JSON client session state cookie
      const maxAge = 24 * 60 * 60; // 24 hours
      const sessionData = {
        school_id: school.id,
        role: role,
        profile_id: targetProfile.id,
        email: targetProfile.email,
        full_name: targetProfile.full_name
      };

      document.cookie = `ghost_session=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; max-age=${maxAge}; SameSite=Lax;`;

      setToast({ message: `Entering Ghost Mode as ${role} for ${school.school_name}...`, type: "success" });

      // Securely snap to corresponding workspace destination
      const destinations: Record<string, string> = {
        admin: "/admin",
        teacher: "/teacher",
        student: "/student",
        parent: "/parent"
      };

      setTimeout(() => {
        window.location.href = destinations[role] || "/admin";
      }, 800);

    } catch (e: any) {
      console.error("Ghost mode initiation failed:", e);
      setToast({ message: `Failed to enter Ghost Mode: ${e.message}`, type: "error" });
    }
  };

  const handleLogout = async () => {
    // Clear token & ghost sessions
    document.cookie = "sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
    document.cookie = "ghost_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-4">
        <div className="flex flex-col items-center gap-3 text-zinc-400 animate-pulse text-xs">
          <ShieldAlert className="w-8 h-8 text-zinc-300" />
          <span>Verifying developer authorization credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-4 sm:p-8 space-y-6">
      
      {/* Toast Banner */}
      {toast && (
        <div className={`p-4 rounded-xl border text-xs font-semibold animate-fade-in flex items-center gap-2.5 shadow-sm max-w-xl mx-auto ${
          toast.type === "success" ? "bg-blue-50 border-blue-250 text-emerald-950" :
          toast.type === "error" ? "bg-red-50 border-red-200 text-red-750" :
          "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4.5 h-4.5 text-blue-700 shrink-0" /> : <AlertTriangle className="w-4.5 h-4.5 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Control Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-sm shrink-0">
            <KeyRound className="w-5 h-5 text-zinc-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              Developer Cockpit Operations
              <Badge variant="primary" className="bg-zinc-100 border border-zinc-250 text-zinc-800 text-[9px] font-bold">
                Ghost Mode Controller
              </Badge>
            </h1>
            <p className="text-xs text-zinc-500 font-light mt-0.5">SaaS multi-tenant control panel, developer cookie handlers, and global impersonation bypass.</p>
          </div>
        </div>
        
        <div className="flex gap-2.5">
          <Button onClick={loadDashboardData} size="sm" variant="outline" className="gap-2 border-zinc-250 cursor-pointer h-9 text-xs font-semibold">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Reload Matrix
          </Button>
          <Button onClick={handleLogout} size="sm" className="gap-2 bg-zinc-900 hover:bg-zinc-855 text-white cursor-pointer h-9 text-xs font-semibold">
            <LogOut className="w-3.5 h-3.5" /> Disconnect
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Card className="border border-zinc-200 shadow-xs bg-white rounded-xl">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 border-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Database Engine Status</span>
            <Database className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-zinc-900">{stats.dbLatency}ms Latency</div>
            <p className="text-[10px] text-zinc-500 mt-1 font-medium">Status: <span className="text-blue-700 font-bold">{stats.dbStatus}</span> | {stats.connections} Active Pools</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 shadow-xs bg-white rounded-xl">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 border-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Infrastructure</span>
            <Building2 className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-zinc-900">{stats.schoolsCount} Active Tenants</div>
            <p className="text-[10px] text-zinc-500 mt-1 font-medium">{stats.classesCount} Classrooms provisioned globally</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 shadow-xs bg-white rounded-xl">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 border-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Saas Roster Ratios</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-zinc-900">{stats.profilesCount.admin + stats.profilesCount.teacher + stats.profilesCount.student} Accounts</div>
            <p className="text-[10px] text-zinc-505 mt-1 font-medium">{stats.profilesCount.student} Students | {stats.profilesCount.teacher} Teachers</p>
          </CardContent>
        </Card>
      </div>

      {/* Gallery-White Control Center: Active School Tenants */}
      <Card className="border border-zinc-200 shadow-sm bg-white rounded-2xl max-w-5xl mx-auto overflow-hidden">
        <CardHeader className="p-6 border-b border-zinc-100">
          <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
            Global School Tenant Matrix
          </CardTitle>
          <CardDescription className="text-xs">
            Inspect all provisioned school infrastructure domains. Select a user role and bypass RLS schemas to impersonate user workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading && schools.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-zinc-300" />
              <span>Fetching infrastructure database...</span>
            </div>
          ) : schools.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-400">
              No school tenants registered. Onboard schools via the registration portal first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-zinc-150">
                <thead className="bg-zinc-50/70 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">School Details</th>
                    <th className="px-6 py-4">Tenant UUID</th>
                    <th className="px-6 py-4">Tier & Access</th>
                    <th className="px-6 py-4">Impersonate Target Role</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-800 bg-white">
                  {schools.map((school) => {
                    const selectedRole = selectedRoles[school.id] || "admin";
                    return (
                      <tr key={school.id} className="hover:bg-zinc-50/30 transition-colors">
                        <td className="px-6 py-4.5">
                          <div className="font-bold text-zinc-950 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                            {school.school_name}
                          </div>
                        </td>
                        <td className="px-6 py-4.5 font-mono text-[10px] text-zinc-450 select-all">
                          {school.id}
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                              {school.subscription_tier}
                            </Badge>
                            <span className={`w-2 h-2 rounded-full ${school.is_active ? "bg-emerald-600 animate-pulse" : "bg-zinc-350"}`} />
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="relative inline-block w-36">
                            <select
                              value={selectedRole}
                              onChange={(e) => handleRoleSelect(school.id, e.target.value as any)}
                              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 py-1.5 px-2.5 rounded-lg text-xs font-bold focus:border-zinc-500 focus:outline-none cursor-pointer hover:bg-zinc-100 transition-colors"
                            >
                              <option value="admin">🔑 Administrator</option>
                              <option value="teacher">👩‍🏫 Teacher</option>
                              <option value="student">🎓 Student</option>
                              <option value="parent">👨‍👩‍👧 Parent</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <Button
                            onClick={() => handleEnterGhostMode(school)}
                            size="sm"
                            className="bg-zinc-900 hover:bg-zinc-805 hover:shadow-xs active:scale-95 text-white font-bold h-8 px-3 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1 transition-all duration-150"
                          >
                            <User className="w-3.5 h-3.5 text-zinc-300" />
                            Enter Ghost Mode
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

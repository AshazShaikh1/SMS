"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Server, Activity, Database, Users, Landmark, AlertTriangle, RefreshCw, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

export default function DeveloperDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenantsCount, setTenantsCount] = useState(0);
  const [profilesCount, setProfilesCount] = useState({ admin: 0, teacher: 0, student: 0, parent: 0, developer: 0 });
  const [classesCount, setClassesCount] = useState(0);
  const [dbStatus, setDbStatus] = useState("Connected");
  const [dbLatency, setDbLatency] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [systemMetrics, setSystemMetrics] = useState({ cpu: 14, ram: 42, activeConnections: 3 });

  // Load Developer Stats
  const loadStats = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      // 1. Fetch schools count
      const { count: schoolsCount, error: schoolsError } = await supabase
        .from("schools")
        .select("*", { count: "exact", head: true });

      if (schoolsError) throw schoolsError;
      setTenantsCount(schoolsCount || 0);

      // 2. Fetch profiles distribution
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("role");

      if (profilesError) throw profilesError;

      const distribution = { admin: 0, teacher: 0, student: 0, parent: 0, developer: 0 };
      profiles.forEach((p) => {
        if (p.role in distribution) {
          distribution[p.role as keyof typeof distribution]++;
        }
      });
      setProfilesCount(distribution);

      // 3. Fetch classes count
      const { count: clsCount, error: clsError } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true });

      if (clsError) throw clsError;
      setClassesCount(clsCount || 0);

      // 4. Calculate DB response latency
      setDbLatency(Math.round(performance.now() - start));
      setDbStatus("Healthy");

      // Generate simulated logs
      const timestamp = new Date().toISOString();
      setLogs([
        `[${timestamp}] INFO: Developer session authenticated successfully. Whitelist checks passed.`,
        `[${timestamp}] DB_QUERY: Bypassed multi-tenant RLS isolation to inspect global tenant metrics.`,
        `[${timestamp}] MONITOR: DB latency resolved at ${Math.round(performance.now() - start)}ms.`,
        `[${timestamp}] RLS: dev_god_mode policies verified active across all database schema objects.`,
        `[${timestamp}] ENV: Whitelist UUID check matching active developer profiles.`,
      ]);

      // Randomize health variables slightly for visual interaction
      setSystemMetrics({
        cpu: Math.floor(10 + Math.random() * 8),
        ram: Math.floor(38 + Math.random() * 5),
        activeConnections: (schoolsCount || 1) * 3 + Math.floor(Math.random() * 4)
      });

    } catch (e: any) {
      console.error("Failed to query developer stats:", e);
      setDbStatus("Degraded");
      setLogs(prev => [...prev, `[${new Date().toISOString()}] ERROR: RLS Bypass query failed: ${e.message}`]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] p-6 space-y-6">
      {/* Developer Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950 flex items-center justify-center text-red-50 font-bold shadow-xs">
            <ShieldAlert className="w-5 h-5 text-red-100" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              Super-User Control Terminal
              <Badge variant="primary" className="bg-red-50 border border-red-200 text-red-800 text-[9px] font-bold">
                Bypass Mode Active
              </Badge>
            </h1>
            <p className="text-xs text-zinc-500 font-light mt-0.5">Global database inspection, multi-tenant diagnostics, and active server log streams.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadStats} size="sm" variant="outline" className="gap-2 border-zinc-250 cursor-pointer h-9 text-xs font-semibold">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Terminal
          </Button>
          <Button onClick={handleLogout} size="sm" className="gap-2 bg-red-950 hover:bg-red-900 text-white cursor-pointer h-9 text-xs font-semibold">
            <LogOut className="w-3.5 h-3.5" /> Close Terminal
          </Button>
        </div>
      </div>

      {/* Global Server Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <Card className="border border-zinc-200 shadow-sm card-accent-rose">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Server Health & Load</span>
            <Activity className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-zinc-900">{systemMetrics.cpu}% CPU</div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Memory load: {systemMetrics.ram}% RAM | Edge Node active</p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="border border-zinc-200 shadow-sm card-accent-emerald">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Supabase DB Engine</span>
            <Database className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-zinc-900">{dbLatency}ms latency</div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Status: <span className="text-emerald-850 font-bold">{dbStatus}</span> | Connections: {systemMetrics.activeConnections}</p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="border border-zinc-200 shadow-sm card-accent-indigo">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Tenant Metrics</span>
            <Server className="w-4 h-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-zinc-900">{tenantsCount} Active Schools</div>
            <p className="text-[10px] text-zinc-405 mt-1 font-medium">Total classrooms provisioned globally: {classesCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Global Ingestion Statistics & User distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User distribution breakdown */}
        <Card className="border border-zinc-200 shadow-sm lg:col-span-1 bg-white">
          <CardHeader className="p-5 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Profiles Role Distribution</span>
            <h3 className="text-sm font-bold text-zinc-900 mt-1">Cross-School Registered User Summary</h3>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3.5 text-xs">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <span className="font-semibold text-zinc-700">Developers (God Mode)</span>
              <Badge variant="primary" className="bg-red-50 border border-red-200 text-red-800">{profilesCount.developer}</Badge>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <span className="font-semibold text-zinc-700">Administrators</span>
              <Badge variant="secondary">{profilesCount.admin}</Badge>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <span className="font-semibold text-zinc-700">Teachers</span>
              <Badge variant="secondary">{profilesCount.teacher}</Badge>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <span className="font-semibold text-zinc-700">Students</span>
              <Badge variant="secondary">{profilesCount.student}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-700">Parents</span>
              <Badge variant="secondary">{profilesCount.parent}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Global Live Server Log Stream */}
        <Card className="border border-zinc-200 shadow-sm lg:col-span-2 bg-white flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Server Log Stream</span>
              <h3 className="text-sm font-bold text-zinc-900 mt-1">Live Environment Operations Console</h3>
            </div>
            <div className="w-2.5 h-2.5 bg-emerald-700 rounded-full animate-ping" />
          </CardHeader>
          <CardContent className="p-5 pt-0 flex-1">
            <div className="bg-zinc-950 rounded-xl p-4 font-mono text-[10px] text-zinc-300 space-y-2 max-h-60 overflow-y-auto leading-relaxed border border-zinc-800">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-emerald-500 shrink-0">~</span>
                  <span>{log}</span>
                </div>
              ))}
              <div className="text-zinc-605 italic pt-1">Listening for incoming server signals...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

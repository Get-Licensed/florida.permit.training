"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabaseClient";
import {
  Settings,
  Image as ImageIcon,
  Users,
  TrendingUp,
  ClipboardCheck,
} from "lucide-react";

export default function AdminPortalPage() {
  const [activeUsers, setActiveUsers] = useState<number>(0);

  useEffect(() => {
    loadActiveUsers();
    loadRecent();
  }, []);

  async function loadActiveUsers() {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    if (!error) setActiveUsers(count ?? 0);
  }

  const [recent, setRecent] = useState<any[]>([]);

  async function loadRecent() {
    const { data } = await supabase
      .from("course_status")
      .select(`
        user_id,
        completed_at,
        paid_at,
        dmv_submitted_at,
        profiles:profiles!course_status_user_id_fkey (
          full_name,
          email
        )
      `)
      .order("paid_at", { ascending: false })
      .limit(5);

    setRecent(data ?? []);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#001f40]">Admin Portal</h1>

        {/* CARDS */}
        <div className="flex gap-4">

          {/* Active Users */}
          <div className="bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-lg flex items-center gap-2">
            <Users size={18} className="text-[#001f40]" />
            <div>
              <p className="text-xs text-gray-500">Active Users</p>
              <p className="text-sm font-semibold">{activeUsers}</p>
            </div>
          </div>

          {/* Completion */}
          <div className="bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-lg flex items-center gap-2">
            <TrendingUp size={18} className="text-[#ca5608]" />
            <div>
              <p className="text-xs text-gray-500">Course Completion</p>
              <p className="text-sm font-semibold">-</p>
            </div>
          </div>

        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <AdminCard
          icon={<ClipboardCheck size={32} className="text-[#001f40]" />}
          title="DMV Submissions"
          description="View course completions, payment status, and DMV submission timestamps."
          href="/admin/submissions"
          buttonText="View Submissions"
        />

        <AdminCard
          icon={<ImageIcon size={32} className="text-[#001f40]" />}
          title="Slide Manager"
          description="Edit slides, captions, durations, and preview the full course flow."
          href="/admin/content/slide-manager"
          buttonText="Open Slide Manager"
        />

        <AdminCard
          icon={<Settings size={32} className="text-[#001f40]" />}
          title="Outline View"
          description="Manage modules, lessons, slides, and structured content."
          href="/admin/content"
          buttonText="Open Editor"
        />

      </div>

      {/* RECENT TABLE */}
      <div className="mt-14 bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <h2 className="text-xl font-bold text-[#001f40] mb-4">
          Recent Submissions
        </h2>

        {recent.length === 0 && (
          <p className="text-sm text-gray-600">No submissions yet.</p>
        )}

        {recent.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border-b">Name</th>
                <th className="p-2 border-b">Email</th>
                <th className="p-2 border-b">Completed</th>
                <th className="p-2 border-b">Paid</th>
                <th className="p-2 border-b">DMV</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.user_id}>
                  <td className="p-2 border-b">{row.profiles?.full_name || row.user_id}</td>
                  <td className="p-2 border-b">{row.profiles?.email || "-"}</td>
                  <td className="p-2 border-b">{fmt(row.completed_at)}</td>
                  <td className="p-2 border-b">{fmt(row.paid_at)}</td>
                  <td className="p-2 border-b">{fmt(row.dmv_submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

/* REUSABLE CARD */
function AdminCard({
  icon,
  title,
  description,
  href,
  buttonText,
}: {
  icon: any;
  title: string;
  description: string;
  href: string;
  buttonText: string;
}) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition">
      <div>
        <div className="mb-4">{icon}</div>

        <h2 className="font-bold text-lg text-[#001f40]">{title}</h2>

        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      <Link
        href={href}
        className="mt-5 inline-block w-full text-center bg-[#ca5608] text-white py-2 rounded-md text-sm font-semibold hover:bg-[#b24b06] transition"
      >
        {buttonText}
      </Link>
    </div>
  );
}

function fmt(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

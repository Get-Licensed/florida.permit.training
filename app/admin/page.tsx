"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/utils/supabaseClient";
import {
  Settings,
  Image as ImageIcon,
  Users,
  TrendingUp,
  HelpCircle,
} from "lucide-react";

export default function AdminPortalPage() {
  const [activeUsers, setActiveUsers] = useState<number>(0);

  useEffect(() => {
    loadActiveUsers();
  }, []);

  async function loadActiveUsers() {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    if (!error) setActiveUsers(count ?? 0);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#001f40]">Admin Portal</h1>

        {/* BADGES */}
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
              <p className="text-sm font-semibold">76%</p>
            </div>
          </div>

        </div>
      </div>

      {/* GRID OF ADMIN TOOLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* SLIDE MANAGER */}
        <AdminCard
          icon={<ImageIcon size={32} className="text-[#001f40]" />}
          title="Slide Manager"
          description="Edit slides, captions, durations, and preview the full course flow."
          href="/admin/content/slide-manager"
          buttonText="Open Slide Manager"
        />

        {/* FULL CONTENT EDITOR */}
        <AdminCard
          icon={<Settings size={32} className="text-[#001f40]" />}
          title="Outline View"
          description="Manage modules, lessons, slides, and structured content."
          href="/admin/content"
          buttonText="Open Editor"
        />

        {/* QUIZZES (NEW BOX) */}
        <AdminCard
          icon={<HelpCircle size={32} className="text-[#001f40]" />}
          title="Quizzes"
          description="Create new quizzes and edit existing quizzes for each lesson."
          href="/admin/content/quiz/new"
          buttonText="Manage Quizzes"
        />

      </div>
    </div>
  );
}

/* ------------------------- */
/* REUSABLE CARD COMPONENT   */
/* ------------------------- */

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

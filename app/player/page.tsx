"use client"

import NextDynamic from "next/dynamic"

export const dynamic = "force-dynamic"

const CoursePlayerLab = NextDynamic(
  () => import("./PlayerLab"),
  { ssr: false }
)

export default function Page() {
  return <CoursePlayerLab />
}
"use client"

import NextDynamic from "next/dynamic"

export const dynamic = "force-dynamic"

const CoursePlayerClient = NextDynamic(() => import("./CoursePlayerClient"), {
  ssr: false,
})

export default function Page() {
  return <CoursePlayerClient />
}
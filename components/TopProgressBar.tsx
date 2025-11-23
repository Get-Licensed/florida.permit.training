"use client";
import React from "react";

const BRAND_ORANGE = "#ca5608";

export default function TopProgressBar({ percent }: { percent: number }) {
 return (
  <div
    className="h-2 transition-all duration-[1400ms] ease-[cubic-bezier(.34,1.56,.64,1)]"
    style={{ width: `${Math.max(0, Math.min(percent, 100))}%`, backgroundColor: "#ca5608" }}
  />
);

}

"use client";

import { createContext, useContext } from "react";

export const ExamProgressContext = createContext<number>(0);

export function useExamProgress() {
  return useContext(ExamProgressContext);
}

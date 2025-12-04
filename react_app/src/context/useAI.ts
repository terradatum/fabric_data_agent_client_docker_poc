import { useContext } from "react";
import { AIContext } from "./context";
import type { AIContextData } from "./types";

export const useAI = (): AIContextData => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
};
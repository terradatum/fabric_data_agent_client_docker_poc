/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext } from "react";
import type { AIContextData } from "./types";

export const AIContext = createContext<AIContextData>({
  prompt: "",
  setPrompt: () => null,
  response: "",
  setResponse: () => null,
  responses: [],
  setResponses: () => null,
  isLoading: false,
  setIsLoading: () => null,
  error: null,
  setError: () => null,
  history: [],
  setHistory: () => null,
  clearAll: () => null,
  deleteHistoryItem: () => null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  submitPrompt: async () => {},
});

export const AIConsumer = AIContext.Consumer;
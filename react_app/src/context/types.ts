/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Dispatch, SetStateAction, ReactNode } from "react";

export interface AIContextData {
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  response: string;
  setResponse: Dispatch<SetStateAction<string>>;
    responses: Array<{ prompt: string; response: string; timestamp: Date }>; // Keeping this line unchanged
  setResponses: Dispatch<
    SetStateAction<Array<{ prompt: string; response: string; timestamp: Date }>>
  >;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
    history: Array<{ conversation: Array<{ prompt: string; response: string; timestamp: Date }> }>;
  setHistory: Dispatch<
      SetStateAction<Array<{ conversation: Array<{ prompt: string; response: string; timestamp: Date }> }>>
  >;
  clearAll: () => void;
  deleteHistoryItem: (index: number) => void;
  submitPrompt: (prompt: string) => Promise<void>;
  isAuthenticated: boolean;
  checkAuthStatus: () => Promise<boolean>;
  startAuth: () => Promise<{ success: boolean; device_code?: string; verification_uri?: string; error?: string }>;
}

export interface AIProviderProps {
  children: ReactNode;
}

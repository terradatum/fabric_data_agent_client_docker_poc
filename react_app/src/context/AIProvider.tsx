/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { AIContext } from "./context";
import type { AIContextData, AIProviderProps } from "./types";

// API base URL - uses environment variable or defaults to relative path for Docker setup
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Types for the run-details API response
interface RunDetailsResponse {
  success: boolean;
  question: string;
  run_status?: string;
  run_steps?: any;
  messages?: {
    data: Array<{
      role: string;
      content: Array<{
        text?: {
          value: string;
        };
      }>;
    }>;
  };
  timestamp?: number;
  sql_queries?: string[];
  sql_data_previews?: any[];
  data_retrieval_query?: string;
  error?: string;
  needs_auth?: boolean;
}

export const AIProvider = ({ children }: AIProviderProps) => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [responses, setResponses] = useState<
    Array<{ prompt: string; response: string; timestamp: Date }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // History now tracks conversations as arrays of prompt/response pairs
  const [history, setHistory] = useState<
    Array<{
      conversation: Array<{
        prompt: string;
        response: string;
        timestamp: Date;
      }>;
    }>
  >([]);

  const clearAll = () => {
    setPrompt("");
    setResponse("");
    setResponses([]);
    setIsLoading(false);
    setError(null);
    // Do NOT clear history, so previous conversations are preserved
  };

  const deleteHistoryItem = (index: number) => {
    setHistory(prev => prev.filter((_, i) => i !== index));
  };

  // Check authentication status
  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/status`);
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      return data.authenticated;
    } catch (err) {
      console.error("Failed to check auth status:", err);
      return false;
    }
  };

  // Start authentication flow
  const startAuth = async (): Promise<{ success: boolean; device_code?: string; verification_uri?: string; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Failed to start auth:", err);
      return { success: false, error: String(err) };
    }
  };

  // Extract response text from the run-details API response
  const extractResponseText = (data: RunDetailsResponse): string => {
    // First, try to get the assistant's message
    if (data.messages?.data) {
      const assistantMessages = data.messages.data.filter(msg => msg.role === "assistant");
      if (assistantMessages.length > 0) {
        const latestMessage = assistantMessages[assistantMessages.length - 1];
        if (latestMessage.content?.[0]?.text?.value) {
          return latestMessage.content[0].text.value;
        }
      }
    }

    // Fallback to SQL data if available
    if (data.sql_data_previews && data.sql_data_previews.length > 0) {
      const preview = data.sql_data_previews[0];
      if (Array.isArray(preview)) {
        return preview.join("\n");
      }
      return String(preview);
    }

    // If we have SQL queries but no data
    if (data.sql_queries && data.sql_queries.length > 0) {
      return `**Query Executed:**\n\`\`\`sql\n${data.sql_queries[0]}\n\`\`\`\n\n*Waiting for data...*`;
    }

    return "No response received from the data agent.";
  };

  // Submit prompt function - calls the Flask /run-details endpoint
  const submitPrompt = async (inputPrompt: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setPrompt(inputPrompt);

      // Call the Flask /run-details endpoint
      const res = await fetch(`${API_BASE_URL}/run-details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: inputPrompt }),
      });

      const data: RunDetailsResponse = await res.json();

      if (!res.ok) {
        if (data.needs_auth) {
          setIsAuthenticated(false);
          throw new Error("Authentication required. Please authenticate first.");
        }
        throw new Error(data.error || "Failed to get response from server");
      }

      if (!data.success) {
        throw new Error(data.error || "Request failed");
      }

      // Extract the response text from the API response
      const responseText = extractResponseText(data);
      console.log("API Response:", data);
      setResponse(responseText);

      // Add to responses array
      setResponses((prev) => [
        ...prev,
        {
          prompt: inputPrompt,
          response: responseText,
          timestamp: new Date(),
        },
      ]);

      // Add to history as a single conversation
      setHistory((prev) => {
        if (responses.length === 0) {
          // Start a new conversation (append to history)
          return [
            ...prev,
            {
              conversation: [
                {
                  prompt: inputPrompt,
                  response: responseText,
                  timestamp: new Date(),
                },
              ],
            },
          ];
        } else {
          // Add to the last conversation
          const updated = [...prev];
          updated[updated.length - 1].conversation.push({
            prompt: inputPrompt,
            response: responseText,
            timestamp: new Date(),
          });
          return updated;
        }
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: AIContextData = {
    prompt,
    setPrompt,
    response,
    setResponse,
    responses,
    setResponses,
    isLoading,
    setIsLoading,
    error,
    setError,
    history,
    setHistory,
    clearAll,
    deleteHistoryItem,
    submitPrompt,
    isAuthenticated,
    checkAuthStatus,
    startAuth,
  };

  return (
    <AIContext.Provider value={contextValue}>{children}</AIContext.Provider>
  );
};

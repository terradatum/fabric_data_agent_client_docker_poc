/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { AIContext } from "./context";
import type { AIContextData, AIProviderProps } from "./types";
import {
  clientTransactions,
  transactionSigningCountResults,
  topAgentsByTransactions,
} from "@mock-data";

export const AIProvider = ({ children }: AIProviderProps) => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<any>("");
  const [responses, setResponses] = useState<
    Array<{ prompt: string; response: any; timestamp: Date }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // History now tracks conversations as arrays of prompt/response pairs
  const [history, setHistory] = useState<
    Array<{
      conversation: Array<{
        prompt: string;
        response: any;
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
    setHistory((prev) => prev.filter((_, i) => i !== index));
  };

  // Function to fetch data from the API endpoint
  const fetchDataFromAPI = async (inputPrompt: string): Promise<any> => {
    try {
      const apiUrl = import.meta.env.VITE_DETAILS_API_URL;
      console.log("API URL:", apiUrl);
      if (!apiUrl) {
        throw new Error("API URL not configured");
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: inputPrompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw API response:", data);
      
      // Try to parse the response and return the full JSON object
      try {
        // If data.response is a JSON string, parse it
        if (typeof data.response === 'string' && 
            (data.response.startsWith('{') || data.response.startsWith('['))) {
          const jsonData = JSON.parse(data.response);
          console.log("Returning parsed JSON object:", jsonData);
          return jsonData;
        }
        // If data itself is the response object, return it
        else if (typeof data === 'object' && data.messages) {
          console.log("Returning direct response object:", data);
          return data;
        }
        // Fallback: return the original data
        else {
          return data;
        }
      } catch (error) {
        console.log("Error parsing response, returning original data:", error);
        return data;
      }
    } catch (error) {
      console.error("Error fetching from API:", error);

      // Fallback to mock data if API fails
      return getMockDataBasedOnPrompt(inputPrompt);
    }
  };

  // Function to determine which mock data to return based on prompt content (fallback)
  const getMockDataBasedOnPrompt = (inputPrompt: string): string => {
    const lowerPrompt = inputPrompt.toLowerCase();

    // Check for client transactions query
    if (
      lowerPrompt.includes("clients") &&
      lowerPrompt.includes("transaction") &&
      lowerPrompt.includes("may")
    ) {
      const results = clientTransactions
        .filter((client) => client.totalTransactions > 1)
        .sort((a, b) => b.totalTransactions - a.totalTransactions);

      const tableRows = results
        .map(
          (client, index) =>
            `| ${index + 1} | ${client.clientName} | ${
              client.totalTransactions
            } |`
        )
        .join("\n");

      return `**Query Results: Clients with Multiple Transactions (May 2024-2025)**

Found ${results.length} clients with more than one transaction:

| Rank | Client Name | Total Transactions |
|------|-------------|-------------------|
${tableRows}

*Data sorted by transaction count in descending order*`;
    }

    // Check for high-value transactions query
    if (
      lowerPrompt.includes("transaction") &&
      lowerPrompt.includes("october") &&
      lowerPrompt.includes("2 million")
    ) {
      const tableRows = transactionSigningCountResults
        .map(
          (transaction, index) =>
            `| ${index + 1} | ${transaction.clientName} | ${
              transaction.userName
            } | ${
              transaction.transactionId
            } | $${transaction.purchasePrice.toLocaleString()} | ${
              transaction.signingCount
            } |`
        )
        .join("\n");

      return `**Query Results: High-Value Transactions (Oct 2024 - Today)**

Found ${transactionSigningCountResults.length} transaction(s) meeting the criteria:

| # | Client Name | User Name | Transaction ID | Purchase Price | Signing Count |
|---|-------------|-----------|----------------|----------------|---------------|
${tableRows}

*Filtered: Purchase price ≥ $2,000,000 and signing count ≥ 5*`;
    }

    // Check for top agents query
    if (
      lowerPrompt.includes("agents") &&
      lowerPrompt.includes("main branch 25.07")
    ) {
      const tableRows = topAgentsByTransactions
        .map(
          (agent, index) =>
            `| ${index + 1} | ${agent.officeName} | ${agent.userKey} | ${
              agent.agentFullName
            } | ${agent.totalTransactions} |`
        )
        .join("\n");

      return `**Query Results: Top 10 Agents from Main Branch 25.07**

| Rank | Office Name | User Key | Agent Full Name | Total Transactions |
|------|-------------|----------|-----------------|-------------------|
${tableRows}

*Sorted by total transactions in descending order*`;
    }

    // Default response for unrecognized queries
    return `**AI Response**

I received your query: "${inputPrompt}"

This appears to be a custom query that doesn't match our predefined sample data sets. 

**Available sample queries:**
- Client transaction analysis (May 2024-2025)
- High-value transactions with signing requirements
- Top agents from Main Branch 25.07

Please try one of the sample prompts for demo data, or this would connect to your actual AI service in production.`;
  };

  // Submit prompt function with mock data integration
  const submitPrompt = async (inputPrompt: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setPrompt(inputPrompt);

      // Fetch data from API endpoint
      const apiResponse = await fetchDataFromAPI(inputPrompt);
      console.log("API Response:", apiResponse);
      setResponse(apiResponse);

      // Add to responses array
      setResponses((prev) => [
        ...prev,
        {
          prompt: inputPrompt,
          response: apiResponse,
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
                  response: apiResponse,
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
            response: apiResponse,
            timestamp: new Date(),
          });
          return updated;
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
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
  };

  return (
    <AIContext.Provider value={contextValue}>{children}</AIContext.Provider>
  );
};

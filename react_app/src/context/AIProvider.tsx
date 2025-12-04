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
  const [response, setResponse] = useState("");
  const [responses, setResponses] = useState<
    Array<{ prompt: string; response: string; timestamp: Date }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Function to determine which mock data to return based on prompt content
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

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get mock response based on prompt content
      const mockResponse = getMockDataBasedOnPrompt(inputPrompt);
      console.log("Mock Response:", mockResponse);
      setResponse(mockResponse);

      // Add to responses array
      setResponses((prev) => [
        ...prev,
        {
          prompt: inputPrompt,
          response: mockResponse,
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
                  response: mockResponse,
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
            response: mockResponse,
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

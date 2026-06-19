import OpenAI from "openai";
import type { ChatMessage } from "~/lib/types";

const SYSTEM_PRD_PROMPT = `You are an expert Product Manager and technical writer. Your task is to generate a comprehensive Product Requirements Document (PRD) in Markdown format based on the user's project description.

The PRD should include the following sections:

# Project Name

## Overview
A brief summary of what the project is and its purpose.

## Problem Statement
The problem this project solves and why it matters.

## Target Users
Who will use this product and their characteristics.

## Goals & Objectives
What the project aims to achieve (use SMART objectives).

## User Stories
List of key user stories in the format: "As a [role], I want [feature], so that [benefit]."

## Functional Requirements
Detailed functional requirements organized by feature/module.

## Non-Functional Requirements
Performance, security, scalability, accessibility, and other non-functional requirements.

## Technical Stack
Recommended technologies and frameworks.

## Data Model
Key entities and their relationships.

## API Endpoints
List of main API endpoints (if applicable).

## User Flow
Step-by-step user journey through the application.

## Milestones & Timeline
Suggested development phases and milestones.

## Success Metrics
Key performance indicators and success criteria.

## Risks & Assumptions
Known risks and assumptions made.

IMPORTANT: Output ONLY the Markdown content without any code fences, backticks, or markdown code block wrappers. The output should be clean, ready-to-use Markdown.`;

const SYSTEM_CHAT_PROMPT = `You are an expert Product Manager helping refine a Product Requirements Document. The user will provide feedback or new requirements, and you must update the PRD accordingly.

Rules:
1. Keep the same PRD structure and format
2. Apply the user's changes precisely
3. If the user asks to add something, integrate it naturally into the existing document
4. If the user asks to remove something, remove it cleanly
5. Maintain consistent formatting throughout
6. Output ONLY the updated Markdown content without any code fences, backticks, or markdown code block wrappers
7. Do not add explanations like "Here is the updated PRD" — just output the markdown directly`;

async function callProvider(
  messages: ChatMessage[],
  timeoutMs: number,
  provider: "nvidia" | "tokenrouter"
): Promise<{ content: string; provider: string }> {
  const configs = {
    nvidia: {
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: process.env.NVIDIA_BASE_URL,
      model: process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct",
    },
    tokenrouter: {
      apiKey: process.env.TOKENROUTER_API_KEY,
      baseURL: process.env.TOKENROUTER_BASE_URL,
      model: process.env.TOKENROUTER_MODEL || "MiniMax-M3",
    },
  };

  const config = configs[provider];

  if (!config.apiKey || !config.baseURL) {
    throw new Error(`${provider} API key or URL is not configured`);
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: timeoutMs,
    maxRetries: 0,
  });

  const response = await client.chat.completions.create({
    model: config.model,
    messages,
    temperature: 0.7,
    max_tokens: 8000,
  });

  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`No content in ${provider} response`);
  }

  return {
    content: content
      .replace(/^```(?:markdown)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim(),
    provider,
  };
}

async function callWithFallback(
  messages: ChatMessage[],
  timeoutMs: number
): Promise<{ content: string; provider: string; info: string[] }> {
  try {
    const result = await callProvider(messages, timeoutMs, "nvidia");
    return { ...result, info: [] };
  } catch (nvidiaErr) {
    const nvidiaMsg = (nvidiaErr as Error).message;
    console.warn("NVIDIA failed, falling back to TokenRouter:", nvidiaMsg);
    try {
      const result = await callProvider(messages, timeoutMs, "tokenrouter");
      return { ...result, info: [`NVIDIA unavailable: ${nvidiaMsg}`, "Falling back to TokenRouter"] };
    } catch (tokenErr) {
      const tokenMsg = (tokenErr as Error).message;
      throw new Error(
        [`NVIDIA: ${nvidiaMsg}`, `TokenRouter: ${tokenMsg}`].join(" | ")
      );
    }
  }
}

function buildMessages(systemPrompt: string, messages: ChatMessage[]): ChatMessage[] {
  return [
    { role: "system", content: systemPrompt },
    ...messages,
  ];
}

export async function generatePRD(userPrompt: string): Promise<{
  content: string;
  provider: string;
  info: string[];
}> {
  const timeout = Number(process.env.AI_TIMEOUT_MS || 120000);
  const messages = buildMessages(SYSTEM_PRD_PROMPT, [
    { role: "user", content: userPrompt },
  ]);

  return await callWithFallback(messages, timeout);
}

export async function chatRefinement(
  conversationHistory: ChatMessage[],
  currentPRD: string
): Promise<{
  content: string;
  provider: string;
  info: string[];
}> {
  const timeout = Number(process.env.AI_TIMEOUT_MS || 120000);

  const messages = buildMessages(SYSTEM_CHAT_PROMPT, [
    {
      role: "user",
      content: `Here is the current PRD:\n\n${currentPRD}`,
    },
    {
      role: "assistant",
      content: currentPRD,
    },
    ...conversationHistory,
  ]);

  return await callWithFallback(messages, timeout);
}
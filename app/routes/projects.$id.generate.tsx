import { useState } from "react";
import { Link, useLoaderData, redirect, useNavigate, data } from "react-router";
import { db } from "~/db/index";
import { projects, projectVersions, messages } from "~/db/schema";
import { eq, desc, sql, and, max } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { ROUTES, APP_NAME } from "~/lib/constants";
import { generatePRD, chatRefinement } from "~/services/ai.server";
import type { ChatMessage } from "~/lib/types";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Bot,
  Zap,
  FileText,
  Info,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Route } from "./+types/projects.$id.generate";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData?.project ? `Generate PRD — ${loaderData.project.title}` : "Generate PRD" },
  ];
}

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VersionRow {
  id: string;
  versionNumber: number;
  markdownContent: string;
  providerUsed: string;
  createdAt: string;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) throw redirect(ROUTES.login);

  const projectId = params.id;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)));

  if (!project) throw redirect(ROUTES.projects);

  const versions = await db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.versionNumber));

  return {
    project: project as ProjectRow,
    versions: versions as VersionRow[],
    latestVersion: versions[0] || null,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = params.id as string;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)));

  if (!project) {
    return data({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { intent, prompt, messages: chatMessages, currentContent } = body;

  // ─── Chat Refinement ────────────────────────────────────────────────────
  if (intent === "chat") {
    if (!chatMessages?.length || !currentContent) {
      return data({ error: "Messages and current PRD are required" }, { status: 400 });
    }

    try {
      const result = await chatRefinement(chatMessages as ChatMessage[], currentContent);

      const [maxVersion] = await db
        .select({ maxNum: max(projectVersions.versionNumber) })
        .from(projectVersions)
        .where(eq(projectVersions.projectId, projectId));

      const nextVersion = (maxVersion?.maxNum || 0) + 1;

      const [newVersion] = await db
        .insert(projectVersions)
        .values({
          projectId,
          versionNumber: nextVersion,
          markdownContent: result.content,
          providerUsed: result.provider,
        })
        .returning();

      await db
        .update(projects)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(projects.id, projectId));

      const userMessages = (chatMessages as ChatMessage[]).filter(
        (m) => m.role === "user" || m.role === "assistant"
      );
      await db.insert(messages).values(
        userMessages.map((m) => ({
          projectId,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );

      return data({
        success: true,
        version: newVersion,
        content: result.content,
        provider: result.provider,
        info: result.info,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI chat failed";
      console.error("Chat refinement error:", error);
      return data({ error: message }, { status: 500 });
    }
  }

  // ─── Generate PRD ───────────────────────────────────────────────────────
  if (!prompt) {
    return data({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const result = await generatePRD(prompt);

    const [maxVersion] = await db
      .select({ maxNum: max(projectVersions.versionNumber) })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId));

    const nextVersion = (maxVersion?.maxNum || 0) + 1;

    const [newVersion] = await db
      .insert(projectVersions)
      .values({
        projectId,
        versionNumber: nextVersion,
        markdownContent: result.content,
        providerUsed: result.provider,
      })
      .returning();

    await db
      .update(projects)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(projects.id, projectId));

    return data({
      success: true,
      version: newVersion,
      content: result.content,
      provider: result.provider,
      info: result.info,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    console.error("PRD generation error:", error);
    return data({ error: message }, { status: 500 });
  }
}

export default function GeneratePage() {
  const { project, versions, latestVersion } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    content: string;
    provider: string;
    info?: string[];
  } | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to generate PRD");
        return;
      }

      setResult(data);
      // Reload to reflect new version
      navigate(ROUTES.project(project.id));
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const nextVersion = (versions[0]?.versionNumber || 0) + 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back */}
      <div className="mb-6">
        <Link
          to={ROUTES.project(project.id)}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Project
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Generate PRD
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Describe your project idea and AI will create a comprehensive Product Requirements Document
        </p>
      </div>

      {/* Existing Versions Info */}
      {latestVersion && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  This project already has <strong>v{latestVersion.versionNumber}</strong>.
                  Generating a new PRD will create <strong>v{nextVersion}</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Project Idea
          </CardTitle>
          <CardDescription>
            Describe your project in detail. The more context you provide, the better the PRD will be.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <Textarea
              id="prompt"
              placeholder="e.g., Build an inventory management web app for small businesses. Features include: product catalog with barcode scanning, stock tracking across multiple warehouses, low stock alerts, purchase order management, sales reporting with charts, user roles (admin, warehouse staff, cashier), and a mobile-friendly interface."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              required
              autoFocus
            />

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {result?.info && result.info.length > 0 && (
              <div className="flex flex-col gap-1 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                {result.info.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    {msg}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  AI-powered generation
                </span>
                <span className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  NVIDIA NIM
                </span>
              </div>
              <Button type="submit" disabled={loading || !prompt.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating PRD...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate PRD
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Generating your PRD...
                  </p>
                  <p className="text-xs text-zinc-500">
                    AI is analyzing your project idea and creating a comprehensive document. This may take 30-60 seconds.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Link, useLoaderData, redirect } from "react-router";
import { db } from "~/db/index";
import { projects, projectVersions, messages } from "~/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { ROUTES } from "~/lib/constants";
import { formatRelativeDate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { EmptyState } from "~/components/ui/empty-state";
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Eye,
  EyeOff,
  FileText,
  Info,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Route } from "./+types/projects.$id.chat";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData?.project ? `Chat — ${loaderData.project.title}` : "Chat" },
  ];
}

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
}

interface VersionRow {
  id: string;
  versionNumber: number;
  markdownContent: string;
  providerUsed: string;
  createdAt: string;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
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

  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(messages.createdAt);

  return {
    project: project as ProjectRow,
    versions: versions as VersionRow[],
    latestVersion: versions[0] || null,
    chatMessages: chatMessages as MessageRow[],
  };
}

function ProviderBadge({ provider }: { provider: string }) {
  const isNvidia = provider === "NVIDIA";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        isNvidia
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      }`}
    >
      <Bot className="h-2.5 w-2.5" />
      {provider}
    </span>
  );
}

export default function ChatPage() {
  const { project, versions, latestVersion, chatMessages } =
    useLoaderData<typeof loader>();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<string[]>([]);
  const [liveMessages, setLiveMessages] = useState<
    Array<{ role: string; content: string; provider?: string }>
  >(chatMessages.map((m) => ({ role: m.role, content: m.content })));
  const [liveContent, setLiveContent] = useState(
    latestVersion?.markdownContent || ""
  );
  const [liveVersion, setLiveVersion] = useState(latestVersion);
  const [showPreview, setShowPreview] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput("");
    setError("");
    setInfo([]);

    setLiveMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setSending(true);

    try {
      const response = await fetch(`/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "chat",
          messages: [
            ...liveMessages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ],
          currentContent: liveContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to get AI response");
        setSending(false);
        return;
      }

      setLiveMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content, provider: data.provider },
      ]);

      setLiveContent(data.content);
      setLiveVersion(data.version);

      if (data.info?.length) {
        setInfo(data.info);
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  if (!latestVersion) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={ROUTES.project(project.id)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Project
        </Link>
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="Generate a PRD first"
          description="You need to generate an initial PRD before you can refine it through chat"
          action={
            <Link to={ROUTES.generate(project.id)}>
              <Button>
                <Sparkles className="h-4 w-4" />
                Generate PRD
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const currentVersion = liveVersion || latestVersion;

  return (
    <div className="mx-auto flex h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={ROUTES.project(project.id)}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {project.title}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Refining v{currentVersion.versionNumber}
              {currentVersion.id !== latestVersion.id && (
                <span className="text-indigo-500"> (unsaved)</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="hidden lg:inline-flex"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Show Preview
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="lg:hidden"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Show
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Layout: Chat + Preview */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Chat Panel */}
        <div
          className={`flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${
            showPreview ? "flex-1" : "flex-1"
          } ${!showPreview ? "lg:max-w-3xl" : ""}`}
        >
          {/* Messages */}
          <div
            className="flex-1 space-y-3 overflow-y-auto p-4"
            style={{ maxHeight: "calc(100vh - 180px)" }}
          >
            {liveMessages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-indigo-50 p-3 dark:bg-indigo-900/20">
                  <MessageSquare className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Refine your PRD
                </p>
                <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                  Tell the AI how you'd like to update the document. Each message creates a new version.
                </p>
              </div>
            )}

            {liveMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div className="flex max-w-[80%] flex-col gap-1">
                  {msg.role === "assistant" && msg.provider && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        AI Assistant
                      </span>
                      <ProviderBadge provider={msg.provider} />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-br-md bg-indigo-600 text-white dark:bg-indigo-500"
                        : "rounded-bl-md border border-zinc-100 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="markdown-preview prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "assistant" && (
                    <span className="px-1 text-[10px] text-zinc-400">
                      v{i + 1}
                    </span>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <User className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                  <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Updating PRD...
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {info.length > 0 && (
              <div className="flex flex-col gap-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                {info.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    {msg}
                  </div>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <Separator />
          <div className="p-4">
            <form onSubmit={handleSend} className="flex gap-3">
              <Textarea
                ref={inputRef}
                placeholder="Describe the changes you want..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="min-h-[80px] resize-y"
              />
              <Button
                type="submit"
                disabled={sending || !input.trim()}
                className="gap-2"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="hidden w-[480px] shrink-0 flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  PRD Preview
                </h3>
                <p className="text-xs text-zinc-400">
                  v{currentVersion.versionNumber} · {currentVersion.providerUsed}
                </p>
              </div>
              <Link
                to={ROUTES.versions(project.id)}
                className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                History
              </Link>
            </div>
            <div
              className="flex-1 overflow-y-auto p-6"
              style={{ maxHeight: "calc(100vh - 180px)" }}
            >
              <div className="markdown-preview">
                <ReactMarkdown>{liveContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

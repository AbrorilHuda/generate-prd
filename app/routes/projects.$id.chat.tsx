import { useState, useRef, useEffect } from "react";
import { Link, useLoaderData, redirect } from "react-router";
import { db } from "~/db/index";
import { projects, projectVersions, messages } from "~/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { ROUTES, APP_NAME } from "~/lib/constants";
import { formatDate, formatRelativeDate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/ui/empty-state";
import { Separator } from "~/components/ui/separator";
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
  FileText,
  MessageSquare,
  Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Route } from "./+types/projects.$id.chat";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data?.project ? `Chat — ${data.project.title}` : "Chat" },
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
  projectId: string;
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

export default function ChatPage() {
  const { project, versions, latestVersion, chatMessages } =
    useLoaderData<typeof loader>();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [liveMessages, setLiveMessages] = useState<
    Array<{ role: string; content: string }>
  >(chatMessages.map((m) => ({ role: m.role, content: m.content })));
  const [liveContent, setLiveContent] = useState(
    latestVersion?.markdownContent || ""
  );
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

    // Add user message to UI immediately
    setLiveMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setSending(true);

    try {
      const response = await fetch(`/projects/${project.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "chat",
          messages: [
            ...liveMessages,
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

      // Add AI response to UI
      setLiveMessages((prev) => [
        ...prev,
        { role: "assistant", content: "PRD has been updated to version " + data.version.versionNumber + " based on your feedback." },
      ]);

      // Update live content with new PRD
      setLiveContent(data.content);

      // Refresh data
      window.location.href = ROUTES.project(project.id);
    } catch (err) {
      setError("Network error. Please check your connection.");
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back + Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to={ROUTES.project(project.id)}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Project
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Chat Refinement
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {project.title} · Version {latestVersion.versionNumber}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="lg:hidden"
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      {/* Main Layout: Chat + Preview */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Chat Panel */}
        <div className="flex flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 320px)" }}>
            {liveMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Start a conversation
                </p>
                <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                  Tell the AI how you'd like to refine your PRD. For example:
                  "Add multi-warehouse support" or "Include a user approval workflow"
                </p>
              </div>
            )}

            {liveMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                    <Bot className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md bg-indigo-600 text-white dark:bg-indigo-500"
                      : "rounded-bl-md bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <User className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                  <Bot className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="chat-message-assistant flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  <span className="text-sm text-zinc-400">Updating PRD...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mx-auto flex max-w-md items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <Separator />
          <form onSubmit={handleSend} className="p-4">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                placeholder="Describe the changes you want..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="min-h-[44px] resize-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !input.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        <div
          className={`rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${
            !showPreview ? "hidden lg:block" : ""
          }`}
        >
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Live PRD Preview
            </h3>
            <p className="text-xs text-zinc-400">
              Updated in real-time as you chat
            </p>
          </div>
          <div
            className="overflow-y-auto p-6"
            style={{ maxHeight: "calc(100vh - 360px)" }}
          >
            <div className="markdown-preview">
              <ReactMarkdown>{liveContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

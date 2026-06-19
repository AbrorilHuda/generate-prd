import { Link, useLoaderData, redirect, useNavigate, useRevalidator } from "react-router";
import { db } from "~/db/index";
import { projects, projectVersions } from "~/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { ROUTES, APP_NAME } from "~/lib/constants";
import { formatDate, formatRelativeDate, slugify, truncate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { EmptyState } from "~/components/ui/empty-state";
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Download,
  History,
  FileText,
  Bot,
  ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Route } from "./+types/projects.$id";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data?.project ? `${data.project.title} — ${APP_NAME}` : `Project — ${APP_NAME}` },
  ];
}

interface VersionRow {
  id: string;
  versionNumber: number;
  markdownContent: string;
  providerUsed: string;
  createdAt: string;
}

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
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

export async function action({ params, request }: Route.ActionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) throw redirect(ROUTES.login);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update-title") {
    const title = (formData.get("title") as string)?.trim();
    if (!title) return { error: "Title is required" };

    await db
      .update(projects)
      .set({ title, updatedAt: sql`datetime('now')` })
      .where(and(eq(projects.id, params.id), eq(projects.userId, session.user.id)));

    return { success: true };
  }

  return { error: "Unknown action" };
}

export default function ProjectDetailPage() {
  const { project, versions, latestVersion } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  function handleExport() {
    if (!latestVersion) return;
    const content = latestVersion.markdownContent;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(project.title)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button + Breadcrumb */}
      <div className="mb-6">
        <Link
          to={ROUTES.projects}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects
        </Link>
      </div>

      {/* Project Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {project.title}
            </h1>
            {project.description && (
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!latestVersion && (
              <Link to={ROUTES.generate(project.id)}>
                <Button>
                  <Sparkles className="h-4 w-4" />
                  Generate PRD
                </Button>
              </Link>
            )}
            {latestVersion && (
              <>
                <Link to={ROUTES.chat(project.id)}>
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Link to={ROUTES.versions(project.id)}>
                  <Button variant="ghost">
                    <History className="h-4 w-4" />
                    History
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Content */}
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Main: PRD Content */}
        <div>
          {!latestVersion ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No PRD generated yet"
              description="Describe your project idea and let AI generate a comprehensive Product Requirements Document"
              action={
                <Link to={ROUTES.generate(project.id)}>
                  <Button size="lg">
                    <Sparkles className="h-4 w-4" />
                    Generate PRD
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Version {latestVersion.versionNumber}
                  </h2>
                  <Badge variant="success">Latest</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Bot className="h-3 w-3" />
                  {latestVersion.providerUsed}
                  <span className="mx-1">·</span>
                  {formatRelativeDate(latestVersion.createdAt)}
                </div>
              </div>
              <Separator className="mb-6" />
              <div className="markdown-preview">
                <ReactMarkdown>{latestVersion.markdownContent}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Version History */}
        <div className="lg:order-2">
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Version History
              </h3>
            </div>
            {versions.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-400">
                No versions yet
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {versions.map((version) => (
                  <Link
                    key={version.id}
                    to={ROUTES.versions(project.id)}
                    className="block px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        v{version.versionNumber}
                      </span>
                      {version.id === latestVersion?.id && (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {formatRelativeDate(version.createdAt)} · {version.providerUsed}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {truncate(version.markdownContent, 80)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to={ROUTES.generate(project.id)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <Sparkles className="h-4 w-4" />
                Regenerate PRD
              </Link>
              <Link
                to={ROUTES.chat(project.id)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <MessageSquare className="h-4 w-4" />
                Refine via Chat
              </Link>
              {latestVersion && (
                <button
                  onClick={handleExport}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <Download className="h-4 w-4" />
                  Export Markdown
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

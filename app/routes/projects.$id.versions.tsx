import { useState } from "react";
import { Link, useLoaderData, redirect } from "react-router";
import { db } from "~/db/index";
import { projects, projectVersions } from "~/db/schema";
import { eq, desc, and, max } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { ROUTES, APP_NAME } from "~/lib/constants";
import { formatDate, formatRelativeDate, slugify, truncate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Separator } from "~/components/ui/separator";
import {
  ArrowLeft,
  History,
  Bot,
  RotateCcw,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Route } from "./+types/projects.$id.versions";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data?.project ? `Version History — ${data.project.title}` : "Version History" },
  ];
}

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
}

interface VersionRow {
  id: string;
  projectId: string;
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
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) throw redirect(ROUTES.login);

  const projectId = params.id;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "restore") {
    const versionId = formData.get("versionId") as string;
    if (!versionId) return { error: "Version ID required" };

    const [version] = await db
      .select()
      .from(projectVersions)
      .where(and(eq(projectVersions.id, versionId), eq(projectVersions.projectId, projectId)));

    if (!version) return { error: "Version not found" };

    // Get next version number
    const [maxVer] = await db
      .select({ maxNum: max(projectVersions.versionNumber) })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId));

    const nextVersion = (maxVer?.maxNum || 0) + 1;

    // Create new version as copy
    await db.insert(projectVersions).values({
      projectId,
      versionNumber: nextVersion,
      markdownContent: version.markdownContent,
      providerUsed: `${version.providerUsed} (restored)`,
    });

    return { success: true, newVersion: nextVersion };
  }

  return { error: "Unknown action" };
}

export default function VersionHistoryPage() {
  const { project, versions } = useLoaderData<typeof loader>();
  const [expandedVersion, setExpandedVersion] = useState<string | null>(
    versions[0]?.id || null
  );

  async function handleRestore(version: VersionRow) {
    const formData = new FormData();
    formData.set("intent", "restore");
    formData.set("versionId", version.id);

    const res = await fetch(window.location.href, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      window.location.reload();
    }
  }

  function handleExport(version: VersionRow) {
    const blob = new Blob([version.markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(project.title)}-v${version.versionNumber}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
          Version History
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {project.title} · {versions.length} version{versions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Version List */}
      {versions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History className="h-12 w-12" />}
            title="No versions yet"
            description="Generate a PRD to create the first version"
            action={
              <Link to={ROUTES.generate(project.id)}>
                <Button>
                  <Sparkles className="h-4 w-4" />
                  Generate PRD
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {versions.map((version, index) => {
            const isExpanded = expandedVersion === version.id;
            const isLatest = index === 0;

            return (
              <Card key={version.id} className={isLatest ? "border-indigo-200 dark:border-indigo-800" : ""}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {version.versionNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Version {version.versionNumber}
                          </span>
                          {isLatest && <Badge variant="success">Latest</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <Bot className="h-3 w-3" />
                          {version.providerUsed}
                          <span>·</span>
                          {formatDate(version.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isLatest && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(version)}
                          title="Restore this version"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExport(version)}
                        title="Export this version"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedVersion(isExpanded ? null : version.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <div
                      className="markdown-preview max-h-[500px] overflow-y-auto rounded-md border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                      <ReactMarkdown>{version.markdownContent}</ReactMarkdown>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

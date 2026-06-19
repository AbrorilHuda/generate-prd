import { Link, useLoaderData, redirect } from "react-router";
import { db } from "~/db/index";
import { projects, projectVersions } from "~/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { ROUTES, APP_NAME } from "~/lib/constants";
import { formatDate, formatRelativeDate, truncate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Plus,
  FolderOpen,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { Route } from "./+types/dashboard";

export function meta() {
  return [
    { title: `Dashboard — ${APP_NAME}` },
    { name: "description", content: "Manage your projects and generate PRDs" },
  ];
}

interface DashboardProject {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  latestVersionDate: string | null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) throw redirect(ROUTES.login);

  const userProjects = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      versionCount:
        sql<number>`(SELECT COUNT(*) FROM project_versions WHERE project_versions.project_id = projects.id)`.as(
          "versionCount"
        ),
    })
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.updatedAt))
    .limit(10);

  const totalProjects = await db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  return {
    projects: userProjects as DashboardProject[],
    totalProjects: totalProjects[0]?.count || 0,
  };
}

export default function DashboardPage() {
  const { projects, totalProjects } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage your projects and generate PRDs with AI
          </p>
        </div>
        <Link to={ROUTES.projects}>
          <Button>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Total Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {totalProjects}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              PRDs Generated
            </CardTitle>
            <FileText className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {projects.reduce((acc, p) => acc + (p.versionCount || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Last Updated
            </CardTitle>
            <Clock className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {projects.length > 0
                ? formatRelativeDate(projects[0].updatedAt)
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Projects
        </h2>

        {projects.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No projects yet"
              description="Create your first project to start generating PRDs with AI"
              action={
                <Link to={ROUTES.projects}>
                  <Button>
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1">
                      {project.title}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      v{project.versionCount || 0}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {truncate(project.description, 100)}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {formatRelativeDate(project.updatedAt)}
                    </span>
                    <Link to={ROUTES.project(project.id)}>
                      <Button variant="ghost" size="sm">
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

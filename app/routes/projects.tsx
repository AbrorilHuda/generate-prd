import { useState } from "react";
import { Link, useLoaderData, redirect, useNavigate } from "react-router";
import { db } from "~/db/index";
import { projects, projectVersions, messages } from "~/db/schema";
import { eq, desc, sql, count, and } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { ROUTES, APP_NAME } from "~/lib/constants";
import { formatDate, formatRelativeDate, truncate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/empty-state";
import {
  Plus,
  FolderOpen,
  MoreHorizontal,
  Trash2,
  Edit,
  ArrowRight,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import type { Route } from "./+types/projects";

export function meta() {
  return [
    { title: `Projects — ${APP_NAME}` },
    { name: "description", content: "View and manage all your projects" },
  ];
}

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
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
    .orderBy(desc(projects.updatedAt));

  return { projects: userProjects as ProjectRow[] };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) throw redirect(ROUTES.login);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();

    if (!title) {
      return { error: "Project title is required" };
    }

    await db.insert(projects).values({
      userId: session.user.id,
      title,
      description: description || null,
    });

    return { success: true };
  }

  if (intent === "delete") {
    const projectId = formData.get("projectId") as string;
    if (!projectId) return { error: "Project ID is required" };

    // Delete messages and versions first (cascade), then project
    await db.delete(messages).where(eq(messages.projectId, projectId));
    await db.delete(projectVersions).where(eq(projectVersions.projectId, projectId));
    await db.delete(projects).where(
      and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
    );

    return { success: true, deleted: projectId };
  }

  return { error: "Unknown action" };
}

export default function ProjectsPage() {
  const { projects } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setCreating(true);
    try {
      const formData = new FormData();
      formData.set("intent", "create");
      formData.set("title", title.trim());
      formData.set("description", description.trim());

      const res = await fetch(window.location.href, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setCreateOpen(false);
        setTitle("");
        setDescription("");
        // Reload the page data
        window.location.reload();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(projectId: string) {
    setDeleting(true);
    try {
      const formData = new FormData();
      formData.set("intent", "delete");
      formData.set("projectId", projectId);

      const res = await fetch(window.location.href, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setDeleteOpen(null);
        window.location.reload();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Projects
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Project List */}
      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderOpen className="h-12 w-12" />}
            title="No projects yet"
            description="Create your first project to start generating PRDs with AI"
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group flex flex-col transition-shadow hover:shadow-md"
            >
              <CardHeader className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-1">
                    {project.title}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="shrink-0">
                      v{project.versionCount || 0}
                    </Badge>
                    <button
                      onClick={() => setDeleteOpen(project.id)}
                      className="rounded-md p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Updated {formatRelativeDate(project.updatedAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    {project.versionCount > 0 ? (
                      <>
                        <Link to={ROUTES.project(project.id)}>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="h-3 w-3" />
                            Open
                          </Button>
                        </Link>
                        <Link to={ROUTES.chat(project.id)}>
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Link to={ROUTES.generate(project.id)}>
                        <Button variant="ghost" size="sm">
                          <Sparkles className="h-3 w-3" />
                          Generate
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogClose onClose={() => setCreateOpen(false)} />
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className="space-y-4">
            <Input
              id="project-title"
              label="Project Title"
              placeholder="e.g., Inventory Management App"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
            <Textarea
              id="project-description"
              label="Description (optional)"
              placeholder="Brief description of the project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !title.trim()}>
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteOpen}
        onClose={() => setDeleteOpen(null)}
      >
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogClose onClose={() => setDeleteOpen(null)} />
        </DialogHeader>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Are you sure you want to delete this project? This action cannot be
          undone. All versions and messages will be permanently deleted.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteOpen && handleDelete(deleteOpen)}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Project"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

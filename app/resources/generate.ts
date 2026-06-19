import { data } from "react-router";
import { db } from "~/db/index";
import { projects, projectVersions } from "~/db/schema";
import { eq, desc, and, max } from "drizzle-orm";
import { auth } from "~/lib/auth.server";
import { ROUTES } from "~/lib/constants";
import { generatePRD, chatRefinement } from "~/services/ai.server";
import type { Route } from "./+types/resource.generate";

export async function action({ request, params }: Route.ActionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = params.id as string;

  // Verify project ownership
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)));

  if (!project) {
    return data({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { prompt, messages, currentContent, intent } = body;

  try {
    let result: { content: string; provider: string };

    if (intent === "chat" && messages && currentContent) {
      // Chat refinement mode
      result = await chatRefinement(messages, currentContent);
    } else if (prompt) {
      // New PRD generation
      result = await generatePRD(prompt);
    } else {
      return data({ error: "No prompt or messages provided" }, { status: 400 });
    }

    // Get next version number
    const [maxVersion] = await db
      .select({ maxNum: max(projectVersions.versionNumber) })
      .from(projectVersions)
      .where(eq(projectVersions.projectId, projectId));

    const nextVersion = (maxVersion?.maxNum || 0) + 1;

    // Save as new version
    const [newVersion] = await db
      .insert(projectVersions)
      .values({
        projectId,
        versionNumber: nextVersion,
        markdownContent: result.content,
        providerUsed: result.provider,
      })
      .returning();

    // Update project timestamp
    await db
      .update(projects)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(projects.id, projectId));

    return data({
      success: true,
      version: newVersion,
      content: result.content,
      provider: result.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed";
    console.error("PRD generation error:", error);
    return data({ error: message }, { status: 500 });
  }
}

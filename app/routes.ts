import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Auth pages
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/register", "routes/auth.register.tsx"),
  // Better Auth API routes (catch-all)
  route("auth/*", "routes/auth.ts"),
  // App pages
  route("dashboard", "routes/dashboard.tsx"),
  route("projects", "routes/projects.tsx"),
  route("projects/:id", "routes/projects.$id.tsx"),
  route("projects/:id/generate", "routes/projects.$id.generate.tsx"),
  route("projects/:id/chat", "routes/projects.$id.chat.tsx"),
  route("projects/:id/versions", "routes/projects.$id.versions.tsx"),
] satisfies RouteConfig;

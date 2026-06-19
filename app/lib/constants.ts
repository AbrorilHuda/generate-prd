export const APP_NAME = "PRD Forge";

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  projects: "/projects",
  project: (id: string) => `/projects/${id}`,
  generate: (id: string) => `/projects/${id}/generate`,
  chat: (id: string) => `/projects/${id}/chat`,
  versions: (id: string) => `/projects/${id}/versions`,
  login: "/auth/login",
  register: "/auth/register",
} as const;



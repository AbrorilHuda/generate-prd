export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  markdownContent: string;
  providerUsed: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  projectId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  preferredProvider: "cavoti" | "nvidia" | "auto";
  createdAt: Date;
}

export interface ProjectWithVersions extends Project {
  versions: ProjectVersion[];
  latestVersion: ProjectVersion | null;
  versionCount: number;
}

export interface ProjectDetail extends Project {
  versions: ProjectVersion[];
  messages: Message[];
  latestVersion: ProjectVersion | null;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

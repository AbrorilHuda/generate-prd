import { auth } from "~/lib/auth.server";
import type { Route } from "./+types/auth";

// This route handles all Better Auth API requests
export async function action({ request }: Route.ActionArgs) {
  // Better Auth handles the request internally
  const response = await auth.handler(request);
  return response;
}

export async function loader({ request }: Route.LoaderArgs) {
  const response = await auth.handler(request);
  return response;
}

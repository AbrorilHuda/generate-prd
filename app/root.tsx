import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useEffect } from "react";
import type { Route } from "./+types/root";
import "./app.css";
import { AppBar } from "~/components/layout/app-bar";
import { initTheme } from "~/stores/theme.store";
import { authClient } from "~/lib/auth.client";
import { auth } from "~/lib/auth.server";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  useEffect(() => {
    initTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative flex min-h-screen flex-col">
        <AppBar
          userName={data.user?.name}
          userEmail={data.user?.email}
          userImage={data.user?.image}
          onLogout={() => authClient.signOut().then(() => navigate("/"))}
        />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className: "dark:!bg-zinc-900 dark:!text-zinc-100 dark:!border-zinc-800",
        }}
      />
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">{message}</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">{details}</p>
        {stack && (
          <pre className="mx-auto mt-4 max-w-lg overflow-x-auto rounded-lg bg-zinc-100 p-4 text-left text-sm dark:bg-zinc-900">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return {
      user: session?.user
        ? {
            id: session.user.id,
            name: session.user.name || "",
            email: session.user.email || "",
            image: session.user.image || null,
          }
        : null,
    };
  } catch {
    return { user: null };
  }
}

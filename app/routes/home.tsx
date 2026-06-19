import { Link } from "react-router";
import { APP_NAME, ROUTES } from "~/lib/constants";
import { Button } from "~/components/ui/button";
import {
  Sparkles,
  MessageSquare,
  History,
  Download,
  FileText,
  Zap,
  Bot,
  ArrowRight,
  CheckCircle2,
  Shield,
} from "lucide-react";

export function meta() {
  return [
    { title: `${APP_NAME} — AI-Powered PRD Generator` },
    {
      name: "description",
      content:
        "Transform your project ideas into professional Product Requirements Documents using AI. Generate, refine, and export PRDs in Markdown format.",
    },
  ];
}

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description:
      "Describe your project idea in natural language and get a comprehensive PRD with all essential sections.",
  },
  {
    icon: MessageSquare,
    title: "Chat Refinement",
    description:
      "Iterate on your PRD through conversation. Add features, modify sections, and refine requirements effortlessly.",
  },
  {
    icon: History,
    title: "Version Control",
    description:
      "Every change creates a new version. View history, compare versions, and restore previous iterations.",
  },
  {
    icon: Download,
    title: "Markdown Export",
    description:
      "Export your PRD as a clean Markdown file, ready for GitHub, documentation tools, or your team.",
  },
  {
    icon: Bot,
    title: "Smart Fallback",
    description:
      "Multiple AI providers with automatic fallback ensure you always get results, even if one provider is down.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Your project data is encrypted and private. Authentication keeps your work protected at all times.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/80 via-white to-white dark:from-indigo-950/30 dark:via-zinc-950 dark:to-zinc-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[600px] rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-900/20" />

        <div className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered PRD Generation
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-100">
              Transform ideas into{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                professional PRD
              </span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Describe your project, and let AI generate a comprehensive Product
              Requirements Document. Refine through chat, track versions, and
              export in Markdown.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <Link to={ROUTES.register}>
                <Button size="lg" className="h-12 px-6 text-base">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={ROUTES.login}>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 text-base"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Free to start
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Multiple AI providers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-zinc-100 bg-zinc-50/50 py-20 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Everything you need to build great PRDs
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              From initial idea to polished document, {APP_NAME} handles the
              entire PRD workflow with AI assistance.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-800"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-900/50 dark:text-indigo-400 dark:group-hover:bg-indigo-600 dark:group-hover:text-white">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              How it works
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Three simple steps from idea to professional PRD.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                step: "01",
                title: "Describe Your Idea",
                description:
                  "Enter your project concept in natural language. Be as detailed or brief as you like — AI will fill in the gaps.",
                icon: FileText,
              },
              {
                step: "02",
                title: "AI Generates PRD",
                description:
                  "Our AI creates a comprehensive PRD with all standard sections: overview, requirements, user stories, timeline, and more.",
                icon: Sparkles,
              },
              {
                step: "03",
                title: "Refine & Export",
                description:
                  "Chat with AI to iterate on the document, track changes with versioning, and export as a Markdown file.",
                icon: Download,
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                  <item.icon className="h-7 w-7" />
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Step {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-zinc-100 bg-zinc-50/50 py-20 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Ready to build your next PRD?
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Start generating professional Product Requirements Documents in
            seconds. No setup required.
          </p>
          <div className="mt-8">
            <Link to={ROUTES.register}>
              <Button size="lg" className="h-12 px-8 text-base">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-8 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {APP_NAME}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Built with React Router, Tailwind CSS, and AI. ©{" "}
              {new Date().getFullYear()} {APP_NAME}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

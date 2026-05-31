import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-400">
        404
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-foreground">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The page you are looking for does not exist or was moved.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          to="/"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Back Home
        </Link>
      </div>
    </div>
  );
}

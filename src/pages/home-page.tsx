export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Starter App
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
        Your new project starts here
      </h1>
      <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
        This repo has been cleaned into a reusable React + TypeScript + Vite
        baseline. Build your pages in{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">src/pages</code>
        and wire routes in{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5">src/router.tsx</code>
        .
      </p>
    </section>
  );
}

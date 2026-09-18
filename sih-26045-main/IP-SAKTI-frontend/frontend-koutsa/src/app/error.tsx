"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-xl rounded-card border border-line bg-white p-8 text-center"><h1 className="serif text-3xl text-forest">Something went wrong</h1><p className="mt-2 text-sm text-ink/60">The page could not be loaded safely.</p><button onClick={reset} className="mt-5 rounded-control bg-forest px-4 py-3 text-sm font-semibold text-white">Try again</button></div>;
}
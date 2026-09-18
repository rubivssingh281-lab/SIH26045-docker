import Link from "next/link";

export default function NotFound() {
  return <div className="mx-auto max-w-xl rounded-card border border-line bg-white p-8 text-center"><h1 className="serif text-3xl text-forest">Research record not found</h1><p className="mt-2 text-sm text-ink/60">The requested case does not exist or is no longer available.</p><Link href="/dashboard" className="mt-5 inline-flex rounded-control bg-forest px-4 py-3 text-sm font-semibold text-white">Back to dashboard</Link></div>;
}
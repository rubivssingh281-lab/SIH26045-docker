import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-6"><Skeleton className="h-24 w-2/3" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>;
}
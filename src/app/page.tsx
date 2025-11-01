import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl font-headline">
            JMK Trading Bill Book
          </h1>
          <p className="max-w-[600px] text-muted-foreground md:text-xl">
            Create professional, GST-free bills quickly and efficiently. Perfect for small businesses, shopkeepers, and freelancers.
          </p>
        </div>
        <Button asChild size="lg" className="shadow-lg shadow-primary/20">
          <Link href="/create-bill">Create New Bill</Link>
        </Button>
      </div>
    </main>
  );
}

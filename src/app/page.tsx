import { Button } from "@/components/ui/button";
import { JMKTradingLogo } from "@/components/icons";
import Link from "next/link";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <>
    <Header />
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
         
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl font-headline">
              Bill Book
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              Create professional, GST-free bills quickly and efficiently. Perfect for small businesses, shopkeepers, and freelancers.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="shadow-lg shadow-primary/20">
              <Link href="/create-bill">Create New Bill</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
                <Link href="/bill/history">View Bill History</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
                <Link href="/profit-loss">Profit and Loss</Link>
            </Button>
        </div>
      </div>
    </main>
    </>
  );
}

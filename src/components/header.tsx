import Link from "next/link";
import { JMKTradingLogo } from "@/components/icons";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <JMKTradingLogo className="h-8 w-8" />
          <span className="font-bold text-foreground">JMK Trading</span>
        </Link>
      </div>
    </header>
  );
}

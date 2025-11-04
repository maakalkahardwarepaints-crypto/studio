'use client';

import Link from "next/link";
import { JMKTradingLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Settings, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { useIsMobile } from "@/hooks/use-mobile";

export function Header() {
    const isMobile = useIsMobile();

    const DesktopNav = () => (
        <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
                <Link href="/profit-loss">Profit & Loss</Link>
            </Button>
            <Button variant="ghost" asChild>
                <Link href="/bill/history">History</Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
                <Link href="/settings">
                    <Settings />
                    <span className="sr-only">Settings</span>
                </Link>
            </Button>
        </div>
    );

    const MobileNav = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <HamburgerMenuIcon className="h-6 w-6" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href="/profit-loss">Profit & Loss</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/bill/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <JMKTradingLogo className="h-8 w-8" />
          <span className="font-bold text-foreground">JMK Trading</span>
        </Link>
        {isMobile ? <MobileNav /> : <DesktopNav />}
      </div>
    </header>
  );
}

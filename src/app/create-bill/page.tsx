import { BillCreator } from "@/components/bill-creator";
import Link from "next/link";

export default function CreateBillPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-foreground">JMK Trading</span>
          </Link>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <BillCreator />
      </main>
    </div>
  );
}

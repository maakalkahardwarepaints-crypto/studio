import { BillCreator } from "@/components/bill-creator";
import { Header } from "@/components/header";

export default function CreateBillPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <BillCreator />
      </main>
    </div>
  );
}

import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClientManager } from "@/components/client-manager";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeToggle />
            </CardContent>
          </Card>
          
          <ClientManager />
        </div>

      </main>
    </>
  );
}

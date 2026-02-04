import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopHeader } from "@/components/layout/top-header";
import { UserProvider } from "@/lib/contexts/user-context";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <UserProvider>
      <div className="min-h-screen bg-background">
        {/* Top Header */}
        <TopHeader />

        {/* Desktop Sidebar */}
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="md:pl-64 pt-14 pb-16 md:pb-0 h-screen">
          <div className="h-full overflow-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav className="md:hidden" />
      </div>
    </UserProvider>
  );
}

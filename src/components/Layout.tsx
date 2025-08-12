import { Outlet } from "react-router-dom";
import { MondeAppSidebar } from "@/components/MondeAppSidebar";
import { MondeHeader } from "@/components/MondeHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
export function Layout() {
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-muted/30">
          <MondeAppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <MondeHeader />
            <main className="flex-1 overflow-auto pt-5 pr-14 pb-14 pl-14 sm:pt-5 sm:pr-14 sm:pb-14 sm:pl-14\n">
              <div className="max-w-7xl mx-auto space-y-6">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>;
}
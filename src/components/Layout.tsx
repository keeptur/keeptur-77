import { Outlet } from "react-router-dom";
import { MondeAppSidebar } from "@/components/MondeAppSidebar";
import { MondeHeader } from "@/components/MondeHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
// WelcomeTrialModal temporarily disabled
export function Layout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
        <MondeAppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <MondeHeader />
          <main className="flex-1 overflow-auto pt-0 pr-14 pb-14 pl-14 sm:pt-5 sm:pr-14 sm:pb-14 sm:pl-14">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* WelcomeTrialModal temporarily disabled */}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
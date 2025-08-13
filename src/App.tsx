import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "./components/Layout";
import LoginForm from "./components/LoginForm";
import Dashboard from "./pages/Dashboard";
import PeoplePage from "./pages/People";
import ProfilePage from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { TokenManagerInside } from "./components/TokenManagerInside";
import { SubscriberSync } from "./components/SubscriberSync";
import AdminPage from "./pages/Admin";
import { AdminRoute } from "./components/auth/AdminRoute";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminPlansPage from "./pages/admin/AdminPlansPage";
import AdminBillingPage from "./pages/admin/AdminBillingPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminEmailsPage from "./pages/admin/AdminEmailsPage";
import AdminLogsPage from "./pages/admin/AdminLogsPage";
// Setup page removed

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [supaReady, setSupaReady] = useState(false);
  const [supaLogged, setSupaLogged] = useState(false);
  const mondeAuthenticated = api.isAuthenticated();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSupaLogged(!!session);
      setSupaReady(true);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSupaLogged(!!session);
    });
    init();
    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = mondeAuthenticated || supaLogged;
  console.log("ProtectedRoute check:", { isAuthenticated });

  if (!supaReady && !mondeAuthenticated) {
    return <></>;
  }
  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Public Route Component (redirects authenticated users)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  if (api.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// App wrapper component
const AppWrapper = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="keeptur-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TokenManagerInside />
            <SubscriberSync />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <LoginForm />
                </PublicRoute>
              } />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="people" element={<PeoplePage />} />
                <Route path="profile" element={<ProfilePage />} />
                {/* Legacy single admin page (kept) */}
                <Route path="admin" element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                } />
                {/* Redirect legacy admin subroutes to unified /admin */}
                <Route path="admin/dashboard" element={<Navigate to="/admin?t=dashboard" replace />} />
                <Route path="admin/users" element={<Navigate to="/admin?t=users" replace />} />
                <Route path="admin/plans" element={<Navigate to="/admin?t=plans" replace />} />
                <Route path="admin/billing" element={<Navigate to="/admin?t=billing" replace />} />
                <Route path="admin/settings" element={<Navigate to="/admin?t=settings" replace />} />
                <Route path="admin/emails" element={<Navigate to="/admin?t=emails" replace />} />
                <Route path="admin/logs" element={<Navigate to="/admin?t=logs" replace />} />
              </Route>
              
// Setup route removed
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const App = () => <AppWrapper />;

export default App;

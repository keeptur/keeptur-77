
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { api } from "@/lib/api";
import { Layout } from "./components/Layout";
import LoginForm from "./components/LoginForm";
import Dashboard from "./pages/Dashboard";
import PeoplePage from "./pages/People";
import ProfilePage from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { TokenManagerInside } from "./components/TokenManagerInside";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = api.isAuthenticated();
  console.log("ProtectedRoute check:", { isAuthenticated });
  
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
              </Route>
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const App = () => <AppWrapper />;

export default App;

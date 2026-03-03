import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BuyKey from "./pages/BuyKey";
import TopUp from "./pages/TopUp";
import Admin from "./pages/Admin";
import History from "./pages/History";
import GameDetail from "./pages/GameDetail";
import BackgroundMusic from "./components/BackgroundMusic";
import ResetPassword from "./pages/ResetPassword";
import LC79Game from "./pages/LC79Game";
import BetVipGame from "./pages/BetVipGame";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a0a00" }}><div className="text-2xl" style={{ color: "#ffd700" }}>⏳ Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BackgroundMusic />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/buy-key" element={<ProtectedRoute><BuyKey /></ProtectedRoute>} />
            <Route path="/topup" element={<ProtectedRoute><TopUp /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/game/lc79" element={<ProtectedRoute><LC79Game /></ProtectedRoute>} />
            <Route path="/game/betvip" element={<ProtectedRoute><BetVipGame /></ProtectedRoute>} />
            <Route path="/game/:id" element={<ProtectedRoute><GameDetail /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

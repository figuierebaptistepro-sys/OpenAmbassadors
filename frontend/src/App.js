import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CreatorDashboard from "./pages/CreatorDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import CreatorProfile from "./pages/CreatorProfile";
import BrowseCreators from "./pages/BrowseCreators";
import PacksPage from "./pages/PacksPage";
import MessagesPage from "./pages/MessagesPage";
import OnboardingPage from "./pages/OnboardingPage";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Auth Callback Component
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionId = new URLSearchParams(hash.substring(1)).get("session_id");

      if (sessionId) {
        try {
          const response = await fetch(`${API_URL}/api/auth/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ session_id: sessionId }),
          });

          if (response.ok) {
            const userData = await response.json();
            // Clear hash and navigate based on user type
            window.history.replaceState(null, "", window.location.pathname);
            if (userData.user_type === "creator") {
              navigate("/creator/dashboard", { state: { user: userData } });
            } else {
              navigate("/business/dashboard", { state: { user: userData } });
            }
          } else {
            navigate("/login");
          }
        } catch (error) {
          console.error("Auth error:", error);
          navigate("/login");
        }
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Connexion en cours...</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedTypes }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const [user, setUser] = useState(location.state?.user || null);

  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) throw new Error("Not authenticated");

        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);

        // Check if user type is allowed
        if (allowedTypes && !allowedTypes.includes(userData.user_type)) {
          if (userData.user_type === "creator") {
            navigate("/creator/dashboard");
          } else {
            navigate("/business/dashboard");
          }
        }
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate, location.state, allowedTypes]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return typeof children === "function" ? children({ user }) : children;
};

// App Router
function AppRouter() {
  const location = useLocation();

  // Check for session_id in hash - process BEFORE normal routing
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/creator" element={<RegisterPage userType="creator" />} />
      <Route path="/register/business" element={<RegisterPage userType="business" />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/packs" element={<PacksPage />} />
      <Route path="/creators" element={<BrowseCreators />} />
      <Route path="/creators/:userId" element={<CreatorProfile />} />
      
      {/* Creator Routes */}
      <Route
        path="/creator/dashboard"
        element={
          <ProtectedRoute allowedTypes={["creator"]}>
            {({ user }) => <CreatorDashboard user={user} />}
          </ProtectedRoute>
        }
      />
      
      {/* Business Routes */}
      <Route
        path="/business/dashboard"
        element={
          <ProtectedRoute allowedTypes={["business"]}>
            {({ user }) => <BusinessDashboard user={user} />}
          </ProtectedRoute>
        }
      />
      
      {/* Messages - both can access */}
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            {({ user }) => <MessagesPage user={user} />}
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;

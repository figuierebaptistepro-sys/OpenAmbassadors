import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
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
import LoginPage from "./pages/LoginPage";
import SelectTypePage from "./pages/SelectTypePage";
import CreatorDashboard from "./pages/CreatorDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import CreatorProfile from "./pages/CreatorProfile";
import BrowseCreators from "./pages/BrowseCreators";
import TrainingsPage from "./pages/TrainingsPage";
import ProjectsPage from "./pages/ProjectsPage";

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
            window.history.replaceState(null, "", window.location.pathname);
            
            // Check if user type is set
            if (!userData.user_type) {
              navigate("/select-type", { state: { user: userData } });
            } else if (userData.user_type === "creator") {
              navigate("/dashboard", { state: { user: userData } });
            } else {
              navigate("/business", { state: { user: userData } });
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/80 font-medium">Connexion en cours...</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requireType = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authState, setAuthState] = useState({ checked: false, user: null });

  useEffect(() => {
    // If user passed from previous navigation, use it
    if (location.state?.user) {
      setAuthState({ checked: true, user: location.state.user });
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) throw new Error("Not authenticated");

        const userData = await response.json();
        
        // Check if type selection is required
        if (requireType && !userData.user_type) {
          navigate("/select-type", { state: { user: userData } });
          return;
        }
        
        setAuthState({ checked: true, user: userData });
      } catch (error) {
        setAuthState({ checked: true, user: null });
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate, location.state, requireType]);

  if (!authState.checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authState.user) {
    return null;
  }

  return typeof children === "function" ? children({ user: authState.user }) : children;
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
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Type selection - required after first login */}
      <Route
        path="/select-type"
        element={
          <ProtectedRoute>
            {({ user }) => <SelectTypePage user={user} />}
          </ProtectedRoute>
        }
      />
      
      {/* Creator Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <CreatorDashboard user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainings"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <TrainingsPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <ProjectsPage user={user} />}
          </ProtectedRoute>
        }
      />
      
      {/* Business Routes */}
      <Route
        path="/business"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <BusinessDashboard user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/creators"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <BrowseCreators user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/creators/:userId"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <CreatorProfile currentUser={user} />}
          </ProtectedRoute>
        }
      />
      
      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
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

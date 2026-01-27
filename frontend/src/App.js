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
import LearnPage from "./pages/LearnPage";
import ProjectsPage from "./pages/ProjectsPage";
import AccountSettings from "./pages/AccountSettings";
import SupportPage from "./pages/SupportPage";
import BillingPage from "./pages/BillingPage";
import NewProjectPage from "./pages/NewProjectPage";
import WalletPage from "./pages/WalletPage";
import AdminPage from "./pages/AdminPage";
import BusinessProjectsPage from "./pages/BusinessProjectsPage";
import ProjectApplicationsPage from "./pages/ProjectApplicationsPage";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Auth Callback Component
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
    <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Connexion en cours...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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

  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Type selection */}
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
        path="/projects"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <ProjectsPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <WalletPage user={user} />}
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
        path="/business/projects"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <BusinessProjectsPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/projects/new"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <NewProjectPage user={user} />}
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
      
      {/* Shared Routes */}
      <Route
        path="/learn"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <LearnPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <AccountSettings user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <SupportPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <BillingPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <AdminPage user={user} />}
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

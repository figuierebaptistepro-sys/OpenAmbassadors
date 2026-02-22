import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
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

// Components
// HelpCrunch is now handled directly in index.html - no React component needed

// Pages
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SelectTypePage from "./pages/SelectTypePage";
import CreatorDashboard from "./pages/CreatorDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import CreatorProfileV2 from "./pages/CreatorProfileV2";
import BrowseCreators from "./pages/BrowseCreators";
import LearnPage from "./pages/LearnPage";
import ArticlePage from "./pages/ArticlePage";
import ProjectsPage from "./pages/ProjectsPage";
import AccountSettings from "./pages/AccountSettings";
import SupportPage from "./pages/SupportPage";
import BillingPage from "./pages/BillingPage";
import NewProjectPage from "./pages/NewProjectPage";
import WalletPage from "./pages/WalletPage";
import AdminPage from "./pages/AdminPage";
import BusinessProjectsPage from "./pages/BusinessProjectsPage";
import ProjectApplicationsPage from "./pages/ProjectApplicationsPage";
import { InboxPage, ConversationPage } from "./pages/MessagesPage";
import ExternalReviewPage from "./pages/ExternalReviewPage";
import AffiliatePage from "./pages/AffiliatePage";
import CreatorCardPage from "./pages/CreatorCardPage";
import CreatorCardManagePage from "./pages/CreatorCardManagePage";
import ArenaPage from "./pages/ArenaPage";
import PoolDetailPage from "./pages/PoolDetailPage";
import CreatePoolPage from "./pages/CreatePoolPage";
import BusinessPoolDetailPage from "./pages/BusinessPoolDetailPage";
import BusinessPoolsPage from "./pages/BusinessPoolsPage";
import PoolPaymentSuccessPage from "./pages/PoolPaymentSuccessPage";
import MyFavoritesPage from "./pages/MyFavoritesPage";

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

// Public wrapper for Creator Card - fetches user optionally without blocking
const CreatorCardPublicWrapper = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        // Not logged in, that's fine
      }
    };
    checkUser();
  }, []);

  return <CreatorCardPage user={user} />;
};

// Redirect from /@username to /c/username
const CreatorCardRedirect = () => {
  const { username } = useParams();
  // Remove @ prefix if present (for URLs like /@username)
  const cleanUsername = username?.startsWith('@') ? username.slice(1) : username;
  return <Navigate to={`/c/${cleanUsername}`} replace />;
};

// Conditional route for /:username - checks if it starts with @
const CreatorCardConditionalRoute = () => {
  const { username } = useParams();
  
  // If the username starts with @, redirect to creator card
  if (username?.startsWith('@')) {
    const cleanUsername = username.slice(1);
    return <Navigate to={`/c/${cleanUsername}`} replace />;
  }
  
  // Otherwise, this is an unknown route - redirect to login
  return <Navigate to="/login" replace />;
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

  // Fonction pour mettre à jour l'utilisateur en temps réel
  const handleUserUpdate = (updatedUser) => {
    setAuthState(prev => ({ ...prev, user: updatedUser }));
  };

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

  return typeof children === "function" ? children({ user: authState.user, onUserUpdate: handleUserUpdate }) : children;
};

// App Router
function AppRouter({ onUserChange }) {
  const location = useLocation();

  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/review/external" element={<ExternalReviewPage />} />
      
      {/* Public Creator Card - /c/:username */}
      <Route path="/c/:username" element={<CreatorCardPublicWrapper />} />
      
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
            {({ user, onUserUpdate }) => <CreatorDashboard user={user} onUserUpdate={onUserUpdate} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator-card"
        element={
          <ProtectedRoute requireType>
            {({ user, onUserUpdate }) => <CreatorCardManagePage user={user} onUserUpdate={onUserUpdate} />}
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
      
      {/* Messages Routes */}
      <Route
        path="/messages"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <InboxPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages/:conversationId"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <ConversationPage user={user} />}
          </ProtectedRoute>
        }
      />
      
      {/* Pool Routes (Creators) */}
      <Route
        path="/pool"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <ArenaPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/pool/:poolId"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <PoolDetailPage user={user} />}
          </ProtectedRoute>
        }
      />
      {/* Legacy arena routes redirect to pool */}
      <Route path="/arena" element={<Navigate to="/pool" replace />} />
      <Route path="/arena/:poolId" element={<Navigate to="/pool" replace />} />
      
      {/* Business Routes */}
      <Route
        path="/business"
        element={
          <ProtectedRoute requireType>
            {({ user, onUserUpdate }) => <BusinessDashboard user={user} onUserUpdate={onUserUpdate} />}
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
        path="/business/projects/:projectId/edit"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <NewProjectPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/projects/:projectId"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <ProjectApplicationsPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/pools"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <BusinessPoolsPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/pools/new"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <CreatePoolPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/pools/success"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <PoolPaymentSuccessPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/pools/:poolId"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <BusinessPoolDetailPage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/business/favorites"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <MyFavoritesPage user={user} />}
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
            {({ user }) => <CreatorProfileV2 currentUser={user} />}
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
        path="/learn/:articleId"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <ArticlePage user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute requireType>
            {({ user, onUserUpdate }) => <AccountSettings user={user} onUserUpdate={onUserUpdate} />}
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
      <Route
        path="/affiliate"
        element={
          <ProtectedRoute requireType>
            {({ user }) => <AffiliatePage user={user} />}
          </ProtectedRoute>
        }
      />
      
      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* Handle @username URLs for creator cards - must be before catch-all */}
      <Route path="/:username" element={<CreatorCardConditionalRoute />} />
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

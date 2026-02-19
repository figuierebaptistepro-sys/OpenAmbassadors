import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, BookOpen, Users,
  Settings, HelpCircle, Crown, LogOut, Menu, X, User, ChevronDown, CreditCard, FileText, Wallet, Shield, MessageCircle, Gift, Share2, Trophy, Zap
} from "lucide-react";
import { Badge } from "./ui/badge";
import NotificationBell from "./NotificationBell";

const LOGO_URL = "/logo-sun.png";
const API_URL = process.env.REACT_APP_BACKEND_URL;

const AppLayout = ({ children, user, currentPlan }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const userType = user?.user_type;
  const isPremium = user?.is_premium;

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/check`, { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.is_admin);
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };
    if (user) checkAdmin();
  }, [user]);

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await fetch(`${API_URL}/api/messaging/conversations`, { credentials: "include" });
        if (response.ok) {
          const convs = await response.json();
          const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          setUnreadMessages(total);
        }
      } catch (e) {}
    };
    if (user) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const creatorMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadMessages },
    { icon: Trophy, label: "Pool", path: "/pool", highlight: true },
    { icon: CreditCard, label: "Creator Card", path: "/dashboard", soon: true },
    { icon: Briefcase, label: "Missions", path: "/projects" },
    { icon: Wallet, label: "Cagnotte", path: "/wallet" },
    { icon: Gift, label: "Affiliation", path: "/affiliate" },
    { icon: BookOpen, label: "Learn", path: "/learn" },
  ];

  const businessMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/business" },
    { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadMessages },
    { icon: Zap, label: "Créer Pool", path: "/business/pools/new", highlight: true },
    { icon: Users, label: "Find Creator", path: "/creators" },
    { icon: Briefcase, label: "Mes Projets", path: "/business/projects" },
    { icon: Gift, label: "Affiliation", path: "/affiliate" },
    { icon: BookOpen, label: "Learn", path: "/learn" },
  ];

  const menuItems = userType === "creator" ? creatorMenuItems : businessMenuItems;

  const commonMenuItems = [
    { icon: HelpCircle, label: "Support & Guides", path: "/support" },
    { icon: Settings, label: "Paramètres", path: "/settings" },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          data-testid="mobile-menu-btn"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5 text-gray-700" />
          ) : (
            <Menu className="w-5 h-5 text-gray-700" />
          )}
        </button>
        
        <Link to={userType === "creator" ? "/dashboard" : "/business"} className="flex items-center gap-2">
          <img src={LOGO_URL} alt="OpenAmbassadors" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-heading font-bold text-base text-gray-900">OpenAmbassadors</span>
        </Link>

        {/* Mobile: Notifications + User Avatar */}
        <div className="flex items-center gap-2">
          <NotificationBell user={user} />
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center"
          >
            {user?.picture ? (
              <img src={getImageUrl(user.picture)} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile User Menu Dropdown */}
      {userMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 z-50"
            onClick={() => setUserMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-14 right-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="font-medium text-gray-900 text-sm truncate">{user?.name || "Utilisateur"}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
              {currentPlan && (
                <Badge className="bg-primary/10 text-primary text-xs mt-2">{currentPlan}</Badge>
              )}
            </div>
            <div className="py-1">
              <button onClick={() => { navigate("/settings"); setUserMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 w-full hover:bg-gray-50 text-left">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 text-sm">Mon compte</span>
              </button>
              <button onClick={() => { navigate("/billing"); setUserMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 w-full hover:bg-gray-50 text-left">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 text-sm">Abonnement</span>
              </button>
            </div>
            <div className="border-t border-gray-100 pt-1">
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 w-full hover:bg-red-50 text-left">
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-red-600 text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`lg:hidden fixed top-14 left-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left ${
                isActive(item.path)
                  ? "bg-primary-soft text-primary font-semibold"
                  : item.highlight
                    ? "bg-gradient-to-r from-primary/10 to-orange-500/10 text-primary hover:from-primary/20 hover:to-orange-500/20"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              } ${item.soon ? "opacity-60" : ""}`}
            >
              <div className="relative">
                <item.icon className={`w-5 h-5 flex-shrink-0 ${item.highlight && !isActive(item.path) ? "text-primary" : ""}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-sm">{item.label}</span>
              {item.soon && (
                <span className="ml-auto text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">Soon</span>
              )}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-100">
            {commonMenuItems.filter(item => !item.adminOnly).map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left ${
                  isActive(item.path)
                    ? "bg-primary-soft text-primary font-semibold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
            
            {/* Admin Link - Mobile (only for admins) */}
            {isAdmin && (
              <button
                onClick={() => handleNavClick("/admin")}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left ${
                  isActive("/admin")
                    ? "bg-gray-900 text-white font-semibold"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Administration</span>
              </button>
            )}
          </div>
        </nav>

        {/* Premium CTA for creators */}
        {userType === "creator" && !isPremium && (
          <div className="p-3">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-primary" />
                <span className="font-semibold text-gray-900 text-sm">Upgrade Premium</span>
              </div>
              <p className="text-gray-600 text-xs mb-2">Boost ta visibilité</p>
              <button
                onClick={() => handleNavClick("/dashboard")}
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-xs"
              >
                19.99€/mois
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-white border-r border-gray-200 flex-col z-40">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <Link to={userType === "creator" ? "/dashboard" : "/business"} className="flex items-center gap-3">
            <img src={LOGO_URL} alt="OpenAmbassadors" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            <span className="font-heading font-bold text-lg text-gray-900">OpenAmbassadors</span>
          </Link>
        </div>

        {/* Main Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive(item.path)
                  ? "bg-primary-soft text-primary font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              } ${item.soon ? "opacity-60" : ""}`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {item.soon && (
                <span className="ml-auto text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">Soon</span>
              )}
            </Link>
          ))}

          <div className="pt-6 mt-6 border-t border-gray-100">
            {commonMenuItems.filter(item => !item.adminOnly).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive(item.path)
                    ? "bg-primary-soft text-primary font-semibold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
            
            {/* Admin Link - Only for admins */}
            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive("/admin")
                    ? "bg-gray-900 text-white font-semibold"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
              data-testid="admin-link"
            >
              <Shield className="w-5 h-5" />
              <span>Administration</span>
            </Link>
            )}
          </div>
        </nav>

        {/* Premium CTA */}
        {userType === "creator" && !isPremium && (
          <div className="p-4">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-primary" />
                <span className="font-semibold text-gray-900">Upgrade Premium</span>
              </div>
              <p className="text-gray-600 text-sm mb-3">Boost ta visibilité et accède aux missions premium</p>
              <button
                onClick={() => navigate("/dashboard", { state: { openPremium: true } })}
                className="w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm shadow-md shadow-primary/20"
              >
                19.99€/mois
              </button>
            </div>
          </div>
        )}

        {/* User Profile Block */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
              {user?.picture ? (
                <img src={getImageUrl(user.picture)} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{user?.name || "Utilisateur"}</p>
              <div className="flex items-center gap-1.5">
                {isPremium ? (
                  <Badge className="bg-gradient-to-r from-primary to-pink-500 text-white text-xs px-1.5 py-0 shadow-sm">
                    <Crown className="w-3 h-3 mr-0.5" />
                    Premium
                  </Badge>
                ) : currentPlan ? (
                  <Badge className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0">{currentPlan}</Badge>
                ) : (
                  <span className="text-gray-500 text-xs">{userType === "creator" ? "Créateur" : "Entreprise"}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all w-full"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-14 lg:pt-0 min-h-screen">
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex fixed top-0 left-72 right-0 h-14 bg-white border-b border-gray-200 items-center justify-between px-6 z-40">
          <div className="flex items-center gap-4">
            <h2 className="font-heading font-semibold text-gray-900">
              {userType === "creator" ? "Espace Créateur" : "Espace Entreprise"}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notifications Bell - Desktop */}
            <NotificationBell user={user} />
            
            {/* User Info */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || "Utilisateur"}</p>
                <p className="text-xs text-gray-500">{isPremium ? "Premium" : currentPlan || (userType === "creator" ? "Créateur" : "Entreprise")}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                {user?.picture ? (
                  <img src={getImageUrl(user.picture)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Content with padding for desktop header */}
        <div className="lg:pt-14">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;

import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, BookOpen, Users,
  Settings, HelpCircle, Crown, LogOut, Menu, X, MessageCircle, Share2
} from "lucide-react";

const LOGO_URL = "/logo-sun.png";
const API_URL = process.env.REACT_APP_BACKEND_URL;

const Sidebar = ({ userType, isPremium, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await fetch(`${API_URL}/api/messaging/conversations`, { credentials: "include" });
        if (response.ok) {
          const convs = await response.json();
          const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          setUnreadCount(total);
        }
      } catch (e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const creatorMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    // { icon: Share2, label: "Creator Card", path: "/creator-card", highlight: true }, // hidden for launch
    // { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadCount }, // hidden for launch
    // { icon: Briefcase, label: "Missions", path: "/projects" }, // hidden for launch
    { icon: BookOpen, label: "Learn", path: "/learn" },
  ];

  const businessMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/business" },
    // { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadCount }, // hidden for launch
    { icon: Users, label: "Find Creator", path: "/creators" },
    { icon: Briefcase, label: "Mes Projets", path: "/business/projects" },
    { icon: BookOpen, label: "Learn", path: "/learn" },
  ];

  const menuItems = userType === "creator" ? creatorMenuItems : businessMenuItems;

  const secondaryItems = [
    { icon: HelpCircle, label: "Support & Guides", path: "/support" },
    { icon: Settings, label: "Account Settings", path: "/settings" },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-gray-100">
        <Link 
          to={userType === "creator" ? "/dashboard" : "/business"} 
          className="flex items-center gap-3"
          onClick={() => isMobile && setMobileMenuOpen(false)}
        >
          <img src={LOGO_URL} alt="OpenAmbassadors" className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl object-cover" />
          <span className="font-heading font-bold text-lg lg:text-xl text-gray-900">OpenAmbassadors</span>
        </Link>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavClick(item.path)}
            className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all w-full text-left ${
              isActive(item.path)
                ? "bg-primary-soft text-primary font-semibold"
                : item.highlight
                  ? "text-primary bg-gradient-to-r from-primary/5 to-pink-50 hover:from-primary/10 hover:to-pink-100 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <div className="relative">
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </div>
            <span className="text-sm lg:text-base">{item.label}</span>
          </button>
        ))}

        <div className="pt-4 lg:pt-6 mt-4 lg:mt-6 border-t border-gray-100">
          {secondaryItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all w-full text-left ${
                isActive(item.path)
                  ? "bg-primary-soft text-primary font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm lg:text-base">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Premium CTA - hidden for launch */}
      {false && userType === "creator" && !isPremium && (
        <div className="p-3 lg:p-4">
          <div className="premium-card rounded-xl p-3 lg:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="font-semibold text-gray-900 text-sm lg:text-base">Upgrade Premium</span>
            </div>
            <p className="text-gray-600 text-xs lg:text-sm mb-3">
              Boost ta visibilité et accède aux missions premium
            </p>
            <button
              onClick={() => {
                navigate("/dashboard", { state: { openPremium: true } });
                setMobileMenuOpen(false);
              }}
              className="block w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white text-center rounded-lg font-medium text-sm transition-colors shadow-md shadow-primary/20"
            >
              49€/mois
            </button>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-3 lg:p-4 border-t border-gray-100">
        <button
          onClick={() => {
            onLogout();
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all w-full"
          data-testid="logout-btn"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm lg:text-base">Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <Link to={userType === "creator" ? "/dashboard" : "/business"} className="flex items-center gap-2">
          <img src={LOGO_URL} alt="OpenAmbassadors" className="w-9 h-9 rounded-xl object-cover" />
          <span className="font-heading font-bold text-lg text-gray-900">OpenAmbassadors</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          data-testid="mobile-menu-btn"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`lg:hidden fixed top-16 left-0 bottom-0 w-72 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent isMobile={true} />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex-col z-40">
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;

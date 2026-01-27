import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, BookOpen, Users,
  Settings, HelpCircle, Crown, LogOut
} from "lucide-react";

const LOGO_URL = "/logo-sun.png";

const Sidebar = ({ userType, isPremium, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const creatorMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Briefcase, label: "Missions", path: "/projects" },
    { icon: BookOpen, label: "Learn", path: "/learn" },
  ];

  const businessMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/business" },
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

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link to={userType === "creator" ? "/dashboard" : "/business"} className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Incubateur" className="w-11 h-11 rounded-xl object-cover" />
          <span className="font-heading font-bold text-xl text-gray-900">Incubateur</span>
        </Link>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive(item.path)
                ? "bg-primary-soft text-primary font-semibold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="pt-6 mt-6 border-t border-gray-100">
          {secondaryItems.map((item) => (
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
        </div>
      </nav>

      {/* Premium CTA - Only for creators who aren't premium */}
      {userType === "creator" && !isPremium && (
        <div className="p-4">
          <div className="premium-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="font-semibold text-gray-900">Upgrade Incubateur</span>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              Boost ta visibilité et accède aux missions premium
            </p>
            <button
              onClick={() => navigate("/dashboard", { state: { openPremium: true } })}
              className="block w-full py-2 px-4 bg-primary hover:bg-primary-hover text-white text-center rounded-lg font-medium text-sm transition-colors shadow-md shadow-primary/20"
            >
              49€/mois
            </button>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all w-full"
          data-testid="logout-btn"
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

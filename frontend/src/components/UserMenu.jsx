import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User, Settings, CreditCard, FileText, LogOut, ChevronDown, Crown
} from "lucide-react";
import { Badge } from "./ui/badge";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const UserMenu = ({ user, currentPlan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const menuItems = [
    { icon: User, label: "Mon compte", path: "/settings" },
    { icon: CreditCard, label: "Abonnement & facturation", path: "/billing" },
    { icon: FileText, label: "Factures", path: "/billing?tab=invoices" },
    { icon: Settings, label: "Paramètres", path: "/settings" },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors"
        data-testid="user-menu-btn"
      >
        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
          {user?.picture ? (
            <img src={getImageUrl(user.picture)} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-gray-500" />
          )}
        </div>
        <div className="hidden md:block text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">{user?.name || "Utilisateur"}</span>
            {currentPlan && (
              <Badge className="bg-primary/10 text-primary text-xs font-normal">
                {currentPlan}
              </Badge>
            )}
          </div>
          <span className="text-gray-500 text-xs">{user?.email}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-medium text-gray-900">{user?.name || "Utilisateur"}</p>
            <p className="text-gray-500 text-sm truncate">{user?.email}</p>
            {currentPlan && (
              <div className="flex items-center gap-2 mt-2">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">{currentPlan}</span>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <item.icon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 text-sm">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-red-50 transition-colors text-left"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span className="text-red-600 text-sm">Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

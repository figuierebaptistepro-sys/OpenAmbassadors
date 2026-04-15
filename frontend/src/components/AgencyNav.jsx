import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Kanban, FileText, Plus } from "lucide-react";
import { Button } from "./ui/button";

const LINKS = [
  { to: "/agency",           label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/agency/clients",   label: "Clients",        icon: Users },
  { to: "/agency/campaigns", label: "Campagnes",      icon: Kanban },
  { to: "/agency/scripts",   label: "Scripts",        icon: FileText },
];

export default function AgencyNav({ onNewCampaign }) {
  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4">
      <div className="flex items-center gap-1 overflow-x-auto">
        {LINKS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px
              ${isActive
                ? "border-[#FF2E63] text-[#FF2E63]"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"}`
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </NavLink>
        ))}
        <div className="ml-auto pl-4 py-2 flex-shrink-0">
          <NavLink to="/agency/campaign/new">
            <Button size="sm" className="h-7 text-xs bg-[#FF2E63] hover:bg-[#e0254f] text-white">
              <Plus className="w-3 h-3 mr-1" /> Nouvelle campagne
            </Button>
          </NavLink>
        </div>
      </div>
    </div>
  );
}

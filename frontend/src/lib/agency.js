// ─── Shared agency constants and utilities ───────────────────────────────────

export const CAMPAIGN_STATUSES = [
  { key: "non_commence", label: "À venir",    badge: "bg-gray-100 text-gray-400",     dot: "bg-gray-300",    kanban: { border: "border-gray-200",  head: "bg-gray-50",    text: "text-gray-400"   } },
  { key: "brief_recu",   label: "Brief reçu", badge: "bg-gray-100 text-gray-600",     dot: "bg-gray-400",    kanban: { border: "border-gray-300",  head: "bg-gray-100",   text: "text-gray-600"   } },
  { key: "casting",      label: "Casting",    badge: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",    kanban: { border: "border-blue-300",  head: "bg-blue-50",    text: "text-blue-700"   } },
  { key: "tournage",     label: "Tournage",   badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-500",   kanban: { border: "border-amber-300", head: "bg-amber-50",   text: "text-amber-700"  } },
  { key: "montage",      label: "Montage",    badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500",  kanban: { border: "border-purple-300",head: "bg-purple-50",  text: "text-purple-700" } },
  { key: "livraison",    label: "Livraison",  badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500",  kanban: { border: "border-orange-300",head: "bg-orange-50",  text: "text-orange-700" } },
  { key: "termine",      label: "Terminé",    badge: "bg-green-100 text-green-700",   dot: "bg-green-500",   kanban: { border: "border-green-300", head: "bg-green-50",   text: "text-green-700"  } },
];

// Workflow statuses only (excludes non_commence — used for stepper)
export const WORKFLOW_STATUSES = CAMPAIGN_STATUSES.filter(s => s.key !== "non_commence");

export const STATUS_MAP = Object.fromEntries(CAMPAIGN_STATUSES.map(s => [s.key, s]));

export const FORMULAS = [
  { key: "12_videos", label: "12 vidéos / mois", videos: 12 },
  { key: "20_videos", label: "20 vidéos / mois", videos: 20 },
];

export const FORMULA_MAP = Object.fromEntries(FORMULAS.map(f => [f.key, f]));

export const SCRIPT_STATUSES = {
  en_attente:              { label: "En attente",      badge: "bg-gray-100 text-gray-600",     dot: "bg-gray-400"   },
  valide:                  { label: "Validé",           badge: "bg-green-100 text-green-700",   dot: "bg-green-500"  },
  modifications_demandees: { label: "Modifs demandées", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  refuse:                  { label: "Refusé",           badge: "bg-red-100 text-red-700",       dot: "bg-red-500"    },
};

/**
 * Returns urgency info for a deadline date string ("YYYY-MM-DD").
 * Returns null if no deadline set.
 */
export function getDeadlineInfo(deadline) {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  const formatted = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (diff < 0)   return { label: `En retard ${Math.abs(diff)}j`, short: `Retard ${Math.abs(diff)}j`, color: "bg-red-100 text-red-700",     border: "border-red-200",     text: "text-red-600"    };
  if (diff === 0) return { label: "Deadline aujourd'hui !",        short: "Aujourd'hui",               color: "bg-red-100 text-red-700",     border: "border-red-200",     text: "text-red-600"    };
  if (diff <= 3)  return { label: `Deadline dans ${diff}j`,        short: `Dans ${diff}j`,             color: "bg-orange-100 text-orange-700",border: "border-orange-200",  text: "text-orange-600" };
  if (diff <= 7)  return { label: `Deadline dans ${diff}j`,        short: `Dans ${diff}j`,             color: "bg-yellow-100 text-yellow-700",border: "border-yellow-200",  text: "text-yellow-600" };
  return { label: `Deadline : ${formatted}`, short: formatted, color: "bg-gray-100 text-gray-500", border: "border-gray-200", text: "text-gray-400" };
}

/**
 * Groups campaigns by package_id. Singles become a group of 1.
 * Returns array of arrays sorted by most recently updated.
 */
export function groupByPackage(campaigns) {
  const pkgs = {};
  const singles = [];
  campaigns.forEach(c => {
    if (c.package_id) {
      if (!pkgs[c.package_id]) pkgs[c.package_id] = [];
      pkgs[c.package_id].push(c);
    } else {
      singles.push([c]);
    }
  });
  return [
    ...Object.values(pkgs).map(g => g.sort((a, b) => a.order - b.order)),
    ...singles,
  ].sort((a, b) => new Date(b[0].updated_at) - new Date(a[0].updated_at));
}

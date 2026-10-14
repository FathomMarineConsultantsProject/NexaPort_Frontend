import {
  BadgeCheck,
  ClipboardCheck,
  ContactRound,
  Factory,
  Flag,
  PackageOpen,
  Ship,
  Wrench,
  Search,
  Users,
  Building2,
} from "lucide-react";

export const ADMIN_DIRECTORY_GROUPS = [
  {
    label: "Surveyors",
    items: [
      { label: "All Surveyors", path: "/surveyors", icon: Search },
      { label: "Marine Surveyors", path: "/surveyors?category=Marine%20Surveyors", icon: Ship },
      { label: "Maritime Consultants", path: "/surveyors?category=Maritime%20Consultants", icon: Users },
      { label: "Flag State Inspectors", path: "/surveyors?category=Flag%20State%20Inspectors", icon: Flag },
      { label: "Vessel Inspectors", path: "/surveyors?category=Vessel%20Inspectors", icon: ClipboardCheck },
      { label: "Accredited Inspectors", path: "/surveyors?category=Accredited%20Inspectors", icon: BadgeCheck },
      { label: "Appointed Surveyors", path: "/surveyors?category=Appointed%20Surveyors", icon: ClipboardCheck },
    ],
  },
  {
    label: "Industry Network",
    items: [
      { label: "Owners & Managers", singular: "Company", type: "owners_managers", path: "/owners-managers", icon: Building2, description: "Ship owners and managers in the maritime company directory." },
      { label: "Vessels", path: "/vessels?view=directory", icon: Ship },
      {
        label: "Service Providers",
        singular: "Service Provider",
        type: "service_provider",
        path: "/service-providers",
        icon: Wrench,
        description: "Organizations providing technical, operational, inspection, repair and specialist support to vessels and ports.",
      },
      {
        label: "Ship Agents",
        singular: "Ship Agent",
        type: "ship_agent",
        path: "/ship-agents",
        icon: ContactRound,
        description: "Port agents coordinating vessel calls, documentation, clearances and local marine services.",
      },
      {
        label: "Suppliers",
        singular: "Supplier",
        type: "supplier",
        path: "/suppliers",
        icon: PackageOpen,
        description: "Marine suppliers and chandlers providing provisions, equipment, spare parts and vessel stores.",
      },
      {
        label: "Shipyards",
        singular: "Shipyard",
        type: "shipyard",
        path: "/shipyards",
        icon: Factory,
        description: "Shipbuilding, dry-docking, repair, conversion and maintenance facilities.",
      },
      {
        label: "Tug Boats",
        singular: "Tug Boat",
        type: "tug_boat",
        path: "/tug-boats",
        icon: Ship,
        description: "Towage operators and tug fleets supporting harbour, terminal and offshore operations.",
      },
    ],
  },
];

export const ADMIN_DIRECTORIES = ADMIN_DIRECTORY_GROUPS.flatMap((group) => group.items);
export const NEW_ADMIN_DIRECTORIES = ADMIN_DIRECTORY_GROUPS[1].items.filter((item) => item.type);

// Existing directories stay Admin-only; Consultants keeps its former non-Client visibility.
export function getVisibleDirectoryGroups(roleId) {
  const role = Number(roleId);
  const consultant = { label: "Consultants", path: "/experts", icon: Users, excludedRoles: [3] };
  const groups = ADMIN_DIRECTORY_GROUPS.map((group) => ({
    ...group,
    items: [
      ...(group.label === "Surveyors" ? [consultant] : []),
      ...group.items.map((item) => ({ ...item, roles: [1] })),
    ],
  }));
  return groups.map((group) => ({ ...group, items: group.items.filter((item) => (!item.roles || item.roles.includes(role)) && !item.excludedRoles?.includes(role)) })).filter((group) => group.items.length);
}

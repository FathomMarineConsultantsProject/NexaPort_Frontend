import {
  BadgeCheck,
  ClipboardCheck,
  ContactRound,
  Factory,
  Flag,
  PackageOpen,
  Ship,
  Wrench,
} from "lucide-react";

export const ADMIN_DIRECTORY_GROUPS = [
  {
    label: "Compliance & Inspection",
    items: [
      { label: "Flag Inspectors", path: "/flag", icon: Flag },
      { label: "Accredited Inspectors", path: "/accredited-inspectors", icon: BadgeCheck },
      { label: "Appointed Surveyors", path: "/appointed-surveyors", icon: ClipboardCheck },
    ],
  },
  {
    label: "Industry Network",
    items: [
      {
        label: "Service Providers",
        path: "/service-providers",
        icon: Wrench,
        description: "Organizations providing technical, operational, inspection, repair and specialist support to vessels and ports.",
      },
      {
        label: "Ship Agents",
        path: "/ship-agents",
        icon: ContactRound,
        description: "Port agents coordinating vessel calls, documentation, clearances and local marine services.",
      },
      {
        label: "Suppliers",
        path: "/suppliers",
        icon: PackageOpen,
        description: "Marine suppliers and chandlers providing provisions, equipment, spare parts and vessel stores.",
      },
      {
        label: "Shipyards",
        path: "/shipyards",
        icon: Factory,
        description: "Shipbuilding, dry-docking, repair, conversion and maintenance facilities.",
      },
      {
        label: "Tug Boats",
        path: "/tug-boats",
        icon: Ship,
        description: "Towage operators and tug fleets supporting harbour, terminal and offshore operations.",
      },
    ],
  },
];

export const ADMIN_DIRECTORIES = ADMIN_DIRECTORY_GROUPS.flatMap((group) => group.items);
export const NEW_ADMIN_DIRECTORIES = ADMIN_DIRECTORY_GROUPS[1].items;

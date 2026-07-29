import { Anchor, Factory, PackageOpen, Ship, Wrench } from "lucide-react";

export const MARITIME_DIRECTORIES = [
  {
    type: "service_provider",
    label: "Service Providers",
    singular: "Service Provider",
    path: "/service-providers",
    icon: Wrench,
    description: "Verified technical, operational, inspection and repair support for vessels and port calls.",
    serviceLabel: "Services",
    sections: ["overview", "services", "ports", "branches", "offices", "certifications", "class_approvals", "memberships", "products", "faqs"],
  },
  {
    type: "ship_agent",
    label: "Ship Agents",
    singular: "Ship Agent",
    path: "/ship-agents",
    icon: Anchor,
    description: "Verified port agents coordinating vessel calls, clearances and local marine services.",
    serviceLabel: "Agency Services",
    sections: ["overview", "services", "ports", "branches", "offices", "certifications", "class_approvals", "memberships", "products", "faqs"],
  },
  {
    type: "supplier",
    label: "Suppliers",
    singular: "Supplier",
    path: "/suppliers",
    icon: PackageOpen,
    description: "Verified marine suppliers providing provisions, equipment, spares and vessel stores.",
    serviceLabel: "Services",
    sections: ["overview", "products", "services", "ports", "branches", "offices", "certifications", "class_approvals", "memberships", "faqs"],
  },
  {
    type: "shipyard",
    label: "Shipyards",
    singular: "Shipyard",
    path: "/shipyards",
    icon: Factory,
    description: "Verified shipbuilding, dry-docking, repair, conversion and maintenance facilities.",
    serviceLabel: "Capabilities",
    sections: ["overview", "dimensions", "contact"],
  },
  {
    type: "tug_boat",
    label: "Tug Boats",
    singular: "Tug Boat",
    path: "/tug-boats",
    icon: Ship,
    description: "Verified towage operators supporting harbour, terminal and offshore operations.",
    serviceLabel: "Towage Capabilities",
    sections: ["overview", "contact", "services", "ports", "fleet", "branches", "offices", "certifications", "memberships", "faqs"],
  },
];

export const DIRECTORY_BY_TYPE = Object.fromEntries(
  MARITIME_DIRECTORIES.map((directory) => [directory.type, directory]),
);

export const DIRECTORY_TYPE_LABELS = Object.fromEntries(
  MARITIME_DIRECTORIES.map(({ type, singular }) => [type, singular]),
);

// Angielskie tytuły i opisy stron używane w metadanych SEO

import type { LocaleMetadataBundle } from "../types";

export const metadataEn: LocaleMetadataBundle = {
  root: {
    titleDefault: "Realty Nest — brokerage operations",
    titleTemplate: "%s · Realty Nest",
    description:
      "One workspace for leads, listings, and handoffs across your brokerage.",
    siteName: "Realty Nest",
  },
  dashboard: {
    title: "Dashboard",
    description:
      "Realty Nest brokerage workspace — pipeline, contacts, and settings.",
  },
  pages: {
    product: {
      title: "Product",
      description:
        "Queues, listing records, and handoffs—how Realty Nest maps to a brokerage week.",
    },
    trust: {
      title: "Trust & security",
      description:
        "Broker-managed access, exports, and audit-friendly handoffs—demo copy for IT conversations.",
    },
    stories: {
      title: "Stories",
      description:
        "Rollout scenarios and use cases—composite stories for discovery workshops.",
    },
  },
};

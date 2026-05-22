export type MembershipTier = "free" | "member";

export type MembershipStatus = {
  tier: MembershipTier;
  isMember: boolean;
  planLabel: string;
  source: "default" | "preview-env";
};

export type PremiumFeature = {
  id:
    | "csv-export"
    | "rate-watchlist"
    | "meeting-planner"
    | "strength-ranking"
    | "business-brief";
  title: string;
  shortTitle: string;
  description: string;
};

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: "csv-export",
    title: "Export comparison CSV",
    shortTitle: "CSV export",
    description:
      "Download the visible comparison table for client work, travel planning, or reports."
  },
  {
    id: "rate-watchlist",
    title: "Rate watchlist alerts",
    shortTitle: "Alerts",
    description:
      "Save currencies and prepare target-rate notifications for your preferred base currency."
  },
  {
    id: "meeting-planner",
    title: "Best meeting windows",
    shortTitle: "Planner",
    description:
      "Compare overlapping business hours between your base timezone and selected countries."
  },
  {
    id: "strength-ranking",
    title: "Currency strength ranking",
    shortTitle: "Ranking",
    description:
      "Sort premium views by the strongest and most affordable currencies against your base."
  },
  {
    id: "business-brief",
    title: "Business travel brief",
    shortTitle: "Brief",
    description:
      "Bundle language, currency, timezone, and regional notes into a compact country briefing."
  }
];

export function getMembershipStatus(): MembershipStatus {
  if (process.env.NEXT_PUBLIC_PREMIUM_PREVIEW === "true") {
    return {
      tier: "member",
      isMember: true,
      planLabel: "Member preview",
      source: "preview-env"
    };
  }

  return {
    tier: "free",
    isMember: false,
    planLabel: "Free plan",
    source: "default"
  };
}

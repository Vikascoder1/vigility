export type AgeRange = "<18" | "18-40" | ">40" | "all";
export type GenderFilter = "Male" | "Female" | "Other" | "all";

export type DashboardFilters = {
  startDate: string;
  endDate: string;
  ageRange: AgeRange;
  gender: GenderFilter;
};

export const DEFAULT_FILTERS: DashboardFilters = (() => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 90);

  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    ageRange: "all",
    gender: "all",
  };
})();

export function parseAgeRange(ageRange: AgeRange) {
  if (ageRange === "all") return null;
  if (ageRange === "<18") return { min: 0, max: 17 };
  if (ageRange === "18-40") return { min: 18, max: 40 };
  return { min: 41, max: 200 };
}



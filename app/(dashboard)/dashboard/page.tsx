"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_FILTERS, DashboardFilters, AgeRange, GenderFilter } from "@/lib/filters";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

type AnalyticsResponse = {
  bars: { featureName: string; totalClicks: number }[];
  line: { date: string; count: number }[];
  selectedFeature: string | null;
};

function readFiltersFromCookies(): DashboardFilters {
  if (typeof document === "undefined") return DEFAULT_FILTERS;
  try {
    const cookieMap = Object.fromEntries(
      document.cookie.split(";").map((c) => {
        const [k, ...rest] = c.trim().split("=");
        return [decodeURIComponent(k), decodeURIComponent(rest.join("="))];
      }),
    );
    const startDate = cookieMap["filters_startDate"] ?? DEFAULT_FILTERS.startDate;
    const endDate = cookieMap["filters_endDate"] ?? DEFAULT_FILTERS.endDate;
    const ageRange = (cookieMap["filters_ageRange"] as AgeRange | undefined) ?? DEFAULT_FILTERS.ageRange;
    const gender = (cookieMap["filters_gender"] as GenderFilter | undefined) ?? DEFAULT_FILTERS.gender;
    return { startDate, endDate, ageRange, gender };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function persistFiltersToCookies(filters: DashboardFilters) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `filters_startDate=${encodeURIComponent(filters.startDate)}; path=/; max-age=${maxAge}`;
  document.cookie = `filters_endDate=${encodeURIComponent(filters.endDate)}; path=/; max-age=${maxAge}`;
  document.cookie = `filters_ageRange=${encodeURIComponent(filters.ageRange)}; path=/; max-age=${maxAge}`;
  document.cookie = `filters_gender=${encodeURIComponent(filters.gender)}; path=/; max-age=${maxAge}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [filters, setFilters] = React.useState<DashboardFilters>(() => readFiltersFromCookies());
  const [analytics, setAnalytics] = React.useState<AnalyticsResponse | null>(null);
  const [selectedFeature, setSelectedFeature] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAnalytics = React.useCallback(
    async (nextFilters: DashboardFilters, featureName?: string | null) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          startDate: nextFilters.startDate,
          endDate: nextFilters.endDate,
          ageRange: nextFilters.ageRange,
          gender: nextFilters.gender,
        });
        if (featureName) params.set("featureName", featureName);

        const res = await fetch(`/api/analytics?${params.toString()}`);
        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const body = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) {
          setError(body.error || "Failed to load analytics.");
          return;
        }

        setAnalytics(body as AnalyticsResponse);
        setSelectedFeature(body.selectedFeature ?? null);
      } catch (err) {
        console.error(err);
        setError("Something went wrong loading analytics.");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me");
        const body = await res.json().catch(() => ({}));
        if (!body?.user) {
          router.push("/login");
          return;
        }
        fetchAnalytics(filters);
      } catch {
        router.push("/login");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = async () => {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      setError("Please choose a valid date range (start before end).");
      return;
    }

    persistFiltersToCookies(filters);
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureName: "filters_apply" }),
    }).catch(() => {});

    await fetchAnalytics(filters, selectedFeature);
  };

  const bars = analytics?.bars ?? [];
  const line = analytics?.line ?? [];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-4 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Product Analytics Dashboard</h1>
            <p className="text-sm text-slate-500">
              Explore how users interact with filters and charts. This dashboard tracks its own usage.
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={() => {
                router.push("/login");
              }}
            >
              Switch User
            </Button>
          </div>
        </header>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 grid grid-cols-1 gap-4 sm:flex sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-1 sm:w-auto">
              <label className="text-xs font-medium text-slate-600">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  const next = { ...filters, startDate: e.target.value };
                  setFilters(next);
                  void fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ featureName: "date_picker" }),
                  }).catch(() => {});
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1 sm:w-auto">
              <label className="text-xs font-medium text-slate-600">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  const next = { ...filters, endDate: e.target.value };
                  setFilters(next);
                  void fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ featureName: "date_picker" }),
                  }).catch(() => {});
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:w-40">
              <Select
                label="Age Range"
                value={filters.ageRange}
                onChange={(e) => {
                  const value = e.target.value as AgeRange;
                  const next = { ...filters, ageRange: value };
                  setFilters(next);
                  void fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ featureName: "filter_age" }),
                  }).catch(() => {});
                }}
              >
                <option value="all">All</option>
                <option value="<18">{"<18"}</option>
                <option value="18-40">18-40</option>
                <option value=">40">{">40"}</option>
              </Select>
            </div>

            <div className="sm:w-40">
              <Select
                label="Gender"
                value={filters.gender}
                onChange={(e) => {
                  const value = e.target.value as GenderFilter;
                  const next = { ...filters, gender: value };
                  setFilters(next);
                  void fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ featureName: "filter_gender" }),
                  }).catch(() => {});
                }}
              >
                <option value="all">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>

            <div className="sm:ml-auto">
              <Button className="w-full sm:w-auto" onClick={handleApply} loading={loading}>
                Apply
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white px-4 py-4 sm:px-6 sm:py-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Total Clicks</h2>
            <div className="h-72 sm:h-80">
              {bars.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No data for selected filters.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={bars}
                    margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                    barCategoryGap="20%"
                    barSize={28}
                    onClick={async (state) => {
                      const feature =
                        (state?.activePayload && state.activePayload[0]?.payload?.featureName) || null;
                      if (!feature) return;
                      setSelectedFeature(feature);
                      await fetch("/api/track", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ featureName: feature }),
                      }).catch(() => {});
                      await fetchAnalytics(filters, feature);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="featureName"
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="totalClicks"
                      fill="#0f766e"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white px-4 py-4 sm:px-6 sm:py-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-1 text-base font-semibold text-slate-800">Clicks Daily</h2>
            <p className="mb-3 text-xs text-slate-500">
              {selectedFeature
                ? `Selected feature: ${selectedFeature}`
                : "Select a bar to see its daily trend."}
            </p>
            <div className="h-72 sm:h-80">
              {line.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No time-series data for this feature.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={line} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" angle={-20} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}



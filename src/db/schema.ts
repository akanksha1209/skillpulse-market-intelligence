import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * SkillPulse persistence layer.
 *
 * Every market search is stored as an immutable "analysis" so that history,
 * re-opening and exports are all reproducible from the database alone.
 */

export const searches = pgTable(
  "searches",
  {
    id: text("id").primaryKey(),
    query: text("query").notNull(),
    canonicalQuery: text("canonical_query"),
    location: text("location"),
    /** serpapi | demo | cache */
    source: text("source").notNull().default("demo"),
    /** completed | partial | failed */
    status: text("status").notNull().default("completed"),
    isDemo: boolean("is_demo").notNull().default(false),
    signalCount: integer("signal_count").notNull().default(0),
    marketScore: real("market_score"),
    momentumScore: real("momentum_score"),
    topSkill: text("top_skill"),
    notes: jsonb("notes").$type<string[]>(),
    /** Full serialised MarketAnalysis snapshot (used for instant re-open). */
    analysis: jsonb("analysis"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("searches_created_idx").on(t.createdAt), index("searches_query_idx").on(t.query)],
);

export const signals = pgTable(
  "signals",
  {
    id: text("id").primaryKey(),
    searchId: text("search_id")
      .notNull()
      .references(() => searches.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    company: text("company"),
    industry: text("industry"),
    role: text("role"),
    location: text("location"),
    via: text("via"),
    url: text("url"),
    snippet: text("snippet"),
    publishedDaysAgo: integer("published_days_ago"),
    experienceLevel: text("experience_level"),
    salaryMin: real("salary_min"),
    salaryMax: real("salary_max"),
    employmentType: text("employment_type"),
    skills: jsonb("skills").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("signals_search_idx").on(t.searchId), index("signals_role_idx").on(t.role)],
);

export const skillMetrics = pgTable(
  "skill_metrics",
  {
    id: text("id").primaryKey(),
    searchId: text("search_id")
      .notNull()
      .references(() => searches.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category"),
    frequency: integer("frequency").notNull().default(0),
    uniqueSources: integer("unique_sources").notNull().default(0),
    roleDiversity: integer("role_diversity").notNull().default(0),
    companyDiversity: integer("company_diversity").notNull().default(0),
    recencyScore: real("recency_score"),
    growthScore: real("growth_score"),
    demandScore: real("demand_score"),
    momentumScore: real("momentum_score"),
    classification: text("classification"),
    emerging: boolean("emerging").notNull().default(false),
    recentWindow: integer("recent_window").notNull().default(0),
    priorWindow: integer("prior_window").notNull().default(0),
  },
  (t) => [index("skill_metrics_search_idx").on(t.searchId), index("skill_metrics_slug_idx").on(t.slug)],
);

export const skillEdges = pgTable(
  "skill_edges",
  {
    id: text("id").primaryKey(),
    searchId: text("search_id")
      .notNull()
      .references(() => searches.id, { onDelete: "cascade" }),
    skillA: text("skill_a").notNull(),
    skillB: text("skill_b").notNull(),
    support: integer("support").notNull().default(0),
    weight: real("weight").notNull().default(0),
    lift: real("lift").notNull().default(0),
  },
  (t) => [index("skill_edges_search_idx").on(t.searchId)],
);

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    searchId: text("search_id")
      .notNull()
      .references(() => searches.id, { onDelete: "cascade" }),
    /** llm | heuristic */
    mode: text("mode").notNull().default("heuristic"),
    model: text("model"),
    sections: jsonb("sections"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reports_search_idx").on(t.searchId)],
);

export type SearchRow = typeof searches.$inferSelect;
export type SignalRow = typeof signals.$inferSelect;
export type SkillMetricRow = typeof skillMetrics.$inferSelect;
export type SkillEdgeRow = typeof skillEdges.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;

import { extractFromParts } from "@/lib/analytics/extractor";
import {
  COMPANY_POOL,
  EXPERIENCE_LEVELS,
  LOCATION_POOL,
  ROLE_SEEDS,
  SKILL_BY_SLUG,
  SKILL_NAME_BY_SLUG,
  VIA_POOL,
  detectRole,
} from "@/lib/taxonomy";
import type { Signal } from "@/lib/types";

/**
 * Demo dataset generator.
 *
 * Produces realistic — but clearly SYNTHETIC — job-market records so the whole
 * product works with zero API keys. The generator is fully deterministic:
 * the same query always produces the same dataset (seeded PRNG), which makes
 * demos, screenshots and tests reproducible.
 *
 * Skill assignment is *not* pre-labelled: the generator writes a realistic job
 * description and the real skill extractor parses it, so the demo path
 * exercises exactly the same NLP pipeline as the SerpAPI path.
 */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Skills that are losing share in the synthetic market (older postings only). */
const COOLING = new Set(["selenium", "excel", "hadoop", "angular", "ansible", "r-language"]);

const SENIORITY = ["", "Senior ", "Lead ", "Staff ", "Junior ", "", "", "Principal ", "Associate "];

const TEAM_SUFFIX = [
  " – Platform Team",
  " – Growth",
  " – Core Product",
  " – Data Platform",
  " – AI Studio",
  " – Hybrid",
  " – Remote First",
  " – Immediate Joiner",
  " – Series B Startup",
  " – Global Capability Centre",
  "",
  "",
];

function pickWeighted<T>(rand: () => number, items: T[], weight: (item: T) => number): T {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let r = rand() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

/** Choose which roles this query should surface. */
function rolesForQuery(query: string) {
  const q = query.toLowerCase();
  const direct = detectRole(query);

  // Specific title fragments first ("machine learning engineer"), then roles
  // whose label shares two or more meaningful words with the query. Generic
  // words like "engineer" alone must not pull in every engineering role.
  const fragmentHits = ROLE_SEEDS.filter((r) => r.match.some((m) => m && m.length > 6 && q.includes(m)));
  const labelHits = ROLE_SEEDS.filter((r) => {
    const words = r.label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    return words.filter((w) => q.includes(w)).length >= 2;
  });
  const matched = fragmentHits.length ? fragmentHits : labelHits;
  const seeds = matched.length ? matched : direct !== "Other" ? ROLE_SEEDS.filter((r) => r.label === direct) : [];

  // Query mentions a technology → surface roles that require it.
  const querySkills = extractFromParts(query);
  if (querySkills.length && seeds.length < 3) {
    const bySkill = ROLE_SEEDS.filter((r) =>
      [...r.core, ...r.emerging].some(([slug]) => querySkills.includes(slug)),
    ).sort((a, b) => {
      const score = (r: typeof a) =>
        [...r.core, ...r.emerging]
          .filter(([slug]) => querySkills.includes(slug))
          .reduce((s, [, w]) => s + w, 0);
      return score(b) - score(a);
    });
    for (const r of bySkill.slice(0, 5)) if (!seeds.includes(r)) seeds.push(r);
  }

  if (!seeds.length) return ROLE_SEEDS.slice(0, 8);
  return seeds.slice(0, 6);
}

function describeSkills(rand: () => number, skills: string[], role: string): string {
  const names = skills.map((s) => SKILL_NAME_BY_SLUG[s] ?? s);
  const must = names.slice(0, Math.min(5, names.length));
  const nice = names.slice(5, Math.min(9, names.length));
  const openers = [
    `We are looking for a ${role} to own production systems for a fast scaling product team.`,
    `Join our engineering pod as a ${role} and ship work used by millions of customers.`,
    `${role} needed for a greenfield platform initiative with a modern data and cloud stack.`,
    `Hiring a ${role} to partner with product, design and business stakeholders.`,
  ];
  const closers = [
    "Strong communication and ownership mindset required.",
    "You will mentor juniors and drive engineering best practices.",
    "Exposure to agile delivery and code review culture expected.",
    "Interview loop includes a system design and a hands-on coding round.",
  ];
  const pick = (n: number) => openers[(rand() * openers.length) | 0] + (n ? "" : "");
  return [
    pick(0),
    `Must have: ${must.join(", ")}.`,
    nice.length ? `Good to have: ${nice.join(", ")}.` : "",
    closers[(rand() * closers.length) | 0],
  ]
    .filter(Boolean)
    .join(" ");
}

export interface DemoResult {
  signals: Signal[];
  notes: string[];
}

export function generateDemoSignals(
  query: string,
  location: string,
  count = 150,
  seedOverride?: number,
): DemoResult {
  const rand = mulberry32(seedOverride ?? hashString(`${query.toLowerCase().trim()}|${location.toLowerCase()}`));
  const roles = rolesForQuery(query);
  const signals: Signal[] = [];

  for (let i = 0; i < count; i++) {
    const role = pickWeighted(rand, roles, (r) => 1 + (roles.indexOf(r) === 0 ? 1.2 : 0));

    // Recency buckets are sized so that an undrifted skill looks STABLE:
    // recent window = 30 days, prior window = 60 days, therefore the prior
    // bucket carries exactly twice the mass of the recent bucket (1:2 ratio).
    const bucket = rand();
    const publishedDaysAgo =
      bucket < 0.28
        ? Math.floor(rand() * 30)
        : bucket < 0.84
          ? 31 + Math.floor(rand() * 60)
          : 91 + Math.floor(rand() * 90);

    // Sample skills from the role profile.
    //
    // `drift` is the only time-dependent factor: emerging skills appear mostly
    // in recent postings, cooling skills mostly in older ones, everything else
    // has a flat rate (so it classifies as STABLE, not falsely exploding).
    const recency = (90 - Math.min(90, publishedDaysAgo)) / 90; // 1 = today, 0 = 90d+
    const drift = (slug: string) => {
      if (SKILL_BY_SLUG[slug]?.emerging) return 0.25 + recency * 1.5;
      if (COOLING.has(slug)) return 1.6 - recency * 1.3;
      return 1;
    };

    const chosen: string[] = [];
    for (const [slug, weight] of role.core) {
      if (!SKILL_BY_SLUG[slug]) continue;
      if (rand() < Math.min(0.95, weight * 0.82 * drift(slug))) chosen.push(slug);
    }
    for (const [slug, weight] of role.emerging) {
      if (!SKILL_BY_SLUG[slug]) continue;
      const p = weight * drift(slug) * 0.8;
      if (rand() < Math.max(0.03, Math.min(0.95, p))) chosen.push(slug);
    }
    // Cross-pollination: sprinkle a couple of skills from related roles.
    if (rand() < 0.35) {
      const other = roles[(rand() * roles.length) | 0];
      const [slug] = other.core[(rand() * other.core.length) | 0] ?? [];
      if (slug && SKILL_BY_SLUG[slug]) chosen.push(slug);
    }

    const uniqueSkills = Array.from(new Set(chosen)).slice(0, 16);
    if (uniqueSkills.length < 3) continue;

    const industryBias = role.industries;
    const company = pickWeighted(rand, COMPANY_POOL, (c) =>
      industryBias.includes(c.industry) ? 4 : 1,
    );

    const seniority = SENIORITY[(rand() * SENIORITY.length) | 0];
    const title = `${seniority}${role.label}${TEAM_SUFFIX[(rand() * TEAM_SUFFIX.length) | 0]}`.trim();
    const snippet = describeSkills(rand, uniqueSkills, role.label);

    const experienceLevel = pickWeighted(rand, EXPERIENCE_LEVELS, (lvl) =>
      lvl.startsWith("Mid") ? 3 : lvl.startsWith("Senior") ? 2.4 : lvl.startsWith("Entry") ? 2 : 1,
    );

    const baseSalary =
      experienceLevel.startsWith("Internship")
        ? 3
        : experienceLevel.startsWith("Entry")
          ? 6
          : experienceLevel.startsWith("Mid")
            ? 16
            : experienceLevel.startsWith("Senior")
              ? 32
              : 52;
    const roleBoost = /AI|GenAI|Data Scientist|Architect/.test(role.label) ? 1.35 : 1;
    const jitter = 0.75 + rand() * 0.7;
    const salaryMin = Math.round(baseSalary * roleBoost * jitter * 10) / 10;
    const salaryMax = Math.round(salaryMin * (1.25 + rand() * 0.4) * 10) / 10;

    // The extractor parses the generated text — identical path to live data.
    const extracted = extractFromParts(title, snippet, role.label);

    signals.push({
      id: `demo-${i}-${hashString(title + company.name + i)}`,
      title,
      company: company.name,
      industry: company.industry,
      role: role.label,
      location: location && location.toLowerCase() !== "any" ? location : LOCATION_POOL[(rand() * LOCATION_POOL.length) | 0],
      via: VIA_POOL[(rand() * VIA_POOL.length) | 0],
      url: `https://example.com/jobs/${role.slug}/${i}`,
      snippet,
      publishedDaysAgo,
      experienceLevel,
      employmentType: rand() < 0.88 ? "Full-time" : rand() < 0.5 ? "Contract" : "Internship",
      salaryMin,
      salaryMax,
      skills: extracted,
    });
  }

  return {
    signals,
    notes: [
      "DEMO MODE: signals are synthetically generated by SkillPulse (deterministic seeded generator), not scraped from the web.",
      `No SerpAPI key was used for this analysis. Set SERPAPI_API_KEY to collect live signals.`,
      "Publication dates are synthetic too — momentum is therefore computed on a simulated 90-day window.",
    ],
  };
}

/** A ready-made showcase analysis used by the landing page "Try Demo" button. */
export const DEMO_QUERIES = [
  "AI Engineer",
  "Data Scientist",
  "Generative AI",
  "Cybersecurity",
  "Python Developer",
  "Data Analyst",
  "Cloud Computing",
  "Machine Learning Engineer India",
];

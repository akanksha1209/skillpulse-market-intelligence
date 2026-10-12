import { normalizeSkillInput } from "@/lib/analytics/extractor";
import { ROLE_SEEDS, SKILL_BY_SLUG, SKILL_NAME_BY_SLUG } from "@/lib/taxonomy";
import type { MarketAnalysis, SkillGapResult } from "@/lib/types";

/**
 * Skill-gap analysis: compares a user's declared skills with what the market
 * is actually asking for a target role.
 *
 * Preference order for the "market requirement" set:
 *   1. OBSERVED — the role as it appears in the collected signals for this
 *      analysis (real evidence).
 *   2. PRIOR — the curated role profile in the taxonomy (used when the role
 *      has too few observed signals). This is always disclosed in the
 *      `explanation` array so the UI can label the basis of the score.
 */

export interface RequiredSkill {
  slug: string;
  name: string;
  weight: number;
  demandScore: number;
}

function fuzzyRole(role: string, analysis: MarketAnalysis | null) {
  if (!analysis) return null;
  const target = role.trim().toLowerCase();
  const exact = analysis.roles.find((r) => r.role.toLowerCase() === target);
  if (exact) return exact;
  const partial = analysis.roles.find(
    (r) => r.role.toLowerCase().includes(target) || target.includes(r.role.toLowerCase()),
  );
  return partial ?? null;
}

export function requiredSkillsForRole(role: string, analysis: MarketAnalysis | null): {
  skills: RequiredSkill[];
  basis: "observed" | "taxonomy";
} {
  const observed = fuzzyRole(role, analysis);
  if (observed && observed.topSkills.length >= 6) {
    const max = Math.max(...observed.topSkills.map((s) => s.demandScore), 1);
    return {
      basis: "observed",
      skills: observed.topSkills.map((s) => ({
        slug: s.slug,
        name: s.name,
        weight: Math.round((s.demandScore / max) * 100) / 100,
        demandScore: s.demandScore,
      })),
    };
  }

  const profile =
    ROLE_SEEDS.find((r) => r.label.toLowerCase() === role.trim().toLowerCase()) ??
    ROLE_SEEDS.find((r) => r.match.some((m) => role.toLowerCase().includes(m))) ??
    ROLE_SEEDS.find((r) => r.label.toLowerCase().includes(role.trim().toLowerCase()));

  if (!profile) return { basis: "taxonomy", skills: [] };

  const blended: RequiredSkill[] = [];
  for (const [slug, weight] of profile.core) {
    if (!SKILL_BY_SLUG[slug]) continue;
    const obs = observed?.topSkills.find((s) => s.slug === slug);
    blended.push({
      slug,
      name: SKILL_NAME_BY_SLUG[slug],
      weight,
      demandScore: obs?.demandScore ?? Math.round(weight * 70),
    });
  }
  for (const [slug, weight] of profile.emerging) {
    if (!SKILL_BY_SLUG[slug] || blended.some((b) => b.slug === slug)) continue;
    blended.push({
      slug,
      name: SKILL_NAME_BY_SLUG[slug],
      weight: Math.round(weight * 0.75 * 100) / 100,
      demandScore: Math.round(weight * 60),
    });
  }
  blended.sort((a, b) => b.weight - a.weight);
  return { basis: "taxonomy", skills: blended.slice(0, 18) };
}

export function analyzeSkillGap(
  rawUserSkills: string[],
  role: string,
  analysis: MarketAnalysis | null,
): SkillGapResult {
  const userSlugs = new Set<string>();
  const unresolved: string[] = [];
  for (const raw of rawUserSkills) {
    const def = normalizeSkillInput(raw);
    if (def) userSlugs.add(def.slug);
    else if (raw.trim()) unresolved.push(raw.trim());
  }

  const { skills: required, basis } = requiredSkillsForRole(role, analysis);

  if (!required.length) {
    return {
      role,
      readiness: 0,
      matched: [],
      missing: [],
      extras: Array.from(userSlugs).map((slug) => ({ slug, name: SKILL_NAME_BY_SLUG[slug] ?? slug })),
      requiredSkills: [],
      earnedScore: 0,
      totalScore: 0,
      explanation: [
        `No market requirement profile could be resolved for "${role}".`,
        unresolved.length ? `Could not map to the taxonomy: ${unresolved.join(", ")}.` : "",
        "Pick one of the roles shown on the Roles page, or run a market search first so observed data is available.",
      ].filter(Boolean),
    };
  }

  const matched: SkillGapResult["matched"] = [];
  const missing: SkillGapResult["missing"] = [];
  let earned = 0;
  let total = 0;

  for (const req of required) {
    total += req.weight;
    if (userSlugs.has(req.slug)) {
      earned += req.weight;
      matched.push({ slug: req.slug, name: req.name, demandScore: req.demandScore, weight: req.weight });
    } else {
      missing.push({
        slug: req.slug,
        name: req.name,
        demandScore: req.demandScore,
        weight: req.weight,
        difficulty: SKILL_BY_SLUG[req.slug]?.difficulty ?? 3,
      });
    }
  }

  missing.sort((a, b) => b.weight * b.demandScore - a.weight * a.demandScore || a.difficulty - b.difficulty);
  matched.sort((a, b) => b.demandScore - a.demandScore);

  const extras = Array.from(userSlugs)
    .filter((slug) => !required.some((r) => r.slug === slug))
    .map((slug) => ({ slug, name: SKILL_NAME_BY_SLUG[slug] ?? slug }));

  const readiness = total > 0 ? Math.round((earned / total) * 1000) / 10 : 0;

  const basisNote =
    basis === "observed"
      ? `observed market data for "${role}" from the current analysis (${analysis?.overview.totalSignals ?? 0} signals).`
      : `curated SkillPulse role profile for "${role}" (the current analysis had too few signals for this role).`;

  const explanation = [
    `Requirement basis: ${basisNote}`,
    `Market Readiness = (sum of demand weights you already cover) ÷ (sum of all required demand weights) × 100.`,
    `Covered weight: ${Math.round(earned * 100) / 100} of ${Math.round(total * 100) / 100} → ${readiness}%.`,
    `Matched ${matched.length} of ${required.length} required skills; ${missing.length} gaps remain.`,
    `Weights come from the skill demand score, so a missing high-demand skill costs more readiness than a niche one.`,
  ];
  if (extras.length) {
    explanation.push(
      `You also list ${extras.length} skill(s) the market does not currently require for ${role} (${extras
        .slice(0, 4)
        .map((e) => e.name)
        .join(", ")}${extras.length > 4 ? "…" : ""}) — these are transferable, not wasted.`,
    );
  }
  if (unresolved.length) {
    explanation.push(`Could not map to the skill taxonomy: ${unresolved.join(", ")}.`);
  }

  return { role, readiness, matched, missing, extras, requiredSkills: required, explanation, earnedScore: Math.round(earned * 100) / 100, totalScore: Math.round(total * 100) / 100 };
}

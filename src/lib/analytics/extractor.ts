import { SKILL_BY_SLUG, SKILLS, type SkillDef } from "@/lib/taxonomy";

/**
 * Deterministic skill extraction & normalisation.
 *
 * The extractor is a curated alias matcher (longest-alias-first, boundary
 * aware) so that scores are reproducible and explainable. When an LLM key is
 * available it may *suggest* additional skills, but the canonical scoring path
 * always runs through this module.
 */

interface AliasRule {
  slug: string;
  alias: string;
  regex: RegExp;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRules(): AliasRule[] {
  const rules: AliasRule[] = [];
  for (const skill of SKILLS) {
    const aliases = Array.from(new Set([skill.name, ...skill.aliases]))
      .map((a) => a.toLowerCase().trim())
      .filter((a) => a.length >= 2);
    for (const alias of aliases) {
      rules.push({
        slug: skill.slug,
        alias,
        regex: new RegExp(`(?<![a-z0-9])${escapeRegExp(alias)}(?![a-z0-9])`, "i"),
      });
    }
  }
  // Longest aliases first so "machine learning engineer" beats "ml".
  rules.sort((a, b) => b.alias.length - a.alias.length);
  return rules;
}

const RULES = buildRules();

export interface SkillHit {
  slug: string;
  alias: string;
}

/** Extract every canonical skill mentioned in a blob of text. */
export function extractSkillHits(text: string): SkillHit[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  const found = new Map<string, SkillHit>();
  for (const rule of RULES) {
    if (found.has(rule.slug)) continue;
    // Cheap containment pre-check keeps extraction fast on long corpora.
    if (!haystack.includes(rule.alias)) continue;
    if (rule.regex.test(haystack)) {
      found.set(rule.slug, { slug: rule.slug, alias: rule.alias });
    }
  }
  return Array.from(found.values());
}

/** Extract canonical slugs only. */
export function extractSkills(text: string): string[] {
  return extractSkillHits(text).map((h) => h.slug);
}

/** Extract from several fields at once (title + description + company…). */
export function extractFromParts(...parts: (string | null | undefined)[]): string[] {
  return extractSkills(parts.filter(Boolean).join(" \n "));
}

/**
 * Normalise a user-typed skill name (skill-gap analyzer) to a canonical slug.
 * Falls back to fuzzy token matching, then to null.
 */
export function normalizeSkillInput(input: string): SkillDef | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  if (SKILL_BY_SLUG[raw]) return SKILL_BY_SLUG[raw];

  const direct = extractSkillHits(raw);
  if (direct.length === 1) return SKILL_BY_SLUG[direct[0].slug] ?? null;
  if (direct.length > 1) {
    // Prefer the longest alias match (most specific).
    direct.sort((a, b) => b.alias.length - a.alias.length);
    return SKILL_BY_SLUG[direct[0].slug] ?? null;
  }

  const compact = raw.replace(/[^a-z0-9]/g, "");
  for (const skill of SKILLS) {
    for (const alias of [skill.name, ...skill.aliases]) {
      if (alias.toLowerCase().replace(/[^a-z0-9]/g, "") === compact) return skill;
    }
  }

  // Levenshtein-lite: token overlap on names.
  const tokens = raw.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  let best: { skill: SkillDef; score: number } | null = null;
  for (const skill of SKILLS) {
    const nameTokens = skill.name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    const shared = tokens.filter((t) => nameTokens.some((n) => n.startsWith(t) || t.startsWith(n)));
    const score = shared.length / Math.max(1, tokens.length);
    if (score >= 0.6 && (!best || score > best.score)) best = { skill, score };
  }
  return best ? best.skill : null;
}

/** All aliases for a skill – used by the UI to show normalisation evidence. */
export function aliasesFor(slug: string): string[] {
  const skill = SKILL_BY_SLUG[slug];
  if (!skill) return [];
  return Array.from(new Set([skill.name, ...skill.aliases]));
}

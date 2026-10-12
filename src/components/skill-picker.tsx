"use client";

import { useMemo, useState } from "react";
import { normalizeSkillInput } from "@/lib/analytics/extractor";
import { SKILL_NAME_BY_SLUG, SKILLS } from "@/lib/taxonomy";
import { Badge } from "@/components/ui";

export const SKILLS_STORAGE_KEY = "skillpulse.userSkills";
export const ROLE_STORAGE_KEY = "skillpulse.targetRole";

export function readStoredSkills(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SKILLS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredSkills(slugs: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    /* ignore quota errors */
  }
}

export function readStoredRole(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(ROLE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredRole(role: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  } catch {
    /* ignore */
  }
}

/**
 * Skill input with taxonomy-aware autocomplete. Accepts free text
 * ("python 3", "ML", "gen ai") and normalises it to a canonical skill.
 */
export function SkillPicker({
  value,
  onChange,
  suggestions = [],
  suggestionLabel = "Frequently demanded — click to add",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: { slug: string; name: string; demandScore?: number }[];
  suggestionLabel?: string;
}) {
  const [text, setText] = useState("");
  const [unresolved, setUnresolved] = useState<string[]>([]);

  const matches = useMemo(() => {
    const t = text.trim().toLowerCase();
    if (t.length < 2) return [];
    return SKILLS.filter(
      (s) =>
        !value.includes(s.slug) &&
        (s.name.toLowerCase().includes(t) || s.slug.includes(t) || s.aliases.some((a) => a.includes(t))),
    ).slice(0, 7);
  }, [text, value]);

  function add(raw: string) {
    const def = normalizeSkillInput(raw);
    if (!def) {
      setUnresolved((u) => (u.includes(raw.trim()) ? u : [...u, raw.trim()]));
      return;
    }
    setUnresolved([]);
    if (!value.includes(def.slug)) onChange([...value, def.slug]);
    setText("");
  }

  return (
    <div>
      <div className="relative">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (text.trim()) add(text);
            }
            if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          placeholder="Type a skill (e.g. python 3, ML, gen ai, k8s) and press Enter"
          className="sp-input"
          aria-label="Add your skills"
        />
        {matches.length ? (
          <div className="sp-card absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-auto p-1.5 sp-rise">
            {matches.map((s) => (
              <button
                key={s.slug}
                onClick={() => add(s.name)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-white/6"
              >
                <span className="text-[12.5px] text-white">{s.name}</span>
                <span className="sp-num text-[10.5px] text-mist-500">{s.category}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {value.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {value.map((slug) => (
            <span key={slug} className="sp-chip !border-pulse-400/30 !bg-pulse-400/10 !text-pulse-300">
              {SKILL_NAME_BY_SLUG[slug] ?? slug}
              <button
                onClick={() => onChange(value.filter((s) => s !== slug))}
                className="ml-0.5 text-mist-400 transition-colors hover:text-coral-signal"
                aria-label={`Remove ${SKILL_NAME_BY_SLUG[slug] ?? slug}`}
              >
                ✕
              </button>
            </span>
          ))}
          <button onClick={() => onChange([])} className="sp-chip hover:text-white">Clear all</button>
        </div>
      ) : null}

      {unresolved.length ? (
        <p className="mt-2 text-[11.5px] text-amber-signal">
          Not in the taxonomy: {unresolved.join(", ")} — try a different spelling (the matcher handles common aliases
          like “ML”, “k8s”, “GenAI”).
        </p>
      ) : null}

      {suggestions.length ? (
        <div className="mt-3">
          <div className="sp-label mb-1.5 text-[9.5px]">{suggestionLabel}</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 18).map((s) => (
              <button
                key={s.slug}
                onClick={() => !value.includes(s.slug) && onChange([...value, s.slug])}
                disabled={value.includes(s.slug)}
                className={`sp-chip transition-colors ${
                  value.includes(s.slug) ? "!border-pulse-400/40 !bg-pulse-400/12 !text-pulse-300" : "hover:border-pulse-400/40 hover:text-white"
                }`}
              >
                {s.name}
                {typeof s.demandScore === "number" ? (
                  <span className="sp-num ml-1 text-[10px] opacity-70">{s.demandScore}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-2.5 text-[11px] text-mist-500">
        <Badge tone="neutral">{SKILLS.length}</Badge> skills in the taxonomy · everything you add is normalised to a
        canonical skill before scoring.
      </p>
    </div>
  );
}

import { SKILL_BY_SLUG, SKILL_NAME_BY_SLUG } from "@/lib/taxonomy";
import type { MarketAnalysis, Roadmap, RoadmapWeek, SkillGapResult } from "@/lib/types";

/**
 * 30-day learning roadmap generator.
 *
 * Prioritisation = market demand × gap weight ÷ learning cost, with a
 * dependency pass so prerequisites are always scheduled before the skill
 * that needs them. Fully deterministic — the LLM only rewrites the prose
 * when a key is available.
 */

const RESOURCE_LIBRARY: Record<string, string[]> = {
  python: ["docs.python.org/3/tutorial", "Automate the Boring Stuff (free online)"],
  sql: ["sqlbolt.com", "Mode Analytics SQL tutorial"],
  "machine-learning": ["Andrew Ng – Machine Learning Specialization (Coursera)"],
  "deep-learning": ["fast.ai Practical Deep Learning", "DeepLearning.AI Deep Learning Specialization"],
  pytorch: ["pytorch.org/tutorials", "PyTorch 60-min blitz"],
  tensorflow: ["tensorflow.org/tutorials"],
  "scikit-learn": ["scikit-learn.org/stable/tutorial"],
  llm: ["Hugging Face LLM course", "DeepLearning.AI – ChatGPT Prompt Engineering for Developers"],
  "generative-ai": ["DeepLearning.AI – Generative AI for Everyone", "Google Generative AI learning path"],
  rag: ["LangChain RAG tutorial", "Pinecone learning centre – RAG"],
  langchain: ["python.langchain.com/docs/tutorials", "DeepLearning.AI – LangChain for LLM App Development"],
  "vector-databases": ["pinecone.io/learn", "pgvector GitHub readme"],
  "prompt-engineering": ["learnprompting.org", "OpenAI prompt engineering guide"],
  "agentic-ai": ["LangGraph documentation", "DeepLearning.AI – AI Agents in LangGraph"],
  "fine-tuning": ["Hugging Face PEFT docs", "Unsloth notebooks"],
  mlops: ["mlflow.org/docs", "Google MLOps whitepaper"],
  docker: ["docs.docker.com/get-started", "Docker Curriculum"],
  kubernetes: ["kubernetes.io/docs/tutorials", "KodeKloud CKA path"],
  aws: ["AWS Skill Builder – Cloud Practitioner", "AWS well-architected labs"],
  azure: ["Microsoft Learn – AZ-900"],
  gcp: ["Google Cloud Skills Boost"],
  terraform: ["developer.hashicorp.com/terraform/tutorials"],
  "ci-cd": ["GitHub Actions quickstart", "Jenkins pipeline tutorial"],
  react: ["react.dev/learn"],
  nextjs: ["nextjs.org/learn"],
  nodejs: ["nodejs.org/en/learn", "The Odin Project – Node"],
  fastapi: ["fastapi.tiangolo.com/tutorial"],
  django: ["docs.djangoproject.com – official tutorial"],
  "spring-boot": ["spring.io/guides"],
  "rest-api": ["restfulapi.net", "OpenAPI specification tutorial"],
  pandas: ["pandas.pydata.org/docs/getting_started"],
  spark: ["spark.apache.org/docs/latest/quick-start.html"],
  airflow: ["airflow.apache.org/docs – tutorial"],
  dbt: ["docs.getdbt.com/tutorial"],
  snowflake: ["Snowflake quickstarts"],
  databricks: ["Databricks Academy free courses"],
  kafka: ["kafka.apache.org/documentation – quickstart"],
  "data-modeling": ["Kimball Group design tips"],
  "data-visualization": ["matplotlib.org/tutorials", "Storytelling with Data"],
  tableau: ["Tableau free training videos"],
  "power-bi": ["Microsoft Learn – Power BI data analyst"],
  excel: ["Excel Easy", "Chandoo.org"],
  statistics: ["Khan Academy statistics", "StatQuest YouTube"],
  "a-b-testing": ["Trustworthy Online Controlled Experiments (book)"],
  cybersecurity: ["TryHackMe – Pre Security path", "CompTIA Security+ objectives"],
  "penetration-testing": ["PortSwigger Web Security Academy", "HackTheBox Academy"],
  "soc-siem": ["Splunk 7.x user fundamentals", "TryHackMe SOC Level 1"],
  "incident-response": ["SANS incident response posters", "Cybrary IR path"],
  iam: ["Okta identity 101", "Microsoft Entra docs"],
  appsec: ["OWASP Top 10", "OWASP Testing Guide"],
  "cloud-security": ["AWS Security best practices", "DevSecOps foundations (Linux Foundation)"],
  "governance-risk": ["NIST CSF 2.0", "ISO 27001 overview (advisera)"],
  linux: ["Linux Journey", "OverTheWire Bandit"],
  git: ["git-scm.com/book", "Learn Git Branching"],
  bash: ["bash.academy", "Google shell scripting guide"],
  javascript: ["javascript.info"],
  typescript: ["typescriptlang.org/docs/handbook"],
  golang: ["go.dev/tour"],
  rust: ["rust-book (doc.rust-lang.org/book)"],
  java: ["Dev.java learn"],
  "system-design": ["System Design Primer (GitHub)", "Designing Data-Intensive Applications"],
  microservices: ["microservices.io patterns"],
  prometheus: ["prometheus.io/docs/tutorials", "Grafana fundamentals"],
  "product-management": ["Reforge blog", "Inspired – Marty Cagan"],
  agile: ["scrum.org open assessments"],
  pytest: ["docs.pytest.org"],
  selenium: ["selenium.dev/documentation"],
  playwright: ["playwright.dev/docs/intro"],
  "computer-vision": ["OpenCV tutorials", "CS231n notes"],
  nlp: ["Stanford CS224n lectures", "Hugging Face NLP course"],
  transformers: ["The Illustrated Transformer", "Hugging Face course ch.1"],
  "hugging-face": ["huggingface.co/learn"],
  "model-deployment": ["BentoML quickstart", "Triton inference server docs"],
  mlflow: ["mlflow.org/docs/latest/quickstart"],
  "feature-engineering": ["Feature Engineering for ML (Zheng & Casari)"],
  mongodb: ["MongoDB University free courses"],
  postgresql: ["postgresqltutorial.com"],
  redis: ["redis.io/docs – university"],
  elasticsearch: ["Elastic search fundamentals"],
  "ai-ethics": ["Google Responsible AI practices", "Microsoft Responsible AI standard"],
};

function resourcesFor(slug: string): string[] {
  return RESOURCE_LIBRARY[slug] ?? [`Search: "learn ${SKILL_NAME_BY_SLUG[slug] ?? slug} tutorial"`];
}

function hoursFor(difficulty: number): number {
  return [4, 6, 9, 13, 18][Math.max(0, Math.min(4, difficulty - 1))];
}

const WEEK_THEMES = [
  "Foundations & the highest-demand gap",
  "Core tooling & shipping",
  "Specialisation & the emerging edge",
  "Integrate, build & prove it",
  "Depth & scale",
  "Portfolio hardening",
  "Interview readiness",
  "Advanced specialisation",
];

const DELIVERABLES = [
  "Publish a small repo: one script + one notebook that uses the week's skills on a real dataset.",
  "Containerise the week's code and expose it through a working API endpoint.",
  "Add the emerging skill to the project — one end-to-end feature, documented in the README.",
  "Ship a demo (deployed link + 2-minute Loom) and write a 300-word technical breakdown.",
  "Refactor for scale: add tests, monitoring and a documented architecture diagram.",
  "Write a case study: problem → approach → metrics → trade-offs.",
  "Do two mock interviews on the topic and publish a Q&A cheatsheet.",
  "Contribute a fix or feature to an open-source project using the week's stack.",
];

export interface PrioritisedSkill {
  slug: string;
  name: string;
  priority: number;
  reason: string;
  hours: number;
  difficulty: number;
  prerequisites: string[];
}

export function prioritise(gap: SkillGapResult, analysis: MarketAnalysis | null, take = 10): PrioritisedSkill[] {
  const demandBySlug = new Map((analysis?.skills ?? []).map((s) => [s.slug, s]));
  const emergingSet = new Set((analysis?.emerging ?? []).map((e) => e.slug));

  const scored: PrioritisedSkill[] = [];
  for (const m of gap.missing) {
    const def = SKILL_BY_SLUG[m.slug];
    const difficulty = def?.difficulty ?? m.difficulty ?? 3;
    const observed = demandBySlug.get(m.slug);
    const demand = observed?.demandScore ?? m.demandScore;
    const momentum = observed?.momentumScore ?? 50;
    const weight = m.weight ?? 0.5;

    // priority = (market pull × role weight × momentum) / learning cost
    const pull = (demand / 100) * 0.55 + (momentum / 100) * 0.2 + weight * 0.25;
    const cost = 0.8 + difficulty * 0.09;
    const priority = Number(((pull / cost) * 100).toFixed(1));

    const reason = [
      observed
        ? `Observed demand ${demand}/100 in ${observed.frequency} collected signals`
        : `Curated demand weight ${demand}/100 for this role`,
      emergingSet.has(m.slug) || def?.emerging ? "flagged emerging" : "",
      `role weight ${Math.round(weight * 100)}%`,
      `learning cost ${difficulty}/5`,
    ]
      .filter(Boolean)
      .join(" · ");

    scored.push({
      slug: m.slug,
      name: m.name,
      priority,
      reason,
      hours: hoursFor(difficulty),
      difficulty,
      prerequisites: def?.prerequisites ?? [],
    });
  }

  scored.sort((a, b) => b.priority - a.priority);
  const selected = scored.slice(0, take);

  // Dependency pass: pull in missing prerequisites and place them earlier.
  const have = new Set([...gap.matched.map((m) => m.slug)]);
  const ordered: PrioritisedSkill[] = [];
  const seen = new Set<string>();

  const visit = (skill: PrioritisedSkill, depth = 0) => {
    if (seen.has(skill.slug) || depth > 3) return;
    seen.add(skill.slug);
    for (const pre of skill.prerequisites) {
      if (have.has(pre) || seen.has(pre) || !SKILL_BY_SLUG[pre]) continue;
      const def = SKILL_BY_SLUG[pre];
      visit(
        {
          slug: pre,
          name: def.name,
          priority: skill.priority + 4,
          reason: `Prerequisite for ${skill.name} (difficulty ${def.difficulty}/5)`,
          hours: hoursFor(def.difficulty),
          difficulty: def.difficulty,
          prerequisites: def.prerequisites,
        },
        depth + 1,
      );
    }
    ordered.push(skill);
  };

  for (const s of selected) visit(s);
  return ordered;
}

export function buildRoadmap(
  gap: SkillGapResult,
  analysis: MarketAnalysis | null,
  weeks = 4,
): Roadmap {
  const prioritised = prioritise(gap, analysis, Math.max(4, weeks * 3));

  if (!prioritised.length) {
    return {
      role: gap.role,
      totalHours: 0,
      weeks: [],
      prioritisation: [],
      notes: [
        gap.readiness >= 95
          ? `You already cover ${gap.readiness}% of the observed market requirements for ${gap.role} — the roadmap is empty because there is no material gap.`
          : "No gaps could be resolved. Add your current skills or pick a different target role.",
      ],
    };
  }

  // Distribute skills across weeks, keeping prerequisites earlier.
  const buckets: PrioritisedSkill[][] = Array.from({ length: weeks }, () => []);
  prioritised.forEach((skill, i) => {
    buckets[Math.min(weeks - 1, Math.floor((i * weeks) / prioritised.length))].push(skill);
  });

  const plan: RoadmapWeek[] = buckets.map((skills, idx) => {
    const totalHours = skills.reduce((s, x) => s + x.hours, 0);
    // Progressive narrative: foundations → tooling → specialisation → ship.
    const theme = WEEK_THEMES[Math.min(WEEK_THEMES.length - 1, weeks <= 4 ? idx : idx + 2)];
    return {
      week: idx + 1,
      theme,
      focus: skills.map((s) => ({
        slug: s.slug,
        name: s.name,
        reason: s.reason,
        hours: s.hours,
      })),
      deliverable: DELIVERABLES[Math.min(DELIVERABLES.length - 1, idx)],
      resources: skills.flatMap((s) => resourcesFor(s.slug).slice(0, 1)).slice(0, 4),
      estimatedHours: totalHours,
    };
  });

  return {
    role: gap.role,
    totalHours: plan.reduce((s, w) => s + w.estimatedHours, 0),
    weeks: plan,
    prioritisation: prioritised.map((p) => ({ slug: p.slug, name: p.name, priority: p.priority, reason: p.reason })),
    notes: [
      `Built from ${gap.missing.length} detected gaps against ${gap.role}.`,
      analysis
        ? `Demand evidence: ${analysis.overview.totalSignals} signals (${analysis.source.toUpperCase()} source) collected on ${new Date(analysis.createdAt).toLocaleString()}.`
        : "No market analysis attached — priorities come from the curated role profile.",
      "Hours assume focused study; adjust ±40% to your background.",
    ],
  };
}

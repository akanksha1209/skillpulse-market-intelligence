/**
 * SkillPulse knowledge base.
 *
 * A deterministic, hand-curated taxonomy used by the skill extractor so that
 * "Python programming", "Python 3" and "python" all collapse to one canonical
 * skill. The LLM is only used to *extend* this map, never to replace it, which
 * keeps scoring reproducible when no API key is configured.
 *
 * Seed tuple: [slug, display name, category, difficulty 1-5, emerging 0|1,
 *              aliases (| separated), prerequisites (, separated slugs)]
 */

type Seed = [string, string, string, number, 0 | 1, string, string];

const SKILL_SEEDS: Seed[] = [
  // ── Languages ────────────────────────────────────────────────────────────
  ["python", "Python", "Language", 2, 0, "python|python3|python programming|py", ""],
  ["sql", "SQL", "Language", 2, 0, "sql|t-sql|pl/sql|ansi sql|advanced sql", ""],
  ["javascript", "JavaScript", "Language", 2, 0, "javascript|js|es6|ecmascript", ""],
  ["typescript", "TypeScript", "Language", 3, 0, "typescript|ts", "javascript"],
  ["java", "Java", "Language", 3, 0, "java|core java|java 8|j2ee", ""],
  ["golang", "Go", "Language", 3, 0, "golang|go language|go (golang)", ""],
  ["rust", "Rust", "Language", 4, 1, "rust|rustlang", ""],
  ["csharp", "C#", "Language", 3, 0, "c#|csharp|.net c#", ""],
  ["cpp", "C++", "Language", 4, 0, "c++|cpp", ""],
  ["r-language", "R", "Language", 3, 0, "r language|rstats|r programming", "statistics"],
  ["kotlin", "Kotlin", "Language", 3, 0, "kotlin", "java"],
  ["swift", "Swift", "Language", 3, 0, "swift|swiftui", ""],
  ["bash", "Bash / Shell", "Language", 2, 0, "bash|shell scripting|sh|zsh", "linux"],

  // ── AI / ML core ─────────────────────────────────────────────────────────
  ["machine-learning", "Machine Learning", "AI / ML", 4, 0, "machine learning|ml|ml algorithms|supervised learning", "python,statistics"],
  ["deep-learning", "Deep Learning", "AI / ML", 4, 0, "deep learning|dl|neural networks|anns", "machine-learning"],
  ["statistics", "Statistics", "Foundations", 3, 0, "statistics|statistical analysis|statistical modelling|probability", ""],
  ["scikit-learn", "Scikit-learn", "AI / ML", 3, 0, "scikit-learn|sklearn|scikit learn", "python,machine-learning"],
  ["pytorch", "PyTorch", "AI / ML", 4, 0, "pytorch|torch", "deep-learning"],
  ["tensorflow", "TensorFlow", "AI / ML", 4, 0, "tensorflow|tf|keras", "deep-learning"],
  ["xgboost", "XGBoost / LightGBM", "AI / ML", 3, 0, "xgboost|lightgbm|gradient boosting|gbm", "machine-learning"],
  ["nlp", "Natural Language Processing", "AI / ML", 4, 0, "nlp|natural language processing|text mining|spacy|text analytics", "machine-learning"],
  ["computer-vision", "Computer Vision", "AI / ML", 4, 0, "computer vision|cv|image processing|opencv|yolo", "deep-learning"],
  ["transformers", "Transformer Architectures", "AI / ML", 5, 0, "transformers|transformer architecture|attention mechanism", "deep-learning"],
  ["llm", "Large Language Models", "AI / ML", 4, 1, "llm|llms|large language model|gpt|gpt-4|llama|claude", "nlp,transformers"],
  ["generative-ai", "Generative AI", "AI / ML", 4, 1, "generative ai|genai|gen ai|gen-ai|generative machine learning", "llm"],
  ["rag", "RAG / Retrieval-Augmented Generation", "AI / ML", 4, 1, "rag|retrieval augmented generation|retrieval-augmented generation", "llm,vector-databases"],
  ["langchain", "LangChain", "AI / ML", 3, 1, "langchain|lang chain|langgraph|llamaindex|llama index", "llm"],
  ["prompt-engineering", "Prompt Engineering", "AI / ML", 2, 1, "prompt engineering|prompt design|prompting", "llm"],
  ["agentic-ai", "Agentic AI / AI Agents", "AI / ML", 5, 1, "agentic ai|ai agents|autonomous agents|multi-agent systems|agent orchestration", "llm,langchain"],
  ["fine-tuning", "Fine-tuning / PEFT", "AI / ML", 5, 1, "fine-tuning|finetuning|lora|qlora|peft|rlhf|instruction tuning", "llm,pytorch"],
  ["vector-databases", "Vector Databases", "AI / ML", 3, 1, "vector database|vector databases|pinecone|weaviate|qdrant|chromadb|milvus|faiss|pgvector|embeddings", "llm"],
  ["hugging-face", "Hugging Face", "AI / ML", 3, 1, "hugging face|huggingface|hf hub|transformers library", "pytorch"],
  ["mlops", "MLOps", "AI / ML", 4, 1, "mlops|ml ops|machine learning operations", "machine-learning,docker"],
  ["mlflow", "MLflow", "AI / ML", 3, 0, "mlflow|ml flow|model registry|weights and biases|wandb", "machine-learning"],
  ["model-deployment", "Model Serving & Deployment", "AI / ML", 4, 0, "model deployment|model serving|triton|torchserve|bentonml|inference api", "machine-learning,docker"],
  ["feature-engineering", "Feature Engineering", "AI / ML", 3, 0, "feature engineering|feature store|feature selection", "machine-learning"],
  ["ai-ethics", "Responsible AI / AI Governance", "AI / ML", 3, 1, "responsible ai|ai ethics|ai governance|ai safety|model explainability|explainable ai|xai", "machine-learning"],
  ["multimodal-ai", "Multimodal AI", "AI / ML", 5, 1, "multimodal|multi-modal ai|vision-language models|vlm", "llm,computer-vision"],

  // ── Data engineering & analytics ─────────────────────────────────────────
  ["pandas", "Pandas", "Data", 2, 0, "pandas|numpy|dataframes", "python"],
  ["data-wrangling", "Data Wrangling / Cleaning", "Data", 2, 0, "data cleaning|data wrangling|data preprocessing|data munging|etl", "sql,pandas"],
  ["spark", "Apache Spark", "Data", 4, 0, "spark|pyspark|apache spark|databricks spark", "python"],
  ["airflow", "Apache Airflow", "Data", 4, 0, "airflow|apache airflow|dagster|prefect|orchestration", "python"],
  ["kafka", "Apache Kafka", "Data", 4, 1, "kafka|apache kafka|event streaming|pubsub|pub/sub", ""],
  ["dbt", "dbt", "Data", 3, 1, "dbt|data build tool", "sql"],
  ["data-modeling", "Data Modeling", "Data", 3, 0, "data modeling|data modelling|star schema|dimensional modeling|data warehouse", "sql"],
  ["snowflake", "Snowflake", "Data", 3, 0, "snowflake", "sql"],
  ["bigquery", "BigQuery", "Data", 3, 0, "bigquery|big query|redshift|synapse analytics", "sql"],
  ["databricks", "Databricks", "Data", 4, 1, "databricks|delta lake|lakehouse", "spark"],
  ["postgresql", "PostgreSQL", "Database", 2, 0, "postgresql|postgres|psql", "sql"],
  ["mysql", "MySQL", "Database", 2, 0, "mysql|mariadb", "sql"],
  ["mongodb", "MongoDB", "Database", 2, 0, "mongodb|mongo|nosql|document database", ""],
  ["redis", "Redis", "Database", 2, 0, "redis|caching|memcached", ""],
  ["elasticsearch", "Elasticsearch", "Database", 3, 0, "elasticsearch|opensearch|solr|search index", ""],

  // ── Visualisation / BI ───────────────────────────────────────────────────
  ["data-visualization", "Data Visualization", "Data", 2, 0, "data visualization|data visualisation|matplotlib|seaborn|plotly|charts", "pandas"],
  ["tableau", "Tableau", "BI", 2, 0, "tableau", "data-visualization"],
  ["power-bi", "Power BI", "BI", 2, 0, "power bi|powerbi|dax", "data-visualization"],
  ["looker", "Looker", "BI", 3, 0, "looker|lookml|looker studio", "sql"],
  ["excel", "Advanced Excel", "BI", 1, 0, "excel|spreadsheet|pivot tables|vba|google sheets", ""],

  // ── Web / application engineering ────────────────────────────────────────
  ["react", "React", "Frontend", 3, 0, "react|reactjs|react.js|redux", "javascript"],
  ["nextjs", "Next.js", "Frontend", 3, 1, "next.js|nextjs|remix", "react"],
  ["vue", "Vue.js", "Frontend", 3, 0, "vue|vuejs|nuxt", "javascript"],
  ["angular", "Angular", "Frontend", 3, 0, "angular|angularjs", "typescript"],
  ["tailwindcss", "Tailwind CSS", "Frontend", 2, 1, "tailwind|tailwind css|tailwindcss", "html-css"],
  ["html-css", "HTML / CSS", "Frontend", 1, 0, "html|css|html5|css3|responsive design", ""],
  ["nodejs", "Node.js", "Backend", 3, 0, "node.js|nodejs|node", "javascript"],
  ["express", "Express", "Backend", 2, 0, "express|expressjs|nestjs", "nodejs"],
  ["fastapi", "FastAPI", "Backend", 3, 1, "fastapi|fast api", "python"],
  ["django", "Django", "Backend", 3, 0, "django|flask", "python"],
  ["spring-boot", "Spring Boot", "Backend", 4, 0, "spring boot|spring|hibernate", "java"],
  ["rest-api", "REST API Design", "Backend", 2, 0, "rest api|rest|restful|api design|openapi|swagger", ""],
  ["graphql", "GraphQL", "Backend", 3, 1, "graphql|apollo", "rest-api"],
  ["microservices", "Microservices Architecture", "Backend", 4, 0, "microservices|micro-services|distributed systems|event driven architecture", "rest-api,docker"],
  ["system-design", "System Design", "Backend", 5, 0, "system design|scalability|high availability|architecture design", "microservices"],
  ["git", "Git / Version Control", "Tooling", 1, 0, "git|github|gitlab|version control|bitbucket", ""],
  ["linux", "Linux", "Tooling", 2, 0, "linux|unix|ubuntu|rhel", ""],

  // ── Cloud / DevOps ───────────────────────────────────────────────────────
  ["aws", "AWS", "Cloud", 4, 0, "aws|amazon web services|ec2|s3|lambda", "linux"],
  ["azure", "Microsoft Azure", "Cloud", 4, 0, "azure|microsoft azure", "linux"],
  ["gcp", "Google Cloud", "Cloud", 4, 0, "gcp|google cloud|google cloud platform|bigquery cloud", "linux"],
  ["docker", "Docker", "DevOps", 3, 0, "docker|containerization|containers|containerisation", "linux"],
  ["kubernetes", "Kubernetes", "DevOps", 5, 0, "kubernetes|k8s|eks|aks|gke|openshift", "docker"],
  ["terraform", "Terraform / IaC", "DevOps", 4, 1, "terraform|infrastructure as code|iac|pulumi|cloudformation", "aws"],
  ["ci-cd", "CI/CD", "DevOps", 3, 0, "ci/cd|cicd|continuous integration|continuous delivery|jenkins|github actions|gitlab ci|argo cd", "git,docker"],
  ["ansible", "Ansible / Configuration Mgmt", "DevOps", 3, 0, "ansible|chef|puppet|configuration management", "linux"],
  ["prometheus", "Prometheus & Grafana", "DevOps", 3, 0, "prometheus|grafana|monitoring|observability|datadog|new relic", "linux"],
  ["sre", "Site Reliability Engineering", "DevOps", 5, 0, "sre|site reliability|incident management|sla|slo", "kubernetes,prometheus"],

  // ── Security ─────────────────────────────────────────────────────────────
  ["cybersecurity", "Cybersecurity Fundamentals", "Security", 3, 0, "cybersecurity|cyber security|information security|infosec|network security", ""],
  ["penetration-testing", "Penetration Testing", "Security", 4, 0, "penetration testing|pentesting|ethical hacking|vapt|red team|burp suite|metasploit", "cybersecurity"],
  ["soc-siem", "SOC / SIEM Operations", "Security", 4, 1, "siem|soc|splunk|sentinel|log analysis|security monitoring|blue team", "cybersecurity"],
  ["incident-response", "Incident Response", "Security", 4, 0, "incident response|forensics|digital forensics|threat hunting|dfir", "soc-siem"],
  ["iam", "Identity & Access Management", "Security", 3, 1, "iam|identity management|access management|zero trust|okta|sso|privileged access", "cybersecurity"],
  ["appsec", "Application Security", "Security", 4, 1, "application security|appsec|owasp|secure coding|threat modeling|sast|dast", "cybersecurity"],
  ["cloud-security", "Cloud Security", "Security", 4, 1, "cloud security|devsecops|security compliance|cis benchmark", "aws,cybersecurity"],
  ["governance-risk", "GRC / Compliance", "Security", 3, 1, "grc|compliance|iso 27001|soc 2|gdpr|nist|risk management|audit", "cybersecurity"],
  ["cryptography", "Cryptography", "Security", 4, 0, "cryptography|encryption|pki|tls|certificates", ""],

  // ── Testing ──────────────────────────────────────────────────────────────
  ["pytest", "Pytest / Unit Testing", "Testing", 2, 0, "pytest|unit testing|junit|tdd|test driven development", "python"],
  ["selenium", "Selenium", "Testing", 3, 0, "selenium|webdriver", "javascript"],
  ["playwright", "Playwright / Cypress", "Testing", 3, 1, "playwright|cypress|browser automation", "javascript"],

  // ── Mobile ───────────────────────────────────────────────────────────────
  ["react-native", "React Native", "Mobile", 3, 0, "react native|react-native", "react"],
  ["flutter", "Flutter", "Mobile", 3, 1, "flutter|dart", ""],
  ["android", "Android Development", "Mobile", 3, 0, "android|jetpack compose", "kotlin"],
  ["ios", "iOS Development", "Mobile", 3, 0, "ios|iphone|xcode", "swift"],

  // ── Product / business / soft ────────────────────────────────────────────
  ["product-management", "Product Management", "Product", 4, 0, "product management|product owner|product strategy|prd", ""],
  ["agile", "Agile / Scrum", "Process", 2, 0, "agile|scrum|kanban|sprint|jira|safe", ""],
  ["stakeholder-management", "Stakeholder Management", "Soft skill", 3, 0, "stakeholder management|cross-functional|client management|business partnering", "communication"],
  ["communication", "Communication", "Soft skill", 2, 0, "communication|presentation skills|written communication|storytelling", ""],
  ["problem-solving", "Problem Solving", "Soft skill", 2, 0, "problem solving|analytical thinking|critical thinking|data driven decision", ""],
  ["a-b-testing", "Experimentation / A-B Testing", "Data", 3, 0, "a/b testing|ab testing|experimentation|hypothesis testing", "statistics"],
  ["business-analysis", "Business Analysis", "Product", 3, 0, "business analysis|business analyst|requirements gathering|brd|process mapping", ""],
  ["kpi-analysis", "KPI & Metric Analysis", "Data", 2, 0, "kpi|metrics|dashboards|reporting|performance analysis", "sql"],

  // ── Domain knowledge ─────────────────────────────────────────────────────
  ["fintech-domain", "FinTech Domain", "Domain", 3, 0, "fintech|banking|payments|financial services|trading", ""],
  ["healthcare-domain", "Healthcare Domain", "Domain", 3, 1, "healthcare|clinical|hl7|fhir|medical", ""],
  ["ecommerce-domain", "E-commerce Domain", "Domain", 3, 0, "e-commerce|ecommerce|retail|marketplace", ""],
  ["saas-domain", "SaaS / B2B Products", "Domain", 3, 0, "saas|b2b|subscription", ""],
];

export interface SkillDef {
  slug: string;
  name: string;
  category: string;
  difficulty: number;
  emerging: boolean;
  aliases: string[];
  prerequisites: string[];
}

export const SKILLS: SkillDef[] = SKILL_SEEDS.map(
  ([slug, name, category, difficulty, emerging, aliases, prereqs]) => ({
    slug,
    name,
    category,
    difficulty,
    emerging: emerging === 1,
    aliases: aliases
      .split("|")
      .map((a) => a.trim())
      .filter(Boolean),
    prerequisites: prereqs
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  }),
);

export const SKILL_BY_SLUG: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.slug, s]),
);

export const SKILL_NAME_BY_SLUG: Record<string, string> = Object.fromEntries(
  SKILLS.map((s) => [s.slug, s.name]),
);

export const CATEGORY_ORDER = [
  "AI / ML",
  "Language",
  "Data",
  "Cloud",
  "DevOps",
  "Backend",
  "Frontend",
  "Database",
  "Security",
  "BI",
  "Tooling",
  "Testing",
  "Mobile",
  "Product",
  "Process",
  "Domain",
  "Soft skill",
  "Foundations",
];

/* ────────────────────────────────────────────────────────────────────────────
 * Roles
 * ────────────────────────────────────────────────────────────────────────── */

type RoleSeed = {
  slug: string;
  label: string;
  /** regex fragments matched against a job title */
  match: string[];
  /** core skill weights (0..1) */
  core: [string, number][];
  /** emerging skill weights */
  emerging: [string, number][];
  industries: string[];
};

export const ROLE_SEEDS: RoleSeed[] = [
  {
    slug: "machine-learning-engineer",
    label: "Machine Learning Engineer",
    match: ["machine learning engineer", "ml engineer", "mle", "machine learning developer"],
    core: [
      ["python", 1], ["machine-learning", 0.95], ["deep-learning", 0.7], ["sql", 0.6],
      ["pytorch", 0.65], ["tensorflow", 0.4], ["scikit-learn", 0.55], ["docker", 0.6],
      ["aws", 0.5], ["mlops", 0.55], ["statistics", 0.5], ["git", 0.5], ["pandas", 0.6],
      ["model-deployment", 0.5], ["feature-engineering", 0.45], ["kubernetes", 0.3],
      ["mlflow", 0.35], ["spark", 0.3], ["rest-api", 0.35], ["system-design", 0.3],
    ],
    emerging: [["rag", 0.55], ["llm", 0.6], ["vector-databases", 0.4], ["fine-tuning", 0.45], ["agentic-ai", 0.35], ["transformers", 0.4]],
    industries: ["SaaS", "IT Services", "FinTech", "E-commerce", "Healthcare"],
  },
  {
    slug: "ai-engineer",
    label: "AI / GenAI Engineer",
    match: ["ai engineer", "genai engineer", "generative ai engineer", "llm engineer", "prompt engineer", "applied ai"],
    core: [
      ["python", 1], ["llm", 0.9], ["generative-ai", 0.85], ["rag", 0.8], ["langchain", 0.7],
      ["prompt-engineering", 0.7], ["vector-databases", 0.75], ["fastapi", 0.55], ["docker", 0.6],
      ["aws", 0.45], ["nlp", 0.6], ["pytorch", 0.5], ["rest-api", 0.5], ["git", 0.5],
      ["machine-learning", 0.5], ["mlops", 0.45],
    ],
    emerging: [["agentic-ai", 0.75], ["fine-tuning", 0.6], ["multimodal-ai", 0.45], ["ai-ethics", 0.35], ["langchain", 0.5]],
    industries: ["SaaS", "AI Research", "IT Services", "FinTech", "Consulting"],
  },
  {
    slug: "data-scientist",
    label: "Data Scientist",
    match: ["data scientist", "senior data scientist", "applied scientist", "decision scientist"],
    core: [
      ["python", 1], ["sql", 0.9], ["statistics", 0.85], ["machine-learning", 0.85],
      ["pandas", 0.8], ["scikit-learn", 0.7], ["data-visualization", 0.7], ["a-b-testing", 0.6],
      ["feature-engineering", 0.55], ["xgboost", 0.45], ["spark", 0.4], ["tableau", 0.35],
      ["power-bi", 0.3], ["problem-solving", 0.6], ["communication", 0.55], ["deep-learning", 0.35],
      ["nlp", 0.35], ["git", 0.45], ["aws", 0.35],
    ],
    emerging: [["llm", 0.5], ["generative-ai", 0.45], ["rag", 0.3], ["databricks", 0.35]],
    industries: ["FinTech", "E-commerce", "Healthcare", "SaaS", "Consulting"],
  },
  {
    slug: "data-analyst",
    label: "Data Analyst",
    match: ["data analyst", "business analyst", "analytics engineer", "product analyst", "reporting analyst"],
    core: [
      ["sql", 1], ["excel", 0.85], ["power-bi", 0.75], ["tableau", 0.7], ["python", 0.6],
      ["pandas", 0.55], ["data-visualization", 0.8], ["kpi-analysis", 0.75],
      ["statistics", 0.6], ["communication", 0.65], ["business-analysis", 0.6],
      ["data-wrangling", 0.6], ["looker", 0.35], ["problem-solving", 0.55],
    ],
    emerging: [["dbt", 0.4], ["generative-ai", 0.3], ["snowflake", 0.35]],
    industries: ["E-commerce", "FinTech", "IT Services", "Retail", "Consulting"],
  },
  {
    slug: "data-engineer",
    label: "Data Engineer",
    match: ["data engineer", "big data engineer", "data platform engineer", "analytics engineer"],
    core: [
      ["sql", 1], ["python", 0.95], ["spark", 0.8], ["airflow", 0.75], ["aws", 0.8],
      ["data-modeling", 0.7], ["snowflake", 0.6], ["kafka", 0.5], ["docker", 0.55],
      ["postgresql", 0.6], ["data-wrangling", 0.7], ["ci-cd", 0.5], ["gcp", 0.4],
      ["azure", 0.4], ["mongodb", 0.35], ["linux", 0.5], ["system-design", 0.45],
    ],
    emerging: [["dbt", 0.55], ["databricks", 0.6], ["terraform", 0.4], ["bigquery", 0.4]],
    industries: ["IT Services", "FinTech", "SaaS", "E-commerce", "Telecom"],
  },
  {
    slug: "backend-engineer",
    label: "Backend Engineer",
    match: ["backend engineer", "backend developer", "server side", "python developer", "java developer", "node developer", "software engineer backend"],
    core: [
      ["python", 0.7], ["java", 0.5], ["nodejs", 0.55], ["sql", 0.85], ["rest-api", 0.95],
      ["postgresql", 0.75], ["mongodb", 0.5], ["redis", 0.45], ["docker", 0.75],
      ["kubernetes", 0.5], ["aws", 0.7], ["microservices", 0.8], ["git", 0.8],
      ["ci-cd", 0.6], ["linux", 0.6], ["system-design", 0.65], ["spring-boot", 0.4],
      ["django", 0.35], ["express", 0.35], ["pytest", 0.45],
    ],
    emerging: [["fastapi", 0.5], ["golang", 0.4], ["kafka", 0.4], ["terraform", 0.35], ["graphql", 0.3]],
    industries: ["SaaS", "FinTech", "IT Services", "E-commerce"],
  },
  {
    slug: "frontend-engineer",
    label: "Frontend Engineer",
    match: ["frontend engineer", "front end developer", "ui developer", "react developer", "web developer"],
    core: [
      ["javascript", 1], ["typescript", 0.85], ["react", 0.9], ["html-css", 0.95],
      ["tailwindcss", 0.6], ["rest-api", 0.7], ["git", 0.8], ["nodejs", 0.45],
      ["playwright", 0.35], ["graphql", 0.3], ["vue", 0.25], ["angular", 0.25],
      ["communication", 0.4],
    ],
    emerging: [["nextjs", 0.65], ["tailwindcss", 0.4], ["generative-ai", 0.2]],
    industries: ["SaaS", "E-commerce", "IT Services", "Media"],
  },
  {
    slug: "fullstack-engineer",
    label: "Full Stack Engineer",
    match: ["full stack", "fullstack", "full-stack developer", "software engineer full stack"],
    core: [
      ["javascript", 0.9], ["typescript", 0.75], ["react", 0.85], ["nodejs", 0.8],
      ["sql", 0.75], ["rest-api", 0.9], ["postgresql", 0.6], ["mongodb", 0.5],
      ["docker", 0.6], ["aws", 0.6], ["git", 0.85], ["html-css", 0.8], ["ci-cd", 0.5],
      ["system-design", 0.5], ["python", 0.4],
    ],
    emerging: [["nextjs", 0.6], ["fastapi", 0.35], ["terraform", 0.3], ["generative-ai", 0.3]],
    industries: ["SaaS", "IT Services", "E-commerce", "FinTech"],
  },
  {
    slug: "devops-engineer",
    label: "DevOps / SRE Engineer",
    match: ["devops", "site reliability", "sre", "platform engineer", "cloud engineer", "infrastructure engineer"],
    core: [
      ["docker", 0.95], ["kubernetes", 0.9], ["aws", 0.9], ["linux", 0.9], ["ci-cd", 0.95],
      ["terraform", 0.8], ["python", 0.6], ["bash", 0.75], ["prometheus", 0.75],
      ["git", 0.85], ["ansible", 0.5], ["microservices", 0.6], ["sre", 0.6],
      ["azure", 0.4], ["gcp", 0.4], ["system-design", 0.55],
    ],
    emerging: [["cloud-security", 0.45], ["databricks", 0.2], ["mlops", 0.4], ["golang", 0.3]],
    industries: ["SaaS", "IT Services", "Telecom", "FinTech", "Cloud"],
  },
  {
    slug: "cybersecurity-analyst",
    label: "Cybersecurity Analyst",
    match: ["security analyst", "cybersecurity", "information security", "security engineer", "soc analyst", "penetration tester", "ciso"],
    core: [
      ["cybersecurity", 1], ["soc-siem", 0.8], ["incident-response", 0.7],
      ["penetration-testing", 0.6], ["iam", 0.6], ["appsec", 0.55],
      ["cryptography", 0.5], ["linux", 0.6], ["governance-risk", 0.6],
      ["cloud-security", 0.5], ["python", 0.4], ["bash", 0.45], ["communication", 0.5],
    ],
    emerging: [["cloud-security", 0.5], ["iam", 0.4], ["ai-ethics", 0.25], ["governance-risk", 0.3]],
    industries: ["Cybersecurity", "FinTech", "Banking", "Government", "IT Services"],
  },
  {
    slug: "product-manager",
    label: "Product Manager",
    match: ["product manager", "technical product manager", "product owner", "group product"],
    core: [
      ["product-management", 1], ["agile", 0.85], ["stakeholder-management", 0.85],
      ["communication", 0.9], ["kpi-analysis", 0.7], ["a-b-testing", 0.55],
      ["sql", 0.5], ["business-analysis", 0.6], ["problem-solving", 0.7],
      ["data-visualization", 0.4], ["rest-api", 0.25],
    ],
    emerging: [["generative-ai", 0.55], ["llm", 0.45], ["prompt-engineering", 0.4], ["ai-ethics", 0.3]],
    industries: ["SaaS", "E-commerce", "FinTech", "Consumer Tech"],
  },
  {
    slug: "software-engineer",
    label: "Software Engineer",
    match: ["software engineer", "software developer", "sde", "programmer", "engineer"],
    core: [
      ["python", 0.6], ["java", 0.5], ["javascript", 0.6], ["sql", 0.7], ["git", 0.9],
      ["rest-api", 0.75], ["docker", 0.55], ["aws", 0.55], ["system-design", 0.5],
      ["ci-cd", 0.5], ["pytest", 0.45], ["microservices", 0.5], ["problem-solving", 0.6],
      ["linux", 0.45],
    ],
    emerging: [["generative-ai", 0.4], ["typescript", 0.4], ["kubernetes", 0.3], ["terraform", 0.25]],
    industries: ["IT Services", "SaaS", "FinTech", "E-commerce", "Consulting"],
  },
  {
    slug: "qa-engineer",
    label: "QA / Test Automation Engineer",
    match: ["qa engineer", "test engineer", "quality assurance", "sdet", "automation engineer"],
    core: [
      ["selenium", 0.9], ["pytest", 0.7], ["playwright", 0.65], ["javascript", 0.6],
      ["java", 0.5], ["sql", 0.55], ["ci-cd", 0.7], ["git", 0.8], ["rest-api", 0.65],
      ["python", 0.55], ["agile", 0.6], ["linux", 0.4],
    ],
    emerging: [["playwright", 0.4], ["generative-ai", 0.2], ["docker", 0.3]],
    industries: ["IT Services", "SaaS", "FinTech"],
  },
  {
    slug: "mobile-engineer",
    label: "Mobile App Developer",
    match: ["android developer", "ios developer", "mobile developer", "mobile engineer", "flutter developer"],
    core: [
      ["kotlin", 0.7], ["swift", 0.6], ["android", 0.7], ["ios", 0.6],
      ["react-native", 0.6], ["flutter", 0.55], ["javascript", 0.5], ["rest-api", 0.7],
      ["git", 0.8], ["mongodb", 0.3], ["ci-cd", 0.45],
    ],
    emerging: [["flutter", 0.4], ["generative-ai", 0.25], ["react-native", 0.3]],
    industries: ["Consumer Tech", "FinTech", "E-commerce", "Media"],
  },
  {
    slug: "solutions-architect",
    label: "Solutions / Cloud Architect",
    match: ["solutions architect", "cloud architect", "enterprise architect", "technical architect"],
    core: [
      ["system-design", 1], ["aws", 0.85], ["azure", 0.6], ["gcp", 0.55],
      ["kubernetes", 0.6], ["microservices", 0.8], ["terraform", 0.6],
      ["stakeholder-management", 0.7], ["cloud-security", 0.5], ["docker", 0.55],
      ["ci-cd", 0.5], ["communication", 0.65], ["data-modeling", 0.4],
    ],
    emerging: [["generative-ai", 0.5], ["llm", 0.4], ["agentic-ai", 0.35], ["cloud-security", 0.35]],
    industries: ["Consulting", "Cloud", "IT Services", "Banking"],
  },
];

export const ROLES = ROLE_SEEDS.map((r) => ({ ...r }));

export const ROLE_BY_LABEL: Record<string, RoleSeed> = Object.fromEntries(
  ROLE_SEEDS.map((r) => [r.label, r]),
);

/** Detect the canonical role for a free-text job title. */
export function detectRole(title: string): string {
  const t = title.toLowerCase();
  let best: { label: string; score: number } | null = null;
  for (const role of ROLE_SEEDS) {
    for (const frag of role.match) {
      if (!frag) continue;
      if (t.includes(frag)) {
        // Longer, more specific fragments win (e.g. "machine learning engineer" > "engineer").
        const score = frag.length;
        if (!best || score > best.score) best = { label: role.label, score };
      }
    }
  }
  return best ? best.label : "Other";
}

export const ROLE_LABELS = ROLE_SEEDS.map((r) => r.label);

/* ────────────────────────────────────────────────────────────────────────────
 * Companies & industries (used to enrich demo signals and label SerpAPI hits)
 * ────────────────────────────────────────────────────────────────────────── */

export const COMPANY_POOL: { name: string; industry: string }[] = [
  { name: "TCS", industry: "IT Services" },
  { name: "Infosys", industry: "IT Services" },
  { name: "Wipro", industry: "IT Services" },
  { name: "Accenture", industry: "Consulting" },
  { name: "Cognizant", industry: "IT Services" },
  { name: "Capgemini", industry: "Consulting" },
  { name: "Deloitte", industry: "Consulting" },
  { name: "HCLTech", industry: "IT Services" },
  { name: "Tech Mahindra", industry: "IT Services" },
  { name: "Infosys BPM", industry: "IT Services" },
  { name: "Flipkart", industry: "E-commerce" },
  { name: "Amazon", industry: "E-commerce" },
  { name: "Meesho", industry: "E-commerce" },
  { name: "Myntra", industry: "E-commerce" },
  { name: "Swiggy", industry: "Consumer Tech" },
  { name: "Zomato", industry: "Consumer Tech" },
  { name: "Zerodha", industry: "FinTech" },
  { name: "Razorpay", industry: "FinTech" },
  { name: "PhonePe", industry: "FinTech" },
  { name: "Paytm", industry: "FinTech" },
  { name: "CRED", industry: "FinTech" },
  { name: "Groww", industry: "FinTech" },
  { name: "JPMorgan Chase", industry: "Banking" },
  { name: "Goldman Sachs", industry: "Banking" },
  { name: "HDFC Bank", industry: "Banking" },
  { name: "ICICI Bank", industry: "Banking" },
  { name: "Wells Fargo", industry: "Banking" },
  { name: "Freshworks", industry: "SaaS" },
  { name: "Zoho", industry: "SaaS" },
  { name: "Postman", industry: "SaaS" },
  { name: "Hasura", industry: "SaaS" },
  { name: "BrowserStack", industry: "SaaS" },
  { name: "Druva", industry: "SaaS" },
  { name: "Salesforce", industry: "SaaS" },
  { name: "Microsoft", industry: "Cloud" },
  { name: "Google", industry: "Cloud" },
  { name: "AWS India", industry: "Cloud" },
  { name: "Oracle", industry: "Cloud" },
  { name: "IBM", industry: "Cloud" },
  { name: "NVIDIA", industry: "Semiconductors" },
  { name: "Qualcomm", industry: "Semiconductors" },
  { name: "Intel", industry: "Semiconductors" },
  { name: "Practo", industry: "Healthcare" },
  { name: "Apollo Hospitals", industry: "Healthcare" },
  { name: "Philips Healthcare", industry: "Healthcare" },
  { name: "Optum", industry: "Healthcare" },
  { name: "Quick Heal", industry: "Cybersecurity" },
  { name: "Palo Alto Networks", industry: "Cybersecurity" },
  { name: "CrowdStrike", industry: "Cybersecurity" },
  { name: "Zscaler", industry: "Cybersecurity" },
  { name: "Airtel", industry: "Telecom" },
  { name: "Jio", industry: "Telecom" },
  { name: "Vodafone Idea", industry: "Telecom" },
  { name: "Bosch", industry: "Manufacturing" },
  { name: "Siemens", industry: "Manufacturing" },
  { name: "Tata Motors", industry: "Automotive" },
  { name: "Ola Electric", industry: "Automotive" },
  { name: "Walmart Global Tech", industry: "Retail" },
  { name: "Target", industry: "Retail" },
  { name: "Delhivery", industry: "Logistics" },
  { name: "Sarvam AI", industry: "AI Research" },
  { name: "Krutrim", industry: "AI Research" },
  { name: "Fractal Analytics", industry: "Consulting" },
  { name: "Mu Sigma", industry: "Consulting" },
  { name: "LatentView", industry: "Consulting" },
  { name: "Innovaccer", industry: "Healthcare" },
  { name: "Dream11", industry: "Consumer Tech" },
  { name: "Unacademy", industry: "EdTech" },
  { name: "BYJU'S", industry: "EdTech" },
  { name: "upGrad", industry: "EdTech" },
];

export const LOCATION_POOL = [
  "Bengaluru, India",
  "Hyderabad, India",
  "Pune, India",
  "Mumbai, India",
  "Chennai, India",
  "Delhi NCR, India",
  "Gurugram, India",
  "Noida, India",
  "Kochi, India",
  "Ahmedabad, India",
  "Remote – India",
  "Remote – Global",
];

export const VIA_POOL = [
  "LinkedIn",
  "Naukri",
  "Indeed",
  "Company careers page",
  "Instahy",
  "Cutshort",
  "Wellfound",
  "Google Jobs",
];

export const EXPERIENCE_LEVELS = [
  "Internship",
  "Entry level (0-2 yrs)",
  "Mid level (2-5 yrs)",
  "Senior (5-8 yrs)",
  "Lead / Staff (8+ yrs)",
];

"""
SkillPulse knowledge base (Python mirror of `src/lib/taxonomy.ts`).

Compact line-based definitions keep the catalogue reviewable in one screen:

    slug|Display Name|Category|difficulty(1-5)|emerging(0/1)|alias,alias|prereq,prereq
"""

from __future__ import annotations

from dataclasses import dataclass, field

_SKILLS_RAW = """
python|Python|Language|2|0|python3,python programming,py|
sql|SQL|Language|2|0|t-sql,pl/sql,ansi sql,advanced sql|
javascript|JavaScript|Language|2|0|js,es6,ecmascript|
typescript|TypeScript|Language|3|0|ts|javascript
java|Java|Language|3|0|core java,java 8,j2ee|
golang|Go|Language|3|0|go language|
rust|Rust|Language|4|1|rustlang|
csharp|C#|Language|3|0|csharp,.net c#|
cpp|C++|Language|4|0||
r-language|R|Language|3|0|rstats,r programming|statistics
kotlin|Kotlin|Language|3|0||java
swift|Swift|Language|3|0|swiftui|
bash|Bash / Shell|Language|2|0|shell scripting,zsh|linux
machine-learning|Machine Learning|AI / ML|4|0|ml,ml algorithms,supervised learning|python,statistics
deep-learning|Deep Learning|AI / ML|4|0|dl,neural networks,anns|machine-learning
statistics|Statistics|Foundations|3|0|statistical analysis,statistical modelling,probability|
scikit-learn|Scikit-learn|AI / ML|3|0|sklearn,scikit learn|python,machine-learning
pytorch|PyTorch|AI / ML|4|0|torch|deep-learning
tensorflow|TensorFlow|AI / ML|4|0|tf,keras|deep-learning
xgboost|XGBoost / LightGBM|AI / ML|3|0|lightgbm,gradient boosting,gbm|machine-learning
nlp|Natural Language Processing|AI / ML|4|0|natural language processing,text mining,spacy,text analytics|machine-learning
computer-vision|Computer Vision|AI / ML|4|0|cv,image processing,opencv,yolo|deep-learning
transformers|Transformer Architectures|AI / ML|5|0|transformer architecture,attention mechanism|deep-learning
llm|Large Language Models|AI / ML|4|1|llms,large language model,gpt,gpt-4,llama,claude|nlp,transformers
generative-ai|Generative AI|AI / ML|4|1|genai,gen ai,gen-ai,generative machine learning|llm
rag|RAG / Retrieval-Augmented Generation|AI / ML|4|1|retrieval augmented generation,retrieval-augmented generation|llm,vector-databases
langchain|LangChain|AI / ML|3|1|lang chain,langgraph,llamaindex,llama index|llm
prompt-engineering|Prompt Engineering|AI / ML|2|1|prompt design,prompting|llm
agentic-ai|Agentic AI / AI Agents|AI / ML|5|1|ai agents,autonomous agents,multi-agent systems,agent orchestration|llm,langchain
fine-tuning|Fine-tuning / PEFT|AI / ML|5|1|finetuning,lora,qlora,peft,rlhf,instruction tuning|llm,pytorch
vector-databases|Vector Databases|AI / ML|3|1|vector database,pinecone,weaviate,qdrant,chromadb,milvus,faiss,pgvector,embeddings|llm
hugging-face|Hugging Face|AI / ML|3|1|huggingface,hf hub,transformers library|pytorch
mlops|MLOps|AI / ML|4|1|ml ops,machine learning operations|machine-learning,docker
mlflow|MLflow|AI / ML|3|0|ml flow,model registry,weights and biases,wandb|machine-learning
model-deployment|Model Serving & Deployment|AI / ML|4|0|model deployment,model serving,triton,torchserve,inference api|machine-learning,docker
feature-engineering|Feature Engineering|AI / ML|3|0|feature store,feature selection|machine-learning
ai-ethics|Responsible AI / AI Governance|AI / ML|3|1|responsible ai,ai ethics,ai governance,ai safety,explainable ai,xai|machine-learning
multimodal-ai|Multimodal AI|AI / ML|5|1|multimodal,multi-modal ai,vision-language models,vlm|llm,computer-vision
pandas|Pandas|Data|2|0|numpy,dataframes|python
data-wrangling|Data Wrangling / Cleaning|Data|2|0|data cleaning,data preprocessing,data munging,etl|sql,pandas
spark|Apache Spark|Data|4|0|pyspark,databricks spark|python
airflow|Apache Airflow|Data|4|0|apache airflow,dagster,prefect,orchestration|python
kafka|Apache Kafka|Data|4|1|apache kafka,event streaming,pubsub,pub/sub|
dbt|dbt|Data|3|1|data build tool|sql
data-modeling|Data Modeling|Data|3|0|data modelling,star schema,dimensional modeling,data warehouse|sql
snowflake|Snowflake|Data|3|0||sql
bigquery|BigQuery|Data|3|0|big query,redshift,synapse analytics|sql
databricks|Databricks|Data|4|1|delta lake,lakehouse|spark
postgresql|PostgreSQL|Database|2|0|postgres,psql|sql
mysql|MySQL|Database|2|0|mariadb|sql
mongodb|MongoDB|Database|2|0|mongo,nosql,document database|
redis|Redis|Database|2|0|caching,memcached|
elasticsearch|Elasticsearch|Database|3|0|opensearch,solr,search index|
data-visualization|Data Visualization|Data|2|0|data visualisation,matplotlib,seaborn,plotly,charts|pandas
tableau|Tableau|BI|2|0||data-visualization
power-bi|Power BI|BI|2|0|powerbi,dax|data-visualization
looker|Looker|BI|3|0|lookml,looker studio|sql
excel|Advanced Excel|BI|1|0|spreadsheet,pivot tables,vba,google sheets|
react|React|Frontend|3|0|reactjs,react.js,redux|javascript
nextjs|Next.js|Frontend|3|1|remix|react
vue|Vue.js|Frontend|3|0|vuejs,nuxt|javascript
angular|Angular|Frontend|3|0|angularjs|typescript
tailwindcss|Tailwind CSS|Frontend|2|1|tailwind,tailwind css|html-css
html-css|HTML / CSS|Frontend|1|0|html,css,html5,css3,responsive design|
nodejs|Node.js|Backend|3|0|node|javascript
express|Express|Backend|2|0|expressjs,nestjs|nodejs
fastapi|FastAPI|Backend|3|1|fast api|python
django|Django|Backend|3|0|flask|python
spring-boot|Spring Boot|Backend|4|0|spring,hibernate|java
rest-api|REST API Design|Backend|2|0|rest,restful,api design,openapi,swagger|
graphql|GraphQL|Backend|3|1|apollo|rest-api
microservices|Microservices Architecture|Backend|4|0|micro-services,distributed systems,event driven architecture|rest-api,docker
system-design|System Design|Backend|5|0|scalability,high availability,architecture design|microservices
git|Git / Version Control|Tooling|1|0|github,gitlab,version control,bitbucket|
linux|Linux|Tooling|2|0|unix,ubuntu,rhel|
aws|AWS|Cloud|4|0|amazon web services,ec2,s3,lambda|linux
azure|Microsoft Azure|Cloud|4|0|microsoft azure|linux
gcp|Google Cloud|Cloud|4|0|google cloud,google cloud platform|linux
docker|Docker|DevOps|3|0|containerization,containers,containerisation|linux
kubernetes|Kubernetes|DevOps|5|0|k8s,eks,aks,gke,openshift|docker
terraform|Terraform / IaC|DevOps|4|1|infrastructure as code,iac,pulumi,cloudformation|aws
ci-cd|CI/CD|DevOps|3|0|cicd,continuous integration,continuous delivery,jenkins,github actions,gitlab ci,argo cd|git,docker
ansible|Ansible / Configuration Mgmt|DevOps|3|0|chef,puppet,configuration management|linux
prometheus|Prometheus & Grafana|DevOps|3|0|grafana,monitoring,observability,datadog,new relic|linux
sre|Site Reliability Engineering|DevOps|5|0|site reliability,incident management,sla,slo|kubernetes,prometheus
cybersecurity|Cybersecurity Fundamentals|Security|3|0|cyber security,information security,infosec,network security|
penetration-testing|Penetration Testing|Security|4|0|pentesting,ethical hacking,vapt,red team,burp suite,metasploit|cybersecurity
soc-siem|SOC / SIEM Operations|Security|4|1|siem,soc,splunk,sentinel,log analysis,security monitoring,blue team|cybersecurity
incident-response|Incident Response|Security|4|0|forensics,digital forensics,threat hunting,dfir|soc-siem
iam|Identity & Access Management|Security|3|1|identity management,access management,zero trust,okta,sso,privileged access|cybersecurity
appsec|Application Security|Security|4|1|application security,owasp,secure coding,threat modeling,sast,dast|cybersecurity
cloud-security|Cloud Security|Security|4|1|devsecops,security compliance,cis benchmark|aws,cybersecurity
governance-risk|GRC / Compliance|Security|3|1|grc,compliance,iso 27001,soc 2,gdpr,nist,risk management,audit|cybersecurity
cryptography|Cryptography|Security|4|0|encryption,pki,tls,certificates|
pytest|Pytest / Unit Testing|Testing|2|0|unit testing,junit,tdd,test driven development|python
selenium|Selenium|Testing|3|0|webdriver|javascript
playwright|Playwright / Cypress|Testing|3|1|cypress,browser automation|javascript
react-native|React Native|Mobile|3|0||react
flutter|Flutter|Mobile|3|1|dart|
android|Android Development|Mobile|3|0|jetpack compose|kotlin
ios|iOS Development|Mobile|3|0|iphone,xcode|swift
product-management|Product Management|Product|4|0|product owner,product strategy,prd|
agile|Agile / Scrum|Process|2|0|scrum,kanban,sprint,jira,safe|
stakeholder-management|Stakeholder Management|Soft skill|3|0|cross-functional,client management,business partnering|communication
communication|Communication|Soft skill|2|0|presentation skills,written communication,storytelling|
problem-solving|Problem Solving|Soft skill|2|0|analytical thinking,critical thinking,data driven decision|
a-b-testing|Experimentation / A-B Testing|Data|3|0|ab testing,experimentation,hypothesis testing|statistics
business-analysis|Business Analysis|Product|3|0|business analyst,requirements gathering,brd,process mapping|
kpi-analysis|KPI & Metric Analysis|Data|2|0|kpi,metrics,dashboards,reporting,performance analysis|sql
fintech-domain|FinTech Domain|Domain|3|0|banking,payments,financial services,trading|
healthcare-domain|Healthcare Domain|Domain|3|1|clinical,hl7,fhir,medical|
ecommerce-domain|E-commerce Domain|Domain|3|0|ecommerce,retail,marketplace|
saas-domain|SaaS / B2B Products|Domain|3|0|b2b,subscription|
"""

_ROLES_RAW = """
machine-learning-engineer|Machine Learning Engineer|machine learning engineer,ml engineer,machine learning developer|python=1,machine-learning=.95,deep-learning=.7,sql=.6,pytorch=.65,tensorflow=.4,scikit-learn=.55,docker=.6,aws=.5,mlops=.55,statistics=.5,git=.5,pandas=.6,model-deployment=.5,feature-engineering=.45,kubernetes=.3,mlflow=.35,spark=.3,rest-api=.35,system-design=.3|rag=.55,llm=.6,vector-databases=.4,fine-tuning=.45,agentic-ai=.35,transformers=.4|SaaS,IT Services,FinTech,E-commerce,Healthcare
ai-engineer|AI / GenAI Engineer|ai engineer,genai engineer,generative ai engineer,llm engineer,prompt engineer,applied ai|python=1,llm=.9,generative-ai=.85,rag=.8,langchain=.7,prompt-engineering=.7,vector-databases=.75,fastapi=.55,docker=.6,aws=.45,nlp=.6,pytorch=.5,rest-api=.5,git=.5,machine-learning=.5,mlops=.45|agentic-ai=.75,fine-tuning=.6,multimodal-ai=.45,ai-ethics=.35|SaaS,AI Research,IT Services,FinTech,Consulting
data-scientist|Data Scientist|data scientist,applied scientist,decision scientist|python=1,sql=.9,statistics=.85,machine-learning=.85,pandas=.8,scikit-learn=.7,data-visualization=.7,a-b-testing=.6,feature-engineering=.55,xgboost=.45,spark=.4,tableau=.35,power-bi=.3,problem-solving=.6,communication=.55,deep-learning=.35,nlp=.35,git=.45,aws=.35|llm=.5,generative-ai=.45,rag=.3,databricks=.35|FinTech,E-commerce,Healthcare,SaaS,Consulting
data-analyst|Data Analyst|data analyst,business analyst,product analyst,reporting analyst|sql=1,excel=.85,power-bi=.75,tableau=.7,python=.6,pandas=.55,data-visualization=.8,kpi-analysis=.75,statistics=.6,communication=.65,business-analysis=.6,data-wrangling=.6,looker=.35,problem-solving=.55|dbt=.4,generative-ai=.3,snowflake=.35|E-commerce,FinTech,IT Services,Retail,Consulting
data-engineer|Data Engineer|data engineer,big data engineer,data platform engineer|sql=1,python=.95,spark=.8,airflow=.75,aws=.8,data-modeling=.7,snowflake=.6,kafka=.5,docker=.55,postgresql=.6,data-wrangling=.7,ci-cd=.5,gcp=.4,azure=.4,mongodb=.35,linux=.5,system-design=.45|dbt=.55,databricks=.6,terraform=.4,bigquery=.4|IT Services,FinTech,SaaS,E-commerce,Telecom
backend-engineer|Backend Engineer|backend engineer,backend developer,python developer,java developer,node developer|python=.7,java=.5,nodejs=.55,sql=.85,rest-api=.95,postgresql=.75,mongodb=.5,redis=.45,docker=.75,kubernetes=.5,aws=.7,microservices=.8,git=.8,ci-cd=.6,linux=.6,system-design=.65,spring-boot=.4,django=.35,express=.35,pytest=.45|fastapi=.5,golang=.4,kafka=.4,terraform=.35,graphql=.3|SaaS,FinTech,IT Services,E-commerce
frontend-engineer|Frontend Engineer|frontend engineer,front end developer,ui developer,react developer,web developer|javascript=1,typescript=.85,react=.9,html-css=.95,tailwindcss=.6,rest-api=.7,git=.8,nodejs=.45,playwright=.35,graphql=.3,vue=.25,angular=.25,communication=.4|nextjs=.65,generative-ai=.2|SaaS,E-commerce,IT Services,Media
fullstack-engineer|Full Stack Engineer|full stack,fullstack,full-stack developer|javascript=.9,typescript=.75,react=.85,nodejs=.8,sql=.75,rest-api=.9,postgresql=.6,mongodb=.5,docker=.6,aws=.6,git=.85,html-css=.8,ci-cd=.5,system-design=.5,python=.4|nextjs=.6,fastapi=.35,terraform=.3,generative-ai=.3|SaaS,IT Services,E-commerce,FinTech
devops-engineer|DevOps / SRE Engineer|devops,site reliability,sre,platform engineer,cloud engineer,infrastructure engineer|docker=.95,kubernetes=.9,aws=.9,linux=.9,ci-cd=.95,terraform=.8,python=.6,bash=.75,prometheus=.75,git=.85,ansible=.5,microservices=.6,sre=.6,azure=.4,gcp=.4,system-design=.55|cloud-security=.45,mlops=.4,golang=.3|SaaS,IT Services,Telecom,FinTech,Cloud
cybersecurity-analyst|Cybersecurity Analyst|security analyst,cybersecurity,information security,security engineer,soc analyst,penetration tester|cybersecurity=1,soc-siem=.8,incident-response=.7,penetration-testing=.6,iam=.6,appsec=.55,cryptography=.5,linux=.6,governance-risk=.6,cloud-security=.5,python=.4,bash=.45,communication=.5|cloud-security=.5,iam=.4,governance-risk=.3|Cybersecurity,FinTech,Banking,Government,IT Services
product-manager|Product Manager|product manager,technical product manager,product owner|product-management=1,agile=.85,stakeholder-management=.85,communication=.9,kpi-analysis=.7,a-b-testing=.55,sql=.5,business-analysis=.6,problem-solving=.7,data-visualization=.4|generative-ai=.55,llm=.45,prompt-engineering=.4,ai-ethics=.3|SaaS,E-commerce,FinTech,Consumer Tech
software-engineer|Software Engineer|software engineer,software developer,sde,programmer|python=.6,java=.5,javascript=.6,sql=.7,git=.9,rest-api=.75,docker=.55,aws=.55,system-design=.5,ci-cd=.5,pytest=.45,microservices=.5,problem-solving=.6,linux=.45|generative-ai=.4,typescript=.4,kubernetes=.3,terraform=.25|IT Services,SaaS,FinTech,E-commerce,Consulting
qa-engineer|QA / Test Automation Engineer|qa engineer,test engineer,quality assurance,sdet,automation engineer|selenium=.9,pytest=.7,playwright=.65,javascript=.6,java=.5,sql=.55,ci-cd=.7,git=.8,rest-api=.65,python=.55,agile=.6,linux=.4|playwright=.4,generative-ai=.2,docker=.3|IT Services,SaaS,FinTech
mobile-engineer|Mobile App Developer|android developer,ios developer,mobile developer,mobile engineer,flutter developer|kotlin=.7,swift=.6,android=.7,ios=.6,react-native=.6,flutter=.55,javascript=.5,rest-api=.7,git=.8,mongodb=.3,ci-cd=.45|flutter=.4,generative-ai=.25|Consumer Tech,FinTech,E-commerce,Media
solutions-architect|Solutions / Cloud Architect|solutions architect,cloud architect,enterprise architect,technical architect|system-design=1,aws=.85,azure=.6,gcp=.55,kubernetes=.6,microservices=.8,terraform=.6,stakeholder-management=.7,cloud-security=.5,docker=.55,ci-cd=.5,communication=.65,data-modeling=.4|generative-ai=.5,llm=.4,agentic-ai=.35|Consulting,Cloud,IT Services,Banking
"""

COMPANIES: list[tuple[str, str]] = [
    ("TCS", "IT Services"), ("Infosys", "IT Services"), ("Wipro", "IT Services"),
    ("Accenture", "Consulting"), ("Cognizant", "IT Services"), ("Capgemini", "Consulting"),
    ("Deloitte", "Consulting"), ("HCLTech", "IT Services"), ("Flipkart", "E-commerce"),
    ("Amazon", "E-commerce"), ("Meesho", "E-commerce"), ("Swiggy", "Consumer Tech"),
    ("Zomato", "Consumer Tech"), ("Zerodha", "FinTech"), ("Razorpay", "FinTech"),
    ("PhonePe", "FinTech"), ("Paytm", "FinTech"), ("CRED", "FinTech"), ("Groww", "FinTech"),
    ("JPMorgan Chase", "Banking"), ("Goldman Sachs", "Banking"), ("HDFC Bank", "Banking"),
    ("ICICI Bank", "Banking"), ("Wells Fargo", "Banking"), ("Freshworks", "SaaS"),
    ("Zoho", "SaaS"), ("Postman", "SaaS"), ("BrowserStack", "SaaS"), ("Salesforce", "SaaS"),
    ("Microsoft", "Cloud"), ("Google", "Cloud"), ("AWS India", "Cloud"), ("Oracle", "Cloud"),
    ("IBM", "Cloud"), ("NVIDIA", "Semiconductors"), ("Qualcomm", "Semiconductors"),
    ("Practo", "Healthcare"), ("Apollo Hospitals", "Healthcare"), ("Optum", "Healthcare"),
    ("Innovaccer", "Healthcare"), ("Palo Alto Networks", "Cybersecurity"),
    ("CrowdStrike", "Cybersecurity"), ("Zscaler", "Cybersecurity"), ("Quick Heal", "Cybersecurity"),
    ("Airtel", "Telecom"), ("Jio", "Telecom"), ("Bosch", "Manufacturing"), ("Siemens", "Manufacturing"),
    ("Tata Motors", "Automotive"), ("Ola Electric", "Automotive"), ("Walmart Global Tech", "Retail"),
    ("Delhivery", "Logistics"), ("Sarvam AI", "AI Research"), ("Krutrim", "AI Research"),
    ("Fractal Analytics", "Consulting"), ("Mu Sigma", "Consulting"), ("LatentView", "Consulting"),
    ("Unacademy", "EdTech"), ("upGrad", "EdTech"), ("Dream11", "Consumer Tech"),
]

LOCATIONS = [
    "Bengaluru, India", "Hyderabad, India", "Pune, India", "Mumbai, India", "Chennai, India",
    "Delhi NCR, India", "Gurugram, India", "Remote – India", "Remote – Global",
]

CHANNELS = ["LinkedIn", "Naukri", "Indeed", "Company careers page", "Cutshort", "Wellfound", "Google Jobs"]

EXPERIENCE_LEVELS = [
    "Internship", "Entry level (0-2 yrs)", "Mid level (2-5 yrs)", "Senior (5-8 yrs)", "Lead / Staff (8+ yrs)",
]


@dataclass(frozen=True)
class Skill:
    slug: str
    name: str
    category: str
    difficulty: int
    emerging: bool
    aliases: tuple[str, ...] = field(default_factory=tuple)
    prerequisites: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class RoleProfile:
    slug: str
    label: str
    match: tuple[str, ...]
    core: tuple[tuple[str, float], ...]
    emerging: tuple[tuple[str, float], ...]
    industries: tuple[str, ...]


def _parse_skills() -> list[Skill]:
    out: list[Skill] = []
    for line in _SKILLS_RAW.strip().splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 7:
            parts += [""] * (7 - len(parts))
        slug, name, category, difficulty, emerging, aliases, prereqs = parts[:7]
        out.append(
            Skill(
                slug=slug,
                name=name,
                category=category,
                difficulty=int(difficulty or 3),
                emerging=emerging == "1",
                aliases=tuple(a.strip() for a in aliases.split(",") if a.strip()),
                prerequisites=tuple(p.strip() for p in prereqs.split(",") if p.strip()),
            )
        )
    return out


def _parse_roles() -> list[RoleProfile]:
    def weights(raw: str) -> tuple[tuple[str, float], ...]:
        items = []
        for chunk in raw.split(","):
            chunk = chunk.strip()
            if not chunk or "=" not in chunk:
                continue
            slug, w = chunk.split("=", 1)
            items.append((slug.strip(), float(w)))
        return tuple(items)

    out: list[RoleProfile] = []
    for line in _ROLES_RAW.strip().splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 7:
            parts += [""] * (7 - len(parts))
        slug, label, match, core, emerging, industries = parts[:6]
        out.append(
            RoleProfile(
                slug=slug,
                label=label,
                match=tuple(m.strip() for m in match.split(",") if m.strip()),
                core=weights(core),
                emerging=weights(emerging),
                industries=tuple(i.strip() for i in industries.split(",") if i.strip()),
            )
        )
    return out


SKILLS: list[Skill] = _parse_skills()
SKILL_BY_SLUG: dict[str, Skill] = {s.slug: s for s in SKILLS}
SKILL_NAME: dict[str, str] = {s.slug: s.name for s in SKILLS}
ROLES: list[RoleProfile] = _parse_roles()
ROLE_BY_LABEL: dict[str, RoleProfile] = {r.label: r for r in ROLES}
ROLE_LABELS: list[str] = [r.label for r in ROLES]


def detect_role(title: str) -> str:
    """Attribute a free-text job title to a canonical role (longest match wins)."""
    t = (title or "").lower()
    best: tuple[str, int] | None = None
    for role in ROLES:
        for frag in role.match:
            if frag and frag in t:
                if best is None or len(frag) > best[1]:
                    best = (role.label, len(frag))
    return best[0] if best else "Other"


def role_profile(label: str) -> RoleProfile | None:
    lowered = (label or "").strip().lower()
    if not lowered:
        return None
    for role in ROLES:
        if role.label.lower() == lowered:
            return role
    for role in ROLES:
        if any(frag and frag in lowered for frag in role.match):
            return role
    for role in ROLES:
        if role.label.lower() in lowered or lowered in role.label.lower():
            return role
    return None

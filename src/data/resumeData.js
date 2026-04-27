// Source of truth for resume content
export const profile = {
  name: "Abhisek Mondal",
  title: "DevOps Engineer",
  tagline: "Building Scalable Cloud Systems · Azure · AWS · Kubernetes · CI/CD",
  location: "Greater Kolkata Area, India",
  email: "bhskmondal@gmail.com",
  phone: "+91 9038105409",
  linkedin: "https://www.linkedin.com/in/abhisek-mondal-725573181",
  linkedinHandle: "abhisek-mondal-725573181",
  totalExperience: "6+ years in IT · 5+ years in DevOps",
};

export const summary = `Senior-minded DevOps Engineer with 6+ years in IT and 5+ years specializing in DevOps, cloud infrastructure, and platform engineering. Proven track record of architecting CI/CD pipelines, automating production-grade Kubernetes workloads, and engineering Infrastructure-as-Code on Azure and AWS. Passionate about reliability, observability, and developer-velocity—turning manual operations into self-healing, code-defined systems that scale.`;

export const focusAreas = [
  "CI/CD Pipeline Design & Automation",
  "Cloud Infrastructure (AWS / Azure)",
  "Docker & Kubernetes Orchestration",
  "Infrastructure as Code (Terraform / Ansible)",
  "Monitoring, Logging & Performance Optimization",
  "Site Reliability & High Availability",
];

export const skillGroups = [
  {
    label: "Cloud Platforms",
    items: ["Microsoft Azure", "Amazon Web Services (AWS)", "Azure Resource Manager", "AWS EC2 / S3 / IAM / VPC"],
  },
  {
    label: "CI/CD & Automation",
    items: ["Azure DevOps Pipelines", "GitHub Actions", "YAML Pipelines", "Release Gates", "Build Automation", "Git"],
  },
  {
    label: "Containers & Orchestration",
    items: ["Docker", "Kubernetes (AKS / EKS)", "Helm", "Container Registry", "Image Hardening"],
  },
  {
    label: "Infrastructure as Code",
    items: ["Terraform", "Ansible", "ARM Templates", "Bash Scripting", "PowerShell"],
  },
  {
    label: "Operating Systems",
    items: ["Linux (Ubuntu, RHEL, SUSE SLES)", "Windows Server", "Shell / Bash"],
  },
  {
    label: "Monitoring & Observability",
    items: ["Azure Monitor", "Application Insights", "Log Analytics", "Prometheus", "Grafana"],
  },
  {
    label: "Application Stack",
    items: ["SAP Business One Administration", "Microsoft Dynamics NAV", "Plesk", "cPanel", "IIS"],
  },
  {
    label: "Practices",
    items: ["DevSecOps", "GitOps", "Blue-Green Deployments", "SRE Principles", "Incident Response"],
  },
];

export const experience = [
  {
    role: "DevOps Engineer",
    company: "APPSeCONNECT",
    type: "Full-time · Hybrid",
    location: "Kolkata, West Bengal, India",
    start: "Nov 2022",
    end: "Present",
    duration: "3+ yrs",
    bullets: [
      "Designed and maintained end-to-end CI/CD pipelines on Azure DevOps to automate build, test, and deployment, cutting release cycles and lifting deployment frequency across the engineering org.",
      "Containerized production services with Docker and orchestrated workloads on Kubernetes, improving resource utilization and enabling zero-downtime rolling deployments.",
      "Operated and scaled multi-region cloud infrastructure on Azure and AWS—provisioning compute, networking, IAM, and storage layers to meet evolving product demand.",
      "Authored Infrastructure-as-Code using Terraform and Ansible to enforce consistent, version-controlled environments across dev, staging, and production.",
      "Implemented monitoring, alerting, and centralized logging to drive high availability, faster MTTR, and proactive performance tuning.",
      "Partnered with development and QA teams to streamline branching strategies, automated testing gates, and shift-left security in pipelines.",
      "Hardened production infrastructure with security best practices—secret management, least-privilege IAM, image scanning, and patch automation.",
    ],
    stack: ["Azure", "AWS", "Azure DevOps", "Kubernetes", "Docker", "Terraform", "Ansible", "Bash", "YAML"],
  },
  {
    role: "Junior System Engineer",
    company: "InSync Tech-Fin Solutions Ltd. (now APPSeCONNECT)",
    type: "Full-time",
    location: "Kolkata, West Bengal, India",
    start: "Nov 2020",
    end: "Dec 2022",
    duration: "2 yrs 2 mos",
    bullets: [
      "Administered Linux (SUSE SLES) and Windows Server fleets supporting business-critical SAP Business One and Microsoft Dynamics NAV deployments.",
      "Managed hosting environments on Plesk and cPanel—handling DNS, mail, SSL, and customer onboarding for SaaS offerings.",
      "Began transition into DevOps: scripting routine ops, building deployment runbooks, and assisting senior engineers on Azure resource provisioning.",
      "Drove uptime and customer SLAs through structured incident response, root-cause analysis, and follow-up automation.",
    ],
    stack: ["SUSE Linux", "Windows Server", "SAP B1", "MS Dynamics NAV", "Plesk", "cPanel", "Azure"],
  },
  {
    role: "Assistant System Engineer",
    company: "JRM Software Consultancy",
    type: "Full-time",
    location: "Kolkata, India",
    start: "Sep 2019",
    end: "Nov 2020",
    duration: "1 yr 3 mos",
    bullets: [
      "Provided L1/L2 support for client infrastructure—server health, networking, backups, and recovery.",
      "Assisted in deploying and configuring on-prem and hybrid environments for enterprise clients.",
      "Documented operating procedures and trained junior team members on systems administration fundamentals.",
    ],
    stack: ["Linux", "Windows Server", "Networking", "Backup & Recovery"],
  },
];

export const certifications = [
  {
    name: "Microsoft Certified: DevOps Engineer Expert",
    issuer: "Microsoft",
    code: "AZ-400",
    level: "Expert",
    focus: "DevOps",
    status: "Active",
    issueDate: "February 18, 2023",
    expiryDate: "February 19, 2027",
    credentialId: "1F21F060805B4D88",
    verifyUrl: "https://learn.microsoft.com/en-us/users/ABHISEKMONDAL-3205/credentials/1F21F060805B4D88",
    detailsUrl: "https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/",
  },
  {
    name: "Microsoft Certified: Azure Administrator Associate",
    issuer: "Microsoft",
    code: "AZ-104",
    level: "Associate",
    focus: "Azure Administration",
    status: "Active",
    issueDate: "December 10, 2022",
    expiryDate: "December 11, 2026",
    credentialId: "27C54A52781134CE",
    verifyUrl: "https://learn.microsoft.com/en-us/users/ABHISEKMONDAL-3205/credentials/27C54A52781134CE",
    detailsUrl: "https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/",
  },
  {
    name: "Microsoft Certified: Azure Fundamentals",
    issuer: "Microsoft",
    code: "AZ-900",
    level: "Fundamentals",
    focus: "Cloud Fundamentals",
    status: "Active",
    issueDate: "May 27, 2022",
    expiryDate: "",
    credentialId: "30048B3DFE085761",
    verifyUrl: "https://learn.microsoft.com/en-us/users/ABHISEKMONDAL-3205/credentials/30048B3DFE085761",
    detailsUrl: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/",
  },
  {
    name: "Cisco Certified Network Associate Routing and Switching (CCNA)",
    issuer: "Cisco",
    code: "CCNA",
    level: "Associate",
    focus: "Routing and Switching",
    status: "Expired",
    issueDate: "January 2020",
    expiryDate: "January 2023",
    credentialId: "dc9c484b-619b-4d42-85bf-23322eccfb19",
    verifyUrl: "https://www.credly.com/badges/dc9c484b-619b-4d42-85bf-23322eccfb19/linked_in_profile",
    detailsUrl: "https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccna/index.html",
  },
];

export const education = [
  {
    degree: "Diploma in Computer Science",
    institute: "JIS School of Polytechnic (WBSCTE)",
    year: "2017",
  },
  {
    degree: "Higher Secondary Education",
    institute: "West Bengal Council of Higher Secondary Education",
    year: "2014",
  },
  {
    degree: "Secondary Education",
    institute: "West Bengal Board of Secondary Education",
    year: "2011",
  },
];

export const stats = [
  { value: "6+", label: "Years in IT" },
  { value: "5+", label: "Years in DevOps" },
  { value: "4", label: "Microsoft & Cisco Certs" },
  { value: "2", label: "Clouds in Production" },
];

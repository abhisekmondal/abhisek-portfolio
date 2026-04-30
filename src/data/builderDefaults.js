export const emptyResume = {
  profile: {
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
  },
  sections: {
    summary: true,
    skills: true,
    experience: true,
    projects: true,
    education: true,
    certifications: true,
  },
  summary: "",
  skills: [
    { label: "Core Skills", items: [""] },
  ],
  experience: [
    {
      role: "",
      company: "",
      location: "",
      start: "",
      end: "",
      bullets: [""],
    },
  ],
  education: [
    {
      degree: "",
      institute: "",
      location: "",
      year: "",
    },
  ],
  certifications: [
    {
      name: "",
      issuer: "",
      year: "",
      url: "",
    },
  ],
  projects: [
    {
      name: "",
      role: "",
      url: "",
      bullets: [""],
    },
  ],
};

export const sampleResume = {
  profile: {
    name: "Alex Morgan",
    title: "Senior Product Manager",
    email: "alex.morgan@example.com",
    phone: "+1 555 014 7823",
    location: "Austin, TX",
    website: "alexmorgan.work",
    linkedin: "linkedin.com/in/alexmorgan",
    github: "",
  },
  sections: {
    summary: true,
    skills: true,
    experience: true,
    projects: true,
    education: true,
    certifications: true,
  },
  summary:
    "Senior Product Manager with 8+ years of experience launching B2B SaaS, marketplace, and analytics products. Skilled at turning ambiguous customer problems into focused product strategy, measurable roadmap decisions, and cross-functional delivery plans. Known for pairing discovery, data analysis, and crisp execution to improve activation, retention, and revenue outcomes.",
  skills: [
    {
      label: "Product Strategy",
      items: ["Product Discovery", "Roadmap Planning", "Market Research", "Positioning", "Customer Segmentation"],
    },
    {
      label: "Execution",
      items: ["Agile Delivery", "Backlog Management", "Launch Planning", "Stakeholder Alignment", "Experiment Design"],
    },
    {
      label: "Analytics",
      items: ["SQL", "Amplitude", "Mixpanel", "A/B Testing", "Funnel Analysis", "KPI Dashboards"],
    },
    {
      label: "Collaboration",
      items: ["User Research", "Design Partnership", "Engineering Handoff", "Executive Communication", "GTM Planning"],
    },
  ],
  experience: [
    {
      role: "Senior Product Manager",
      company: "Northstar Labs",
      location: "Austin, TX",
      start: "Mar 2021",
      end: "Present",
      bullets: [
        "Led the redesign of a self-serve analytics workflow used by 18,000+ weekly users, improving report creation completion by 31%.",
        "Shipped onboarding experiments across activation, education, and lifecycle messaging that increased trial-to-paid conversion by 22%.",
        "Built a quarterly roadmap process linking customer pain points, revenue impact, and engineering capacity for a 24-person product group.",
        "Partnered with sales and customer success to package enterprise reporting capabilities that supported $2.4M in expansion pipeline.",
      ],
    },
    {
      role: "Product Manager",
      company: "BrightCart",
      location: "Remote",
      start: "Jun 2018",
      end: "Feb 2021",
      bullets: [
        "Owned merchant workflows for inventory, checkout, and campaign management across web and mobile surfaces.",
        "Ran moderated usability studies that identified checkout friction and helped reduce support tickets by 18%.",
        "Defined launch metrics and release plans for three major workflow improvements adopted by 4,500+ merchants.",
      ],
    },
    {
      role: "Associate Product Manager",
      company: "Riverbend Software",
      location: "Austin, TX",
      start: "Jul 2016",
      end: "May 2018",
      bullets: [
        "Supported discovery, QA, and launch coordination for a CRM integration product serving small business teams.",
        "Created product briefs and dashboard reporting that improved sprint planning and release communication.",
      ],
    },
  ],
  education: [
    {
      degree: "BBA in Information Systems",
      institute: "State University",
      location: "Austin, TX",
      year: "2016",
    },
  ],
  certifications: [
    {
      name: "Product Management Certificate",
      issuer: "Product School",
      year: "2021",
      url: "https://example.com/product-management",
    },
    {
      name: "Advanced Analytics for Product",
      issuer: "Reforge",
      year: "2020",
      url: "https://example.com/analytics",
    },
  ],
  projects: [
    {
      name: "Self-Serve Reporting Launch",
      role: "Product Lead",
      url: "https://example.com/case-study",
      bullets: [
        "Created the product brief, success metrics, beta plan, and launch checklist for a reporting workflow used by enterprise teams.",
        "Validated the direction through 12 customer interviews, prototype tests, and usage analysis before engineering handoff.",
      ],
    },
  ],
};

export const builderSettings = {
  template: "modern",
  accent: "#22d3ee",
  density: "comfortable",
};

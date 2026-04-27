import React from "react";
import { Link } from "react-router-dom";
import {
  Mail, Phone, MapPin, Linkedin, ArrowRight, Download, Cloud, Container,
  GitBranch, ServerCog, ShieldCheck, Activity, Terminal, Sparkles, ExternalLink, Award
} from "lucide-react";
import {
  profile, summary, focusAreas, skillGroups, experience,
  certifications, education, stats
} from "@/data/resumeData";

const focusIcons = [GitBranch, Cloud, Container, ServerCog, Activity, ShieldCheck];

const Home = () => {
  return (
    <div className="App relative min-h-screen text-[var(--text)]">
      {/* HERO */}
      <header className="relative overflow-hidden bg-grid bg-grain" data-testid="hero-section">
        <div className="absolute inset-0 glow pointer-events-none" />
        <Nav />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-28">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 fade-in-up">
              <div className="section-label mb-6" data-testid="hero-tag">
                <Terminal size={14} /> ~ /home/abhisek &nbsp; • &nbsp; senior devops engineer
              </div>
              <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.02] tracking-tight">
                Abhisek<br />
                <span className="text-white/90">Mondal.</span>
                <span className="text-[var(--accent)]">_</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg md:text-xl text-[var(--text-soft)] leading-relaxed">
                I build and run scalable cloud platforms — automating CI/CD, hardening Kubernetes,
                and turning infrastructure into code on <span className="text-[var(--accent)]">Azure</span> &
                <span className="text-[var(--accent)]"> AWS</span>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--text-mute)] font-mono">
                <span>{profile.totalExperience}</span>
                <span>·</span>
                <span>{profile.location}</span>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link to="/resume" className="btn btn-primary" data-testid="view-resume-btn">
                  View Resume <ArrowRight size={16} />
                </Link>
                <a
                  href={`mailto:${profile.email}`}
                  className="btn btn-ghost"
                  data-testid="contact-btn"
                >
                  <Mail size={14} /> Get in touch
                </a>
                <a
                  href={profile.linkedin}
                  target="_blank" rel="noreferrer"
                  className="btn btn-ghost"
                  data-testid="linkedin-btn"
                >
                  <Linkedin size={14} /> LinkedIn
                </a>
              </div>
            </div>

            <div className="lg:col-span-4 fade-in-up delay-2">
              <TerminalCard />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)] rounded-xl overflow-hidden border border-[var(--border)]" data-testid="stats-grid">
            {stats.map((s, i) => (
              <div key={s.label} className={`bg-[var(--bg-2)] px-6 py-7 fade-in-up delay-${i+1}`} data-testid={`stat-${i}`}>
                <div className="font-display text-4xl md:text-5xl font-bold text-white">{s.value}</div>
                <div className="mt-2 font-mono text-xs text-[var(--text-mute)] uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ABOUT */}
      <section className="max-w-6xl mx-auto px-6 py-24" id="about" data-testid="about-section">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="section-label">About</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-4 leading-tight">
              Reliability through<br />automation.
            </h2>
          </div>
          <div className="lg:col-span-8">
            <p className="text-[var(--text-soft)] text-lg leading-relaxed">{summary}</p>
            <div className="mt-10 grid sm:grid-cols-2 gap-3">
              {focusAreas.map((area, i) => {
                const Icon = focusIcons[i % focusIcons.length];
                return (
                  <div
                    key={area}
                    className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] transition-colors"
                    data-testid={`focus-${i}`}
                  >
                    <span className="flex-shrink-0 w-9 h-9 rounded-md bg-[var(--bg-2)] grid place-items-center text-[var(--accent)]">
                      <Icon size={16} />
                    </span>
                    <span className="text-sm">{area}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="divider max-w-6xl mx-auto" />

      {/* SKILLS */}
      <section className="max-w-6xl mx-auto px-6 py-24" id="skills" data-testid="skills-section">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <div className="section-label">Stack</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-4">Tools of the trade</h2>
          </div>
          <div className="font-mono text-xs text-[var(--text-mute)]">// curated, not exhaustive</div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {skillGroups.map((group, i) => (
            <div
              key={group.label}
              className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors"
              data-testid={`skill-group-${i}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-xs text-[var(--accent)]">0{i+1}</span>
                <h3 className="font-display text-lg font-semibold">{group.label}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((it) => (
                  <span key={it} className="chip">{it}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider max-w-6xl mx-auto" />

      {/* EXPERIENCE */}
      <section className="max-w-6xl mx-auto px-6 py-24" id="experience" data-testid="experience-section">
        <div className="section-label">Experience</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mt-4 mb-12">A record of shipping.</h2>
        <div className="relative">
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[var(--border-2)]" />
          {experience.map((exp, i) => (
            <article key={`${exp.company}-${i}`} className="relative pl-10 pb-12 last:pb-0" data-testid={`exp-${i}`}>
              <div className="absolute left-0 top-2 timeline-dot" />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-display text-xl md:text-2xl font-bold">{exp.role}</h3>
                <span className="text-[var(--accent)] font-mono text-sm">@ {exp.company}</span>
              </div>
              <div className="mt-1 font-mono text-xs text-[var(--text-mute)] flex flex-wrap gap-x-3">
                <span>{exp.start} — {exp.end}</span>
                <span>·</span>
                <span>{exp.duration}</span>
                <span>·</span>
                <span>{exp.location}</span>
                <span>·</span>
                <span>{exp.type}</span>
              </div>
              <ul className="mt-5 space-y-2.5 text-[var(--text-soft)] leading-relaxed">
                {exp.bullets.map((b, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="text-[var(--accent)] mt-1.5 flex-shrink-0">▸</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                {exp.stack.map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="divider max-w-6xl mx-auto" />

      {/* CERTS + EDU */}
      <section className="max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-10">
        <div data-testid="certs-section">
            <div className="section-label">Certifications</div>
            <div className="flex items-center justify-between gap-4 flex-wrap mt-4 mb-8">
              <h2 className="font-display text-3xl font-bold">Validated, in writing.</h2>
              <Link to="/certifications" className="btn btn-ghost text-xs" data-testid="certification-path-btn">
                Certification Path <ArrowRight size={12} />
              </Link>
            </div>
          <div className="space-y-3">
            {certifications.map((c, i) => (
              <div key={c.name} className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-start gap-4 hover:border-[var(--accent)] transition-colors" data-testid={`cert-${i}`}>
                <span className="flex-shrink-0 w-10 h-10 rounded-md bg-[var(--bg-2)] grid place-items-center text-[var(--amber)]">
                  <Award size={18} />
                </span>
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="font-mono text-xs text-[var(--text-mute)] mt-1">
                    {[c.issuer, c.code, c.level].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div data-testid="edu-section">
          <div className="section-label">Education</div>
          <h2 className="font-display text-3xl font-bold mt-4 mb-8">Foundations.</h2>
          <div className="space-y-3">
            {education.map((e, i) => (
              <div key={e.degree} className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]" data-testid={`edu-${i}`}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="font-medium">{e.degree}</div>
                  <span className="font-mono text-xs text-[var(--accent)]">{e.year}</span>
                </div>
                <div className="font-mono text-xs text-[var(--text-mute)] mt-1">{e.institute}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider max-w-6xl mx-auto" />

      {/* CONTACT */}
      <section className="max-w-6xl mx-auto px-6 py-24" id="contact" data-testid="contact-section">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 md:p-14 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />
          <div className="relative">
            <div className="section-label"><Sparkles size={14} /> Let's connect</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 leading-tight">
              Hiring for SRE, Cloud,<br />or Platform Engineering?
            </h2>
            <p className="mt-5 max-w-xl text-[var(--text-soft)] text-lg">
              Open to <span className="text-[var(--accent)]">Senior DevOps</span>, SRE, Cloud Engineer & Platform roles. On-site or hybrid in Kolkata, or remote.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`mailto:${profile.email}`} className="btn btn-primary" data-testid="email-cta">
                <Mail size={14} /> {profile.email}
              </a>
              <a href={`tel:${profile.phone.replace(/\s/g, '')}`} className="btn btn-ghost" data-testid="phone-cta">
                <Phone size={14} /> {profile.phone}
              </a>
              <a href={profile.linkedin} target="_blank" rel="noreferrer" className="btn btn-ghost" data-testid="linkedin-cta">
                <Linkedin size={14} /> LinkedIn <ExternalLink size={12} />
              </a>
              <Link to="/resume" className="btn btn-ghost" data-testid="resume-cta">
                <Download size={14} /> Download Resume
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--border)] py-8" data-testid="footer">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between items-center gap-3 font-mono text-xs text-[var(--text-mute)]">
          <span>© {new Date().getFullYear()} Abhisek Mondal. Crafted with care.</span>
          <span>uptime: 99.99% · last deploy: now</span>
        </div>
      </footer>
    </div>
  );
};

const Nav = () => (
  <nav className="relative max-w-6xl mx-auto px-6 pt-7 flex items-center justify-between" data-testid="navbar">
    <Link to="/" className="flex items-center gap-2 group" data-testid="logo">
      <span className="w-8 h-8 rounded-md bg-[var(--accent)] text-[#06121a] grid place-items-center font-mono font-bold text-sm">AM</span>
      <span className="font-display font-bold text-lg group-hover:text-[var(--accent)] transition-colors">abhisek.dev</span>
    </Link>
    <div className="hidden md:flex items-center gap-7 font-mono text-sm text-[var(--text-soft)]">
      <a href="#about" className="link-underline hover:text-[var(--accent)] transition-colors" data-testid="nav-about">about</a>
      <a href="#skills" className="link-underline hover:text-[var(--accent)] transition-colors" data-testid="nav-skills">stack</a>
      <a href="#experience" className="link-underline hover:text-[var(--accent)] transition-colors" data-testid="nav-experience">experience</a>
      <Link to="/certifications" className="link-underline hover:text-[var(--accent)] transition-colors" data-testid="nav-certifications">certifications</Link>
      <a href="#contact" className="link-underline hover:text-[var(--accent)] transition-colors" data-testid="nav-contact">contact</a>
    </div>
    <Link to="/resume" className="btn btn-ghost text-xs" data-testid="nav-resume">
      Resume <ArrowRight size={12} />
    </Link>
  </nav>
);

const TerminalCard = () => (
  <div className="rounded-xl border border-[var(--border-2)] bg-[var(--bg-2)] shadow-2xl overflow-hidden" data-testid="terminal-card">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
      <span className="ml-3 font-mono text-xs text-[var(--text-mute)]">~ abhisek@prod-cluster</span>
    </div>
    <div className="p-5 font-mono text-[13px] leading-relaxed">
      <div><span className="text-[var(--accent)]">$</span> <span className="text-[var(--text-soft)]">whoami</span></div>
      <div className="text-[var(--green)] mt-1">abhisek-mondal · devops-engineer</div>
      <div className="mt-3"><span className="text-[var(--accent)]">$</span> <span className="text-[var(--text-soft)]">kubectl get expertise</span></div>
      <div className="mt-1 text-[var(--text-soft)]">
        <div>NAME              STATUS    AGE</div>
        <div>azure-pipelines   <span className="text-[var(--green)]">Running</span>   3y</div>
        <div>aws-infra         <span className="text-[var(--green)]">Running</span>   3y</div>
        <div>kubernetes        <span className="text-[var(--green)]">Running</span>   3y</div>
        <div>terraform-iac     <span className="text-[var(--green)]">Running</span>   3y</div>
      </div>
      <div className="mt-3"><span className="text-[var(--accent)]">$</span> <span className="text-[var(--text-soft)]">echo $STATUS</span></div>
      <div className="mt-1 text-[var(--amber)]">→ open to new opportunities ✱</div>
      <div className="mt-3 flex items-center gap-1"><span className="text-[var(--accent)]">$</span> <span className="w-2 h-4 bg-[var(--accent)] inline-block animate-pulse" /></div>
    </div>
  </div>
);

export default Home;

import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Mail, Phone, Linkedin, MapPin, Printer } from "lucide-react";
import {
  profile, summary, skillGroups, experience, certifications, education
} from "@/data/resumeData";

const Resume = () => {
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Toolbar — hidden on print */}
      <div className="no-print sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-2)]/85 backdrop-blur" data-testid="resume-toolbar">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="btn btn-ghost text-xs" data-testid="back-to-portfolio">
            <ArrowLeft size={14} /> Back to portfolio
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline font-mono text-xs text-[var(--text-mute)]">// Tip: choose "Save as PDF" in print dialog</span>
            <button onClick={handlePrint} className="btn btn-primary" data-testid="download-pdf-btn">
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Resume page — paper-like card */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        <div className="print-page bg-white text-[#0f172a] rounded-xl shadow-2xl px-10 md:px-14 py-12" data-testid="resume-paper">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-slate-300">
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900" style={{ color: "#0f172a" }}>
                {profile.name}
              </h1>
              <div className="mt-1 text-cyan-700 font-medium" style={{ color: "#0e7490" }}>
                {profile.title} · Cloud · CI/CD · Kubernetes · IaC
              </div>
              <div className="mt-2 text-sm text-slate-600 font-mono" style={{ color: "#475569" }}>
                {profile.totalExperience}
              </div>
            </div>
            <div className="text-sm space-y-1 text-slate-700" style={{ color: "#334155" }}>
              <ContactLine icon={<Mail size={13} />}>
                <a href={`mailto:${profile.email}`} className="hover:underline" style={{ color: "#0e7490" }}>{profile.email}</a>
              </ContactLine>
              <ContactLine icon={<Phone size={13} />}>{profile.phone}</ContactLine>
              <ContactLine icon={<MapPin size={13} />}>{profile.location}</ContactLine>
              <ContactLine icon={<Linkedin size={13} />}>
                <a href={profile.linkedin} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "#0e7490" }}>
                  linkedin.com/in/{profile.linkedinHandle}
                </a>
              </ContactLine>
            </div>
          </div>

          {/* Summary */}
          <Section title="Professional Summary">
            <p className="text-[14.5px] leading-relaxed text-slate-700" style={{ color: "#334155" }}>{summary}</p>
          </Section>

          {/* Core Skills */}
          <Section title="Core Skills">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              {skillGroups.map((g) => (
                <div key={g.label} className="text-[13.5px]">
                  <div className="font-semibold text-slate-900" style={{ color: "#0f172a" }}>{g.label}</div>
                  <div className="text-slate-700 leading-relaxed" style={{ color: "#334155" }}>
                    {g.items.join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Experience */}
          <Section title="Professional Experience">
            <div className="space-y-6">
              {experience.map((exp, i) => (
                <div key={i} data-testid={`resume-exp-${i}`}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-bold text-slate-900 text-[15px]" style={{ color: "#0f172a" }}>
                        {exp.role} <span className="font-normal text-cyan-700" style={{ color: "#0e7490" }}>· {exp.company}</span>
                      </h3>
                      <div className="text-[12.5px] text-slate-500 font-mono mt-0.5" style={{ color: "#64748b" }}>
                        {exp.location} · {exp.type}
                      </div>
                    </div>
                    <div className="text-[12.5px] text-slate-500 font-mono whitespace-nowrap" style={{ color: "#64748b" }}>
                      {exp.start} — {exp.end} · {exp.duration}
                    </div>
                  </div>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-[13.5px] text-slate-700" style={{ color: "#334155" }}>
                    {exp.bullets.map((b, idx) => <li key={idx}>{b}</li>)}
                  </ul>
                  <div className="mt-2 text-[12px] text-slate-600" style={{ color: "#475569" }}>
                    <span className="font-semibold">Stack: </span>{exp.stack.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Certifications */}
          <Section title="Certifications">
            <ul className="grid md:grid-cols-2 gap-x-8 gap-y-1 text-[13.5px] text-slate-700 list-disc pl-5" style={{ color: "#334155" }}>
              {certifications.map((c) => (
                <li key={c.name}>
                  <span className="font-semibold text-slate-900" style={{ color: "#0f172a" }}>{c.name}</span>
                  <span className="text-slate-500" style={{ color: "#64748b" }}> — {c.issuer}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Education */}
          <Section title="Education">
            <div className="space-y-2">
              {education.map((e) => (
                <div key={e.degree} className="flex items-baseline justify-between gap-3 flex-wrap text-[13.5px]">
                  <div>
                    <span className="font-semibold text-slate-900" style={{ color: "#0f172a" }}>{e.degree}</span>
                    <span className="text-slate-700" style={{ color: "#334155" }}> — {e.institute}</span>
                  </div>
                  <div className="font-mono text-slate-500 text-[12.5px]" style={{ color: "#64748b" }}>{e.year}</div>
                </div>
              ))}
            </div>
          </Section>

          <div className="mt-8 pt-4 border-t border-slate-200 text-[11px] text-slate-400 font-mono text-center" style={{ color: "#94a3b8" }}>
            References available on request
          </div>
        </div>
      </div>

      <div className="no-print py-8" />
    </div>
  );
};

const Section = ({ title, children }) => (
  <section className="mt-7" data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <h2
      className="font-display font-bold uppercase tracking-[0.14em] text-[12.5px] text-cyan-700 border-b border-slate-300 pb-1.5 mb-3"
      style={{ color: "#0e7490" }}
    >
      {title}
    </h2>
    {children}
  </section>
);

const ContactLine = ({ icon, children }) => (
  <div className="flex items-center gap-2 justify-start md:justify-end">
    <span className="text-cyan-700" style={{ color: "#0e7490" }}>{icon}</span>
    <span>{children}</span>
  </div>
);

export default Resume;

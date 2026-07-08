import React from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import {
  hasCertificationContent,
  hasEducationContent,
  hasProjectContent,
  hasRoleContent,
  hasSkillGroupContent,
} from "@/lib/resumeSchema";

const ResumePreview = ({ resume, settings }) => {
  const sections = resume.sections || {};
  const contact = [
    { icon: Mail, value: resume.profile.email },
    { icon: Phone, value: resume.profile.phone },
    { icon: MapPin, value: resume.profile.location },
  ].filter((item) => item.value);
  const links = [resume.profile.website, resume.profile.linkedin, resume.profile.github].filter(Boolean);

  return (
    <article
      className={`resume-preview template-${settings.template} density-${settings.density}`}
      style={{ "--resume-accent": settings.accent }}
    >
      <header className="resume-header">
        <div>
          <h2>{resume.profile.name || "Your Name"}</h2>
          <p>{resume.profile.title || "Target Role / Professional Headline"}</p>
        </div>
        <div className="resume-contact">
          {contact.map(({ icon: Icon, value }) => (
            <span key={value}>
              <Icon size={12} /> {value}
            </span>
          ))}
          {links.map((link) => (
            <span key={link}>{link}</span>
          ))}
        </div>
      </header>

      <PreviewSection title="Professional Summary" visible={sections.summary !== false && resume.summary}>
        <p>{resume.summary}</p>
      </PreviewSection>

      <PreviewSection
        title="Core Skills"
        visible={sections.skills !== false && resume.skills.some((group) => group.items.some(Boolean))}
      >
        <div className="preview-skills">
          {resume.skills.filter(hasSkillGroupContent).map((group, index) => (
            <div key={`${group.label}-${index}`}>
              <strong>{group.label || "Skills"}</strong>
              <span>{group.items.filter(Boolean).join(" | ")}</span>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Professional Experience"
        visible={sections.experience !== false && resume.experience.some(hasRoleContent)}
      >
        <div className="preview-records">
          {resume.experience.filter(hasRoleContent).map((item, index) => (
            <div key={`${item.company}-${index}`} className="preview-record">
              <div className="record-heading">
                <div>
                  <h4>
                    {item.role || "Role"} <span>{item.company ? `- ${item.company}` : ""}</span>
                  </h4>
                  <p>{item.location}</p>
                </div>
                <time>{[item.start, item.end].filter(Boolean).join(" - ")}</time>
              </div>
              <BulletList bullets={item.bullets} />
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="Projects" visible={sections.projects !== false && resume.projects.some(hasProjectContent)}>
        <div className="preview-records">
          {resume.projects.filter(hasProjectContent).map((item, index) => (
            <div key={`${item.name}-${index}`} className="preview-record">
              <div className="record-heading">
                <div>
                  <h4>
                    {item.name || "Project"} <span>{item.role ? `- ${item.role}` : ""}</span>
                  </h4>
                  <p>{item.url}</p>
                </div>
              </div>
              <BulletList bullets={item.bullets} />
            </div>
          ))}
        </div>
      </PreviewSection>

      <div className="preview-two-col">
        <PreviewSection title="Education" visible={sections.education !== false && resume.education.some(hasEducationContent)}>
          {resume.education.filter(hasEducationContent).map((item, index) => (
            <div key={`${item.degree}-${index}`} className="mini-record">
              <strong>{item.degree}</strong>
              <span>{[item.institute, item.location].filter(Boolean).join(", ")}</span>
              <em>{item.year}</em>
            </div>
          ))}
        </PreviewSection>

        <PreviewSection
          title="Certifications"
          visible={sections.certifications !== false && resume.certifications.some(hasCertificationContent)}
        >
          {resume.certifications.filter(hasCertificationContent).map((item, index) => (
            <div key={`${item.name}-${index}`} className="mini-record">
              <strong>{item.name}</strong>
              <span>{[item.issuer, item.year].filter(Boolean).join(" | ")}</span>
              <em>{item.url}</em>
            </div>
          ))}
        </PreviewSection>
      </div>
    </article>
  );
};

const PreviewSection = ({ title, visible, children }) => {
  if (!visible) return null;
  return (
    <section className="preview-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
};

const BulletList = ({ bullets }) => {
  const filtered = bullets.filter(Boolean);
  if (!filtered.length) return null;
  return (
    <ul>
      {filtered.map((bullet, index) => (
        <li key={index}>{bullet}</li>
      ))}
    </ul>
  );
};

export default ResumePreview;

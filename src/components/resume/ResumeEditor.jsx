import React from "react";
import {
  Award,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";

export const ProfileForm = ({ profile, updateProfile }) => (
  <EditorSection title="Candidate profile" icon={UserRound}>
    <div className="form-grid">
      <InputField label="Full name" value={profile.name} onChange={(value) => updateProfile("name", value)} />
      <InputField label="Headline" value={profile.title} onChange={(value) => updateProfile("title", value)} />
      <InputField label="Email" value={profile.email} onChange={(value) => updateProfile("email", value)} />
      <InputField label="Phone" value={profile.phone} onChange={(value) => updateProfile("phone", value)} />
      <InputField label="Location" value={profile.location} onChange={(value) => updateProfile("location", value)} />
      <InputField label="Website" value={profile.website} onChange={(value) => updateProfile("website", value)} />
      <InputField label="LinkedIn" value={profile.linkedin} onChange={(value) => updateProfile("linkedin", value)} />
      <InputField label="GitHub" value={profile.github} onChange={(value) => updateProfile("github", value)} />
    </div>
  </EditorSection>
);

export const SummaryForm = ({ summary, updateRoot }) => (
  <EditorSection title="Professional summary" icon={FileText}>
    <TextareaField
      label="Summary"
      rows={9}
      value={summary}
      onChange={(value) => updateRoot("summary", value)}
      placeholder="Write 3-5 lines that connect your role, strongest skills, domain, and measurable impact."
    />
  </EditorSection>
);

export const ExperienceForm = ({ items, addItem, removeItem, updateItem, updateBullet, addBullet, removeBullet }) => (
  <EditorSection title="Work experience" icon={BriefcaseBusiness} actionLabel="Add role" onAction={addItem}>
    <div className="stack-list">
      {items.map((item, index) => (
        <RecordCard key={index} title={item.role || `Role ${index + 1}`} onRemove={() => removeItem(index)}>
          <div className="form-grid">
            <InputField label="Role" value={item.role} onChange={(value) => updateItem(index, "role", value)} />
            <InputField label="Company" value={item.company} onChange={(value) => updateItem(index, "company", value)} />
            <InputField label="Location" value={item.location} onChange={(value) => updateItem(index, "location", value)} />
            <InputField label="Start" value={item.start} onChange={(value) => updateItem(index, "start", value)} />
            <InputField label="End" value={item.end} onChange={(value) => updateItem(index, "end", value)} />
          </div>
          <BulletEditor
            bullets={item.bullets}
            onChange={(bulletIndex, value) => updateBullet(index, bulletIndex, value)}
            onAdd={() => addBullet(index)}
            onRemove={(bulletIndex) => removeBullet(index, bulletIndex)}
          />
        </RecordCard>
      ))}
    </div>
  </EditorSection>
);

export const SkillsForm = ({ groups, updateGroup, updateSkill, addGroup, removeGroup, addSkill, removeSkill }) => (
  <EditorSection title="Skill groups" icon={Wrench} actionLabel="Add group" onAction={addGroup}>
    <div className="stack-list">
      {groups.map((group, groupIndex) => (
        <RecordCard key={groupIndex} title={group.label || `Group ${groupIndex + 1}`} onRemove={() => removeGroup(groupIndex)}>
          <InputField label="Group label" value={group.label} onChange={(value) => updateGroup(groupIndex, "label", value)} />
          <div className="skill-editor">
            {group.items.map((skill, skillIndex) => (
              <div key={skillIndex} className="inline-edit">
                <input value={skill} onChange={(event) => updateSkill(groupIndex, skillIndex, event.target.value)} />
                <button type="button" onClick={() => removeSkill(groupIndex, skillIndex)} aria-label="Remove skill">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="inline-action" type="button" onClick={() => addSkill(groupIndex)}>
            <Plus size={14} /> Add skill
          </button>
        </RecordCard>
      ))}
    </div>
  </EditorSection>
);

export const ProjectForm = ({ items, addItem, removeItem, updateItem, updateBullet, addBullet, removeBullet }) => (
  <EditorSection title="Projects" icon={Sparkles} actionLabel="Add project" onAction={addItem}>
    <div className="stack-list">
      {items.map((item, index) => (
        <RecordCard key={index} title={item.name || `Project ${index + 1}`} onRemove={() => removeItem(index)}>
          <div className="form-grid">
            <InputField label="Project name" value={item.name} onChange={(value) => updateItem(index, "name", value)} />
            <InputField label="Role" value={item.role} onChange={(value) => updateItem(index, "role", value)} />
            <InputField label="URL" value={item.url} onChange={(value) => updateItem(index, "url", value)} />
          </div>
          <BulletEditor
            bullets={item.bullets}
            onChange={(bulletIndex, value) => updateBullet(index, bulletIndex, value)}
            onAdd={() => addBullet(index)}
            onRemove={(bulletIndex) => removeBullet(index, bulletIndex)}
          />
        </RecordCard>
      ))}
    </div>
  </EditorSection>
);

export const EducationForm = ({ items, addItem, removeItem, updateItem }) => (
  <EditorSection title="Education" icon={GraduationCap} actionLabel="Add education" onAction={addItem}>
    <div className="stack-list">
      {items.map((item, index) => (
        <RecordCard key={index} title={item.degree || `Education ${index + 1}`} onRemove={() => removeItem(index)}>
          <div className="form-grid">
            <InputField label="Degree" value={item.degree} onChange={(value) => updateItem(index, "degree", value)} />
            <InputField label="Institute" value={item.institute} onChange={(value) => updateItem(index, "institute", value)} />
            <InputField label="Location" value={item.location} onChange={(value) => updateItem(index, "location", value)} />
            <InputField label="Year" value={item.year} onChange={(value) => updateItem(index, "year", value)} />
          </div>
        </RecordCard>
      ))}
    </div>
  </EditorSection>
);

export const CertificationForm = ({ items, addItem, removeItem, updateItem }) => (
  <EditorSection title="Certifications" icon={Award} actionLabel="Add cert" onAction={addItem}>
    <div className="stack-list">
      {items.map((item, index) => (
        <RecordCard key={index} title={item.name || `Certification ${index + 1}`} onRemove={() => removeItem(index)}>
          <div className="form-grid">
            <InputField label="Name" value={item.name} onChange={(value) => updateItem(index, "name", value)} />
            <InputField label="Issuer" value={item.issuer} onChange={(value) => updateItem(index, "issuer", value)} />
            <InputField label="Year" value={item.year} onChange={(value) => updateItem(index, "year", value)} />
            <InputField label="URL" value={item.url} onChange={(value) => updateItem(index, "url", value)} />
          </div>
        </RecordCard>
      ))}
    </div>
  </EditorSection>
);

export const SelectField = ({ label, value, onChange, options }) => (
  <label className="select-field">
    <span>{label}</span>
    <div>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  </label>
);

export const StatusPill = ({ label }) => (
  <span className="status-pill">
    <Check size={13} /> {label}
  </span>
);

const EditorSection = ({ title, icon: Icon, actionLabel, onAction, children }) => (
  <section>
    <div className="editor-heading">
      <div>
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {actionLabel ? (
        <button type="button" className="inline-action" onClick={onAction}>
          <Plus size={14} /> {actionLabel}
        </button>
      ) : null}
    </div>
    {children}
  </section>
);

const RecordCard = ({ title, onRemove, children }) => (
  <div className="record-card">
    <div className="record-card-head">
      <strong>{title}</strong>
      <button type="button" onClick={onRemove} aria-label="Remove item">
        <Trash2 size={15} />
      </button>
    </div>
    {children}
  </div>
);

const BulletEditor = ({ bullets, onChange, onAdd, onRemove }) => (
  <div className="bullet-editor">
    <div className="field-label">Impact bullets</div>
    {bullets.map((bullet, index) => (
      <div key={index} className="bullet-row">
        <textarea value={bullet} rows={2} onChange={(event) => onChange(index, event.target.value)} />
        <button type="button" onClick={() => onRemove(index)} aria-label="Remove bullet">
          <Trash2 size={14} />
        </button>
      </div>
    ))}
    <button className="inline-action" type="button" onClick={onAdd}>
      <Plus size={14} /> Add bullet
    </button>
  </div>
);

const InputField = ({ label, value, onChange, placeholder = "" }) => (
  <label className="field">
    <span>{label}</span>
    <input value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const TextareaField = ({ label, value, onChange, rows = 5, placeholder = "" }) => (
  <label className="field">
    <span>{label}</span>
    <textarea value={value || ""} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </label>
);

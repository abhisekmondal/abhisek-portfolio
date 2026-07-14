import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  Cloud,
  Copy,
  FileJson,
  FileText,
  GraduationCap,
  LayoutTemplate,
  Plus,
  Printer,
  RefreshCcw,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  CertificationForm,
  EducationForm,
  ExperienceForm,
  ProfileForm,
  ProjectForm,
  SelectField,
  SkillsForm,
  StatusPill,
  SummaryForm,
} from "@/components/resume/ResumeEditor";
import ResumePreview from "@/components/resume/ResumePreview";
import { builderSettings, emptyResume, sampleResume } from "@/data/builderDefaults";
import { exportResumeDocx } from "@/lib/exportResumeDocx";
import { exportResumePdfFromElement } from "@/lib/exportResumePdf";
import {
  clone,
  getCompletion,
  getResumeIssues,
  normalizeResume,
  normalizeSettings,
  parseResumeJson,
  readStoredJson,
} from "@/lib/resumeSchema";
import { getResumeLength, getResumeScore } from "@/lib/resumeScore";
import {
  checkApiHealth,
  deleteResumeFromApi,
  getResumeFromApi,
  getStoredUser,
  getClientId,
  importResumeFile,
  listResumesFromApi,
  loginUser,
  logoutUser,
  loadLatestResumeFromApi,
  registerUser,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  saveResumeToApi,
  verifyEmail,
} from "@/lib/resumeApi";

const STORAGE_KEY = "resume-builder-draft-v2";
const SETTINGS_KEY = "resume-builder-settings-v1";
const RESUME_ID_KEY = "resume-builder-current-id-v1";
const PDF_TITLE_SUFFIX = "resume";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "summary", label: "Summary", icon: FileText },
  { id: "experience", label: "Experience", icon: BriefcaseBusiness },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "projects", label: "Projects", icon: Sparkles },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "certifications", label: "Certs", icon: Award },
];

const sectionToggles = [
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certs" },
];

const templateOptions = [
  { id: "ats", label: "ATS", tone: "Minimal", tag: "Job portals" },
  { id: "modern", label: "Modern", tone: "Balanced", tag: "Recommended" },
  { id: "tech", label: "Tech", tone: "Structured", tag: "Engineering" },
  { id: "executive", label: "Executive", tone: "Classic", tag: "Leadership" },
  { id: "graduate", label: "Graduate", tone: "Compact", tag: "Early career" },
  { id: "creative", label: "Creative", tone: "Accent", tag: "Portfolio" },
  { id: "classic", label: "Classic", tone: "Serif", tag: "Traditional" },
  { id: "compact", label: "Compact", tone: "Dense", tag: "One page" },
];

const authContent = {
  login: {
    eyebrow: "Private workspace",
    title: "Sign in to continue",
    body: "Use the account you verified to open your saved resumes, imports, exports, and cloud workspace.",
    submit: "Sign in",
  },
  register: {
    eyebrow: "Create account",
    title: "Start with email verification",
    body: "Create your account first. We will send a verification link before your private workspace is enabled.",
    submit: "Create account",
  },
  forgot: {
    eyebrow: "Password help",
    title: "Reset your password",
    body: "Enter your account email and we will send a secure password reset link.",
    submit: "Send reset link",
  },
  reset: {
    eyebrow: "New password",
    title: "Choose a new password",
    body: "Use the reset link from your email, then sign in with your new password.",
    submit: "Reset password",
  },
};

const Home = () => {
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [resume, setResume] = useState(() => readStoredJson(STORAGE_KEY, sampleResume, normalizeResume));
  const [settings, setSettings] = useState(() => readStoredJson(SETTINGS_KEY, builderSettings, normalizeSettings));
  const [resumeId, setResumeId] = useState(() => localStorage.getItem(RESUME_ID_KEY) || "");
  const [clientId] = useState(() => getClientId());
  const [user, setUser] = useState(() => getStoredUser());
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", resetToken: "" });
  const [verificationPendingEmail, setVerificationPendingEmail] = useState("");
  const [cloudResumes, setCloudResumes] = useState([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");
  const [apiMessage, setApiMessage] = useState("Checking cloud storage...");
  const [saveState, setSaveState] = useState("Saved");
  const [notice, setNotice] = useState("");
  const [pageFit, setPageFit] = useState({ pages: 1, overflow: false, usedPercent: 0 });

  useEffect(() => {
    if (saveState !== "Saving") return undefined;
    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeResume(resume)));
      setSaveState("Saved");
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [resume, saveState]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
  }, [settings]);

  const completion = useMemo(() => getCompletion(resume), [resume]);
  const issues = useMemo(() => getResumeIssues(resume), [resume]);
  const resumeScore = useMemo(() => getResumeScore(resume), [resume]);
  const resumeLength = useMemo(() => getResumeLength(resume), [resume]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return undefined;

    let frameId = 0;
    const measurePageFit = () => {
      const width = preview.getBoundingClientRect().width;
      if (!width) return;

      const onePageHeight = width * (297 / 210);
      const contentHeight = preview.scrollHeight;
      const pages = Math.max(1, Math.ceil((contentHeight - 4) / onePageHeight));
      const usedPercent = Math.max(0, Math.round((contentHeight / onePageHeight) * 100));
      const next = {
        pages,
        overflow: contentHeight > onePageHeight + 8,
        usedPercent,
      };

      setPageFit((current) =>
        current.pages === next.pages && current.overflow === next.overflow && current.usedPercent === next.usedPercent
          ? current
          : next,
      );
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measurePageFit);
    };

    scheduleMeasure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(preview);
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [resume, settings]);

  const openScoreSuggestion = (suggestion) => {
    if (!suggestion.target) return;
    setActiveTab(suggestion.target);
    setNotice(`Opened ${tabs.find((tab) => tab.id === suggestion.target)?.label || "the right"} section for: ${suggestion.text}`);
  };

  useEffect(() => {
    checkCloudStatus({ quiet: true }).then((online) => {
      if (online) refreshCloudResumes({ quiet: true });
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("resetToken");
    const verifyToken = params.get("verifyToken");

    if (verifyToken) {
      setNotice("Verifying your email...");
      verifyEmail({ token: verifyToken })
        .then((result) => {
          setAuthMode("login");
          if (result.email) {
            setAuthForm((current) => ({ ...current, email: result.email, password: "", resetToken: "" }));
          }
          setNotice(result.message || "Your email is verified. Sign in to open your workspace.");
        })
        .catch((error) => {
          setAuthMode("login");
          setNotice(error.message);
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      return;
    }

    if (!resetToken) return;

    setAuthMode("reset");
    setAuthForm((current) => ({ ...current, resetToken }));
    setNotice("Enter a new password to finish resetting your account.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const checkCloudStatus = async ({ quiet = false } = {}) => {
    try {
      await checkApiHealth();
      setApiStatus("online");
      setApiMessage("Cloud storage online");
      if (!quiet) setNotice("Cloud storage is online.");
      return true;
    } catch (error) {
      setApiStatus("offline");
      setApiMessage("Cloud storage offline. Local autosave is active.");
      if (!quiet) setNotice(`Cloud storage unavailable: ${error.message}`);
      return false;
    }
  };

  const updateProfile = (field, value) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      profile: { ...current.profile, [field]: value },
    }));
  };

  const updateRoot = (field, value) => {
    setSaveState("Saving");
    setResume((current) => ({ ...current, [field]: value }));
  };

  const updateSectionVisibility = (section, visible) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      sections: { ...current.sections, [section]: visible },
    }));
  };

  const updateCollection = (collection, index, field, value) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      [collection]: current[collection].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const updateBullet = (collection, itemIndex, bulletIndex, value) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      [collection]: current[collection].map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              bullets: item.bullets.map((bullet, bIndex) => (bIndex === bulletIndex ? value : bullet)),
            }
          : item,
      ),
    }));
  };

  const updateSkill = (groupIndex, itemIndex, value) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      skills: current.skills.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              items: group.items.map((skill, sIndex) => (sIndex === itemIndex ? value : skill)),
            }
          : group,
      ),
    }));
  };

  const addItem = (collection, item) => {
    setSaveState("Saving");
    setResume((current) => ({ ...current, [collection]: [...current[collection], clone(item)] }));
  };

  const removeItem = (collection, index) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      [collection]: current[collection].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addBullet = (collection, index) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      [collection]: current[collection].map((item, itemIndex) =>
        itemIndex === index ? { ...item, bullets: [...item.bullets, ""] } : item,
      ),
    }));
  };

  const removeBullet = (collection, itemIndex, bulletIndex) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      [collection]: current[collection].map((item, index) =>
        index === itemIndex
          ? { ...item, bullets: item.bullets.filter((_, bIndex) => bIndex !== bulletIndex) }
          : item,
      ),
    }));
  };

  const addSkill = (groupIndex) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      skills: current.skills.map((group, index) =>
        index === groupIndex ? { ...group, items: [...group.items, ""] } : group,
      ),
    }));
  };

  const removeSkill = (groupIndex, skillIndex) => {
    setSaveState("Saving");
    setResume((current) => ({
      ...current,
      skills: current.skills.map((group, index) =>
        index === groupIndex
          ? { ...group, items: group.items.filter((_, sIndex) => sIndex !== skillIndex) }
          : group,
      ),
    }));
  };

  const resetToSample = () => {
    setSaveState("Saving");
    setResumeId("");
    localStorage.removeItem(RESUME_ID_KEY);
    setNotice("Sample resume loaded.");
    setResume(normalizeResume(sampleResume));
    setActiveTab("profile");
  };

  const clearResume = () => {
    setSaveState("Saving");
    setResumeId("");
    localStorage.removeItem(RESUME_ID_KEY);
    setNotice("Blank resume created. Fill the editor fields, then use Cloud Save.");
    setResume(normalizeResume(emptyResume));
    setActiveTab("profile");
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(normalizeResume(resume), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resume.profile.name || "resume"}-builder-data.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    const fileBase = getExportFileName(resume);

    try {
      setNotice("Preparing PDF export...");
      await exportResumePdfFromElement(previewRef.current, `${fileBase}.pdf`, normalizeResume(resume));
      setNotice(`PDF exported: ${fileBase}.pdf`);
    } catch (error) {
      setNotice(`PDF export failed: ${error.message}`);
    }
  };

  const exportDocx = async () => {
    const fileBase = getExportFileName(resume);

    try {
      setNotice("Preparing DOCX export...");
      await exportResumeDocx(normalizeResume(resume), `${fileBase}.docx`);
      setNotice(`DOCX exported: ${fileBase}.docx`);
    } catch (error) {
      setNotice(`DOCX export failed: ${error.message}`);
    }
  };

  const importResume = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setCloudLoading(true);
      setNotice(`Importing ${file.name}...`);
      let importedResume;

      if (file.name.toLowerCase().endsWith(".json") || file.type === "application/json") {
        const text = await file.text();
        const result = parseResumeJson(text);
        if (!result.ok) {
          setNotice(result.error);
          return;
        }
        importedResume = result.resume;
      } else {
        const result = await importResumeFile(file);
        importedResume = result.resume;
      }

      setSaveState("Saving");
      setResumeId("");
      localStorage.removeItem(RESUME_ID_KEY);
      setResume(normalizeResume(importedResume));
      setActiveTab("profile");
      setNotice(`Imported ${file.name}. Review the extracted fields before saving.`);
    } catch (error) {
      setNotice(`Import failed: ${error.message}`);
    } finally {
      setCloudLoading(false);
      event.target.value = "";
    }
  };

  const saveToCloud = async () => {
    try {
      setCloudLoading(true);
      setNotice("Saving to database...");
      const result = await saveResumeToApi(resumeId, normalizeResume(resume));
      setApiStatus("online");
      setApiMessage("Cloud storage online");
      setResumeId(result.resume.id);
      localStorage.setItem(RESUME_ID_KEY, result.resume.id);
      setNotice(`Saved to database: ${result.resume.title}`);
      await refreshCloudResumes({ quiet: true });
    } catch (error) {
      setApiStatus("offline");
      setApiMessage("Cloud storage offline. Local autosave is active.");
      setNotice(`Database save failed: ${error.message}`);
    } finally {
      setCloudLoading(false);
    }
  };

  const saveAsNewCloudResume = async () => {
    try {
      setCloudLoading(true);
      setNotice("Creating a database copy...");
      const result = await saveResumeToApi("", normalizeResume(resume));
      setApiStatus("online");
      setApiMessage("Cloud storage online");
      setResumeId(result.resume.id);
      localStorage.setItem(RESUME_ID_KEY, result.resume.id);
      setNotice(`Created new database resume: ${result.resume.title}`);
      await refreshCloudResumes({ quiet: true });
    } catch (error) {
      setApiStatus("offline");
      setApiMessage("Cloud storage offline. Local autosave is active.");
      setNotice(`Database copy failed: ${error.message}`);
    } finally {
      setCloudLoading(false);
    }
  };

  const loadLatestFromCloud = async () => {
    try {
      setCloudLoading(true);
      setNotice("Loading latest database resume...");
      const result = await loadLatestResumeFromApi();
      setApiStatus("online");
      setApiMessage("Cloud storage online");
      if (!result?.resume) {
        setNotice("No database resumes found yet.");
        return;
      }
      setResumeId(result.resume.id);
      localStorage.setItem(RESUME_ID_KEY, result.resume.id);
      setSaveState("Saving");
      setResume(normalizeResume(result.resume.data));
      setNotice(`Loaded from database: ${result.resume.title}`);
      await refreshCloudResumes({ quiet: true });
    } catch (error) {
      setApiStatus("offline");
      setApiMessage("Cloud storage offline. Local autosave is active.");
      setNotice(`Database load failed: ${error.message}`);
    } finally {
      setCloudLoading(false);
    }
  };

  const refreshCloudResumes = async ({ quiet = false } = {}) => {
    try {
      setCloudLoading(true);
      if (!quiet) setNotice("Refreshing database resumes...");
      const result = await listResumesFromApi();
      setApiStatus("online");
      setApiMessage("Cloud storage online");
      setCloudResumes(result.resumes || []);
      if (!quiet) setNotice(`Loaded ${result.resumes?.length || 0} database resumes.`);
    } catch (error) {
      setApiStatus("offline");
      setApiMessage("Cloud storage offline. Local autosave is active.");
      if (!quiet) setNotice(`Could not load database resumes: ${error.message}`);
    } finally {
      setCloudLoading(false);
    }
  };

  const loadCloudResume = async (id) => {
    try {
      setCloudLoading(true);
      setNotice("Loading database resume...");
      const result = await getResumeFromApi(id);
      setApiStatus("online");
      setApiMessage("Cloud storage online");
      setResumeId(result.resume.id);
      localStorage.setItem(RESUME_ID_KEY, result.resume.id);
      setSaveState("Saving");
      setResume(normalizeResume(result.resume.data));
      setNotice(`Loaded from database: ${result.resume.title}`);
    } catch (error) {
      setApiStatus("offline");
      setApiMessage("Cloud storage offline. Local autosave is active.");
      setNotice(`Database load failed: ${error.message}`);
    } finally {
      setCloudLoading(false);
    }
  };

  const deleteCloudResume = async (id) => {
    try {
      setCloudLoading(true);
      setNotice("Deleting database resume...");
      await deleteResumeFromApi(id);
      setApiStatus("online");
      setApiMessage("Cloud storage online");
      if (resumeId === id) {
        setResumeId("");
        localStorage.removeItem(RESUME_ID_KEY);
      }
      await refreshCloudResumes({ quiet: true });
      setNotice("Database resume deleted.");
    } catch (error) {
      setApiStatus("offline");
      setApiMessage("Cloud storage offline. Local autosave is active.");
      setNotice(`Database delete failed: ${error.message}`);
    } finally {
      setCloudLoading(false);
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    try {
      const actionCopy = {
        login: "Signing in...",
        register: "Creating account...",
        forgot: "Preparing reset instructions...",
        reset: "Resetting password...",
      };
      setNotice(actionCopy[authMode] || "Working...");
      setCloudLoading(true);

      if (authMode === "forgot") {
        const result = await requestPasswordReset({ email: authForm.email });
        setApiStatus("online");
        setApiMessage("Cloud storage online");
        setAuthForm((current) => ({ ...current, resetToken: result.resetToken || "" }));
        setAuthMode("reset");
        setNotice(
          result.resetToken
            ? `Reset token generated for local testing. Paste or keep the token and set a new password.`
            : result.message,
        );
        return;
      }

      if (authMode === "reset") {
        const result = await resetPassword({ token: authForm.resetToken, password: authForm.password });
        setApiStatus("online");
        setApiMessage("Cloud storage online");
        setAuthForm({ name: "", email: authForm.email, password: "", resetToken: "" });
        setAuthMode("login");
        setNotice(result.message);
        return;
      }

      if (authMode === "register") {
        const result = await registerUser(authForm);
        setApiStatus("online");
        setApiMessage("Cloud storage online");
        setAuthMode("login");
        setAuthForm({ name: "", email: authForm.email, password: "", resetToken: "" });
        setVerificationPendingEmail("");
        setNotice(result.message || "Check your email to verify your account.");
        return;
      }

      const result = await loginUser(authForm);
      setApiStatus("online");
      setApiMessage("Cloud storage online");
      setUser(result.user);
      setAuthForm({ name: "", email: "", password: "", resetToken: "" });
      setVerificationPendingEmail("");
      setNotice(
        result.claimed
          ? `Signed in as ${result.user.email}. Moved ${result.claimed} workspace resume${result.claimed === 1 ? "" : "s"} into this account.`
          : `Signed in as ${result.user.email}.`,
      );
      await refreshCloudResumes({ quiet: true });
    } catch (error) {
      setApiStatus("offline");
      setApiMessage("Cloud storage offline. Local autosave is active.");
      if (authMode === "login" && error.code === "EMAIL_NOT_VERIFIED") {
        setApiStatus("online");
        setApiMessage("Cloud storage online");
        setVerificationPendingEmail(error.details?.email || authForm.email);
      }
      setNotice(error.message);
    } finally {
      setCloudLoading(false);
    }
  };

  const changeAuthMode = (mode) => {
    setVerificationPendingEmail("");
    setAuthMode(mode);
  };

  const resendVerification = async () => {
    try {
      setNotice("Sending verification email...");
      setCloudLoading(true);
      const result = await resendVerificationEmail({ email: authForm.email || verificationPendingEmail, password: authForm.password });
      setApiStatus("online");
      setApiMessage("Cloud storage online");
      setVerificationPendingEmail(authForm.email || verificationPendingEmail);
      setNotice(result.message);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setCloudLoading(false);
    }
  };

  const logout = async () => {
    logoutUser();
    const sample = normalizeResume(sampleResume);
    setUser(null);
    setResumeId("");
    localStorage.removeItem(RESUME_ID_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
    setCloudResumes([]);
    setSaveState("Saved");
    setResume(sample);
    setActiveTab("profile");
    setNotice("");
    await refreshCloudResumes({ quiet: true });
  };

  if (!user) {
    return (
      <div className="builder-app min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <header className="guest-topbar">
          <div className="topbar-copy">
            <div className="section-label">
              <LayoutTemplate size={14} /> Resume Builder
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold mt-3">
              Build a polished resume with live preview.
            </h1>
            <p>
              Preview the builder with sample data. Create an account, verify your email,
              then sign in to unlock editing, cloud storage, imports, exports, and PDF tools.
            </p>
            <div className="product-highlights">
              <span>Sample preview</span>
              <span>ATS-friendly layout</span>
              <span>Cloud workspace after login</span>
            </div>
          </div>
        </header>

        <main className="guest-layout">
          <section className="guest-auth no-print">
            <div>
              <div className="field-label">{authContent[authMode].eyebrow}</div>
              <h2>{authContent[authMode].title}</h2>
              <p>{authContent[authMode].body}</p>
            </div>
            {notice ? <p className="auth-notice">{notice}</p> : null}
            <AccountPanel
              user={user}
              mode={authMode}
              form={authForm}
              onModeChange={changeAuthMode}
              onFormChange={(field, value) => {
                if (field === "email") setVerificationPendingEmail("");
                setAuthForm((current) => ({ ...current, [field]: value }));
              }}
              onSubmit={submitAuth}
              onLogout={logout}
              onResendVerification={resendVerification}
              canResendVerification={authMode === "login" && Boolean(verificationPendingEmail)}
              loading={cloudLoading}
            />
          </section>

          <section className="guest-preview" aria-label="Sample resume preview">
            <div className="guest-preview-head no-print">
            <div>
              <div className="field-label">Sample resume</div>
              <strong>Preview only</strong>
            </div>
          </div>
            <ResumePreview resume={sampleResume} settings={settings} />
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="builder-app min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="builder-topbar no-print">
        <div className="topbar-copy">
          <div className="section-label">
            <LayoutTemplate size={14} /> Resume Builder
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold mt-3">
            Create a polished resume in minutes.
          </h1>
          <p>
            Start from a neutral sample, edit each section with focused fields, then save to cloud,
            export JSON, or print a clean PDF.
          </p>
          <div className="product-highlights">
            <span>Live preview</span>
            <span>Local autosave</span>
            <span>Cloud library</span>
            <span>PDF export</span>
          </div>
        </div>
        <div className="topbar-actions">
          <StatusPill label={saveState} />
          <CloudStatus status={apiStatus} loading={cloudLoading} message={apiMessage} />
          <button className="btn btn-ghost" onClick={exportJson}>
            <FileJson size={14} /> Export
          </button>
          <button className="btn btn-ghost" onClick={exportDocx}>
            <FileText size={14} /> Export DOCX
          </button>
          <button className="btn btn-ghost" onClick={loadLatestFromCloud} disabled={cloudLoading}>
            <Cloud size={14} /> Load Latest
          </button>
          <button className="btn btn-ghost" onClick={saveAsNewCloudResume} disabled={cloudLoading}>
            <Copy size={14} /> Save Copy
          </button>
          <button className="btn btn-ghost" onClick={saveToCloud} disabled={cloudLoading}>
            <Cloud size={14} /> Cloud Save
          </button>
          <button className="btn btn-primary" onClick={exportPdf}>
            <Printer size={14} /> Export PDF
          </button>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept=".json,.txt,.pdf,.docx,application/json,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={importResume}
          />
        </div>
      </header>

      <main className="builder-layout">
        <aside className="builder-panel no-print">
          <ResumeScoreCard score={resumeScore} completion={completion} onOpenSuggestion={openScoreSuggestion} />
          <ResumeLengthCard length={resumeLength} />
          <PageFitCard pageFit={pageFit} onUseCompact={() => setSettings((current) => ({ ...current, density: "compact" }))} />

          <StartPanel
            onBlank={clearResume}
            onSample={resetToSample}
            onImport={() => fileInputRef.current?.click()}
            importing={cloudLoading}
          />

          <div className="editor-intro">
            <div className="field-label">Edit resume details</div>
            <p>Select a section below and fill in the fields. The preview updates instantly.</p>
          </div>

          <nav className="builder-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "active" : ""}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="builder-editor">
            {activeTab === "profile" && <ProfileForm profile={resume.profile} updateProfile={updateProfile} />}
            {activeTab === "summary" && (
              <SummaryForm summary={resume.summary} updateRoot={updateRoot} />
            )}
            {activeTab === "experience" && (
              <ExperienceForm
                items={resume.experience}
                addItem={() => addItem("experience", emptyResume.experience[0])}
                removeItem={(index) => removeItem("experience", index)}
                updateItem={(index, field, value) => updateCollection("experience", index, field, value)}
                updateBullet={(itemIndex, bulletIndex, value) =>
                  updateBullet("experience", itemIndex, bulletIndex, value)
                }
                addBullet={(index) => addBullet("experience", index)}
                removeBullet={(itemIndex, bulletIndex) => removeBullet("experience", itemIndex, bulletIndex)}
              />
            )}
            {activeTab === "skills" && (
              <SkillsForm
                groups={resume.skills}
                updateGroup={(index, field, value) => updateCollection("skills", index, field, value)}
                updateSkill={updateSkill}
                addGroup={() => addItem("skills", { label: "Skill Group", items: [""] })}
                removeGroup={(index) => removeItem("skills", index)}
                addSkill={addSkill}
                removeSkill={removeSkill}
              />
            )}
            {activeTab === "projects" && (
              <ProjectForm
                items={resume.projects}
                addItem={() => addItem("projects", emptyResume.projects[0])}
                removeItem={(index) => removeItem("projects", index)}
                updateItem={(index, field, value) => updateCollection("projects", index, field, value)}
                updateBullet={(itemIndex, bulletIndex, value) => updateBullet("projects", itemIndex, bulletIndex, value)}
                addBullet={(index) => addBullet("projects", index)}
                removeBullet={(itemIndex, bulletIndex) => removeBullet("projects", itemIndex, bulletIndex)}
              />
            )}
            {activeTab === "education" && (
              <EducationForm
                items={resume.education}
                addItem={() => addItem("education", emptyResume.education[0])}
                removeItem={(index) => removeItem("education", index)}
                updateItem={(index, field, value) => updateCollection("education", index, field, value)}
              />
            )}
            {activeTab === "certifications" && (
              <CertificationForm
                items={resume.certifications}
                addItem={() => addItem("certifications", emptyResume.certifications[0])}
                removeItem={(index) => removeItem("certifications", index)}
                updateItem={(index, field, value) => updateCollection("certifications", index, field, value)}
              />
            )}
          </div>

          {(notice || issues.length > 0) && (
            <div className="builder-insights">
              {notice ? <p>{notice}</p> : null}
              {issues.length > 0 ? (
                <ul>
                  {issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          <div className="section-visibility">
            <div className="field-label">Visible sections</div>
            <div>
              {sectionToggles.map((section) => (
                <label key={section.id} className="toggle-chip">
                  <input
                    type="checkbox"
                    checked={resume.sections?.[section.id] !== false}
                    onChange={(event) => updateSectionVisibility(section.id, event.target.checked)}
                  />
                  <span>{section.label}</span>
                </label>
              ))}
            </div>
          </div>

          <ResumeLibrary
            resumes={cloudResumes}
            activeId={resumeId}
            clientId={clientId}
            user={user}
            loading={cloudLoading}
            apiStatus={apiStatus}
            apiMessage={apiMessage}
            onCheckCloud={() => checkCloudStatus()}
            onRefresh={() => refreshCloudResumes()}
            onLoad={loadCloudResume}
            onDelete={deleteCloudResume}
          />

          <AccountPanel
            user={user}
            mode={authMode}
            form={authForm}
            onModeChange={changeAuthMode}
            onFormChange={(field, value) => {
              if (field === "email") setVerificationPendingEmail("");
              setAuthForm((current) => ({ ...current, [field]: value }));
            }}
            onSubmit={submitAuth}
            onLogout={logout}
            onResendVerification={resendVerification}
            canResendVerification={authMode === "login" && Boolean(verificationPendingEmail)}
            loading={cloudLoading}
          />
        </aside>

        <section className="preview-stage">
          <div className="preview-toolbar no-print">
            <div className="template-controls">
              <TemplatePicker
                value={settings.template}
                accent={settings.accent}
                onChange={(value) => setSettings((current) => ({ ...current, template: value }))}
              />
              <div className="template-fine-controls">
                <SelectField
                  label="Density"
                  value={settings.density}
                  onChange={(value) => setSettings((current) => ({ ...current, density: value }))}
                  options={[
                    { value: "comfortable", label: "Comfortable" },
                    { value: "compact", label: "Compact" },
                  ]}
                />
                <label className="color-field">
                  <span>Accent</span>
                  <input
                    type="color"
                    value={settings.accent}
                    onChange={(event) => setSettings((current) => ({ ...current, accent: event.target.value }))}
                  />
                </label>
              </div>
            </div>
            <span className="font-mono text-xs text-[var(--text-mute)]">
              A4 export with fixed margins and print-safe page breaks.
            </span>
          </div>

          <ResumePreview ref={previewRef} resume={resume} settings={settings} />
        </section>
      </main>
    </div>
  );
};

const CloudStatus = ({ status, loading, message }) => (
  <span className={`cloud-status ${status}`}>
    <Cloud size={13} /> {loading ? "Working..." : message}
  </span>
);

const TemplatePicker = ({ value, accent, onChange }) => (
  <section className="template-picker" aria-label="Resume templates">
    <div className="template-picker-head">
      <div>
        <div className="field-label">Templates</div>
        <strong>{templateOptions.find((template) => template.id === value)?.label || "Modern"}</strong>
      </div>
      <span>{templateOptions.length} styles</span>
    </div>
    <div className="template-grid">
      {templateOptions.map((template) => (
        <button
          key={template.id}
          type="button"
          className={`template-card template-card-${template.id} ${value === template.id ? "active" : ""}`}
          onClick={() => onChange(template.id)}
          aria-pressed={value === template.id}
        >
          <TemplateSwatch template={template.id} accent={accent} />
          <span>
            <strong>{template.label}</strong>
            <small>{template.tone}</small>
          </span>
          <em>{template.tag}</em>
        </button>
      ))}
    </div>
  </section>
);

const TemplateSwatch = ({ template, accent }) => (
  <span className={`template-swatch swatch-${template}`} style={{ "--swatch-accent": accent }}>
    <i className="swatch-header" />
    <b />
    <b />
    <b />
    <em />
  </span>
);

const ResumeLibrary = ({
  resumes,
  activeId,
  clientId,
  user,
  loading,
  apiStatus,
  apiMessage,
  onCheckCloud,
  onRefresh,
  onLoad,
  onDelete,
}) => (
  <section className="resume-library no-print">
    <div className="resume-library-head">
      <div>
        <div className="field-label">Database resumes</div>
        <strong>{loading ? "Refreshing..." : `${resumes.length} saved`}</strong>
        <small>{user ? user.email : `Workspace ${clientId.slice(0, 8)}`}</small>
      </div>
      <button type="button" className="inline-action" onClick={apiStatus === "offline" ? onCheckCloud : onRefresh} disabled={loading}>
        <RefreshCcw size={14} /> Refresh
      </button>
    </div>
    <p className={`cloud-message ${apiStatus}`}>{apiMessage}</p>

    {resumes.length ? (
      <div className="resume-library-list">
        {resumes.map((item) => (
          <article key={item.id} className={item.id === activeId ? "active" : ""}>
            <button type="button" className="resume-library-main" onClick={() => onLoad(item.id)} disabled={loading}>
              <span>{item.title}</span>
              <small>{formatDate(item.updated_at)}</small>
            </button>
            <button type="button" className="resume-library-delete" onClick={() => onDelete(item.id)} aria-label="Delete resume" disabled={loading}>
              <Trash2 size={14} />
            </button>
          </article>
        ))}
      </div>
    ) : (
      <p className="resume-library-empty">No database resumes yet. Use Cloud Save to create one.</p>
    )}
  </section>
);

const ResumeScoreCard = ({ score, completion, onOpenSuggestion }) => (
  <section className="resume-score-card no-print">
    <div className="score-card-head">
      <div>
        <div className="field-label">Resume score</div>
        <strong>{score.score}/100</strong>
      </div>
      <span className={`score-grade score-${score.label.toLowerCase().replace(/\s+/g, "-")}`}>{score.label}</span>
    </div>
    <div className="score-track score-track-large" aria-label={`Resume score ${score.score} out of 100`}>
      <span style={{ width: `${score.score}%` }} />
    </div>
    <p>{score.summary}</p>
    <div className="score-meta">
      <span>Completion {completion}%</span>
      <span>{score.suggestions.length} suggested fix{score.suggestions.length === 1 ? "" : "es"}</span>
    </div>
    {score.suggestions.length ? (
      <ul className="score-suggestions">
        {score.suggestions.slice(0, 3).map((item) => (
          <li key={item.text}>
            <button type="button" onClick={() => onOpenSuggestion(item)}>
              <span>{item.text}</span>
              <small>{tabs.find((tab) => tab.id === item.target)?.label || "Open"}</small>
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <p className="score-done">No major gaps detected.</p>
    )}
  </section>
);

const ResumeLengthCard = ({ length }) => (
  <section className="resume-length-card no-print">
    <div className="length-card-head">
      <div>
        <div className="field-label">Resume length</div>
        <strong>{length.words.toLocaleString()} words</strong>
      </div>
      <span className={`length-grade length-${length.status}`}>{length.label}</span>
    </div>
    <div className="length-meter" aria-label={`Resume length ${length.words} words. Target ${length.target}`}>
      <span style={{ width: `${length.percent}%` }} />
    </div>
    <div className="length-bounds">
      <span>{length.min}</span>
      <span>Target {length.target}</span>
      <span>{length.max}</span>
    </div>
    <p>{length.message}</p>
  </section>
);

const PageFitCard = ({ pageFit, onUseCompact }) => (
  <section className={`page-fit-card ${pageFit.overflow ? "page-fit-overflow" : "page-fit-ok"} no-print`}>
    <div className="page-fit-head">
      <div>
        <div className="field-label">A4 page fit</div>
        <strong>{pageFit.overflow ? `${pageFit.pages} pages` : "Fits 1 page"}</strong>
      </div>
      <span>{Math.min(pageFit.usedPercent, 999)}%</span>
    </div>
    <div className="page-fit-meter" aria-label={`Resume uses ${pageFit.usedPercent}% of one A4 page`}>
      <span style={{ width: `${Math.min(pageFit.usedPercent, 100)}%` }} />
    </div>
    <p>
      {pageFit.overflow
        ? "This resume currently spills beyond a single A4 page. Use Compact density, trim bullets, or hide lower-priority sections."
        : "Current content fits inside one A4 page for the selected template and density."}
    </p>
    {pageFit.overflow ? (
      <button type="button" className="page-fit-action" onClick={onUseCompact}>
        Use Compact density
      </button>
    ) : null}
  </section>
);

const AccountPanel = ({
  user,
  mode,
  form,
  onModeChange,
  onFormChange,
  onSubmit,
  onLogout,
  onResendVerification,
  canResendVerification,
  loading,
}) => (
  <section className="account-panel no-print">
    <div className="field-label">Account</div>
    {user ? (
      <div className="account-card">
        <strong>{user.name || user.email}</strong>
        <span>{user.email}</span>
        <button type="button" className="inline-action" onClick={onLogout} disabled={loading}>
          Sign out
        </button>
      </div>
    ) : (
      <form onSubmit={onSubmit} className="account-form">
        <div className="auth-mode">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => onModeChange("login")}>
            Sign in
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => onModeChange("register")}>
            Create account
          </button>
        </div>
        <div className="auth-form-heading">
          <strong>{authContent[mode].title}</strong>
          <span>{authContent[mode].body}</span>
        </div>
        {mode === "register" ? (
          <label className="auth-field">
            <span>Name</span>
            <input value={form.name} placeholder="Your name" onChange={(event) => onFormChange("name", event.target.value)} />
          </label>
        ) : null}
        {mode !== "reset" ? (
          <label className="auth-field">
            <span>Email</span>
            <input value={form.email} type="email" placeholder="you@example.com" onChange={(event) => onFormChange("email", event.target.value)} />
          </label>
        ) : null}
        {mode === "reset" ? (
          <label className="auth-field">
            <span>Reset token</span>
            <input
              value={form.resetToken}
              placeholder="Paste reset token"
              onChange={(event) => onFormChange("resetToken", event.target.value)}
            />
          </label>
        ) : null}
        {mode !== "forgot" ? (
          <label className="auth-field">
            <span>{mode === "reset" ? "New password" : "Password"}</span>
            <input
              value={form.password}
              type="password"
              placeholder={mode === "reset" ? "At least 8 characters" : "Your password"}
              onChange={(event) => onFormChange("password", event.target.value)}
            />
          </label>
        ) : null}
        <button type="submit" className="inline-action" disabled={loading}>
          {authContent[mode].submit}
        </button>
        {mode === "login" && canResendVerification ? (
          <div className="verify-callout">
            <strong>Email verification pending</strong>
            <span>Keep your password entered and request a fresh verification link.</span>
            <button type="button" className="text-action" onClick={onResendVerification} disabled={loading}>
              Resend verification email
            </button>
          </div>
        ) : null}
        {mode === "login" ? (
          <div className="auth-secondary">
            <button type="button" className="text-action" onClick={() => onModeChange("forgot")}>
              Forgot password?
            </button>
          </div>
        ) : null}
        {mode === "forgot" || mode === "reset" ? (
          <div className="auth-secondary">
            <button type="button" className="text-action" onClick={() => onModeChange("login")}>
              Back to sign in
            </button>
          </div>
        ) : null}
      </form>
    )}
  </section>
);

const StartPanel = ({ onBlank, onSample, onImport, importing }) => (
  <section className="start-panel no-print">
    <div>
      <div className="field-label">Quick start</div>
      <h2>Choose how you want to begin</h2>
      <p>Use the sample to understand the structure, start clean, or import an existing Word, PDF, text, or JSON resume.</p>
    </div>
    <div className="start-actions">
      <button type="button" onClick={onBlank}>
        <Plus size={14} />
        <span>
          <strong>Blank resume</strong>
          <small>Start with empty fields</small>
        </span>
      </button>
      <button type="button" onClick={onSample}>
        <RefreshCcw size={14} />
        <span>
          <strong>Sample resume</strong>
          <small>Load realistic demo content</small>
        </span>
      </button>
      <button type="button" onClick={onImport} disabled={importing}>
        <Upload size={14} />
        <span>
          <strong>Import resume</strong>
          <small>DOCX, PDF, TXT, or JSON</small>
        </span>
      </button>
    </div>
  </section>
);

function formatDate(value) {
  if (!value) return "Not saved";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getExportFileName(resume) {
  const base = [resume.profile?.name, PDF_TITLE_SUFFIX]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return base || PDF_TITLE_SUFFIX;
}

export default Home;

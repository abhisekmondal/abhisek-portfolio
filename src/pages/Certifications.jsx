import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BadgeCheck, ExternalLink, ShieldCheck } from "lucide-react";
import { certifications } from "@/data/resumeData";

const Certifications = () => {
  const issuers = [...new Set(certifications.map((cert) => cert.issuer))];
  const withVerification = certifications.filter((cert) => cert.verifyUrl).length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg-2)]/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="btn btn-ghost text-xs" data-testid="back-to-home">
            <ArrowLeft size={14} /> Back to portfolio
          </Link>
          <Link to="/resume" className="btn btn-ghost text-xs" data-testid="certifications-resume-link">
            Resume <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      <header className="relative overflow-hidden bg-grid bg-grain">
        <div className="absolute inset-0 glow pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-14">
          <div className="section-label">
            <ShieldCheck size={14} /> Certifications
          </div>
          <h1 className="mt-5 font-display text-4xl md:text-6xl font-extrabold leading-[1.02] tracking-tight">
            Credential path,<br />
            verification-ready.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-[var(--text-soft)] leading-relaxed">
            This page keeps certification details in one place and links out to the official
            Microsoft and Cisco credential pages. When you have personal credential URLs or IDs,
            you can add them in the data file and the verification buttons will light up automatically.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Credentials listed" value={String(certifications.length)} />
            <StatCard label="Issuers covered" value={String(issuers.length)} />
            <StatCard label="Ready to verify" value={String(withVerification)} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {certifications.map((cert, index) => (
            <article
              key={cert.name}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--accent)] transition-colors"
              data-testid={`certification-card-${index}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="section-label">{cert.issuer}</div>
                  <h2 className="mt-4 font-display text-2xl font-bold leading-tight">{cert.name}</h2>
                </div>
                <span className="inline-flex items-center rounded-full border border-[var(--border-2)] bg-[var(--bg-2)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-mute)]">
                  {cert.code}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {cert.level ? <MetaChip>{cert.level}</MetaChip> : null}
                {cert.focus ? <MetaChip>{cert.focus}</MetaChip> : null}
                <MetaChip>{cert.status || "Verification setup pending"}</MetaChip>
              </div>

              <dl className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
                <DetailItem label="Credential ID" value={cert.credentialId || "Add your credential ID"} muted={!cert.credentialId} />
                <DetailItem label="Issued" value={cert.issueDate || "Add issue date"} muted={!cert.issueDate} />
                <DetailItem label="Expires" value={cert.expiryDate || "Add expiry date or renewal cadence"} muted={!cert.expiryDate} />
                <DetailItem label="Issuer" value={cert.issuer} />
              </dl>

              <div className="mt-6 flex flex-wrap gap-3">
                {cert.verifyUrl ? (
                  <a
                    href={cert.verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    data-testid={`verify-certification-${index}`}
                  >
                    <BadgeCheck size={14} /> Verify Credential
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="btn btn-primary opacity-60 cursor-not-allowed"
                    data-testid={`verify-certification-disabled-${index}`}
                  >
                    <BadgeCheck size={14} /> Add Verify URL
                  </button>
                )}

                {cert.detailsUrl ? (
                  <a
                    href={cert.detailsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                    data-testid={`certification-details-${index}`}
                  >
                    <ExternalLink size={14} /> Official Details
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
          <div className="section-label">Credential Notes</div>
          <p className="mt-4 max-w-3xl text-[var(--text-soft)] leading-relaxed">
            Official verification links are available wherever public credential pages are shared.
            Some entries may only show issuer details or earned dates until a public verification
            URL is available from the certification provider.
          </p>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] px-5 py-6">
    <div className="font-display text-4xl font-bold text-white">{value}</div>
    <div className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-mute)]">
      {label}
    </div>
  </div>
);

const MetaChip = ({ children }) => <span className="chip">{children}</span>;

const DetailItem = ({ label, value, muted = false }) => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] px-4 py-3">
    <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-mute)]">{label}</dt>
    <dd className={`mt-2 ${muted ? "text-[var(--text-mute)]" : "text-[var(--text-soft)]"}`}>{value}</dd>
  </div>
);

export default Certifications;

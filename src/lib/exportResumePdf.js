import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const A4 = {
  widthPt: 595.28,
  heightPt: 841.89,
};

export async function exportResumePdfFromElement(sourceElement, fileName = "resume.pdf", resume = null) {
  if (!sourceElement) {
    throw new Error("Resume preview is not ready for export.");
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const exportNode = createExportNode(sourceElement);
  document.body.appendChild(exportNode);

  try {
    const exportRect = exportNode.getBoundingClientRect();
    const canvas = await html2canvas(exportNode, {
      backgroundColor: "#ffffff",
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      logging: false,
      windowWidth: exportNode.scrollWidth,
      windowHeight: exportNode.scrollHeight,
    });

    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    const canvasScale = canvas.height / exportRect.height;
    const pageHeightPx = (A4.heightPt * canvas.width) / A4.widthPt;
    const pageBreaks = getSafePageBreaks(exportNode, exportRect, canvas.height, canvasScale, pageHeightPx);

    doc.setProperties({
      title: fileName.replace(/\.pdf$/i, ""),
      subject: "Resume",
      creator: "Resume Builder",
    });

    pageBreaks.slice(0, -1).forEach((startY, index) => {
      const endY = pageBreaks[index + 1];
      const pageCanvas = cropCanvas(canvas, startY, endY - startY);
      const pageHeightPt = (pageCanvas.height * A4.widthPt) / pageCanvas.width;
      if (index > 0) doc.addPage();
      if (index === 0) addSearchableTextLayer(doc, resume);
      doc.addImage(pageCanvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, A4.widthPt, pageHeightPt);
    });

    if (pageBreaks.length === 1) {
      addSearchableTextLayer(doc, resume);
      doc.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, A4.widthPt, (canvas.height * A4.widthPt) / canvas.width);
    }

    doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
  } finally {
    exportNode.remove();
  }
}

function addSearchableTextLayer(doc, resume) {
  const text = buildResumeText(resume);
  if (!text) return;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(1);
  doc.setTextColor(255, 255, 255);

  const lines = doc.splitTextToSize(text, A4.widthPt - 24);
  let y = 6;
  lines.forEach((line) => {
    if (y > A4.heightPt - 6) return;
    doc.text(line, 6, y);
    y += 2;
  });
}

function buildResumeText(resume) {
  if (!resume || typeof resume !== "object") return "";

  const profile = resume.profile || {};
  const sections = resume.sections || {};
  const parts = [
    profile.name,
    profile.title,
    profile.email,
    profile.phone,
    profile.location,
    profile.website,
    profile.linkedin,
    profile.github,
  ];

  if (sections.summary !== false) {
    parts.push("Professional Summary", resume.summary);
  }

  if (sections.skills !== false) {
    parts.push(
      "Core Skills",
      ...(resume.skills || []).map((group) => formatSkillGroup(group)),
    );
  }

  if (sections.experience !== false) {
    parts.push(
      "Professional Experience",
      ...(resume.experience || []).flatMap((item) => [
        [item.role, item.company, item.location, item.start, item.end].filter(Boolean).join(" | "),
        ...normalizeBullets(item.bullets),
      ]),
    );
  }

  if (sections.projects !== false) {
    parts.push(
      "Projects",
      ...(resume.projects || []).flatMap((item) => [
        [item.name, item.role, item.url].filter(Boolean).join(" | "),
        ...normalizeBullets(item.bullets),
      ]),
    );
  }

  if (sections.education !== false) {
    parts.push(
      "Education",
      ...(resume.education || []).map((item) =>
        [item.degree, item.institute, item.location, item.year].filter(Boolean).join(" | "),
      ),
    );
  }

  if (sections.certifications !== false) {
    parts.push(
      "Certifications",
      ...(resume.certifications || []).map((item) =>
        [item.name, item.issuer, item.year, item.url].filter(Boolean).join(" | "),
      ),
    );
  }

  return parts
    .flat()
    .map((part) => String(part || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function formatSkillGroup(group) {
  const label = String(group?.label || "").trim();
  const items = (group?.items || []).map((item) => String(item || "").trim()).filter(Boolean);
  if (!items.length) return label;
  if (!label || label.toLowerCase() === "core skills") return items.join(", ");
  return `${label}: ${items.join(", ")}`;
}

function normalizeBullets(bullets = []) {
  return bullets
    .flatMap((bullet) => String(bullet || "").split(/\s*•\s*/))
    .map((bullet) => bullet.replace(/^[-*]\s*/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function createExportNode(sourceElement) {
  const clone = sourceElement.cloneNode(true);
  const wrapper = document.createElement("div");

  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "210mm";
  wrapper.style.minHeight = "297mm";
  wrapper.style.background = "#ffffff";
  wrapper.style.zIndex = "-1";
  wrapper.style.pointerEvents = "none";

  clone.style.width = "210mm";
  clone.style.minHeight = "297mm";
  clone.style.margin = "0";
  clone.style.borderRadius = "0";
  clone.style.boxShadow = "none";
  clone.style.overflow = "visible";

  wrapper.appendChild(clone);
  return wrapper;
}

function getSafePageBreaks(exportNode, exportRect, canvasHeight, canvasScale, pageHeightPx) {
  const candidates = Array.from(
    exportNode.querySelectorAll(".preview-section, .preview-record, .preview-two-col"),
  )
    .map((element) => Math.round((element.getBoundingClientRect().top - exportRect.top) * canvasScale))
    .filter((position) => position > 0 && position < canvasHeight)
    .sort((a, b) => a - b);

  const breaks = [0];
  const safetyGap = Math.round(pageHeightPx * 0.04);
  const minUsefulPage = Math.round(pageHeightPx * 0.55);

  while (canvasHeight - breaks[breaks.length - 1] > pageHeightPx) {
    const pageStart = breaks[breaks.length - 1];
    const idealBreak = pageStart + pageHeightPx;
    const safeBreak = [...candidates]
      .reverse()
      .find((position) => position > pageStart + minUsefulPage && position <= idealBreak - safetyGap);

    breaks.push(safeBreak || Math.round(idealBreak));
  }

  breaks.push(canvasHeight);
  return [...new Set(breaks)].sort((a, b) => a - b);
}

function cropCanvas(sourceCanvas, startY, height) {
  const pageCanvas = document.createElement("canvas");
  const cropHeight = Math.min(height, sourceCanvas.height - startY);
  pageCanvas.width = sourceCanvas.width;
  pageCanvas.height = cropHeight;

  const context = pageCanvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
  context.drawImage(sourceCanvas, 0, startY, sourceCanvas.width, cropHeight, 0, 0, sourceCanvas.width, cropHeight);

  return pageCanvas;
}

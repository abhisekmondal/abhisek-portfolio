import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const A4 = {
  widthPt: 595.28,
  heightPt: 841.89,
};

export async function exportResumePdfFromElement(sourceElement, fileName = "resume.pdf") {
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
      doc.addImage(pageCanvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, A4.widthPt, pageHeightPt);
    });

    if (pageBreaks.length === 1) {
      doc.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, A4.widthPt, (canvas.height * A4.widthPt) / canvas.width);
    }

    doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
  } finally {
    exportNode.remove();
  }
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

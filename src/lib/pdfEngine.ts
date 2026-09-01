import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PDFPageOptions {
  documentTitle: string;
  reportType: string;
  caseId: string;
  dateStr?: string;
  modelUsed?: string;
  category?: string;
  clientName?: string;
  statusBadge?: string;
  filename: string;
}

export interface PDFSectionBlock {
  html: string;
  priority?: number; // 1-10
  forceNewPage?: boolean;
}

/**
 * Escapes HTML special characters safely
 */
export function escapePdfHtml(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Letterhead HTML template
 */
export function getPdfLetterheadHeader(options: {
  documentTitle: string;
  reportType: string;
  caseId: string;
  dateStr: string;
  modelUsed?: string;
  category?: string;
  clientName?: string;
  statusBadge?: string;
}): string {
  return `
    <div class="pdf-header-wrapper" style="width: 100%; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; margin-bottom: 12px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 16px; border: 1.5px solid #D4AF37; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <span style="background: linear-gradient(135deg, #FDE68A, #D4AF37, #FFFFFF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">U</span>
          </div>
          <div>
            <div style="display: flex; align-items: baseline; gap: 6px;">
              <span style="font-size: 13px; font-weight: 900; letter-spacing: 0.06em; color: #0f172a; text-transform: uppercase;">UNIKORN360</span>
              <span style="font-size: 10px; font-weight: 700; color: #B8860B; letter-spacing: 0.08em; text-transform: uppercase;">BUSINESS INTELLIGENCE</span>
            </div>
            <div style="font-size: 8px; font-weight: 600; color: #64748b; letter-spacing: 0.04em;">
              Intelligent Systems • Real-World Impact
            </div>
            <div style="font-size: 7px; color: #475569; margin-top: 1px; font-weight: 500;">
              Business Consulting • AI &amp; Systems Strategy • Finance Advisory • Compliance &amp; Subsidy • Corporate Branding • Project Consulting
            </div>
          </div>
        </div>

        <div style="text-align: right; font-size: 8px; color: #334155; line-height: 1.35;">
          <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-weight: 800; color: #1e293b; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.04em;">
            ${escapePdfHtml(options.reportType)}
          </div>
          <div style="margin-top: 3px; font-family: monospace; font-weight: 700; color: #0f172a; font-size: 8.5px;">
            CASE ID: <span style="color: #4338ca;">${escapePdfHtml(options.caseId)}</span>
          </div>
          <div style="color: #64748b; font-size: 7.5px;">
            DATE: ${escapePdfHtml(options.dateStr)}
            ${options.modelUsed ? ` • MODEL: <b style="color:#0f172a;">${escapePdfHtml(options.modelUsed)}</b>` : ""}
          </div>
        </div>
      </div>

      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 11px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">
          ${escapePdfHtml(options.documentTitle)}
        </div>
        ${options.clientName ? `
          <div style="font-size: 8px; color: #475569; font-weight: 600;">
            Client: <b style="color:#0f172a;">${escapePdfHtml(options.clientName)}</b>
            ${options.category ? ` | ${escapePdfHtml(options.category)}` : ""}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

/**
 * Letterhead Footer template
 */
export function getPdfLetterheadFooter(pageIndex: number, totalPages: number): string {
  return `
    <div class="pdf-footer-wrapper" style="width: 100%; border-top: 1.5px solid #D4AF37; padding-top: 6px; margin-top: 10px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; color: #64748b;">
      <div>
        <span style="font-weight: 700; color: #0f172a;">UNIKORN360 Business Intelligence</span> • Land Revenue &amp; Registration Legal AI Division • Confidential Report
      </div>
      <div style="font-weight: 700; color: #1e293b; font-family: monospace;">
        PAGE ${pageIndex} OF ${totalPages}
      </div>
    </div>
  `;
}

/**
 * Core Pagination Engine:
 * Takes structured HTML blocks, measures rendered heights in an A4 container,
 * groups them cleanly without clipping across page boundaries, and generates
 * a crisp, professional multi-page PDF with consistent headers and footers.
 */
export async function renderAndDownloadPaginatedPDF(
  blocks: (string | PDFSectionBlock)[],
  options: PDFPageOptions
): Promise<void> {
  const A4_WIDTH_PX = 794; // 210mm at 96 DPI
  const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI
  const PADDING_HORIZ = 36; // px
  const PADDING_TOP = 28; // px
  const PADDING_BOTTOM = 24; // px

  // Usable height inside an A4 page
  const CONTENT_MAX_HEIGHT = A4_HEIGHT_PX - (PADDING_TOP + PADDING_BOTTOM);

  // Hidden container for measurement
  const measureContainer = document.createElement("div");
  measureContainer.style.position = "absolute";
  measureContainer.style.left = "-9999px";
  measureContainer.style.top = "-9999px";
  measureContainer.style.width = `${A4_WIDTH_PX - PADDING_HORIZ * 2}px`;
  measureContainer.style.boxSizing = "border-box";
  measureContainer.style.fontFamily = "'Plus Jakarta Sans', 'Mukta Malar', 'Noto Sans Tamil', system-ui, sans-serif";
  measureContainer.style.fontSize = "10px";
  measureContainer.style.lineHeight = "1.5";
  measureContainer.style.color = "#0f172a";
  document.body.appendChild(measureContainer);

  // Measure Header Height
  const headerHtml = getPdfLetterheadHeader({
    documentTitle: options.documentTitle,
    reportType: options.reportType,
    caseId: options.caseId,
    dateStr: options.dateStr || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    modelUsed: options.modelUsed,
    category: options.category,
    clientName: options.clientName,
    statusBadge: options.statusBadge
  });

  measureContainer.innerHTML = headerHtml;
  const headerHeight = measureContainer.offsetHeight + 10; // extra spacing margin

  // Measure Footer Height
  const footerSampleHtml = getPdfLetterheadFooter(1, 1);
  measureContainer.innerHTML = footerSampleHtml;
  const footerHeight = measureContainer.offsetHeight + 8;

  // Maximum content space available between Header and Footer on ANY page
  const USABLE_PAGE_CONTENT_HEIGHT = CONTENT_MAX_HEIGHT - headerHeight - footerHeight;

  // Standardize block inputs
  const rawBlockList: PDFSectionBlock[] = blocks.map(b => (typeof b === "string" ? { html: b } : b));

  // Partition blocks into page groups based on real pixel height
  const pages: string[][] = [];
  let currentPageBlocks: string[] = [];
  let currentAccumulatedHeight = 0;

  for (const block of rawBlockList) {
    if (!block.html || !block.html.trim()) continue;

    if (block.forceNewPage && currentPageBlocks.length > 0) {
      pages.push(currentPageBlocks);
      currentPageBlocks = [];
      currentAccumulatedHeight = 0;
    }

    // Measure this block's rendered height
    measureContainer.innerHTML = block.html;
    const blockHeight = measureContainer.offsetHeight;

    // If block fits within remaining space on current page:
    if (currentAccumulatedHeight + blockHeight <= USABLE_PAGE_CONTENT_HEIGHT || currentPageBlocks.length === 0) {
      currentPageBlocks.push(block.html);
      currentAccumulatedHeight += blockHeight + 8; // account for margin between blocks
    } else {
      // Doesn't fit on current page -> push current page and start next page with this entire block intact!
      pages.push(currentPageBlocks);
      currentPageBlocks = [block.html];
      currentAccumulatedHeight = blockHeight + 8;
    }
  }

  if (currentPageBlocks.length > 0) {
    pages.push(currentPageBlocks);
  }

  // If no pages were generated, create at least 1 empty page
  if (pages.length === 0) {
    pages.push([`<div style="color: #64748b; font-style: italic; padding: 20px;">No report content available.</div>`]);
  }

  const totalPages = pages.length;

  // Clean measurement container
  document.body.removeChild(measureContainer);

  // Initialize jsPDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const pdfWidthMm = pdf.internal.pageSize.getWidth(); // 210
  const pdfHeightMm = pdf.internal.pageSize.getHeight(); // 297

  // Render each page into a separate isolated DOM node and capture with html2canvas
  const renderHost = document.createElement("div");
  renderHost.style.position = "absolute";
  renderHost.style.left = "-9999px";
  renderHost.style.top = "-9999px";
  document.body.appendChild(renderHost);

  try {
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageBlocks = pages[pageIdx];
      const pageNumber = pageIdx + 1;

      const pageNode = document.createElement("div");
      pageNode.style.width = `${A4_WIDTH_PX}px`;
      pageNode.style.height = `${A4_HEIGHT_PX}px`;
      pageNode.style.boxSizing = "border-box";
      pageNode.style.backgroundColor = "#ffffff";
      pageNode.style.color = "#0f172a";
      pageNode.style.padding = `${PADDING_TOP}px ${PADDING_HORIZ}px ${PADDING_BOTTOM}px ${PADDING_HORIZ}px`;
      pageNode.style.display = "flex";
      pageNode.style.flexDirection = "column";
      pageNode.style.justifyContent = "space-between";
      pageNode.style.fontFamily = "'Plus Jakarta Sans', 'Mukta Malar', 'Noto Sans Tamil', system-ui, -apple-system, sans-serif";
      pageNode.style.overflow = "hidden";

      const topSection = document.createElement("div");
      topSection.innerHTML = headerHtml;

      const middleSection = document.createElement("div");
      middleSection.style.flex = "1";
      middleSection.style.overflow = "hidden";
      middleSection.innerHTML = pageBlocks.join("<div style='height: 8px;'></div>");

      const bottomSection = document.createElement("div");
      bottomSection.innerHTML = getPdfLetterheadFooter(pageNumber, totalPages);

      pageNode.appendChild(topSection);
      pageNode.appendChild(middleSection);
      pageNode.appendChild(bottomSection);

      renderHost.innerHTML = "";
      renderHost.appendChild(pageNode);

      // Render page canvas with crisp 2x scale for sharp text and vectors
      const canvas = await html2canvas(pageNode, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      if (pageIdx > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidthMm, pdfHeightMm, undefined, "FAST");
    }

    const cleanFilename = options.filename.replace(/[^a-zA-Z0-9_\-\u0B80-\u0BFF]/g, "_").slice(0, 70);
    pdf.save(`${cleanFilename}.pdf`);
  } catch (error) {
    console.error("PDF generation error, falling back to HTML blob:", error);
    const fullHtml = pages.map((p, idx) => `
      <div style="width: 794px; min-height: 1123px; margin: 20px auto; padding: 30px; border: 1px solid #cbd5e1; font-family: sans-serif;">
        ${headerHtml}
        ${p.join("<hr style='margin: 12px 0; border: none; border-top: 1px dashed #e2e8f0;'/>")}
        ${getPdfLetterheadFooter(idx + 1, totalPages)}
      </div>
    `).join("");

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${options.filename}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  } finally {
    if (document.body.contains(renderHost)) {
      document.body.removeChild(renderHost);
    }
  }
}

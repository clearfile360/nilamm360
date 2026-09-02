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
  minRemainingHeight?: number; // Minimum height required on current page to place this block (prevents orphan headings)
}

/**
 * Escapes HTML special characters safely
 */
export function escapePdfHtml(str?: string | number | null): string {
  if (str === null || str === undefined) return "";
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
    <div class="pdf-header-wrapper" style="width: 100%; border-bottom: 2px solid #1e1b4b; padding-bottom: 8px; margin-bottom: 10px; font-family: 'Mukta Malar', 'Noto Sans Tamil', system-ui, -apple-system, sans-serif; font-size: 10pt;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 6px; background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 14pt; border: 1.5px solid #D4AF37; box-shadow: 0 2px 4px rgba(0,0,0,0.1); shrink-0;">
            <span style="background: linear-gradient(135deg, #FDE68A, #D4AF37, #FFFFFF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">U</span>
          </div>
          <div>
            <div style="display: flex; align-items: baseline; gap: 6px;">
              <span style="font-weight: 800; letter-spacing: 0.05em; color: #0f172a; text-transform: uppercase; font-size: 10pt;">UNIKORN360</span>
              <span style="font-weight: 700; color: #78350f; letter-spacing: 0.04em; text-transform: uppercase; font-size: 10pt;">BUSINESS INTELLIGENCE</span>
            </div>
            <div style="font-weight: 600; color: #475569; font-size: 10pt; line-height: 1.35;">
              Intelligent Systems • Real-World Impact • Land Revenue &amp; Legal AI Division
            </div>
          </div>
        </div>

        <div style="text-align: right; color: #334155; line-height: 1.35; font-size: 10pt;">
          <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.03em; font-size: 10pt;">
            ${escapePdfHtml(options.reportType)}
          </div>
          <div style="margin-top: 3px; font-weight: 700; color: #0f172a; font-size: 10pt;">
            CASE ID: <span style="color: #4338ca;">${escapePdfHtml(options.caseId)}</span>
          </div>
          <div style="color: #64748b; font-size: 10pt;">
            DATE: ${escapePdfHtml(options.dateStr)}
            ${options.modelUsed ? ` • MODEL: <b style="color:#0f172a;">${escapePdfHtml(options.modelUsed)}</b>` : ""}
          </div>
        </div>
      </div>

      <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10pt;">
        <div style="font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.3; font-size: 10pt;">
          ${escapePdfHtml(options.documentTitle)}
        </div>
        ${options.clientName ? `
          <div style="color: #475569; font-weight: 600; font-size: 10pt;">
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
    <div class="pdf-footer-wrapper" style="width: 100%; border-top: 1.5px solid #1e1b4b; padding-top: 5px; margin-top: 8px; font-family: 'Mukta Malar', 'Noto Sans Tamil', system-ui, -apple-system, sans-serif; display: flex; justify-content: space-between; align-items: center; font-size: 10pt; color: #475569;">
      <div>
        <span style="font-weight: 700; color: #0f172a;">UNIKORN360 Business Intelligence</span> • Land Revenue &amp; Registration Legal AI • Confidential Report
      </div>
      <div style="font-weight: 800; color: #1e1b4b; font-size: 10pt;">
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

  // Hidden container for measurement with exact styling
  const measureContainer = document.createElement("div");
  measureContainer.style.position = "absolute";
  measureContainer.style.left = "-9999px";
  measureContainer.style.top = "-9999px";
  measureContainer.style.width = `${A4_WIDTH_PX - PADDING_HORIZ * 2}px`;
  measureContainer.style.boxSizing = "border-box";
  measureContainer.style.fontFamily = "'Mukta Malar', 'Noto Sans Tamil', system-ui, -apple-system, sans-serif";
  measureContainer.style.fontSize = "10pt";
  measureContainer.style.lineHeight = "1.55";
  measureContainer.style.color = "#1e293b";
  
  // Inject default baseline typography style for measurement matching the legal report aesthetic
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    * {
      box-sizing: border-box;
      font-family: 'Mukta Malar', 'Noto Sans Tamil', system-ui, -apple-system, sans-serif !important;
      font-size: 10pt !important;
    }
    .pdf-full-width {
      width: 100%;
      display: block;
    }
    .pdf-article {
      width: 100%;
      display: block;
      font-size: 10pt !important;
      line-height: 1.55;
      margin: 0 0 8px 0;
      text-align: left;
      color: #1e293b;
    }
    .pdf-article-lead {
      width: 100%;
      display: block;
      font-size: 10pt !important;
      font-weight: 700;
      line-height: 1.55;
      margin: 0 0 8px 0;
      text-align: left;
      color: #0f172a;
    }
    .pdf-stage-title {
      font-size: 10pt !important;
      font-weight: 800;
      color: #1e1b4b;
      margin: 12pt 0 6pt 0;
      padding-left: 8px;
      border-left: 3px solid #1e1b4b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.45;
      width: 100%;
      display: block;
    }
    .pdf-section-title {
      font-size: 10pt !important;
      font-weight: 800;
      color: #1e1b4b;
      margin: 10pt 0 4pt 0;
      padding-left: 6px;
      border-left: 2.5px solid #1e1b4b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      line-height: 1.45;
      width: 100%;
      display: block;
    }
    .pdf-subheading {
      font-size: 10pt !important;
      font-weight: 700;
      color: #0f172a;
      margin: 6pt 0 3pt 0;
      line-height: 1.45;
      width: 100%;
      display: block;
    }
    .pdf-p {
      width: 100%;
      display: block;
      font-size: 10pt !important;
      color: #1e293b;
      line-height: 1.55;
      margin: 0 0 8px 0;
      text-align: left;
    }
    .pdf-p-lead {
      width: 100%;
      display: block;
      font-size: 10pt !important;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.55;
      margin: 0 0 8px 0;
      text-align: left;
    }
    .pdf-callout {
      width: 100%;
      display: block;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-left: 3px solid #1e1b4b;
      padding: 6px 10px;
      margin-bottom: 8px;
      font-size: 10pt !important;
      line-height: 1.55;
    }
    .pdf-callout-gold {
      width: 100%;
      display: block;
      background: #fffdf7;
      border: 1px solid #cbd5e1;
      border-left: 3px solid #b45309;
      padding: 6px 10px;
      margin-bottom: 8px;
      font-size: 10pt !important;
      line-height: 1.55;
    }
    .pdf-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt !important;
      margin-bottom: 8px;
      table-layout: fixed;
    }
    .pdf-table th {
      background-color: #1e1b4b;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 5px 8px;
      border: 1px solid #1e1b4b;
      font-size: 10pt !important;
      line-height: 1.45;
      vertical-align: top;
    }
    .pdf-table td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      color: #334155;
      vertical-align: top;
      word-break: break-word;
      line-height: 1.55;
      font-size: 10pt !important;
    }
    .pdf-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .pdf-label {
      font-weight: 700;
      color: #475569;
      font-size: 10pt !important;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .pdf-val {
      color: #0f172a;
      font-weight: 600;
      font-size: 10pt !important;
    }
    .pdf-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10pt !important;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .pdf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .pdf-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .pdf-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; }
    .pdf-list {
      width: 100%;
      margin: 0 0 8px 0;
      padding-left: 18px;
      font-size: 10pt !important;
      color: #1e293b;
      line-height: 1.55;
    }
    .pdf-list li {
      margin-bottom: 4px;
    }
  `;
  measureContainer.appendChild(styleEl);

  const measureInner = document.createElement("div");
  measureContainer.appendChild(measureInner);
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

  measureInner.innerHTML = headerHtml;
  const headerHeight = measureInner.offsetHeight + 10; // extra spacing margin

  // Measure Footer Height
  const footerSampleHtml = getPdfLetterheadFooter(1, 1);
  measureInner.innerHTML = footerSampleHtml;
  const footerHeight = measureInner.offsetHeight + 8;

  // Maximum content space available between Header and Footer on ANY page
  // Include 15px buffer for safety against canvas scaling differences
  const USABLE_PAGE_CONTENT_HEIGHT = CONTENT_MAX_HEIGHT - headerHeight - footerHeight - 15;

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

    // Measure this block's rendered height inside styled measure container
    measureInner.innerHTML = block.html;
    const blockHeight = measureInner.offsetHeight;

    // Check for explicit minRemainingHeight or automatic orphan prevention for headings/tables
    const isMajorStage = block.html.includes("pdf-stage-title");
    const isSectionHeading = block.html.includes("pdf-section-title");
    const isCardHeader = block.html.includes("pdf-card-header");
    const hasTable = block.html.includes("pdf-table");
    
    let defaultMinRequired = 50;
    if (isMajorStage) defaultMinRequired = 220;
    else if (isSectionHeading && hasTable) defaultMinRequired = 200;
    else if (isSectionHeading) defaultMinRequired = 160;
    else if (isCardHeader) defaultMinRequired = 140;

    const minRequired = block.minRemainingHeight ?? defaultMinRequired;
    const remainingHeightOnPage = USABLE_PAGE_CONTENT_HEIGHT - currentAccumulatedHeight;

    // If block fits within remaining space on current page AND doesn't violate orphan threshold:
    const canFit = (currentAccumulatedHeight + blockHeight <= USABLE_PAGE_CONTENT_HEIGHT);
    const hasEnoughRoomForHeading = remainingHeightOnPage >= minRequired;

    if ((canFit && hasEnoughRoomForHeading) || currentPageBlocks.length === 0) {
      currentPageBlocks.push(block.html);
      currentAccumulatedHeight += blockHeight + 10; // account for margin between blocks
    } else {
      // Doesn't fit or causes orphan heading -> push current page and start next page with this entire block intact!
      pages.push(currentPageBlocks);
      currentPageBlocks = [block.html];
      currentAccumulatedHeight = blockHeight + 10;
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
      pageNode.style.fontFamily = "'Mukta Malar', 'Noto Sans Tamil', system-ui, -apple-system, sans-serif";
      pageNode.style.fontSize = "10pt";
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

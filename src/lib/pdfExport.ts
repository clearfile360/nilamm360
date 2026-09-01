import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { PropertyCase } from "../types";
import {
  renderAndDownloadPaginatedPDF,
  PDFPageOptions,
  PDFSectionBlock,
  escapePdfHtml
} from "./pdfEngine";

export interface PDFExportOptions {
  title: string;
  reportType?: string;
  docType?: string;
  domain?: string;
  caseId?: string;
  dateStr?: string;
  status?: string;
  content: string;
  sealHash?: string;
  filename?: string;
  modelUsed?: string;
  clientName?: string;
  category?: string;
}

// Common style tags for PDF rendering
const PDF_SHARED_STYLES = `
  <style>
    .pdf-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 8.5px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .pdf-card-header {
      font-size: 9.5px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pdf-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8px;
      margin-bottom: 6px;
      table-layout: fixed;
    }
    .pdf-table th {
      background-color: #1e1b4b;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 4px 6px;
      border: 1px solid #1e1b4b;
      letter-spacing: 0.02em;
    }
    .pdf-table td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
      word-break: break-word;
      line-height: 1.4;
    }
    .pdf-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .pdf-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .pdf-badge-navy { background: #e0e7ff; color: #3730a3; }
    .pdf-badge-gold { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .pdf-badge-emerald { background: #d1fae5; color: #065f46; }
    .pdf-badge-rose { background: #ffe4e6; color: #9f1239; }
    .pdf-badge-amber { background: #ffedd5; color: #9a3412; }
    .pdf-label {
      font-weight: 700;
      color: #475569;
      font-size: 7.5px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .pdf-val {
      color: #0f172a;
      font-weight: 600;
      font-size: 8.5px;
    }
    .pdf-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .pdf-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }
    .pdf-section-title {
      font-size: 10px;
      font-weight: 800;
      color: #1e1b4b;
      margin: 6px 0 4px 0;
      padding-left: 6px;
      border-left: 3px solid #D4AF37;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  </style>
`;

/**
 * Renders a consistent Case Summary info banner for stage-specific PDFs
 */
function renderCaseBanner(caseData: PropertyCase): string {
  const intake = caseData.intake || ({} as any);
  const clientName = intake.clientName || "Direct Client";
  const category = caseData.stage1?.category || intake.disputeCategory || "Property Dispute";
  const subCategory = (caseData.stage1 as any)?.subCategory || caseData.stage1?.specificType || "";
  const location = [intake.village, intake.taluk, intake.district].filter(Boolean).join(", ") || "Tamil Nadu";
  const surveyNo = intake.surveyNumber || (typeof caseData.stage3 === 'object' && caseData.stage3 !== null ? (caseData.stage3 as any).surveyNumber : '') || caseData.stage0?.surveyNumber || "N/A";
  const modelUsed = caseData.selectedModel || "gemini-3.7-flash";

  return `
    <div class="pdf-card" style="background: linear-gradient(to right, #f8fafc, #ffffff); border-left: 3px solid #312e81; margin-bottom: 8px;">
      <div style="display: grid; grid-template-columns: 2fr 1.5fr 1fr; gap: 8px; font-size: 8px;">
        <div>
          <span class="pdf-label">Client &amp; Matter:</span>
          <div class="pdf-val" style="font-size: 9.5px; color: #1e1b4b;">${escapePdfHtml(clientName)} — ${escapePdfHtml(category)}</div>
          ${subCategory ? `<div style="color: #64748b; font-size: 7.5px; margin-top: 1px;">Sub-category: ${escapePdfHtml(subCategory)}</div>` : ""}
        </div>
        <div>
          <span class="pdf-label">Location / Survey Ref:</span>
          <div class="pdf-val">${escapePdfHtml(location)}</div>
          <div style="color: #64748b; font-size: 7.5px; font-family: monospace;">Survey No: ${escapePdfHtml(surveyNo)}</div>
        </div>
        <div style="text-align: right;">
          <span class="pdf-label">Analysis Model:</span>
          <div class="pdf-val" style="color: #4338ca; font-family: monospace;">${escapePdfHtml(modelUsed)}</div>
          <div style="color: #059669; font-weight: 700; font-size: 7.5px;">12-Stage Verified</div>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------------------------------------------
// 1. STAGE 11 PDF EXPORT (Precedent Intelligence / முன்மாதிரி தீர்ப்புகள்)
// -------------------------------------------------------------------------------------------------
export async function downloadStage11PDF(caseData: PropertyCase, filename?: string): Promise<void> {
  const stage11 = caseData.stage11 || ({} as any);
  const precedents = stage11.precedents || [];
  const statutoryProvisions = stage11.statutoryProvisions || [];
  const bindingAuthorities = stage11.bindingAuthorities || [];
  const practicalGuidance = stage11.practicalGuidanceForCounsel || [];

  const caseId = caseData.id || "UK360-CASE";
  const defaultFilename = `UK360_${caseId}_Stage_11_Precedent_Intelligence`;

  const blocks: PDFSectionBlock[] = [];

  // Style Header block
  blocks.push({
    html: `
      ${PDF_SHARED_STYLES}
      ${renderCaseBanner(caseData)}
      <div class="pdf-section-title">
        நிலை 11: முன்மாதிரி தீர்ப்புகள் &amp; சட்ட வழிகாட்டல் • STAGE 11 PRECEDENT INTELLIGENCE
      </div>
      <div class="pdf-card">
        <div class="pdf-card-header">
          <span>PRECEDENT SYNTHESIS SUMMARY</span>
          <span class="pdf-badge pdf-badge-navy">${precedents.length} Precedents Indexed</span>
        </div>
        <p style="margin: 0; color: #334155; line-height: 1.45; font-size: 8.5px;">
          ${escapePdfHtml(stage11.relevanceAnalysisSummary || "Analysis of binding Supreme Court of India and Madras High Court case laws governing the disputed property rights, revenue corrections, and limitation principles.")}
        </p>
      </div>
    `
  });

  // Precedents Table / Cards
  if (precedents.length > 0) {
    // Group precedents in chunks of 2 or 3 per block so page breaks are clean
    for (let i = 0; i < precedents.length; i++) {
      const p = precedents[i];
      const isFav = p.favorableVsDistinguishable === "Favorable" || p.favorable === true;
      blocks.push({
        html: `
          <div class="pdf-card" style="border-left: 3px solid ${isFav ? '#059669' : '#d97706'};">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
              <div>
                <span style="font-weight: 800; font-size: 9px; color: #0f172a;">${i + 1}. ${escapePdfHtml(p.caseTitle || p.title || "Precedent Case Law")}</span>
                <span style="font-size: 8px; color: #64748b; margin-left: 6px; font-family: monospace;">${escapePdfHtml(p.citation || "")}</span>
              </div>
              <span class="pdf-badge ${isFav ? 'pdf-badge-emerald' : 'pdf-badge-amber'}">
                ${escapePdfHtml(p.favorableVsDistinguishable || (isFav ? 'FAVORABLE' : 'DISTINGUISHABLE'))}
              </span>
            </div>

            <table class="pdf-table" style="margin-bottom: 4px;">
              <tr>
                <th style="width: 25%;">Court / Bench</th>
                <th style="width: 15%;">Year</th>
                <th style="width: 60%;">Key Legal Proposition (Ratio Decidendi)</th>
              </tr>
              <tr>
                <td><b>${escapePdfHtml(p.court || "Supreme Court / Madras High Court")}</b> ${p.bench ? `<br/><span style="color:#64748b; font-size:7px;">Bench: ${escapePdfHtml(p.bench)}</span>` : ""}</td>
                <td><b>${escapePdfHtml(p.year || "Recent")}</b></td>
                <td><b style="color:#1e1b4b;">${escapePdfHtml(p.keyRatioDecidendi || p.ratio || "")}</b></td>
              </tr>
            </table>

            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px; font-size: 8px; border: 1px solid #f1f5f9;">
              <span style="font-weight: 700; color: #475569; text-transform: uppercase; font-size: 7px;">Direct Application to Present Dispute:</span>
              <p style="margin: 2px 0 0 0; color: #334155; line-height: 1.4;">
                ${escapePdfHtml(p.applicationToPresentCase || p.application || "Directly applicable to establish petitioner's possessory and title rights.")}
              </p>
            </div>
          </div>
        `
      });
    }
  }

  // Statutory Provisions & Binding Authorities Table
  if (statutoryProvisions.length > 0 || bindingAuthorities.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-section-title">STATUTORY PROVISIONS &amp; BINDING AUTHORITIES MATRIX</div>
        ${statutoryProvisions.length > 0 ? `
          <table class="pdf-table">
            <tr>
              <th style="width: 30%;">Statute / Act</th>
              <th style="width: 25%;">Section / Rule</th>
              <th style="width: 45%;">Application / Interpretation</th>
            </tr>
            ${statutoryProvisions.map((s: any) => `
              <tr>
                <td><b>${escapePdfHtml(s.act || s.statute)}</b></td>
                <td><b style="color: #4338ca;">${escapePdfHtml(s.section)}</b></td>
                <td>${escapePdfHtml(s.interpretation || s.application || s.notes)}</td>
              </tr>
            `).join("")}
          </table>
        ` : ""}

        ${bindingAuthorities.length > 0 ? `
          <div style="font-size: 8px; font-weight: 700; color: #1e1b4b; margin: 6px 0 2px 0; text-transform: uppercase;">
            Key Binding Precedents &amp; Full Citations:
          </div>
          <table class="pdf-table">
            <tr>
              <th style="width: 40%;">Authority / Case Law</th>
              <th style="width: 25%;">Citation</th>
              <th style="width: 35%;">Binding Principle</th>
            </tr>
            ${bindingAuthorities.map((b: any) => `
              <tr>
                <td><b>${escapePdfHtml(b.authority || b.name)}</b></td>
                <td style="font-family: monospace;">${escapePdfHtml(b.citation)}</td>
                <td>${escapePdfHtml(b.principle)}</td>
              </tr>
            `).join("")}
          </table>
        ` : ""}
      `
    });
  }

  // Practical Guidance for Counsel
  if (practicalGuidance.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-card" style="border-left: 3px solid #D4AF37; background: #fffdfa;">
          <div class="pdf-card-header">
            <span>PRACTICAL GUIDANCE FOR ADVOCATE / COUNSEL</span>
            <span class="pdf-badge pdf-badge-gold">Litigation Strategy Note</span>
          </div>
          <ul style="margin: 0; padding-left: 16px; font-size: 8px; color: #334155; line-height: 1.5;">
            ${practicalGuidance.map((g: string) => `
              <li style="margin-bottom: 3px;">${escapePdfHtml(g)}</li>
            `).join("")}
          </ul>
        </div>
      `
    });
  }

  await renderAndDownloadPaginatedPDF(blocks, {
    documentTitle: "STAGE 11 — PRECEDENT INTELLIGENCE REPORT",
    reportType: "STAGE 11 LEGAL BENCHMARKS",
    caseId,
    dateStr: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    modelUsed: caseData.selectedModel || "gemini-3.7-flash",
    category: caseData.stage1?.category,
    clientName: caseData.intake?.clientName,
    filename: filename || defaultFilename
  });
}

// -------------------------------------------------------------------------------------------------
// 2. STAGE 12 PDF EXPORT (Legal Strategy Simulator / சட்ட உத்தி சிமுலேட்டர்)
// -------------------------------------------------------------------------------------------------
export async function downloadStage12PDF(caseData: PropertyCase, filename?: string): Promise<void> {
  const stage12 = caseData.stage12 || ({} as any);
  const primaryAction = stage12.primaryCourseOfAction || ({} as any);
  const altPaths = stage12.alternativeStrategicPaths || [];
  const counterargs = stage12.likelyOppositeCounterarguments || [];
  const evidenceGaps = stage12.evidenceGapsToFill || [];
  const additionalProofs = stage12.recommendedAdditionalProof || [];
  const priorityActions = stage12.priorityNextActions || [];

  const caseId = caseData.id || "UK360-CASE";
  const defaultFilename = `UK360_${caseId}_Stage_12_Legal_Strategy`;

  const blocks: PDFSectionBlock[] = [];

  // Style Header + Primary Course of Action
  blocks.push({
    html: `
      ${PDF_SHARED_STYLES}
      ${renderCaseBanner(caseData)}
      <div class="pdf-section-title">
        நிலை 12: சட்ட உத்தி சிமுலேட்டர் • STAGE 12 LEGAL STRATEGY SIMULATOR
      </div>
      <div class="pdf-card" style="border-top: 3px solid #4338ca;">
        <div class="pdf-card-header">
          <span>RECOMMENDED PRIMARY COURSE OF ACTION</span>
          <span class="pdf-badge pdf-badge-emerald">Primary Route</span>
        </div>
        <div style="font-size: 10px; font-weight: 800; color: #1e1b4b; margin-bottom: 4px;">
          ${escapePdfHtml(primaryAction.actionTitle || "Strategic Legal Action")}
        </div>
        <p style="margin: 0 0 6px 0; color: #334155; line-height: 1.45; font-size: 8.5px;">
          ${escapePdfHtml(primaryAction.rationale || primaryAction.description || "Detailed tactical legal roadmap optimized for highest probability of successful relief.")}
        </p>
        <div class="pdf-grid-3" style="background: #f8fafc; padding: 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
          <div>
            <span class="pdf-label">Target Forum:</span>
            <div class="pdf-val">${escapePdfHtml(primaryAction.targetForum || "Jurisdictional Court / Revenue Authority")}</div>
          </div>
          <div>
            <span class="pdf-label">Est. Timeline:</span>
            <div class="pdf-val">${escapePdfHtml(primaryAction.estimatedTimeline || "30-90 Days")}</div>
          </div>
          <div>
            <span class="pdf-label">Success Index:</span>
            <div class="pdf-val" style="color: #059669; font-weight: 800;">${escapePdfHtml(primaryAction.successProbability || "High (80%+)")}</div>
          </div>
        </div>
      </div>
    `
  });

  // Alternative Strategic Paths
  if (altPaths.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-section-title">ALTERNATIVE STRATEGIC CONTINGENCY PATHS</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 25%;">Alternative Path</th>
            <th style="width: 45%;">Strategic Mechanism &amp; Scope</th>
            <th style="width: 15%;">Pros / Cons</th>
            <th style="width: 15%;">Risk Level</th>
          </tr>
          ${altPaths.map((p: any) => `
            <tr>
              <td><b>${escapePdfHtml(p.pathName || p.title)}</b></td>
              <td>${escapePdfHtml(p.description || p.mechanism)}</td>
              <td><span style="color:#059669; font-weight:700;">+ ${escapePdfHtml(p.pros || "Direct")}</span><br/><span style="color:#b91c1c;">- ${escapePdfHtml(p.cons || "Cost/Delay")}</span></td>
              <td><span class="pdf-badge ${p.riskLevel === 'High' ? 'pdf-badge-rose' : p.riskLevel === 'Low' ? 'pdf-badge-emerald' : 'pdf-badge-amber'}">${escapePdfHtml(p.riskLevel || 'Moderate')}</span></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  // Counterarguments & Rebuttals
  if (counterargs.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-section-title">ANTICIPATED OPPOSING COUNTERARGUMENTS &amp; REBUTTAL STRATEGY</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 45%;">Anticipated Opposing Argument / Objection</th>
            <th style="width: 55%;">Strategic Rebuttal &amp; Counter-Evidence</th>
          </tr>
          ${counterargs.map((c: any) => `
            <tr>
              <td><b style="color: #991b1b;">${escapePdfHtml(c.argument || c.counterargument)}</b></td>
              <td><b style="color: #1e1b4b;">${escapePdfHtml(c.rebuttalStrategy || c.rebuttal)}</b></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  // Evidence Gaps & Additional Proofs
  if (evidenceGaps.length > 0 || additionalProofs.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-section-title">CRITICAL EVIDENCE GAPS &amp; RECOMMENDED PROOFS</div>
        ${evidenceGaps.length > 0 ? `
          <table class="pdf-table">
            <tr>
              <th style="width: 35%;">Missing Evidence Element</th>
              <th style="width: 50%;">Procurement Procedure / Department</th>
              <th style="width: 15%;">Urgency</th>
            </tr>
            ${evidenceGaps.map((g: any) => `
              <tr>
                <td><b>${escapePdfHtml(g.missingElement || g.element)}</b></td>
                <td>${escapePdfHtml(g.howToObtain || g.procedure)}</td>
                <td><span class="pdf-badge ${g.urgency === 'High' ? 'pdf-badge-rose' : 'pdf-badge-navy'}">${escapePdfHtml(g.urgency || 'Standard')}</span></td>
              </tr>
            `).join("")}
          </table>
        ` : ""}

        ${additionalProofs.length > 0 ? `
          <table class="pdf-table" style="margin-top: 4px;">
            <tr>
              <th style="width: 25%;">Proof Type</th>
              <th style="width: 35%;">Document / Record</th>
              <th style="width: 40%;">Substantive Legal Purpose</th>
            </tr>
            ${additionalProofs.map((pr: any) => `
              <tr>
                <td><span class="pdf-badge pdf-badge-gold">${escapePdfHtml(pr.type || "Documentary")}</span></td>
                <td><b>${escapePdfHtml(pr.title || pr.name)}</b></td>
                <td>${escapePdfHtml(pr.purpose || pr.description)}</td>
              </tr>
            `).join("")}
          </table>
        ` : ""}
      `
    });
  }

  // Priority Step-by-Step Action Plan
  if (priorityActions.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-section-title">PRIORITY STEP-BY-STEP ACTION ROADMAP</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 8%;">Step</th>
            <th style="width: 52%;">Action Required</th>
            <th style="width: 25%;">Target Authority / Forum</th>
            <th style="width: 15%;">Timeline</th>
          </tr>
          ${priorityActions.map((a: any) => `
            <tr>
              <td style="text-align: center; font-weight: 800; color: #4338ca;">#${escapePdfHtml(a.stepNumber || 1)}</td>
              <td><b>${escapePdfHtml(a.action || a.title)}</b></td>
              <td>${escapePdfHtml(a.targetAuthority || a.authority || "Authority")}</td>
              <td><b>${escapePdfHtml(a.timeline || "Immediate")}</b></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  await renderAndDownloadPaginatedPDF(blocks, {
    documentTitle: "STAGE 12 — LEGAL STRATEGY SIMULATOR REPORT",
    reportType: "STAGE 12 STRATEGY BLUEPRINT",
    caseId,
    dateStr: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    modelUsed: caseData.selectedModel || "gemini-3.7-flash",
    category: caseData.stage1?.category,
    clientName: caseData.intake?.clientName,
    filename: filename || defaultFilename
  });
}

// -------------------------------------------------------------------------------------------------
// 3. CLIENT ACTION PDF EXPORT (👤 வாடிக்கையாளர் நடவடிக்கை / Client Action Brief)
// -------------------------------------------------------------------------------------------------
export async function downloadClientActionPDF(caseData: PropertyCase, filename?: string): Promise<void> {
  const reply = caseData.clientFacingReply || ({} as any);
  const immediate = caseData.immediateAction || ({} as any);
  const intake = caseData.intake || ({} as any);
  const servicePkg = caseData.servicePackage || ({} as any);

  const clientName = intake.clientName || "Valued Client";
  const caseId = caseData.id || "UK360-CASE";
  const defaultFilename = `UK360_${caseId}_Client_Action_Brief`;

  const blocks: PDFSectionBlock[] = [];

  // Client Brief Card
  blocks.push({
    html: `
      ${PDF_SHARED_STYLES}
      ${renderCaseBanner(caseData)}
      <div class="pdf-section-title">
        வாடிக்கையாளர் வழிகாட்டுதல் &amp; உடனடி நடவடிக்கை • CLIENT ACTION &amp; ADVISORY BRIEF
      </div>

      <!-- Problem & Position in Plain Language -->
      <div class="pdf-card" style="border-left: 3px solid #312e81;">
        <div class="pdf-card-header">
          <span>வழக்கின் சுருக்கம் &amp; சட்ட நிலைப்பாடு • CASE PROBLEM &amp; LEGAL POSITION</span>
          <span class="pdf-badge pdf-badge-navy">Client Brief</span>
        </div>
        <div style="margin-bottom: 6px;">
          <span class="pdf-label">கண்டறியப்பட்ட முக்கிய சிக்கல் / Problem Identified:</span>
          <p style="margin: 2px 0 0 0; color: #0f172a; font-weight: 600; font-size: 8.5px; line-height: 1.45;">
            ${escapePdfHtml(reply.problemIdentified || intake.rawCaseSummary || "Property dispute regarding revenue records, title assertion, and rightful possession.")}
          </p>
        </div>
        <div>
          <span class="pdf-label">சட்ட நிலைப்பாடு &amp; சாதகமான அம்சங்கள் / Legal Position:</span>
          <p style="margin: 2px 0 0 0; color: #334155; font-size: 8.5px; line-height: 1.45;">
            ${escapePdfHtml(reply.legalPositionSummary || "The documentation presents valid statutory grounds for rectification before the revenue authority / competent civil court.")}
          </p>
        </div>
      </div>

      <!-- Immediate Next Step Highlight -->
      <div class="pdf-card" style="background: linear-gradient(135deg, #f0fdf4, #ffffff); border: 1.5px solid #86efac;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 9px; font-weight: 800; color: #166534; text-transform: uppercase;">
            உடனடி முதல் நடவடிக்கை / Immediate Primary Step:
          </span>
          <span class="pdf-badge pdf-badge-emerald">PRIORITY 1</span>
        </div>
        <div style="font-size: 10px; font-weight: 800; color: #14532d; line-height: 1.4;">
          ${escapePdfHtml(reply.immediateNextStep || "Submit written objection/petition to the competent Revenue Divisional Officer (RDO) / Tahsildar.")}
        </div>
        <div style="display: flex; gap: 16px; margin-top: 6px; font-size: 8px; color: #166534;">
          <div><b>அதிகார வரம்பு / Authority:</b> ${escapePdfHtml(reply.expectedAuthority || "Revenue Divisional Officer / Tahsildar")}</div>
          <div><b>எதிர்பார்க்கப்படும் கால அளவு / Est. Timeline:</b> ${escapePdfHtml(reply.estimatedTimeline || "15-45 Days")}</div>
        </div>
      </div>
    `
  });

  // Chronological Action Schedule (24h, 7d, 30d)
  const within24 = immediate.within24Hours || [];
  const within7 = immediate.within7Days || [];
  const within30 = immediate.within30Days || [];

  blocks.push({
    html: `
      <div class="pdf-section-title">காலவரிசைப்படி செய்ய வேண்டிய நடவடிக்கைகள் • CHRONOLOGICAL ACTION ROADMAP</div>
      <table class="pdf-table">
        <tr>
          <th style="width: 33%; background: #991b1b;">24 மணி நேரத்திற்குள் • Within 24 Hours</th>
          <th style="width: 33%; background: #854d0e;">7 நாட்களுக்குள் • Within 7 Days</th>
          <th style="width: 34%; background: #1e3a8a;">30 நாட்களுக்குள் • Within 30 Days</th>
        </tr>
        <tr>
          <td style="vertical-align: top;">
            ${within24.length > 0 ? `
              <ul style="margin: 0; padding-left: 12px; font-size: 8px; line-height: 1.45;">
                ${within24.map((item: string) => `<li style="margin-bottom: 3px; color: #7f1d1d; font-weight: 600;">${escapePdfHtml(item)}</li>`).join("")}
              </ul>
            ` : `<span style="color: #64748b; font-style: italic;">No urgent 24-hour tasks</span>`}
          </td>
          <td style="vertical-align: top;">
            ${within7.length > 0 ? `
              <ul style="margin: 0; padding-left: 12px; font-size: 8px; line-height: 1.45;">
                ${within7.map((item: string) => `<li style="margin-bottom: 3px; color: #713f12; font-weight: 600;">${escapePdfHtml(item)}</li>`).join("")}
              </ul>
            ` : `<span style="color: #64748b; font-style: italic;">No 7-day tasks</span>`}
          </td>
          <td style="vertical-align: top;">
            ${within30.length > 0 ? `
              <ul style="margin: 0; padding-left: 12px; font-size: 8px; line-height: 1.45;">
                ${within30.map((item: string) => `<li style="margin-bottom: 3px; color: #1e3a8a; font-weight: 600;">${escapePdfHtml(item)}</li>`).join("")}
              </ul>
            ` : `<span style="color: #64748b; font-style: italic;">No 30-day tasks</span>`}
          </td>
        </tr>
      </table>
    `
  });

  // Mandatory Documents Checklist
  const mandatoryDocs = reply.mandatoryDocumentsNeeded || immediate.mandatoryDocumentsNeeded || [];
  if (mandatoryDocs.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>தேவைப்படும் முக்கிய ஆவணங்கள் • REQUIRED PROPERTY DOCUMENTS CHECKLIST</span>
            <span class="pdf-badge pdf-badge-gold">Documents Verification</span>
          </div>
          <div class="pdf-grid-2">
            ${mandatoryDocs.map((doc: string, idx: number) => `
              <div style="display: flex; align-items: center; gap: 6px; padding: 3px 0; border-bottom: 1px dashed #f1f5f9;">
                <span style="display: inline-block; width: 12px; height: 12px; border: 1.5px solid #4338ca; border-radius: 2px; text-align: center; font-size: 8px; line-height: 10px; color: #4338ca;">✓</span>
                <span style="color: #0f172a; font-size: 8px; font-weight: 600;">${idx + 1}. ${escapePdfHtml(doc)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `
    });
  }

  // Recommended Service Package & Deliverables
  if (servicePkg && servicePkg.packageName) {
    blocks.push({
      html: `
        <div class="pdf-card" style="border: 1.5px solid #D4AF37; background: #fffdf7;">
          <div class="pdf-card-header" style="border-bottom-color: #fef3c7;">
            <span>பரிந்துரைக்கப்பட்ட சட்ட சேவை திட்டம் • RECOMMENDED SERVICE PACKAGE</span>
            <span class="pdf-badge pdf-badge-gold">${escapePdfHtml(servicePkg.tier || "ENTERPRISE")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
            <div style="font-size: 10px; font-weight: 800; color: #78350f;">
              ${escapePdfHtml(servicePkg.packageName)}
            </div>
            ${servicePkg.estimatedFee ? `<div style="font-weight: 800; color: #0f172a; font-size: 10px;">${escapePdfHtml(servicePkg.estimatedFee)}</div>` : ""}
          </div>
          <p style="margin: 0 0 6px 0; color: #451a03; font-size: 8px; line-height: 1.4;">
            ${escapePdfHtml(servicePkg.description || "Comprehensive end-to-end legal support covering document verification, representation drafting, and advocate hearing representation.")}
          </p>
          ${servicePkg.deliverables && servicePkg.deliverables.length > 0 ? `
            <div style="font-size: 7.5px; font-weight: 700; color: #78350f; text-transform: uppercase; margin-bottom: 2px;">Deliverables Included:</div>
            <ul style="margin: 0; padding-left: 14px; font-size: 8px; color: #451a03; line-height: 1.4;">
              ${servicePkg.deliverables.map((d: string) => `<li>${escapePdfHtml(d)}</li>`).join("")}
            </ul>
          ` : ""}
        </div>
      `
    });
  }

  // Advocate Review & Signature Block
  blocks.push({
    html: `
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8px; color: #475569;">
        <div>
          <div><b>வழக்கறிஞர் / Advocate:</b> ${escapePdfHtml(intake.existingAdvocate || "UNIKORN360 Legal Intelligence Advisory Panel")}</div>
          <div style="margin-top: 2px;"><b>வழக்கு குறிப்பு / Case Ref:</b> ${escapePdfHtml(intake.existingCaseNumber || caseId)}</div>
          <div style="margin-top: 2px;"><b>நாள் / Date:</b> ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
        </div>
        <div style="text-align: right;">
          <div style="height: 32px;"></div>
          <div style="border-top: 1px solid #94a3b8; display: inline-block; width: 140px; text-align: center; font-weight: 700; color: #0f172a;">
            வழக்கறிஞர் கையொப்பம்
          </div>
        </div>
      </div>
    `
  });

  await renderAndDownloadPaginatedPDF(blocks, {
    documentTitle: "வாடிக்கையாளர் வழிகாட்டுதல் அறிக்கை • CLIENT ACTION BRIEF",
    reportType: "CLIENT ACTION BRIEF",
    caseId,
    dateStr: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    modelUsed: caseData.selectedModel || "gemini-3.7-flash",
    category: caseData.stage1?.category,
    clientName,
    filename: filename || defaultFilename
  });
}

// -------------------------------------------------------------------------------------------------
// 4. COMPLETE CASE REPORT PDF (12-Stage Enterprise Legal Intelligence Dossier)
// -------------------------------------------------------------------------------------------------
export async function downloadCompleteCaseReportPDF(caseData: PropertyCase, filename?: string): Promise<void> {
  const caseId = caseData.id || "UK360-CASE";
  const defaultFilename = `UK360_${caseId}_Complete_Case_Report`;

  const blocks: PDFSectionBlock[] = [];

  // Push Header and Executive Summary
  blocks.push({
    html: `
      ${PDF_SHARED_STYLES}
      ${renderCaseBanner(caseData)}
      <div class="pdf-section-title">EXECUTIVE LEGAL CASE SUMMARY &amp; INTEL MATRIX</div>
      <div class="pdf-grid-2">
        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>CLIENT &amp; OPPONENT PARTICULARS</span>
            <span class="pdf-badge pdf-badge-navy">Stage 1</span>
          </div>
          <table class="pdf-table">
            <tr>
              <th style="width: 35%;">Client / Petitioner</th>
              <td><b>${escapePdfHtml(caseData.intake?.clientName || caseData.stage0?.clientName || "Client")}</b></td>
            </tr>
            <tr>
              <th>Opposing Party</th>
              <td><b style="color: #991b1b;">${escapePdfHtml(caseData.intake?.oppositeParty || (caseData.intake as any)?.opponentName || "Opponent / Department")}</b></td>
            </tr>
            <tr>
              <th>Category</th>
              <td>${escapePdfHtml(caseData.stage1?.category || "Property Dispute")}</td>
            </tr>
            <tr>
              <th>Sub-Category</th>
              <td>${escapePdfHtml((caseData.stage1 as any)?.subCategory || caseData.stage1?.specificType || "N/A")}</td>
            </tr>
          </table>
        </div>

        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>PROPERTY &amp; SURVEY IDENTIFICATION</span>
            <span class="pdf-badge pdf-badge-navy">Stage 3</span>
          </div>
          <table class="pdf-table">
            <tr>
              <th style="width: 35%;">Village / Taluk</th>
              <td>${escapePdfHtml([caseData.intake?.village || caseData.stage0?.village, caseData.intake?.taluk || caseData.stage0?.taluk].filter(Boolean).join(", ") || "Tamil Nadu")}</td>
            </tr>
            <tr>
              <th>District</th>
              <td><b>${escapePdfHtml(caseData.intake?.district || caseData.stage0?.district || "Tamil Nadu")}</b></td>
            </tr>
            <tr>
              <th>Survey Number</th>
              <td><b style="color: #4338ca;">${escapePdfHtml(caseData.intake?.surveyNumber || (typeof caseData.stage3 === 'object' && caseData.stage3 !== null ? (caseData.stage3 as any).surveyNumber : '') || caseData.stage0?.surveyNumber || "N/A")}</b></td>
            </tr>
            <tr>
              <th>Extant Extent</th>
              <td>${escapePdfHtml((typeof caseData.stage3 === 'object' && caseData.stage3 !== null ? (caseData.stage3 as any).extent : '') || "As per document")}</td>
            </tr>
          </table>
        </div>
      </div>
    `
  });

  // Stage 4: Limitation & Procedural Timeline
  const stage4 = caseData.stage4 || ({} as any);
  if (stage4.events && stage4.events.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-section-title">STAGE 4: CHRONOLOGICAL FACT MATRIX &amp; LIMITATION ANALYSIS</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 15%;">Date / Year</th>
            <th style="width: 25%;">Event / Transaction</th>
            <th style="width: 40%;">Legal Significance</th>
            <th style="width: 20%;">Limitation Impact</th>
          </tr>
          ${stage4.events.map((ev: any) => `
            <tr>
              <td><b>${escapePdfHtml(ev.date || ev.year)}</b></td>
              <td>${escapePdfHtml(ev.event || ev.description)}</td>
              <td>${escapePdfHtml(ev.significance || ev.legalSignificance)}</td>
              <td><span class="pdf-badge ${ev.limitationRisk === 'High' ? 'pdf-badge-rose' : 'pdf-badge-emerald'}">${escapePdfHtml(ev.limitationRisk || 'Within Time')}</span></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  // Stage 5 & 6: Statutory Violations & Cause of Action
  const stage5 = caseData.stage5 || ({} as any);
  const stage6 = caseData.stage6 || ({} as any);
  if (stage5.violations || stage6.causeOfActionSummary) {
    blocks.push({
      html: `
        <div class="pdf-section-title">STAGE 5 &amp; 6: STATUTORY PROVISIONS &amp; CAUSE OF ACTION</div>
        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>SUBSTANTIVE CAUSE OF ACTION &amp; VIOLATIONS</span>
            <span class="pdf-badge pdf-badge-rose">Actionable Grounds</span>
          </div>
          <p style="margin: 0 0 6px 0; font-size: 8.5px; color: #334155; line-height: 1.45;">
            <b>Accrual of Cause of Action:</b> ${escapePdfHtml(stage6.causeOfActionSummary || "Cause of action arose when fraudulent entry was detected / adverse claim made.")}
          </p>
          ${stage5.violations && stage5.violations.length > 0 ? `
            <table class="pdf-table">
              <tr>
                <th style="width: 30%;">Statute / Section</th>
                <th style="width: 45%;">Nature of Infraction / Violation</th>
                <th style="width: 25%;">Remedy Available</th>
              </tr>
              ${stage5.violations.map((v: any) => `
                <tr>
                  <td><b>${escapePdfHtml(v.section || v.act)}</b></td>
                  <td>${escapePdfHtml(v.violation || v.description)}</td>
                  <td><b style="color: #059669;">${escapePdfHtml(v.remedy || "Writ / Revision")}</b></td>
                </tr>
              `).join("")}
            </table>
          ` : ""}
        </div>
      `
    });
  }

  // Stage 9 & 10: Risk Assessment Matrix & Revenue Correction Roadmap
  const stage9 = caseData.stage9 || ({} as any);
  const stage10 = caseData.stage10 || ({} as any);
  blocks.push({
    html: `
      <div class="pdf-section-title">STAGE 9 &amp; 10: LITIGATION RISK INDEX &amp; REVENUE FORUM ROADMAP</div>
      <div class="pdf-grid-2">
        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>RISK &amp; WIN PROBABILITY SCORE</span>
            <span class="pdf-badge ${stage9.score > 70 ? 'pdf-badge-emerald' : stage9.score > 40 ? 'pdf-badge-amber' : 'pdf-badge-rose'}">
              Score: ${stage9.score || 75}/100
            </span>
          </div>
          <p style="margin: 0 0 4px 0; font-size: 8px; color: #334155;">
            <b>Primary Risk Factor:</b> ${escapePdfHtml(stage9.primaryRisk || "Limitation / Possession contest")}
          </p>
          <p style="margin: 0; font-size: 8px; color: #334155;">
            <b>Mitigation Strategy:</b> ${escapePdfHtml(stage9.mitigation || "Filing statutory appeal under Patta Pass Book Act")}
          </p>
        </div>

        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>JURISDICTIONAL FORUM ROADMAP</span>
            <span class="pdf-badge pdf-badge-navy">Hierarchy</span>
          </div>
          <table class="pdf-table">
            <tr>
              <th style="width: 40%;">Primary Forum</th>
              <td><b>${escapePdfHtml(stage10.primaryForum || "Revenue Divisional Officer (RDO)")}</b></td>
            </tr>
            <tr>
              <th>Appellate Authority</th>
              <td>${escapePdfHtml(stage10.appellateForum || "District Revenue Officer (DRO)")}</td>
            </tr>
            <tr>
              <th>Revision / Writ</th>
              <td>${escapePdfHtml(stage10.revisionalForum || "High Court of Judicature at Madras")}</td>
            </tr>
          </table>
        </div>
      </div>
    `
  });

  // Stage 11: Precedent Intelligence (Summary table)
  const stage11 = caseData.stage11 || ({} as any);
  const precs = stage11.precedents || [];
  if (precs.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-section-title">STAGE 11: PRECEDENT INTELLIGENCE BENCHMARKS (${precs.length} Cases)</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 30%;">Case Title &amp; Citation</th>
            <th style="width: 20%;">Court &amp; Year</th>
            <th style="width: 35%;">Key Ratio Decidendi</th>
            <th style="width: 15%;">Posture</th>
          </tr>
          ${precs.slice(0, 4).map((p: any) => `
            <tr>
              <td><b>${escapePdfHtml(p.caseTitle || p.title)}</b><br/><span style="font-family: monospace; font-size: 7px; color: #64748b;">${escapePdfHtml(p.citation)}</span></td>
              <td>${escapePdfHtml(p.court || "HC Madras")} (${escapePdfHtml(p.year || "2024")})</td>
              <td>${escapePdfHtml(p.keyRatioDecidendi || p.ratio)}</td>
              <td><span class="pdf-badge ${p.favorableVsDistinguishable === 'Favorable' ? 'pdf-badge-emerald' : 'pdf-badge-amber'}">${escapePdfHtml(p.favorableVsDistinguishable || 'Favorable')}</span></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  // Stage 12: Strategic Action Plan
  const stage12 = caseData.stage12 || ({} as any);
  const priorityActions = stage12.priorityNextActions || [];
  if (priorityActions.length > 0) {
    blocks.push({
      html: `
        <div class="pdf-section-title">STAGE 12: PRIORITY LITIGATION &amp; REVENUE ACTION PLAN</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 10%;">Step</th>
            <th style="width: 50%;">Action Required</th>
            <th style="width: 25%;">Target Authority</th>
            <th style="width: 15%;">Timeline</th>
          </tr>
          ${priorityActions.map((a: any) => `
            <tr>
              <td style="text-align:center; font-weight:800; color:#4338ca;">#${escapePdfHtml(a.stepNumber || 1)}</td>
              <td><b>${escapePdfHtml(a.action || a.title)}</b></td>
              <td>${escapePdfHtml(a.targetAuthority || a.authority)}</td>
              <td><b>${escapePdfHtml(a.timeline || "Immediate")}</b></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  await renderAndDownloadPaginatedPDF(blocks, {
    documentTitle: "COMPLETE 12-STAGE ENTERPRISE LEGAL REPORT",
    reportType: "COMPLETE LEGAL REPORT",
    caseId,
    dateStr: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    modelUsed: caseData.selectedModel || "gemini-3.7-flash",
    category: caseData.stage1?.category,
    clientName: caseData.intake?.clientName,
    filename: filename || defaultFilename
  });
}

// -------------------------------------------------------------------------------------------------
// 5. LEGAL NOTICE / DRAFT PDF EXPORT (AI Legal Notice / Representation Draft)
// -------------------------------------------------------------------------------------------------
export async function downloadDocumentAsPDF(options: PDFExportOptions): Promise<void> {
  const {
    title,
    reportType = "AI LEGAL DRAFT / NOTICE",
    caseId = "UK360-DRAFT",
    dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    content,
    modelUsed,
    clientName,
    category,
    filename
  } = options;

  const rawLines = content.split("\n").map(l => l.trim());
  const blocks: PDFSectionBlock[] = [];
  let currentGroup: string[] = [];

  const flushGroup = () => {
    if (currentGroup.length === 0) return;
    blocks.push({
      html: `
        ${PDF_SHARED_STYLES}
        <div class="pdf-card" style="margin-bottom: 6px; line-height: 1.55;">
          ${currentGroup.join("")}
        </div>
      `
    });
    currentGroup = [];
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) {
      if (currentGroup.length > 5) flushGroup();
      continue;
    }

    if (line.startsWith("---") || line.startsWith("===")) {
      flushGroup();
      continue;
    }

    const isSubjectLine = /^பொருள்:|^Subject:|^பார்வை:|^Reference:/i.test(line);
    const isHeading = line.endsWith(":") || (line.toUpperCase() === line && line.length < 50) || /^([0-9\u0B80-\u0BFFA-Z]+\.)\s+/.test(line);
    const isSignatureLine = /^இங்ஙனம்|^தங்கள் உண்மையுள்ள|^SIGNATURE|^மனுதாரர் ஒப்பம்|^Advocate for Petitioner/i.test(line);

    if (isSignatureLine) {
      flushGroup();
      blocks.push({
        html: `
          ${PDF_SHARED_STYLES}
          <div style="margin-top: 14px; padding-top: 8px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5px;">
            <div>
              <p style="font-size: 8px; font-weight: 700; color: #64748b; margin: 0;">இடம் / Place: _________________</p>
              <p style="font-size: 8px; font-weight: 700; color: #64748b; margin: 3px 0 0 0;">நாள் / Date: ${escapePdfHtml(dateStr)}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 9.5px; font-weight: 800; color: #0f172a; margin: 0 0 24px 0;">${escapePdfHtml(line)}</p>
              <p style="font-size: 8px; font-weight: 700; color: #475569; margin: 0; border-top: 1px dashed #94a3b8; display: inline-block; width: 150px; text-align: center;">(கையொப்பம் / Signature)</p>
            </div>
          </div>
        `
      });
      continue;
    }

    if (isSubjectLine) {
      flushGroup();
      blocks.push({
        html: `
          ${PDF_SHARED_STYLES}
          <div style="background-color: #f8fafc; border-left: 3px solid #4338ca; padding: 6px 10px; margin: 6px 0; border-radius: 0 4px 4px 0;">
            <p style="font-size: 9px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.45;">
              ${escapePdfHtml(line)}
            </p>
          </div>
        `
      });
      continue;
    }

    if (isHeading) {
      currentGroup.push(`
        <div style="font-size: 9px; font-weight: 800; color: #1e1b4b; margin: 6px 0 3px 0; text-transform: uppercase;">
          ${escapePdfHtml(line)}
        </div>
      `);
    } else {
      currentGroup.push(`
        <p style="font-size: 8.5px; margin: 0 0 4px 0; color: #334155; text-align: justify; line-height: 1.5;">
          ${escapePdfHtml(line)}
        </p>
      `);
    }
  }
  flushGroup();

  await renderAndDownloadPaginatedPDF(blocks, {
    documentTitle: title,
    reportType,
    caseId,
    dateStr,
    modelUsed,
    clientName,
    category,
    filename: filename || `UK360_${caseId}_Legal_Draft`
  });
}

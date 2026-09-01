import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  PropertyCase, 
  CaseReferenceItem, 
  GovernmentOrderItem, 
  CircularItem,
  EvidenceGapItem,
  CounterargumentItem,
  AdditionalProofItem,
  PriorityActionItem
} from "../types";
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

// Common style tags for PDF rendering with high legibility and balanced spacing
export const PDF_SHARED_STYLES = `
  <style>
    .pdf-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 10px;
      line-height: 1.5;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .pdf-card-header {
      font-size: 10.5px;
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
      font-size: 9.5px;
      margin-bottom: 6px;
      table-layout: fixed;
    }
    .pdf-table th {
      background-color: #1e1b4b;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #1e1b4b;
      letter-spacing: 0.02em;
      font-size: 9.5px;
    }
    .pdf-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
      word-break: break-word;
      line-height: 1.5;
      font-size: 9.5px;
    }
    .pdf-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .pdf-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .pdf-badge-navy { background: #e0e7ff; color: #3730a3; }
    .pdf-badge-gold { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .pdf-badge-emerald { background: #d1fae5; color: #065f46; }
    .pdf-badge-rose { background: #ffe4e6; color: #9f1239; }
    .pdf-badge-amber { background: #ffedd5; color: #9a3412; }
    .pdf-badge-purple { background: #f3e8ff; color: #6b21a8; }
    .pdf-label {
      font-weight: 700;
      color: #475569;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .pdf-val {
      color: #0f172a;
      font-weight: 600;
      font-size: 10px;
    }
    .pdf-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .pdf-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }
    .pdf-grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 6px;
    }
    .pdf-section-title {
      font-size: 11px;
      font-weight: 800;
      color: #1e1b4b;
      margin: 8px 0 4px 0;
      padding-left: 6px;
      border-left: 3.5px solid #D4AF37;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  </style>
`;

/**
 * Renders a consistent Case Summary info banner for stage-specific PDFs
 */
export function renderCaseBanner(caseData: PropertyCase): string {
  const intake = caseData.intake || ({} as any);
  const clientName = intake.clientName || caseData.stage0?.clientName || "Direct Client";
  const category = caseData.stage1?.category || intake.disputeCategory || "Property Dispute";
  const subCategory = (caseData.stage1 as any)?.subCategory || caseData.stage1?.specificType || "";
  const location = [intake.village || caseData.stage0?.village, intake.taluk || caseData.stage0?.taluk, intake.district || caseData.stage0?.district].filter(Boolean).join(", ") || "Tamil Nadu";
  const surveyNo = intake.surveyNumber || (typeof caseData.stage3 === 'object' && caseData.stage3 !== null ? (caseData.stage3 as any).surveyNumber : '') || caseData.stage0?.surveyNumber || "N/A";
  const modelUsed = caseData.selectedModel || "gemini-3.7-flash";

  return `
    <div class="pdf-card" style="background: linear-gradient(to right, #f8fafc, #ffffff); border-left: 3.5px solid #312e81; margin-bottom: 8px; padding: 8px 10px;">
      <div style="display: grid; grid-template-columns: 2fr 1.5fr 1fr; gap: 8px; font-size: 9.5px;">
        <div>
          <span class="pdf-label">Client &amp; Matter:</span>
          <div class="pdf-val" style="font-size: 10.5px; color: #1e1b4b; font-weight: 800;">${escapePdfHtml(clientName)} — ${escapePdfHtml(category)}</div>
          ${subCategory ? `<div style="color: #64748b; font-size: 8.5px; margin-top: 1px;">Specific Type: ${escapePdfHtml(subCategory)}</div>` : ""}
        </div>
        <div>
          <span class="pdf-label">Location / Survey Ref:</span>
          <div class="pdf-val">${escapePdfHtml(location)}</div>
          <div style="color: #64748b; font-size: 8.5px; font-family: monospace;">Survey No: ${escapePdfHtml(surveyNo)}</div>
        </div>
        <div style="text-align: right;">
          <span class="pdf-label">Analysis Model:</span>
          <div class="pdf-val" style="color: #4338ca; font-family: monospace; font-size: 9.5px;">${escapePdfHtml(modelUsed)}</div>
          <div style="color: #059669; font-weight: 700; font-size: 8.5px;">12-Stage Legal Intelligence</div>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------------------------------------------
// REUSABLE STAGES 00-10 BLOCK GENERATOR (Full Actual Content of Stages 00 to 10)
// -------------------------------------------------------------------------------------------------
export function renderStage00To10Blocks(caseData: PropertyCase): PDFSectionBlock[] {
  const blocks: PDFSectionBlock[] = [];
  const intake = caseData.intake || ({} as any);
  const stage0 = caseData.stage0 || ({} as any);
  const stage1 = caseData.stage1 || ({} as any);
  const stage2 = caseData.stage2 || ({} as any);
  const stage3 = caseData.stage3 || ({} as any);
  const stage4 = caseData.stage4 || ({} as any);
  const stage5 = caseData.stage5 || ({} as any);
  const stage6 = caseData.stage6 || ({} as any);
  const stage7 = caseData.stage7 || ({} as any);
  const stage8 = caseData.stage8 || ({} as any);
  const stage9 = caseData.stage9 || ({} as any);
  const stage10 = caseData.stage10 || ({} as any);

  // STAGE 00 & STAGE 01: Client Intake & Dispute Classification
  blocks.push({
    minRemainingHeight: 180,
    html: `
      ${PDF_SHARED_STYLES}
      ${renderCaseBanner(caseData)}
      <div class="pdf-section-title">STAGE 00 &amp; 01: CLIENT INTAKE &amp; DISPUTE CLASSIFICATION</div>
      <div class="pdf-grid-2">
        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>CLIENT &amp; DISPUTE PARTICULARS</span>
            <span class="pdf-badge pdf-badge-navy">Stage 00 Intake</span>
          </div>
          <table class="pdf-table">
            <tr>
              <th style="width: 38%;">Client / Petitioner</th>
              <td><b>${escapePdfHtml(intake.clientName || stage0.clientName || "Direct Client")}</b></td>
            </tr>
            <tr>
              <th>Mobile / Contact</th>
              <td>${escapePdfHtml(intake.mobile || stage0.mobile || "Confidential")}</td>
            </tr>
            <tr>
              <th>Opposing Party</th>
              <td><b style="color: #991b1b;">${escapePdfHtml(intake.oppositeParty || (intake as any).opponentName || "Opponent / Department")}</b></td>
            </tr>
            <tr>
              <th>Party Relationship</th>
              <td>${escapePdfHtml(intake.partyRelationship || stage0.partyRelationship || "Adverse Claim / Title Discrepancy")}</td>
            </tr>
            <tr>
              <th>Existing Advocate</th>
              <td>${escapePdfHtml(intake.existingAdvocate || stage0.existingAdvocate || "None / Direct Advisory")}</td>
            </tr>
            <tr>
              <th>Case / FIR Number</th>
              <td>${escapePdfHtml(intake.existingCaseNumber || stage0.existingCaseNumber || "Pre-litigation / Fresh Representation")}</td>
            </tr>
          </table>
        </div>

        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>CLASSIFICATION &amp; JURISDICTION</span>
            <span class="pdf-badge pdf-badge-navy">Stage 01</span>
          </div>
          <table class="pdf-table">
            <tr>
              <th style="width: 38%;">Primary Category</th>
              <td><b>${escapePdfHtml(stage1.category || intake.disputeCategory || "Property Dispute")}</b></td>
            </tr>
            <tr>
              <th>Specific Type</th>
              <td><b style="color: #4338ca;">${escapePdfHtml(stage1.specificType || (stage1 as any).subCategory || "Revenue & Title Conflict")}</b></td>
            </tr>
            <tr>
              <th>District</th>
              <td><b>${escapePdfHtml(intake.district || stage0.district || "Tamil Nadu")}</b></td>
            </tr>
            <tr>
              <th>Taluk / Village</th>
              <td>${escapePdfHtml([intake.village || stage0.village, intake.taluk || stage0.taluk].filter(Boolean).join(", ") || "Tamil Nadu")}</td>
            </tr>
            <tr>
              <th>Survey Number</th>
              <td><b style="color: #4338ca;">${escapePdfHtml(intake.surveyNumber || (typeof stage3 === 'object' && stage3 !== null ? stage3.surveyNumber : '') || stage0.surveyNumber || "N/A")}</b></td>
            </tr>
            <tr>
              <th>Limitation Risk</th>
              <td><span class="pdf-badge ${intake.limitationRisk === 'High' ? 'pdf-badge-rose' : 'pdf-badge-emerald'}">${escapePdfHtml(intake.limitationRisk || "Within Statutory Limitation")}</span></td>
            </tr>
          </table>
        </div>
      </div>
    `
  });

  // STAGE 02 & STAGE 03: Core Dispute Issue & Subject Matter Map
  blocks.push({
    minRemainingHeight: 150,
    html: `
      <div class="pdf-section-title">STAGE 02 &amp; 03: CORE LEGAL ISSUE &amp; SUBJECT MATTER MAP</div>
      <div class="pdf-grid-2">
        <div class="pdf-card" style="border-left: 3.5px solid #dc2626;">
          <div class="pdf-card-header">
            <span>STAGE 02: CORE LEGAL ISSUE &amp; ROOT CAUSE</span>
            <span class="pdf-badge pdf-badge-rose">Root Cause</span>
          </div>
          <div style="margin-bottom: 5px;">
            <span class="pdf-label">Real Issue Identified / உண்மையான பிரச்சனை:</span>
            <p style="margin: 2px 0 0 0; font-size: 9.5px; font-weight: 700; color: #0f172a; line-height: 1.45;">
              ${escapePdfHtml(stage2.realIssue || "Dispute regarding property boundary, revenue title entry, and unverified mutation.")}
            </p>
          </div>
          <div>
            <span class="pdf-label">Root Cause Statement / மூலக் காரணம்:</span>
            <p style="margin: 2px 0 0 0; font-size: 9px; color: #334155; line-height: 1.45;">
              ${escapePdfHtml(stage2.rootCauseStatement || "Discrepancy in revenue records and lack of due enquiry prior to mutation.")}
            </p>
          </div>
        </div>

        <div class="pdf-card" style="border-left: 3.5px solid #2563eb;">
          <div class="pdf-card-header">
            <span>STAGE 03: SUBJECT MATTER &amp; RELATIONSHIP MAP</span>
            <span class="pdf-badge pdf-badge-navy">Mapping</span>
          </div>
          <div style="margin-bottom: 5px;">
            <span class="pdf-label">Subject Matter / சொத்து வகை:</span>
            <p style="margin: 2px 0 0 0; font-size: 9.5px; font-weight: 700; color: #1e1b4b;">
              ${escapePdfHtml(typeof stage3 === 'object' && stage3 !== null ? stage3.subjectType : (typeof stage3 === 'string' ? stage3 : "Agricultural / Natham / Residential Land"))}
            </p>
          </div>
          <div>
            <span class="pdf-label">Party Relationship Map / தரப்பினர் தொடர்பு வரைபடம்:</span>
            <p style="margin: 2px 0 0 0; font-size: 9px; color: #334155; line-height: 1.45;">
              ${escapePdfHtml(typeof stage3 === 'object' && stage3 !== null ? stage3.partyRelationshipMap : "Direct adverse claim between petitioner and respondent.")}
            </p>
          </div>
        </div>
      </div>
    `
  });

  // STAGE 04: Cause of Action Timeline (Every event rendered, no .slice)
  const stage4Events = stage4.timelineEvents || stage4.events || [];
  if (stage4Events.length > 0) {
    blocks.push({
      minRemainingHeight: 140,
      html: `
        <div class="pdf-section-title">STAGE 04: CAUSE OF ACTION TIMELINE &amp; CHRONOLOGY</div>
        <div class="pdf-card">
          <ul style="margin: 0; padding-left: 16px; font-size: 9.5px; color: #334155; line-height: 1.55;">
            ${stage4Events.map((ev: any) => `
              <li style="margin-bottom: 3.5px;">
                ${typeof ev === 'string' ? escapePdfHtml(ev) : `<b>${escapePdfHtml(ev.date || ev.year || "Timeline Event")}:</b> ${escapePdfHtml(ev.event || ev.description || "")}`}
              </li>
            `).join("")}
          </ul>
        </div>
      `
    });
  }

  // STAGE 05: Rights, Duties & Liabilities Matrix (Complete actual data)
  const rightsViolated = stage5.rightsViolated || ["Right to peaceful possession and lawful ownership", "Right to natural justice before adverse order"];
  const dutiesBreached = stage5.dutiesBreached || ["Failure of revenue officer to issue prior notice", "Execution of deed without parent title verification"];
  const legalObligations = stage5.legalObligations || ["Duty to conduct summary enquiry under Patta Pass Book Act"];
  const possibleLiabilities = stage5.possibleLiabilities || ["Liability under Registration Act Sec 77A / civil restitution"];
  const availableProtections = stage5.availableProtections || ["Injunction protection and statutory revision appeal"];

  blocks.push({
    minRemainingHeight: 160,
    html: `
      <div class="pdf-section-title">STAGE 05: RIGHTS, DUTIES &amp; LIABILITIES MATRIX</div>
      <div class="pdf-card">
        <div class="pdf-grid-2" style="margin-bottom: 6px;">
          <div>
            <span class="pdf-label" style="color: #b91c1c;">உரிமை மீறல்கள் / Rights Violated:</span>
            <ul style="margin: 2px 0 0 0; padding-left: 14px; font-size: 9px; color: #334155; line-height: 1.45;">
              ${rightsViolated.map((r: string) => `<li style="margin-bottom: 2px;">${escapePdfHtml(r)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <span class="pdf-label" style="color: #b45309;">கடமை மீறல்கள் / Duties Breached:</span>
            <ul style="margin: 2px 0 0 0; padding-left: 14px; font-size: 9px; color: #334155; line-height: 1.45;">
              ${dutiesBreached.map((d: string) => `<li style="margin-bottom: 2px;">${escapePdfHtml(d)}</li>`).join("")}
            </ul>
          </div>
        </div>

        <div class="pdf-grid-3" style="border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 6px;">
          <div>
            <span class="pdf-label">சட்டக் கடமைகள் / Legal Obligations:</span>
            <ul style="margin: 2px 0 0 0; padding-left: 12px; font-size: 8.5px; color: #334155; line-height: 1.4;">
              ${legalObligations.map((o: string) => `<li>${escapePdfHtml(o)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <span class="pdf-label">சாத்தியமான பொறுப்புகள் / Liabilities:</span>
            <ul style="margin: 2px 0 0 0; padding-left: 12px; font-size: 8.5px; color: #334155; line-height: 1.4;">
              ${possibleLiabilities.map((l: string) => `<li>${escapePdfHtml(l)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <span class="pdf-label">கிடைக்கும் பாதுகாப்புகள் / Protections:</span>
            <ul style="margin: 2px 0 0 0; padding-left: 12px; font-size: 8.5px; color: #334155; line-height: 1.4;">
              ${availableProtections.map((p: string) => `<li>${escapePdfHtml(p)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
    `
  });

  // STAGE 06: Documentary Evidence Audit & Strength Assessment
  const availableDocs = stage6.available || ["Original Registered Sale Deed", "Prior Patta Extract"];
  const missingDocs = stage6.missing || ["30-Year Encumbrance Certificate", "FMB Survey Sketch"];

  blocks.push({
    minRemainingHeight: 150,
    html: `
      <div class="pdf-section-title">STAGE 06: DOCUMENTARY EVIDENCE AUDIT &amp; STRENGTH ASSESSMENT</div>
      <div class="pdf-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="pdf-label">Overall Evidence Strength Assessment:</span>
          <span class="pdf-badge ${stage6.evidenceStrength === 'Ironclad' || stage6.evidenceStrength === 'Strong' ? 'pdf-badge-emerald' : 'pdf-badge-amber'}">
            ${escapePdfHtml(stage6.evidenceStrength || "Strong")}
          </span>
        </div>
        <div class="pdf-grid-2">
          <div>
            <span class="pdf-label" style="color: #15803d;">உங்களிடம் உள்ள ஆவணங்கள் / Available Evidence:</span>
            <ul style="margin: 3px 0 0 0; padding-left: 14px; font-size: 9px; color: #14532d; line-height: 1.45;">
              ${availableDocs.map((a: string) => `<li style="margin-bottom: 2px;">✓ ${escapePdfHtml(a)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <span class="pdf-label" style="color: #b91c1c;">பெறப்பட வேண்டிய ஆவணங்கள் / Missing Evidence:</span>
            <ul style="margin: 3px 0 0 0; padding-left: 14px; font-size: 9px; color: #7f1d1d; line-height: 1.45;">
              ${missingDocs.map((m: string) => `<li style="margin-bottom: 2px;">! ${escapePdfHtml(m)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
    `
  });

  // STAGE 07 & STAGE 08: Revenue Authority Route & Legal Remedies
  const routeArray = Array.isArray(stage7.route) ? stage7.route : (Array.isArray(stage7) ? stage7 : []);
  const altOptions = stage8.alternativeOptions || [];

  blocks.push({
    minRemainingHeight: 160,
    html: `
      <div class="pdf-section-title">STAGE 07 &amp; 08: JURISDICTIONAL ROUTE &amp; LEGAL REMEDIES</div>
      <div class="pdf-grid-2">
        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>STAGE 07: AUTHORITY ROUTE</span>
            <span class="pdf-badge pdf-badge-navy">Hierarchy</span>
          </div>
          <table class="pdf-table">
            <tr>
              <th style="width: 40%;">Primary Authority</th>
              <td><b>${escapePdfHtml(stage7.primaryAuthority || "Revenue Divisional Officer (RDO)")}</b></td>
            </tr>
            <tr>
              <th>Appellate Authority</th>
              <td>${escapePdfHtml(stage7.appellateAuthority || "District Revenue Officer (DRO)")}</td>
            </tr>
            <tr>
              <th>Forum Type</th>
              <td>${escapePdfHtml(stage7.forumType || "Revenue / Quasi-Judicial")}</td>
            </tr>
            ${routeArray.length > 0 ? `
              <tr>
                <th>Route Path</th>
                <td><span style="font-size: 8.5px; color: #4338ca; font-weight: 700;">${escapePdfHtml(routeArray.join(" → "))}</span></td>
              </tr>
            ` : ""}
          </table>
        </div>

        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>STAGE 08: LEGAL REMEDIES</span>
            <span class="pdf-badge pdf-badge-emerald">Remedies</span>
          </div>
          <div style="margin-bottom: 5px;">
            <span class="pdf-label">முதன்மை நிவாரணம் / Primary Remedy:</span>
            <div style="font-size: 9.5px; font-weight: 800; color: #065f46; margin-top: 2px;">
              ${escapePdfHtml(stage8.primaryRemedy || "Statutory Appeal under Tamil Nadu Patta Pass Book Act Section 12")}
            </div>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">Remedy Type: <b>${escapePdfHtml(stage8.remedyType || "Administrative / Revenue Appeal")}</b></div>
          </div>
          ${altOptions.length > 0 ? `
            <div>
              <span class="pdf-label">மாற்று வழிகள் / Alternative Remedies:</span>
              <ul style="margin: 2px 0 0 0; padding-left: 14px; font-size: 8.5px; color: #334155; line-height: 1.4;">
                ${altOptions.map((opt: string) => `<li>${escapePdfHtml(opt)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
        </div>
      </div>
    `
  });

  // STAGE 09 & STAGE 10: Risk Rating & Service Package
  const riskFactors = stage9.factors || [];
  const deliverables = stage10.deliverablesList || [];

  blocks.push({
    minRemainingHeight: 160,
    html: `
      <div class="pdf-section-title">STAGE 09 &amp; 10: LITIGATION RISK RATING &amp; LEGAL SERVICE PACKAGE</div>
      <div class="pdf-grid-2">
        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>STAGE 09: LITIGATION RISK ASSESSMENT</span>
            <span class="pdf-badge ${stage9.score >= 70 ? 'pdf-badge-emerald' : stage9.score >= 40 ? 'pdf-badge-amber' : 'pdf-badge-rose'}">
              Score: ${stage9.score || 75}/100 • ${escapePdfHtml(stage9.rating || "Moderate")}
            </span>
          </div>
          <div style="margin-bottom: 4px; font-size: 9px;">
            <b>காலவரையறை நிலை / Limitation:</b> ${escapePdfHtml(stage9.limitationStatus || "Within statutory limitation period")}
          </div>
          <div style="font-size: 9px;">
            <b>அவசர நிலை / Urgency:</b> <span class="pdf-badge pdf-badge-rose">${escapePdfHtml(stage9.urgencyLevel || "High")}</span>
          </div>
          ${riskFactors.length > 0 ? `
            <div style="margin-top: 4px;">
              <span class="pdf-label">Risk Factors Identified:</span>
              <ul style="margin: 2px 0 0 0; padding-left: 14px; font-size: 8.5px; color: #334155; line-height: 1.4;">
                ${riskFactors.map((f: string) => `<li>${escapePdfHtml(f)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
        </div>

        <div class="pdf-card" style="border: 1.5px solid #D4AF37; background: #fffdfa;">
          <div class="pdf-card-header">
            <span>STAGE 10: LEGAL SERVICE PACKAGE</span>
            <span class="pdf-badge pdf-badge-gold">Service Plan</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div style="font-size: 10px; font-weight: 800; color: #78350f;">${escapePdfHtml(stage10.packageName || "Comprehensive Legal Representation")}</div>
            ${stage10.priceRange ? `<div style="font-size: 10px; font-weight: 800; color: #0f172a;">${escapePdfHtml(stage10.priceRange)}</div>` : ""}
          </div>
          <p style="margin: 3px 0 5px 0; font-size: 9px; color: #451a03; line-height: 1.45;">
            ${escapePdfHtml(stage10.description || "Complete statutory representation, document verification, and appellate drafting.")}
          </p>
          ${deliverables.length > 0 ? `
            <span class="pdf-label" style="color: #78350f;">Deliverables Included:</span>
            <ul style="margin: 2px 0 0 0; padding-left: 14px; font-size: 8.5px; color: #451a03; line-height: 1.4;">
              ${deliverables.map((d: string) => `<li>${escapePdfHtml(d)}</li>`).join("")}
            </ul>
          ` : ""}
        </div>
      </div>
    `
  });

  return blocks;
}

// -------------------------------------------------------------------------------------------------
// REUSABLE STAGE 11 BLOCK GENERATOR (Precedent Intelligence / முன்மாதிரி தீர்ப்புகள்)
// -------------------------------------------------------------------------------------------------
export function renderStage11Blocks(caseData: PropertyCase): PDFSectionBlock[] {
  const blocks: PDFSectionBlock[] = [];
  const stage11 = caseData.stage11;

  if (!stage11) {
    blocks.push({
      html: `
        ${PDF_SHARED_STYLES}
        <div class="pdf-section-title">
          நிலை 11 - முன்மாதிரி தீர்ப்புகள் • STAGE 11 PRECEDENT INTELLIGENCE
        </div>
        <div class="pdf-card">
          <p style="margin: 0; color: #64748b; font-style: italic;">No Stage 11 data available in this case analysis.</p>
        </div>
      `
    });
    return blocks;
  }

  const similarCases = stage11.similarCases || [];
  const authSummary = stage11.authoritiesSummary || ({} as any);
  const govOrders: GovernmentOrderItem[] = authSummary.governmentOrders || [];
  const circulars: CircularItem[] = authSummary.circulars || [];
  const statutesList: string[] = authSummary.statutesList || [];
  const overallPrinciples: string[] = stage11.overallPrinciples || [];
  const successProb = stage11.successProbability;

  const similarCasesCount = stage11.similarCasesCount || similarCases.length;
  const avgSimScore = stage11.averageSimilarityScore || (similarCases.length > 0 ? Math.round(similarCases.reduce((acc, c) => acc + (c.similarityScore || 0), 0) / similarCases.length) : 0);
  const highCourtCount = authSummary.highCourtCount || similarCases.filter(c => (c.court || "").toLowerCase().includes("high court") || (c.court || "").toLowerCase().includes("madras")).length;
  const supremeCourtCount = authSummary.supremeCourtCount || similarCases.filter(c => (c.court || "").toLowerCase().includes("supreme court")).length;
  const govOrdersCount = authSummary.governmentOrdersCount || govOrders.length;
  const circularsCount = authSummary.circularsCount || circulars.length;

  // 1. Stage 11 Title + Summary KPI Grid + Success Probability
  blocks.push({
    minRemainingHeight: 180,
    html: `
      ${PDF_SHARED_STYLES}
      <div class="pdf-section-title">
        நிலை 11 - முன்மாதிரி தீர்ப்புகள் • STAGE 11 PRECEDENT INTELLIGENCE
      </div>

      <!-- Summary KPI Grid -->
      <div class="pdf-grid-4" style="margin-bottom: 8px;">
        <div class="pdf-card" style="margin-bottom: 0; background: #faf5ff; border-color: #e9d5ff;">
          <span class="pdf-label" style="color: #6b21a8;">Similar Cases Count</span>
          <div class="pdf-val" style="font-size: 13px; color: #581c87; font-weight: 800;">${similarCasesCount} <span style="font-size: 9px; font-weight: 600;">Judgments</span></div>
        </div>
        <div class="pdf-card" style="margin-bottom: 0; background: #f0fdf4; border-color: #bbf7d0;">
          <span class="pdf-label" style="color: #15803d;">Avg Similarity Score</span>
          <div class="pdf-val" style="font-size: 13px; color: #166534; font-weight: 800;">${avgSimScore}%</div>
        </div>
        <div class="pdf-card" style="margin-bottom: 0; background: #eff6ff; border-color: #bfdbfe;">
          <span class="pdf-label" style="color: #1d4ed8;">High Court / SC</span>
          <div class="pdf-val" style="font-size: 13px; color: #1e40af; font-weight: 800;">${highCourtCount} HC / ${supremeCourtCount} SC</div>
        </div>
        <div class="pdf-card" style="margin-bottom: 0; background: #fffbeb; border-color: #fde68a;">
          <span class="pdf-label" style="color: #b45309;">G.O.s &amp; Circulars</span>
          <div class="pdf-val" style="font-size: 13px; color: #92400e; font-weight: 800;">${govOrdersCount} G.O. / ${circularsCount} Circ.</div>
        </div>
      </div>

      <!-- Success Probability Assessment -->
      ${successProb ? `
        <div class="pdf-card" style="border-left: 3.5px solid #059669; background: #f0fdf4; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 800; color: #166534; text-transform: uppercase;">
              Precedent-Derived Success Probability: <b style="font-size: 12px; color: #14532d;">${successProb.percentage ?? 0}%</b>
            </span>
            <span class="pdf-badge ${successProb.percentage >= 80 ? 'pdf-badge-emerald' : successProb.percentage >= 60 ? 'pdf-badge-amber' : 'pdf-badge-rose'}">
              Rating: ${escapePdfHtml(successProb.rating || "Favorable")}
            </span>
          </div>
          ${successProb.disclaimer ? `
            <p style="margin: 0; font-size: 8.5px; color: #4b5563; line-height: 1.45; font-style: italic;">
              <b>Disclaimer / குறிப்பு:</b> ${escapePdfHtml(successProb.disclaimer)}
            </p>
          ` : ""}
        </div>
      ` : ""}
    `
  });

  // 2. Overall Legal Principles (Export EVERY item, no truncation)
  if (overallPrinciples.length > 0) {
    blocks.push({
      minRemainingHeight: 140,
      html: `
        <div class="pdf-card" style="border-left: 3.5px solid #6366f1; margin-bottom: 8px;">
          <div class="pdf-card-header">
            <span>முக்கிய பொதுவான சட்டக் கோட்பாடுகள் • OVERALL LEGAL PRINCIPLES</span>
            <span class="pdf-badge pdf-badge-navy">${overallPrinciples.length} Principles Established</span>
          </div>
          <ul style="margin: 0; padding-left: 16px; font-size: 9.5px; color: #334155; line-height: 1.55;">
            ${overallPrinciples.map(p => `<li style="margin-bottom: 3.5px;">${escapePdfHtml(p)}</li>`).join("")}
          </ul>
        </div>
      `
    });
  }

  // 3. SIMILAR CASES (Export EVERY item from stage11.similarCases with NO .slice)
  // Granular sub-block structure prevents large blank gaps on page 2 and preserves perfect page flow
  if (similarCases.length > 0) {
    for (let i = 0; i < similarCases.length; i++) {
      const c = similarCases[i];
      const caseTitle = c.title || c.caseName || "Case Title Not Available";
      const citation = c.citation || c.citationNumber || "Citation Not Available";
      const caseId = c.caseId || c.id || `CASE-${i + 1}`;
      const score = c.similarityScore ?? 0;
      const courtDetails = [c.court, c.judge, c.bench, c.year, c.state].filter(Boolean).join(" • ");
      const caseType = c.caseType || c.disputeIssueCategory;
      const isFavorable = score >= 75;

      // Case Part 1: Header, Court info, Factual Similarity & Issues
      blocks.push({
        minRemainingHeight: 160,
        html: `
          <div class="pdf-card" style="border-left: 3.5px solid ${isFavorable ? '#059669' : '#d97706'}; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
              <div>
                <div style="font-size: 10.5px; font-weight: 800; color: #0f172a;">
                  ${i + 1}. ${escapePdfHtml(caseTitle)}
                </div>
                <div style="font-size: 8.5px; color: #64748b; margin-top: 1px; font-family: monospace;">
                  Citation: <b style="color: #1e1b4b;">${escapePdfHtml(citation)}</b> ${caseId ? `• ID: ${escapePdfHtml(caseId)}` : ""}
                </div>
                ${courtDetails ? `<div style="font-size: 8.5px; color: #475569; margin-top: 1px;"><b>Court / Bench:</b> ${escapePdfHtml(courtDetails)}</div>` : ""}
                ${caseType ? `<div style="font-size: 8.5px; color: #6b21a8; margin-top: 1px;"><b>Type / Category:</b> ${escapePdfHtml(caseType)}</div>` : ""}
              </div>
              <div style="text-align: right; shrink-0;">
                <span class="pdf-badge ${isFavorable ? 'pdf-badge-emerald' : 'pdf-badge-amber'}">
                  ${score}% Similarity
                </span>
              </div>
            </div>

            ${c.factualSimilarity ? `
              <div style="background: #f8fafc; padding: 6px 8px; border-radius: 4px; font-size: 9.5px; border: 1px solid #f1f5f9; margin-top: 4px;">
                <span class="pdf-label">நிகழ்வு ஒற்றுமை / Factual Similarity:</span>
                <p style="margin: 2px 0 0 0; color: #334155; line-height: 1.45;">${escapePdfHtml(c.factualSimilarity)}</p>
              </div>
            ` : ""}

            ${(c.issuesCompared && c.issuesCompared.length > 0) || (c.legalPrinciples && c.legalPrinciples.length > 0) ? `
              <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px;">
                ${c.issuesCompared && c.issuesCompared.length > 0 ? `
                  <div style="font-size: 8.5px;">
                    <span class="pdf-label">Issues Compared:</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px;">
                      ${c.issuesCompared.map(issue => `<span class="pdf-badge pdf-badge-navy">${escapePdfHtml(issue)}</span>`).join("")}
                    </div>
                  </div>
                ` : ""}
                ${c.legalPrinciples && c.legalPrinciples.length > 0 ? `
                  <div style="font-size: 8.5px;">
                    <span class="pdf-label">Statutes &amp; Sections:</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px;">
                      ${c.legalPrinciples.map(lp => `<span class="pdf-badge pdf-badge-purple">${escapePdfHtml(lp)}</span>`).join("")}
                    </div>
                  </div>
                ` : ""}
              </div>
            ` : ""}
          </div>
        `
      });

      // Case Part 2: Facts Comparison Matrix (if present)
      if (c.factsComparison && c.factsComparison.length > 0) {
        blocks.push({
          minRemainingHeight: 130,
          html: `
            <div class="pdf-card" style="margin-bottom: 6px; padding: 6px 8px;">
              <span class="pdf-label">Facts Comparison Matrix (${escapePdfHtml(citation)}):</span>
              <table class="pdf-table" style="margin-top: 4px; margin-bottom: 0;">
                <tr>
                  <th style="width: 25%;">Feature</th>
                  <th style="width: 35%;">Current Case</th>
                  <th style="width: 30%;">Reference Case</th>
                  <th style="width: 10%; text-align: center;">Match</th>
                </tr>
                ${c.factsComparison.map(fc => `
                  <tr>
                    <td><b>${escapePdfHtml(fc.feature)}</b></td>
                    <td>${escapePdfHtml(fc.currentCase)}</td>
                    <td>${escapePdfHtml(fc.referenceCase)}</td>
                    <td style="text-align: center;">${fc.match ? '<span style="color:#059669; font-weight:800;">✓</span>' : '<span style="color:#dc2626; font-weight:800;">✗</span>'}</td>
                  </tr>
                `).join("")}
              </table>
            </div>
          `
        });
      }

      // Case Part 3: Holdings, Reasoning, Outcome & Strategic Value
      blocks.push({
        minRemainingHeight: 140,
        html: `
          <div class="pdf-card" style="margin-bottom: 8px;">
            ${c.keyLegalHoldings && c.keyLegalHoldings.length > 0 ? `
              <div style="margin-bottom: 5px;">
                <span class="pdf-label">நீதிமன்றத் தீர்ப்புரைகள் / Key Legal Holdings:</span>
                <ul style="margin: 2px 0 0 0; padding-left: 14px; font-size: 9.5px; color: #1e1b4b; line-height: 1.45;">
                  ${c.keyLegalHoldings.map(h => `<li style="margin-bottom: 2.5px;"><b>${escapePdfHtml(h)}</b></li>`).join("")}
                </ul>
              </div>
            ` : ""}

            ${c.courtReasoningSummary ? `
              <div style="margin-bottom: 5px; font-size: 9.5px;">
                <span class="pdf-label">Court Reasoning Summary:</span>
                <p style="margin: 2px 0 0 0; color: #334155; line-height: 1.45;">${escapePdfHtml(c.courtReasoningSummary)}</p>
              </div>
            ` : ""}

            ${(c.finalOutcome || c.whyItMatters) ? `
              <div class="pdf-grid-2" style="margin-bottom: 5px; font-size: 9.5px;">
                ${c.finalOutcome ? `
                  <div>
                    <span class="pdf-label">Final Outcome:</span>
                    <div style="font-weight: 700; color: #065f46;">${escapePdfHtml(c.finalOutcome)}</div>
                  </div>
                ` : ""}
                ${c.whyItMatters ? `
                  <div>
                    <span class="pdf-label">Why It Matters:</span>
                    <div style="color: #334155;">${escapePdfHtml(c.whyItMatters)}</div>
                  </div>
                ` : ""}
              </div>
            ` : ""}

            ${c.authoritiesCited && c.authoritiesCited.length > 0 ? `
              <div style="margin-bottom: 4px; font-size: 8.5px; color: #475569;">
                <span class="pdf-label">Authorities Cited:</span> ${escapePdfHtml(c.authoritiesCited.join("; "))}
              </div>
            ` : ""}

            ${c.strategicValue ? `
              <div style="background: #faf5ff; padding: 6px 8px; border-radius: 4px; font-size: 9.5px; border: 1px solid #f3e8ff; margin-top: 4px;">
                <span class="pdf-label" style="color: #6b21a8;">பயன்பாட்டு உத்தி / Strategic Value for Present Case:</span>
                <p style="margin: 2px 0 0 0; color: #3b0764; font-weight: 600; line-height: 1.45;">${escapePdfHtml(c.strategicValue)}</p>
              </div>
            ` : ""}
          </div>
        `
      });
    }
  } else {
    blocks.push({
      html: `
        <div class="pdf-card">
          <p style="margin: 0; color: #64748b; font-style: italic;">No similar precedent cases indexed for this matter.</p>
        </div>
      `
    });
  }

  // 4. Government Orders (G.O.s) - Title and Table kept together with orphan protection
  if (govOrders.length > 0) {
    blocks.push({
      minRemainingHeight: 160,
      html: `
        <div class="pdf-section-title">அரசாணைகள் • GOVERNMENT ORDERS (G.O.s)</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 20%;">Order Number</th>
            <th style="width: 13%;">Date</th>
            <th style="width: 23%;">Department</th>
            <th style="width: 26%;">Subject</th>
            <th style="width: 18%;">Relevance</th>
          </tr>
          ${govOrders.map(go => `
            <tr>
              <td><b>${escapePdfHtml(go.orderNumber)}</b></td>
              <td>${escapePdfHtml(go.date)}</td>
              <td>${escapePdfHtml(go.department)}</td>
              <td>${escapePdfHtml(go.subject)}</td>
              <td><b style="color: #581c87;">${escapePdfHtml(go.relevance)}</b></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  // 5. Circulars - Title and Table kept together with orphan protection
  if (circulars.length > 0) {
    blocks.push({
      minRemainingHeight: 160,
      html: `
        <div class="pdf-section-title">சுற்றறிக்கைகள் • OFFICIAL REVENUE &amp; REGISTRATION CIRCULARS</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 20%;">Circular Number</th>
            <th style="width: 13%;">Date</th>
            <th style="width: 23%;">Department</th>
            <th style="width: 26%;">Subject</th>
            <th style="width: 18%;">Relevance</th>
          </tr>
          ${circulars.map(circ => `
            <tr>
              <td><b>${escapePdfHtml(circ.circularNumber)}</b></td>
              <td>${escapePdfHtml(circ.date)}</td>
              <td>${escapePdfHtml(circ.department)}</td>
              <td>${escapePdfHtml(circ.subject)}</td>
              <td><b style="color: #1e40af;">${escapePdfHtml(circ.relevance)}</b></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  // 6. Relevant Statutes List
  if (statutesList.length > 0) {
    blocks.push({
      minRemainingHeight: 100,
      html: `
        <div class="pdf-card">
          <div class="pdf-card-header">
            <span>பொருந்தும் சட்டப்பிரிவுகள் • RELEVANT STATUTES &amp; SECTIONS</span>
            <span class="pdf-badge pdf-badge-navy">Statutory Base</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 5px;">
            ${statutesList.map(s => `<span class="pdf-badge pdf-badge-navy" style="font-size: 9px; padding: 3px 6px;">${escapePdfHtml(s)}</span>`).join("")}
          </div>
        </div>
      `
    });
  }

  // 7. Precedent-Based Strategy Recommendation
  if (stage11.strategyRecommendationFromPrecedents) {
    blocks.push({
      minRemainingHeight: 120,
      html: `
        <div class="pdf-card" style="border-left: 3.5px solid #D4AF37; background: #fffdfa; margin-bottom: 8px;">
          <div class="pdf-card-header">
            <span>முன்மாதிரி தீர்ப்புகள் அடிப்படையிலான சட்ட உத்தி • PRECEDENT-BASED STRATEGY RECOMMENDATION</span>
            <span class="pdf-badge pdf-badge-gold">Strategic Roadmap</span>
          </div>
          <p style="margin: 0; color: #1e1b4b; font-size: 9.5px; font-weight: 600; line-height: 1.55;">
            ${escapePdfHtml(stage11.strategyRecommendationFromPrecedents)}
          </p>
        </div>
      `
    });
  }

  return blocks;
}

// -------------------------------------------------------------------------------------------------
// REUSABLE STAGE 12 BLOCK GENERATOR (Legal Strategy Simulator / சட்ட உத்தி சிமுலேட்டர்)
// -------------------------------------------------------------------------------------------------
export function renderStage12Blocks(caseData: PropertyCase): PDFSectionBlock[] {
  const blocks: PDFSectionBlock[] = [];
  const stage12 = caseData.stage12;

  if (!stage12) {
    blocks.push({
      html: `
        ${PDF_SHARED_STYLES}
        <div class="pdf-section-title">
          நிலை 12 - சட்ட உத்தி சிமுலேட்டர் • STAGE 12 LEGAL STRATEGY SIMULATOR
        </div>
        <div class="pdf-card">
          <p style="margin: 0; color: #64748b; font-style: italic;">No Stage 12 data available in this case analysis.</p>
        </div>
      `
    });
    return blocks;
  }

  const route = stage12.strongestLegalRoute;
  const precedentsList = stage12.mostPersuasivePrecedents || [];
  const evidenceGaps = stage12.evidenceGapsToFill || [];
  const counterargs = stage12.likelyOppositeCounterarguments || [];
  const additionalProofs = stage12.recommendedAdditionalProof || [];
  const priorityActions = stage12.priorityNextActions || [];

  // 1. Strongest Legal Route Block
  blocks.push({
    minRemainingHeight: 180,
    html: `
      ${PDF_SHARED_STYLES}
      <div class="pdf-section-title">
        நிலை 12 - சட்ட உத்தி சிமுலேட்டர் • STAGE 12 LEGAL STRATEGY SIMULATOR
      </div>

      ${route ? `
        <div class="pdf-card" style="border-top: 3.5px solid #4338ca; background: #faf5ff; margin-bottom: 8px;">
          <div class="pdf-card-header">
            <span>12.1 மிக வலுவான சட்ட வழிமுறை • STRONGEST LEGAL ROUTE</span>
            <span class="pdf-badge pdf-badge-emerald">Primary Track</span>
          </div>
          <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 4px;">
            ${escapePdfHtml(route.routeName || "Strategic Legal Action")}
          </div>
          <div style="font-size: 9.5px; color: #334155; line-height: 1.5; margin-bottom: 6px; background: #ffffff; padding: 6px 8px; border-radius: 4px; border: 1px solid #e9d5ff;">
            <b>ஏன் இந்த வழிமுறை? / Justification:</b> ${escapePdfHtml(route.justification || "Recommended legal track optimized for highest statutory and administrative relief.")}
          </div>
          <div class="pdf-grid-3" style="background: #ffffff; padding: 6px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <div>
              <span class="pdf-label">Route Type:</span>
              <div class="pdf-val">${escapePdfHtml(route.routeType || "Writ / Civil")}</div>
            </div>
            <div>
              <span class="pdf-label">Est. Resolution Time:</span>
              <div class="pdf-val">${escapePdfHtml(route.timeToResolutionEst || "3-6 Months")}</div>
            </div>
            <div>
              <span class="pdf-label">Success Probability:</span>
              <div class="pdf-val" style="color: #059669; font-weight: 800;">${route.successProbabilityPercentage ? `${route.successProbabilityPercentage}%` : "85%+"}</div>
            </div>
          </div>
        </div>
      ` : ""}
    `
  });

  // 2. Most Persuasive Precedents
  if (precedentsList.length > 0) {
    blocks.push({
      minRemainingHeight: 120,
      html: `
        <div class="pdf-card" style="border-left: 3.5px solid #8b5cf6; margin-bottom: 8px;">
          <div class="pdf-card-header">
            <span>12.2 மிகவும் வலுவான முன்மாதிரி தீர்ப்புகள் • MOST PERSUASIVE PRECEDENTS</span>
            <span class="pdf-badge pdf-badge-purple">${precedentsList.length} Cited</span>
          </div>
          <ul style="margin: 0; padding-left: 16px; font-size: 9.5px; color: #1e1b4b; line-height: 1.5;">
            ${precedentsList.map(p => `<li style="margin-bottom: 3px;"><b>${escapePdfHtml(p)}</b></li>`).join("")}
          </ul>
        </div>
      `
    });
  }

  // 3. Evidence Gaps to Fill (12.3)
  if (evidenceGaps.length > 0) {
    blocks.push({
      minRemainingHeight: 160,
      html: `
        <div class="pdf-section-title">12.3 நிரப்பப்பட வேண்டிய ஆதார இடைவெளிகள் • EVIDENCE GAPS TO FILL</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 35%;">Missing Evidence Element</th>
            <th style="width: 50%;">How to Obtain / Procedural Step</th>
            <th style="width: 15%; text-align: center;">Urgency</th>
          </tr>
          ${evidenceGaps.map(g => `
            <tr>
              <td><b>${escapePdfHtml(g.missingElement)}</b></td>
              <td>${escapePdfHtml(g.howToObtain)}</td>
              <td style="text-align: center;"><span class="pdf-badge ${g.urgency === 'High' ? 'pdf-badge-rose' : g.urgency === 'Medium' ? 'pdf-badge-amber' : 'pdf-badge-navy'}">${escapePdfHtml(g.urgency)}</span></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  // 4. Opposing Counterarguments & Rebuttals (12.4)
  if (counterargs.length > 0) {
    blocks.push({
      minRemainingHeight: 160,
      html: `
        <div class="pdf-section-title">12.4 எதிர்த்தரப்பின் சாத்தியமான வாதங்கள் &amp; பதில் உத்தி • COUNTERARGUMENT SIMULATOR &amp; REBUTTALS</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 45%;">Anticipated Opposing Argument / Objection</th>
            <th style="width: 55%;">Strategic Rebuttal &amp; Counter-Evidence</th>
          </tr>
          ${counterargs.map(ca => `
            <tr>
              <td><b style="color: #991b1b;">"${escapePdfHtml(ca.argument)}"</b></td>
              <td><b style="color: #065f46;">${escapePdfHtml(ca.rebuttalStrategy)}</b></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  // 5. Recommended Additional Proof (12.5)
  if (additionalProofs.length > 0) {
    blocks.push({
      minRemainingHeight: 160,
      html: `
        <div class="pdf-section-title">12.5 கூடுதல் சாட்சியங்கள் &amp; ஆவணப் பரிந்துரைகள் • RECOMMENDED ADDITIONAL PROOF</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 20%;">Proof Type</th>
            <th style="width: 35%;">Title / Record Name</th>
            <th style="width: 45%;">Substantive Legal Purpose</th>
          </tr>
          ${additionalProofs.map(ap => `
            <tr>
              <td><span class="pdf-badge pdf-badge-gold">${escapePdfHtml(ap.type || "Document")}</span></td>
              <td><b>${escapePdfHtml(ap.title)}</b></td>
              <td>${escapePdfHtml(ap.purpose)}</td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  // 6. Priority Next Actions Roadmap (12.6)
  if (priorityActions.length > 0) {
    blocks.push({
      minRemainingHeight: 160,
      html: `
        <div class="pdf-section-title">12.6 அடுத்தடுத்த முதன்மை நடவடிக்கைகள் • PRIORITY ACTION ROADMAP</div>
        <table class="pdf-table">
          <tr>
            <th style="width: 8%; text-align: center;">Step</th>
            <th style="width: 50%;">Action Required</th>
            <th style="width: 27%;">Target Authority / Forum</th>
            <th style="width: 15%;">Timeline</th>
          </tr>
          ${priorityActions.map(pa => `
            <tr>
              <td style="text-align: center; font-weight: 800; color: #4338ca;">#${escapePdfHtml(pa.stepNumber ?? 1)}</td>
              <td><b>${escapePdfHtml(pa.action)}</b></td>
              <td>${escapePdfHtml(pa.targetAuthority)}</td>
              <td><b>${escapePdfHtml(pa.timeline)}</b></td>
            </tr>
          `).join("")}
        </table>
      `
    });
  }

  return blocks;
}

// -------------------------------------------------------------------------------------------------
// REUSABLE CLIENT ACTION BLOCK GENERATOR (Complete Client Action Solution)
// -------------------------------------------------------------------------------------------------
export function renderClientActionBlocks(caseData: PropertyCase): PDFSectionBlock[] {
  const blocks: PDFSectionBlock[] = [];
  const reply = caseData.clientFacingReply || ({} as any);
  const immediate = caseData.immediateAction || ({} as any);
  const intake = caseData.intake || ({} as any);
  const servicePkg = caseData.servicePackage || ({} as any);
  const docsReq = caseData.documentsRequired || ({} as any);
  const stage6 = caseData.stage6 || ({} as any);

  // A. CLIENT ACTION BRIEF
  blocks.push({
    minRemainingHeight: 180,
    html: `
      ${PDF_SHARED_STYLES}
      <div class="pdf-section-title">
        👤 வாடிக்கையாளர் நடவடிக்கை வழிகாட்டி • CLIENT ACTION BRIEF &amp; ADVISORY ROADMAP
      </div>

      <!-- Problem & Position in Plain Language -->
      <div class="pdf-card" style="border-left: 3.5px solid #312e81; margin-bottom: 8px;">
        <div class="pdf-card-header">
          <span>வழக்கின் சுருக்கம் &amp; சட்ட நிலைப்பாடு • CASE PROBLEM &amp; LEGAL POSITION</span>
          <span class="pdf-badge pdf-badge-navy">Client Brief</span>
        </div>
        <div style="margin-bottom: 6px;">
          <span class="pdf-label">கண்டறியப்பட்ட முக்கிய சிக்கல் / Problem Identified:</span>
          <p style="margin: 2px 0 0 0; color: #0f172a; font-weight: 700; font-size: 10px; line-height: 1.5;">
            ${escapePdfHtml(reply.problemIdentified || intake.rawCaseSummary || caseData.stage2?.realIssue || "Property dispute regarding revenue records, title assertion, and rightful possession.")}
          </p>
        </div>
        <div>
          <span class="pdf-label">சட்ட நிலைப்பாடு &amp; சாதகமான அம்சங்கள் / Legal Position:</span>
          <p style="margin: 2px 0 0 0; color: #334155; font-size: 9.5px; line-height: 1.5;">
            ${escapePdfHtml(reply.legalPosition || reply.legalPositionSummary || caseData.stage2?.rootCauseStatement || "The documentation presents valid statutory grounds for rectification before the revenue authority / competent civil court.")}
          </p>
        </div>
      </div>

      <!-- Immediate Next Step Highlight -->
      <div class="pdf-card" style="background: linear-gradient(135deg, #f0fdf4, #ffffff); border: 1.5px solid #86efac; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 10px; font-weight: 800; color: #166534; text-transform: uppercase;">
            உடனடி முதல் நடவடிக்கை / Immediate Primary Step:
          </span>
          <span class="pdf-badge pdf-badge-emerald">PRIORITY 1</span>
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #14532d; line-height: 1.45;">
          ${escapePdfHtml(reply.immediateNextStep || "Submit written objection/petition to the competent Revenue Divisional Officer (RDO) / Tahsildar.")}
        </div>
        <div style="display: flex; gap: 16px; margin-top: 6px; font-size: 9px; color: #166534;">
          <div><b>அதிகார வரம்பு / Authority:</b> ${escapePdfHtml(reply.expectedAuthority || "Revenue Divisional Officer / Tahsildar")}</div>
          <div><b>எதிர்பார்க்கப்படும் கால அளவு / Est. Timeline:</b> ${escapePdfHtml(reply.estimatedTimeline || "15-45 Days")}</div>
        </div>
      </div>
    `
  });

  // B. CHRONOLOGICAL ACTION SCHEDULE (Within 24 Hours, Within 7 Days, Within 30 Days)
  const within24 = immediate.within24Hours || ["Collect copy of latest Patta & Chitta extract", "Preserve physical possession proof"];
  const within7 = immediate.within7Days || ["Obtain certified Encumbrance Certificate for 30 years", "Draft statutory revenue objection letter"];
  const within30 = immediate.within30Days || ["File formal appeal under Patta Pass Book Act Section 12", "Seek advocate representation before RDO enquiry"];

  blocks.push({
    minRemainingHeight: 160,
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
              <ul style="margin: 0; padding-left: 12px; font-size: 9px; line-height: 1.45;">
                ${within24.map((item: string) => `<li style="margin-bottom: 3px; color: #7f1d1d; font-weight: 600;">${escapePdfHtml(item)}</li>`).join("")}
              </ul>
            ` : `<span style="color: #64748b; font-style: italic;">No urgent 24-hour tasks</span>`}
          </td>
          <td style="vertical-align: top;">
            ${within7.length > 0 ? `
              <ul style="margin: 0; padding-left: 12px; font-size: 9px; line-height: 1.45;">
                ${within7.map((item: string) => `<li style="margin-bottom: 3px; color: #713f12; font-weight: 600;">${escapePdfHtml(item)}</li>`).join("")}
              </ul>
            ` : `<span style="color: #64748b; font-style: italic;">No 7-day tasks</span>`}
          </td>
          <td style="vertical-align: top;">
            ${within30.length > 0 ? `
              <ul style="margin: 0; padding-left: 12px; font-size: 9px; line-height: 1.45;">
                ${within30.map((item: string) => `<li style="margin-bottom: 3px; color: #1e3a8a; font-weight: 600;">${escapePdfHtml(item)}</li>`).join("")}
              </ul>
            ` : `<span style="color: #64748b; font-style: italic;">No 30-day tasks</span>`}
          </td>
        </tr>
      </table>
    `
  });

  // C. REQUIRED PROPERTY DOCUMENTS (Categorized & Distinguishing AVAILABLE vs MISSING)
  const availableSet = new Set<string>([...(stage6.available || []), ...(docsReq.available || [])]);
  const missingSet = new Set<string>([...(stage6.missing || []), ...(docsReq.missing || [])]);

  // If specific categorized lists are available in docsReq, use them, otherwise fallback cleanly
  const titleDocs = docsReq.mandatory || ["Original Registered Title Deed", "Parent Document Link Deeds (30 Years)"];
  const revenueDocs = docsReq.revenue || ["Patta Passbook / Online e-Patta Extract", "Field Measurement Book (FMB) Sketch", "A-Register Extract"];
  const familyDocs = docsReq.family || ["Legal Heirship Certificate (if inherited)", "Death Certificate of original owner"];
  const courtDocs = docsReq.court || ["Copy of prior revenue/court proceedings", "Certified copy of registered objection"];

  blocks.push({
    minRemainingHeight: 180,
    html: `
      <div class="pdf-section-title">தேவைப்படும் முக்கிய ஆவணங்கள் • REQUIRED PROPERTY DOCUMENTS CHECKLIST</div>
      <div class="pdf-card">
        <div class="pdf-grid-2">
          <!-- Column 1: Title & Revenue Records -->
          <div>
            <div style="font-size: 9.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 3px;">1. முதன்மை உரிமை &amp; பத்திரப் பதிவுகள் (Title &amp; Deeds):</div>
            <ul style="margin: 0 0 6px 0; padding-left: 14px; font-size: 9px; line-height: 1.45;">
              ${titleDocs.map((doc: string) => {
                const isAvail = availableSet.has(doc) || (!missingSet.has(doc) && availableSet.size === 0);
                return `
                  <li style="margin-bottom: 2px;">
                    <span style="color: ${isAvail ? '#15803d' : '#b91c1c'}; font-weight: 700;">[${isAvail ? 'AVAILABLE ✓' : 'MISSING !'}]</span>
                    ${escapePdfHtml(doc)}
                  </li>
                `;
              }).join("")}
            </ul>

            <div style="font-size: 9.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 3px;">2. வருவாய் &amp; நில அளவை ஆவணங்கள் (Revenue &amp; Survey):</div>
            <ul style="margin: 0; padding-left: 14px; font-size: 9px; line-height: 1.45;">
              ${revenueDocs.map((doc: string) => {
                const isAvail = availableSet.has(doc);
                return `
                  <li style="margin-bottom: 2px;">
                    <span style="color: ${isAvail ? '#15803d' : '#b91c1c'}; font-weight: 700;">[${isAvail ? 'AVAILABLE ✓' : 'MISSING !'}]</span>
                    ${escapePdfHtml(doc)}
                  </li>
                `;
              }).join("")}
            </ul>
          </div>

          <!-- Column 2: Family/Heirship & Court Records -->
          <div>
            <div style="font-size: 9.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 3px;">3. வாரிசு &amp; குடும்ப ஆவணங்கள் (Family &amp; Heirship):</div>
            <ul style="margin: 0 0 6px 0; padding-left: 14px; font-size: 9px; line-height: 1.45;">
              ${familyDocs.map((doc: string) => {
                const isAvail = availableSet.has(doc);
                return `
                  <li style="margin-bottom: 2px;">
                    <span style="color: ${isAvail ? '#15803d' : '#b91c1c'}; font-weight: 700;">[${isAvail ? 'AVAILABLE ✓' : 'MISSING !'}]</span>
                    ${escapePdfHtml(doc)}
                  </li>
                `;
              }).join("")}
            </ul>

            <div style="font-size: 9.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 3px;">4. நீதிமன்ற &amp; பிற நடவடிக்கைகள் (Litigation &amp; Others):</div>
            <ul style="margin: 0; padding-left: 14px; font-size: 9px; line-height: 1.45;">
              ${courtDocs.map((doc: string) => {
                const isAvail = availableSet.has(doc);
                return `
                  <li style="margin-bottom: 2px;">
                    <span style="color: ${isAvail ? '#15803d' : '#b91c1c'}; font-weight: 700;">[${isAvail ? 'AVAILABLE ✓' : 'MISSING !'}]</span>
                    ${escapePdfHtml(doc)}
                  </li>
                `;
              }).join("")}
            </ul>
          </div>
        </div>
      </div>
    `
  });

  // D. RECOMMENDED SERVICE PACKAGE & DELIVERABLES
  if (servicePkg && (servicePkg.packageName || servicePkg.recommendedPackage || caseData.stage10?.packageName)) {
    const pkgName = servicePkg.packageName || servicePkg.recommendedPackage || caseData.stage10?.packageName;
    const fee = servicePkg.professionalFee || servicePkg.feeRange || caseData.stage10?.priceRange;
    const desc = servicePkg.description || servicePkg.expectedOutcome || caseData.stage10?.description;
    const delivList = servicePkg.deliverables || caseData.stage10?.deliverablesList || [];

    blocks.push({
      minRemainingHeight: 150,
      html: `
        <div class="pdf-card" style="border: 1.5px solid #D4AF37; background: #fffdf7; margin-bottom: 8px;">
          <div class="pdf-card-header" style="border-bottom-color: #fef3c7;">
            <span>பரிந்துரைக்கப்பட்ட சட்ட சேவை திட்டம் • RECOMMENDED SERVICE PACKAGE</span>
            <span class="pdf-badge pdf-badge-gold">${escapePdfHtml(servicePkg.tier || servicePkg.recommendedTrack || "ENTERPRISE")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
            <div style="font-size: 11px; font-weight: 800; color: #78350f;">
              ${escapePdfHtml(pkgName)}
            </div>
            ${fee ? `<div style="font-weight: 800; color: #0f172a; font-size: 11px;">${escapePdfHtml(fee)}</div>` : ""}
          </div>
          <p style="margin: 0 0 5px 0; color: #451a03; font-size: 9.5px; line-height: 1.45;">
            ${escapePdfHtml(desc || "Comprehensive end-to-end legal support covering document verification, representation drafting, and advocate hearing representation.")}
          </p>
          ${delivList.length > 0 ? `
            <div style="font-size: 8.5px; font-weight: 700; color: #78350f; text-transform: uppercase; margin-bottom: 2px;">Deliverables Included:</div>
            <ul style="margin: 0; padding-left: 14px; font-size: 9px; color: #451a03; line-height: 1.45;">
              ${delivList.map((d: string) => `<li>${escapePdfHtml(d)}</li>`).join("")}
            </ul>
          ` : ""}
        </div>
      `
    });
  }

  // Advocate Review & Signature Block
  blocks.push({
    minRemainingHeight: 90,
    html: `
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #475569;">
        <div>
          <div><b>வழக்கறிஞர் / Advocate:</b> ${escapePdfHtml(intake.existingAdvocate || "UNIKORN360 Legal Intelligence Advisory Panel")}</div>
          <div style="margin-top: 2px;"><b>வழக்கு குறிப்பு / Case Ref:</b> ${escapePdfHtml(intake.existingCaseNumber || caseData.id || "UK360-CASE")}</div>
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

  return blocks;
}

// -------------------------------------------------------------------------------------------------
// EXPORT VALIDATION HELPER
// Verifies that all required stages exist before rendering the PDF
// -------------------------------------------------------------------------------------------------
export function validateCaseDataForExport(caseData: PropertyCase): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!caseData.stage0 && !caseData.intake) warnings.push("Stage 00 intake data missing");
  if (!caseData.stage1) warnings.push("Stage 01 classification data missing");
  if (!caseData.stage2) warnings.push("Stage 02 root issue data missing");
  if (!caseData.stage3) warnings.push("Stage 03 subject matter map missing");
  if (!caseData.stage4) warnings.push("Stage 04 timeline data missing");
  if (!caseData.stage5) warnings.push("Stage 05 rights matrix missing");
  if (!caseData.stage6) warnings.push("Stage 06 evidence audit missing");
  if (!caseData.stage7) warnings.push("Stage 07 jurisdictional route missing");
  if (!caseData.stage8) warnings.push("Stage 08 legal remedies missing");
  if (!caseData.stage9) warnings.push("Stage 09 risk score missing");
  if (!caseData.stage10) warnings.push("Stage 10 service package missing");
  if (!caseData.stage11) warnings.push("Stage 11 precedent intelligence missing");
  if (!caseData.stage12) warnings.push("Stage 12 strategy simulator missing");
  if (!caseData.clientFacingReply) warnings.push("Client action reply missing");

  if (warnings.length > 0) {
    console.warn("Complete Case Report Export Validation Warnings:", warnings);
  }

  return { isValid: true, warnings };
}

// -------------------------------------------------------------------------------------------------
// 1. STANDALONE STAGE 11 PDF EXPORT
// -------------------------------------------------------------------------------------------------
export async function downloadStage11PDF(caseData: PropertyCase, filename?: string): Promise<void> {
  const caseId = caseData.id || "UK360-CASE";
  const defaultFilename = `UK360_${caseId}_Stage_11_Precedent_Intelligence`;

  const blocks: PDFSectionBlock[] = [
    { html: `${PDF_SHARED_STYLES}${renderCaseBanner(caseData)}` },
    ...renderStage11Blocks(caseData)
  ];

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
// 2. STANDALONE STAGE 12 PDF EXPORT
// -------------------------------------------------------------------------------------------------
export async function downloadStage12PDF(caseData: PropertyCase, filename?: string): Promise<void> {
  const caseId = caseData.id || "UK360-CASE";
  const defaultFilename = `UK360_${caseId}_Stage_12_Legal_Strategy`;

  const blocks: PDFSectionBlock[] = [
    { html: `${PDF_SHARED_STYLES}${renderCaseBanner(caseData)}` },
    ...renderStage12Blocks(caseData)
  ];

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
// 3. STANDALONE CLIENT ACTION PLAN PDF EXPORT
// -------------------------------------------------------------------------------------------------
export async function downloadClientActionPDF(caseData: PropertyCase, filename?: string): Promise<void> {
  const caseId = caseData.id || "UK360-CASE";
  const defaultFilename = `UK360_${caseId}_Client_Action_Plan`;

  const blocks: PDFSectionBlock[] = [
    { html: `${PDF_SHARED_STYLES}${renderCaseBanner(caseData)}` },
    ...renderClientActionBlocks(caseData)
  ];

  await renderAndDownloadPaginatedPDF(blocks, {
    documentTitle: "வாடிக்கையாளர் வழிகாட்டுதல் அறிக்கை • CLIENT ACTION BRIEF",
    reportType: "CLIENT ACTION BRIEF",
    caseId,
    dateStr: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    modelUsed: caseData.selectedModel || "gemini-3.7-flash",
    category: caseData.stage1?.category,
    clientName: caseData.intake?.clientName,
    filename: filename || defaultFilename
  });
}

// -------------------------------------------------------------------------------------------------
// 4. COMPLETE 12-STAGE ENTERPRISE LEGAL INTELLIGENCE REPORT
// (Guaranteed: Complete Stage 00-10 + Same Complete Stage 11 + Same Complete Stage 12 + Client Action)
// -------------------------------------------------------------------------------------------------
export async function downloadCompleteCaseReportPDF(caseData: PropertyCase, filename?: string): Promise<void> {
  const caseId = caseData.id || "UK360-CASE";
  const defaultFilename = `UK360_${caseId}_Complete_Case_Report`;

  validateCaseDataForExport(caseData);

  const blocks: PDFSectionBlock[] = [
    ...renderStage00To10Blocks(caseData),
    ...renderStage11Blocks(caseData),
    ...renderStage12Blocks(caseData),
    ...renderClientActionBlocks(caseData)
  ];

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
      minRemainingHeight: 90,
      html: `
        ${PDF_SHARED_STYLES}
        <div class="pdf-card" style="margin-bottom: 8px; line-height: 1.6; font-size: 10px;">
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
        minRemainingHeight: 110,
        html: `
          ${PDF_SHARED_STYLES}
          <div style="margin-top: 16px; padding-top: 10px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9.5px;">
            <div>
              <p style="font-size: 9px; font-weight: 700; color: #64748b; margin: 0;">இடம் / Place: _________________</p>
              <p style="font-size: 9px; font-weight: 700; color: #64748b; margin: 4px 0 0 0;">நாள் / Date: ${escapePdfHtml(dateStr)}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 10.5px; font-weight: 800; color: #0f172a; margin: 0 0 24px 0;">${escapePdfHtml(line)}</p>
              <p style="font-size: 9px; font-weight: 700; color: #475569; margin: 0; border-top: 1px dashed #94a3b8; display: inline-block; width: 150px; text-align: center;">(கையொப்பம் / Signature)</p>
            </div>
          </div>
        `
      });
      continue;
    }

    if (isSubjectLine) {
      flushGroup();
      blocks.push({
        minRemainingHeight: 70,
        html: `
          ${PDF_SHARED_STYLES}
          <div style="background-color: #f8fafc; border-left: 3.5px solid #4338ca; padding: 6px 10px; margin: 6px 0; border-radius: 0 4px 4px 0;">
            <p style="font-size: 10px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.45;">
              ${escapePdfHtml(line)}
            </p>
          </div>
        `
      });
      continue;
    }

    if (isHeading) {
      currentGroup.push(`
        <div style="font-size: 10.5px; font-weight: 800; color: #1e1b4b; margin: 6px 0 3px 0; text-transform: uppercase;">
          ${escapePdfHtml(line)}
        </div>
      `);
    } else {
      currentGroup.push(`
        <p style="font-size: 9.5px; margin: 0 0 4px 0; color: #334155; text-align: justify; line-height: 1.55;">
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

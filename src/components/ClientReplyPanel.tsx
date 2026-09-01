import React, { useState } from "react";
import { PropertyCase } from "../types";
import { useLanguage } from "../lib/languageContext";
import { downloadClientActionPDF } from "../lib/pdfExport";
import { 
  Copy, Check, FileText, AlertCircle, Sparkles, Send, 
  Calendar, CheckSquare, Layers, UserCheck, Inbox, MessageSquare,
  Download, Loader2
} from "lucide-react";

interface ClientReplyPanelProps {
  key?: any;
  caseData: PropertyCase;
}

export function ClientReplyPanel({ caseData }: ClientReplyPanelProps) {
  const { t } = useLanguage();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await downloadClientActionPDF(caseData);
    } catch (err) {
      console.error("Failed to download Client Action PDF:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const rReply = caseData.clientFacingReply || {} as any;
  const problemText = rReply.problemIdentified || rReply.summary || caseData.stage2?.realIssue || t("வருவாய் / பத்திரப்பதிவு முரண்பாடுகள் கண்டறியப்பட்டுள்ளன.", "Revenue or registration inconsistencies identified.");
  const legalText = rReply.legalPosition || rReply.actionableAdvice || caseData.stage2?.rootCauseStatement || t("தமிழ்நாடு நிலச் சட்டங்களின் கீழ் ஆய்வு செய்யப்படுகிறது.", "Evaluated under Tamil Nadu property statutes.");
  const nextStepText = rReply.immediateNextStep || rReply.actionableAdvice || (Array.isArray(caseData.immediateAction?.nextSteps) && caseData.immediateAction.nextSteps[0]) || t("தேவையான சான்றளிக்கப்பட்ட சொத்து நகல்களைப் பெற வேண்டும்.", "Obtain certified property copies.");
  const authorityText = rReply.expectedAuthority || caseData.immediateAction?.authorityToApproach || caseData.stage8?.primaryRemedy || t("தொடர்புடைய வருவாய்த் துறை / சார்பதிவாளர் அலுவலகம்.", "Concerned Revenue / SRO Office.");
  const timelineText = rReply.estimatedTimeline || caseData.immediateAction?.timeframe || t("அரசு நடைமுறை கால வரம்பிற்கு உட்பட்டது.", "As per statutory procedure timeline.");

  const getBriefMessage = () => {
    return `*${t("நிலம்360 சொத்து சட்ட விளக்கம்", "Nilam360 Property Legal Brief")}*
----------------------------------------
${t("அன்பான", "Dear")} ${caseData.stage0?.clientName || t("வாடிக்கையாளர்", "Client")},

${t("உங்களது சர்வே எண்.", "Regarding Survey No.")} ${caseData.stage0?.surveyNumber || "N/A"} (${caseData.stage0?.village || "N/A"} ${t("கிராமம்", "Village")}, ${caseData.stage0?.district || "N/A"} ${t("மாவட்டம்", "District")}) ${t("சொத்துத் தகராறு தொடர்பான தொழில்முறை மதிப்பீட்டு அறிக்கை கீழே கொடுக்கப்பட்டுள்ளது:", "property dispute report:")}

🔴 *${t("கண்டறியப்பட்ட பிரச்சனை", "Problem Identified")}:*
${problemText}

⚖️ *${t("சட்ட ரீதியான நிலை", "Legal Standing")}:*
${legalText}

📌 *${t("உடனடி அடுத்த கட்ட நடவடிக்கை", "Immediate Next Step")}:*
${nextStepText}

🏢 *${t("அணுக வேண்டிய அதிகாரி / மன்றம்", "Target Forum / Authority")}:*
${authorityText}

⏳ *${t("மதிப்பிடப்பட்ட கால அளவு", "Estimated Timeline")}:*
${timelineText}

${t("வாழ்த்துக்களுடன்,", "Warm regards,")}
*${t("நிலம்360 சொத்து ஆலோசனை குழு", "Nilam360 Legal Intelligence Team")}*`;
  };

  const rDocs = caseData.documentsRequired || { mandatory: [], revenue: [], family: [], court: [], other: [], available: [], missing: [], optional: [] };
  const rAction = caseData.immediateAction || { within24Hours: [], within7Days: [], within30Days: [], nextSteps: [] };
  const rPackage = caseData.servicePackage || { recommendedPackage: "", deliverables: [], professionalFee: "", expectedOutcome: "" };

  const actions24 = (rAction.within24Hours && rAction.within24Hours.length > 0) 
    ? rAction.within24Hours 
    : ((rAction.nextSteps && rAction.nextSteps.length > 0) ? [rAction.nextSteps[0]] : ["அசல் ஆவணங்களின் சான்றளிக்கப்பட்ட நகல்களை உடனடியாகப் பாதுகாக்கவும்."]);
  
  const actions7 = (rAction.within7Days && rAction.within7Days.length > 0)
    ? rAction.within7Days
    : ((rAction.nextSteps && rAction.nextSteps.length > 1) ? [rAction.nextSteps[1]] : ["சார்பதிவாளர் அலுவலகத்தில் வில்லங்கச் சான்றிதழ் (EC) பெற விண்ணப்பிக்கவும்."]);

  const actions30 = (rAction.within30Days && rAction.within30Days.length > 0)
    ? rAction.within30Days
    : ((rAction.nextSteps && rAction.nextSteps.length > 2) ? rAction.nextSteps.slice(2) : ["வருவாய் கோட்டாட்சியர் / உரிமையியல் நீதிமன்றத்தில் உரிய மனு தாக்கல் செய்யவும்."]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column: Client Facing Brief (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Client Brief Message */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
              <div className="p-1.5 bg-purple-50 text-purple-800 rounded-lg">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
                {t("வாடிக்கையாளர் தகவல் கையேடு", "Client Action Brief & Communication")}
              </h3>
            </div>
            
            <div className="flex items-center gap-2 print:hidden no-print">
              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                title="Export Client Action Plan as PDF"
              >
                {isExportingPDF ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-700" />
                    <span>{t("PDF தயாராகிறது...", "Generating PDF...")}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-purple-700" />
                    <span>{t("வாடிக்கையாளர் நடவடிக்கை PDF", "Export Client Action PDF")}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopy(getBriefMessage(), "brief")}
                className="btn-secondary-white !py-1.5 !px-3 !text-[11px]"
              >
                {copiedText === "brief" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">{t("நகலெடுக்கப்பட்டது!", "Copied!")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>{t("WhatsApp-இல் பகிர நகலெடு", "Copy Brief")}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3.5 text-xs leading-relaxed text-slate-600">
            {/* Card 1: Problem */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {t("அ. கண்டறியப்பட்ட பிரச்சனை", "A. Identified Core Dispute")}
              </span>
              <p className="text-slate-900 font-bold text-xs">{problemText}</p>
            </div>

            {/* Card 2: Legal Position */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {t("ஆ. சட்ட ரீதியான நிலை", "B. Statutory & Legal Standing")}
              </span>
              <p className="text-slate-700 font-medium">{legalText}</p>
            </div>

            {/* Card 3: Next Steps */}
            <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
              <span className="text-[9px] font-bold text-purple-900 uppercase tracking-wider block mb-1">
                {t("இ. உடனடி அடுத்த கட்ட நடவடிக்கை", "C. Immediate Recommended Step")}
              </span>
              <p className="text-purple-950 font-bold text-xs leading-tight">{nextStepText}</p>
            </div>

            {/* Grid for Authority & Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {t("ஈ. அணுக வேண்டிய அதிகாரி", "D. Target Forum / Authority")}
                </span>
                <p className="font-bold text-slate-900 text-xs">{authorityText}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {t("உ. மதிப்பிடப்பட்ட கால அளவு", "E. Estimated Timeline")}
                </span>
                <p className="font-bold text-purple-900 text-xs">{timelineText}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chronological Action Lists */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Calendar className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
              {t("காலவரிசைப்படி நடவடிக்கை திட்டம்", "Chronological Action Roadmap")}
            </h3>
          </div>

          <div className="space-y-4">
            {/* 24 Hours */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase block">
                {t("24 மணி நேரத்திற்குள் (அவசரமானவை)", "Within 24 Hours (Urgent)")}
              </span>
              <ul className="space-y-1">
                {actions24.map((act: string, idx: number) => (
                  <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 7 Days */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-purple-900 tracking-wider uppercase block">
                {t("7 நாட்களுக்குள் (வழிமுறைகள்)", "Within 7 Days (Procedural)")}
              </span>
              <ul className="space-y-1">
                {actions7.map((act: string, idx: number) => (
                  <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-700 shrink-0" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 30 Days */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase block">
                {t("30 நாட்களுக்குள் (தீர்வு)", "Within 30 Days (Resolution)")}
              </span>
              <ul className="space-y-1">
                {actions30.map((act: string, idx: number) => (
                  <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 font-medium">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Right Column: Documents Required & Service Proposal (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Documents Required Categorized List */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
              {t("தேவையான சொத்து ஆவணங்கள் கையேடு", "Required Property Document Checklist")}
            </h3>
          </div>

          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
            {/* Mandatory Docs */}
            {rDocs.mandatory?.length > 0 && (
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {t("நிலை 1 - கட்டாய ஆவணங்கள்", "Stage 1 - Primary Title Documents")}
                </span>
                <div className="space-y-1">
                  {rDocs.mandatory.map((doc: string, idx: number) => (
                    <div key={idx} className="text-xs text-slate-800 font-medium bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-700 shrink-0" />
                      <span className="truncate">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue Docs */}
            {rDocs.revenue?.length > 0 && (
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {t("நிலை 2 - நில வருவாய் ஆவணங்கள்", "Stage 2 - Revenue & Survey Records")}
                </span>
                <div className="space-y-1">
                  {rDocs.revenue.map((doc: string, idx: number) => (
                    <div key={idx} className="text-xs text-slate-800 font-medium bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                      <span className="truncate">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Family Docs */}
            {rDocs.family?.length > 0 && (
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {t("நிலை 3 - குடும்பம் & வாரிசுரிமை ஆவணங்கள்", "Stage 3 - Family & Heirship Proofs")}
                </span>
                <div className="space-y-1">
                  {rDocs.family.map((doc: string, idx: number) => (
                    <div key={idx} className="text-xs text-slate-800 font-medium bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                      <span className="truncate">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Court / Litigation */}
            {rDocs.court?.length > 0 && (
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {t("நிலை 4 - நீதிமன்ற வழக்கு ஆவணங்கள்", "Stage 4 - Court & Litigation Papers")}
                </span>
                <div className="space-y-1">
                  {rDocs.court.map((doc: string, idx: number) => (
                    <div key={idx} className="text-xs text-slate-800 font-medium bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                      <span className="truncate">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Deliverable & Retainer Proposal Service Package */}
        <div className="bg-purple-50/50 border border-purple-200 p-5 rounded-xl shadow-xs space-y-4">
          
          <div className="flex items-center gap-2 pb-3 border-b border-purple-200">
            <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
            <div className="p-1.5 bg-purple-100 text-purple-800 rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
              {t("பரிந்துரைக்கப்படும் சேவை முன்மொழிவு", "Recommended Service Package Proposal")}
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                {t("சேவைப் பிரிவு", "Service Package")}
              </span>
              <span className="text-xs font-bold text-purple-950">{rPackage.recommendedPackage}</span>
            </div>

            <div className="bg-white border border-purple-200 p-3 rounded-xl flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase">
                {t("ஆலோசனை கட்டணம் (தோராயமாக)", "Estimated Retainer Fee")}
              </span>
              <span className="text-base font-extrabold text-purple-900">{rPackage.professionalFee}</span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                {t("வழங்கப்படும் சேவைகள்:", "Package Deliverables:")}
              </span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {(rPackage.deliverables || []).map((deliv: string, idx: number) => (
                  <div key={idx} className="text-xs text-slate-700 font-medium flex items-start gap-1.5">
                    <UserCheck className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
                    <span>{deliv}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-purple-200">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                {t("எதிர்பார்க்கப்படும் முடிவு", "Expected Legal Outcome")}
              </span>
              <p className="text-xs text-slate-700 leading-relaxed italic font-medium">
                "{rPackage.expectedOutcome}"
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

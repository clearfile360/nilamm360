import React, { useState, useEffect, useRef } from "react";
import { PropertyCase } from "../types";
import { 
  FileText, Copy, Check, Sparkles, RefreshCw, 
  ChevronRight, ShieldCheck, QrCode, Download, CheckCircle2, 
  Edit3, Eye, Calendar, MapPin, Scale, HelpCircle
} from "lucide-react";
import { generateDocumentSeal, DocumentSealInfo } from "../lib/security";
import { supabase } from "../lib/supabase";
import { downloadDocumentAsPDF } from "../lib/pdfExport";
import { useLanguage } from "../lib/languageContext";

interface DocumentDraftPanelProps {
  key?: any;
  caseData: PropertyCase;
  onUpdateDraft: (newTitle: string, newContent: string, historyDesc?: string) => void;
}

export function DocumentDraftPanel({ caseData, onUpdateDraft }: DocumentDraftPanelProps) {
  const { langMode, t } = useLanguage();
  
  const initialTitle = caseData.customDocumentDraft?.documentTitle || caseData.customDocumentDraft?.title || "சட்ட அறிவிப்பு / மனு";
  const initialContent = caseData.customDocumentDraft?.documentContent || caseData.customDocumentDraft?.content || "";

  const [draftTitle, setDraftTitle] = useState(() => initialTitle);
  const [draftContent, setDraftContent] = useState(() => initialContent);
  const [originalTitle, setOriginalTitle] = useState(() => initialTitle);
  const [originalContent, setOriginalContent] = useState(() => initialContent);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  
  // View mode toggle: 'document' (Structured Canvas) vs 'editor' (Direct Text Editor)
  const [activeMode, setActiveMode] = useState<"document" | "editor">("document");

  const [instructions, setInstructions] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sealInfo, setSealInfo] = useState<DocumentSealInfo | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if caseData changes from outside (e.g. cloud sync or different case selected)
  useEffect(() => {
    const nextTitle = caseData.customDocumentDraft?.documentTitle || caseData.customDocumentDraft?.title || "சட்ட அறிவிப்பு / மனு";
    const nextContent = caseData.customDocumentDraft?.documentContent || caseData.customDocumentDraft?.content || "";

    if (nextTitle !== originalTitle && !debounceTimerRef.current) {
      setDraftTitle(nextTitle);
      setOriginalTitle(nextTitle);
    }
    if (nextContent !== originalContent && !debounceTimerRef.current) {
      setDraftContent(nextContent);
      setOriginalContent(nextContent);
    }
  }, [caseData.id, caseData.updatedAt]);

  useEffect(() => {
    if (caseData.id && draftContent) {
      generateDocumentSeal(caseData.id, draftContent).then(setSealInfo);
    }
  }, [caseData.id, draftContent]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const triggerSave = (titleToSave: string, contentToSave: string, desc?: string) => {
    setSaveStatus("saving");
    try {
      onUpdateDraft(titleToSave, contentToSave, desc);
      setOriginalTitle(titleToSave);
      setOriginalContent(contentToSave);
      setTimeout(() => setSaveStatus("saved"), 350);
    } catch {
      setSaveStatus("idle");
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setDraftTitle(newTitle);
    setSaveStatus("saving");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      triggerSave(newTitle, draftContent, `வரைவுத் தலைப்பு மாற்றப்பட்டது: "${newTitle}"`);
      debounceTimerRef.current = null;
    }, 1200);
  };

  const handleContentChange = (newContent: string) => {
    setDraftContent(newContent);
    setSaveStatus("saving");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      triggerSave(draftTitle, newContent, "வரைவு உள்ளடக்கங்கள் மாற்றப்பட்டது");
      debounceTimerRef.current = null;
    }, 1200);
  };

  const handleTitleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (draftTitle !== originalTitle) {
      triggerSave(draftTitle, draftContent, `வரைவுத் தலைப்பு மாற்றப்பட்டது: "${draftTitle}"`);
    }
  };

  const handleContentBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (draftContent !== originalContent) {
      triggerSave(draftTitle, draftContent, "வரைவு உள்ளடக்கங்கள் கைமுறையாக மாற்றப்பட்டது");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      await downloadDocumentAsPDF({
        title: draftTitle || "சட்ட வரைவு மனு (Legal Draft Petition)",
        reportType: "AI LEGAL DRAFT",
        docType: caseData.stage1?.category ? `${caseData.stage1.category} / Representation` : "Police / Legal Representation",
        domain: "Property Law (Nilam360 Intelligence)",
        caseId: `UK360-${String(caseData.id).toUpperCase().slice(-6)}`,
        status: "AI Draft | Advocate Review Recommended",
        content: draftContent || "சட்ட வரைவு விவரங்கள் இல்லை.",
        sealHash: sealInfo?.sha256Hash,
        filename: `${draftTitle || "AO_Draft"}_${caseData.id}`
      });
    } catch (err) {
      console.error("PDF Download failed:", err);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructions.trim()) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsRefining(true);
    setErrorMessage(null);

    try {
      let authToken = "";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        authToken = session?.access_token || "";
      } catch (err) {
        console.warn("Failed to get Supabase Auth Token:", err);
      }

      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          caseData,
          documentTitle: draftTitle,
          instructions,
          languageMode: langMode
        })
      });

      const responseText = await response.text();
      let data: any = null;
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          // Non-JSON response
        }
      }

      if (!response.ok) {
        const errorMsg = data?.error || responseText || "வரைவை மேம்படுத்துவதில் தோல்வி அடைந்தது.";
        throw new Error(errorMsg);
      }

      if (!data) {
        throw new Error("வரைவு எஞ்சின் செல்லுபடியாகும் தரவு வழங்கவில்லை.");
      }
      
      const newTitle = data.documentTitle || draftTitle;
      const newContent = data.documentContent || draftContent;

      setDraftTitle(newTitle);
      setDraftContent(newContent);
      
      const instrSnippet = instructions.length > 35 
        ? instructions.slice(0, 35) + "..." 
        : instructions;
      
      triggerSave(newTitle, newContent, `AI மூலம் வரைவு மேம்படுத்தப்பட்டது: "${instrSnippet}"`);
      setInstructions("");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "ஆவணத்தை மேம்படுத்துவதில் ஏதோ தவறு நிகழ்ந்துள்ளது.");
    } finally {
      setIsRefining(false);
    }
  };

  // Quick prompt injection helper
  const handleApplyQuickPrompt = (promptText: string) => {
    setInstructions(prev => prev ? `${prev}. ${promptText}` : promptText);
  };

  // Property metadata helper
  const hasPropertyMeta = Boolean(
    caseData.stage0?.surveyNumber || 
    caseData.stage0?.village || 
    caseData.stage0?.taluk || 
    caseData.stage0?.district
  );

  // Helper to intelligently parse raw draft text into structured sections and paragraphs
  const renderDocumentParagraphs = (rawText: string) => {
    if (!rawText || !rawText.trim()) {
      return (
        <div className="p-8 text-center text-slate-400 italic">
          {t("வரைவு விவரங்கள் இன்னும் உருவாக்கப்படவில்லை.", "Draft content has not been generated yet.")}
        </div>
      );
    }

    // Split text by standard double-newline or recognizable block delimiters
    const blocks = rawText.split(/\n\s*\n/);

    return blocks.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Check if block is a formal section header
      const isFromBlock = /^(அனுப்புநர்|From|பெறுநர்|To)[\s:]/i.test(trimmed);
      const isSubjectBlock = /^(பொருள்|Subject|பார்வை|Ref|Reference)[\s:]/i.test(trimmed);
      const isPrayerBlock = /(பரிகாரம்|கோரிக்கை|Prayer|Relief|தாழ்மையுடன்|வேண்டுகோள்)/i.test(trimmed);
      const isHeadingBlock = /^[0-9IVX]+\.[\s\t]+|^[#]{1,4}[\s\t]+/i.test(trimmed) || /^(விவரங்கள்|காரணங்கள்|சட்டப்பிரிவுகள்|Facts|Grounds|Legal Grounds|Schedule of Property)[\s:]/i.test(trimmed);
      const isSignatureBlock = /(இடம்|தேதி|கையொப்பம்|Signature|Date|Place|உண்மையுள்ள|Yours faithfully)/i.test(trimmed) && trimmed.length < 280;

      if (isSubjectBlock) {
        return (
          <div key={idx} className="my-4 p-4 bg-slate-50 border-l-4 border-purple-700 rounded-r-lg">
            <p className="text-[15px] md:text-[16px] text-slate-900 font-bold leading-relaxed whitespace-pre-wrap" style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}>
              {trimmed}
            </p>
          </div>
        );
      }

      if (isFromBlock) {
        return (
          <div key={idx} className="my-3 p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg text-[14px] md:text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap" style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}>
            {trimmed}
          </div>
        );
      }

      if (isPrayerBlock && trimmed.length > 50) {
        return (
          <div key={idx} className="my-5 p-4 bg-purple-50/60 border border-purple-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-3.5 bg-purple-700 rounded"></span>
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                {t("கோரிக்கை / பரிகாரம் (PRAYER / RELIEF)", "PRAYER / RELIEF SOUGHT")}
              </span>
            </div>
            <p className="text-[15px] md:text-[16px] text-purple-950 font-medium leading-[1.75] whitespace-pre-wrap" style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}>
              {trimmed}
            </p>
          </div>
        );
      }

      if (isHeadingBlock) {
        return (
          <div key={idx} className="mt-5 mb-2.5 pt-2">
            <h4 className="text-[15px] md:text-[16px] font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5 font-display">
              <span className="w-1.5 h-3.5 bg-purple-700 rounded shrink-0"></span>
              <span className="whitespace-pre-wrap" style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}>
                {trimmed.replace(/^[#]+\s*/, '')}
              </span>
            </h4>
          </div>
        );
      }

      if (isSignatureBlock) {
        return (
          <div key={idx} className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-slate-700 text-sm">
            <div className="whitespace-pre-wrap leading-relaxed font-medium" style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}>
              {trimmed}
            </div>
            <div className="text-right sm:self-end">
              <div className="w-36 border-b border-slate-400 mb-1"></div>
              <p className="text-xs text-slate-500 font-medium">{t("மனுதாரர் கையொப்பம்", "Signature of Petitioner / Advocate")}</p>
            </div>
          </div>
        );
      }

      // Standard legal paragraph
      return (
        <p 
          key={idx} 
          className="text-[15px] md:text-[16px] text-slate-800 leading-[1.75] mb-4 text-justify font-normal whitespace-pre-wrap"
          style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
        >
          {trimmed}
        </p>
      );
    });
  };

  const wordCount = draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0;
  const charCount = draftContent.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column: Interactive Legal Document Canvas (8 cols) */}
      <div className="lg:col-span-8 flex flex-col space-y-4 print:w-full print:border-none print:shadow-none">
        
        {/* Document Action & Mode Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3 print:hidden no-print">
          
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode("document")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                activeMode === "document" 
                  ? "bg-white text-purple-900 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="சட்ட ஆவண வடிவத்தில் பார்க்க (Structured Legal Document View)"
            >
              <Eye className="h-3.5 w-3.5 text-purple-700" />
              <span>{t("சட்ட ஆவணம்", "Document View")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("editor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                activeMode === "editor" 
                  ? "bg-white text-purple-900 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="நேரடி வரைவு உரைத் திருத்தி (Direct Legal Paper Editor)"
            >
              <Edit3 className="h-3.5 w-3.5 text-purple-700" />
              <span>{t("உரைத் திருத்தி", "Edit Text")}</span>
            </button>
          </div>

          {/* Save Status & Metrics */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
              {saveStatus === "saving" ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin text-purple-600" />
                  <span>{t("சேமிக்கப்படுகிறது...", "Saving...")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>{t("சேமிக்கப்பட்டது", "Saved")}</span>
                </>
              )}
            </div>

            <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium px-1">
              {wordCount} {t("சொற்கள்", "words")}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="btn-primary-purple !py-1.5 !px-3 !text-xs disabled:opacity-50"
              title="சட்ட வரைவை PDF கோப்பாக பதிவிறக்கவும் (Download Draft as PDF)"
            >
              {isDownloadingPDF ? (
                <>
                  <RefreshCw className="animate-spin h-3.5 w-3.5 text-white" />
                  <span className="font-bold">{t("PDF உருவாகிறது...", "PDF...")}</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-white" />
                  <span className="font-bold">{t("PDF பதிவிறக்கம்", "PDF")}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="btn-secondary-white !py-1.5 !px-3 !text-xs"
              title="வரைவு உரையை நகலெடுக்க (Copy Text)"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">{t("நகலெடுக்கப்பட்டது!", "Copied!")}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t("நகலெடு", "Copy")}</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* =================================================== */}
        {/* DOCUMENT PAPER CANVAS */}
        {/* =================================================== */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative print:border-none print:shadow-none print:overflow-visible">
          
          {/* Refining Overlay Loader */}
          {isRefining && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 print:hidden no-print">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col items-center gap-3 shadow-lg">
                <RefreshCw className="animate-spin h-8 w-8 text-purple-700" />
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-900">{t("சட்ட அளவுருக்களுடன் வரைவு புதுப்பிக்கப்படுகிறது...", "Refining Legal Pleadings with AI Engine...")}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{t("தமிழ்நாடு சட்ட விதிகள் மற்றும் வடிவமைப்பு ஒருங்கிணைக்கப்படுகிறது", "Integrating Tamil Nadu statutory formats")}</p>
                </div>
              </div>
            </div>
          )}

          {/* Official Document Banner */}
          <div className="bg-slate-900 text-white px-6 py-2.5 flex flex-wrap items-center justify-between text-[11px] font-medium border-b border-slate-800 print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-800 print:px-0">
            <div className="flex items-center gap-2">
              <Scale className="h-3.5 w-3.5 text-purple-400 print:hidden shrink-0" />
              <span className="font-bold tracking-wide uppercase text-slate-200">
                {t("நிலம்360 சட்டப்பூர்வ வரைவு மனு • LEGAL NOTICE / PETITION", "NILAM360 FORMAL LEGAL PLEADING")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[10px]">
              <span>REF: UK360-{String(caseData.id).toUpperCase().slice(-6)}</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString(langMode === "ta" ? "ta-IN" : "en-IN")}</span>
            </div>
          </div>

          {/* Document Content Canvas Surface */}
          <div className="p-6 sm:p-8 md:p-10 bg-white min-h-[620px] flex flex-col justify-between print:p-0">
            
            <div className="space-y-6">
              
              {/* Document Title Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4 pt-1">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onBlur={handleTitleBlur}
                    className="w-full text-center text-lg sm:text-xl font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-600 focus:outline-none py-1 font-display tracking-tight uppercase"
                    placeholder="மனு / சட்ட அறிவிப்பு தலைப்பு..."
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {t("தமிழ்நாடு வருவாய் மற்றும் பத்திரப்பதிவு அதிகார எல்லைக்கு உட்பட்டது", "Jurisdiction of Tamil Nadu Revenue & Registration Department")}
                </p>
              </div>

              {/* Structured Property Schedule Block (if available) */}
              {hasPropertyMeta && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <span className="w-1.5 h-3.5 bg-purple-700 rounded"></span>
                    <MapPin className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
                      {t("சொத்து விவர அட்டவணை (SCHEDULE OF PROPERTY)", "SCHEDULE OF PROPERTY")}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t("சர்வே எண்", "Survey No")}</span>
                      <span className="font-bold text-slate-900">{caseData.stage0?.surveyNumber || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t("கிராமம்", "Village")}</span>
                      <span className="font-medium text-slate-800">{caseData.stage0?.village || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t("வட்டம் / மாவட்டம்", "Taluk / District")}</span>
                      <span className="font-medium text-slate-800">
                        {caseData.stage0?.taluk || "N/A"}, {caseData.stage0?.district || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">{t("எதிர்த்தரப்பினர்", "Opposite Party")}</span>
                      <span className="font-medium text-slate-800 truncate block">{caseData.stage0?.oppositeParty || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* View Mode Switch Logic: Structured Legal Document View vs Direct Paper Text Editor */}
              {activeMode === "document" ? (
                <div className="space-y-4 font-sans print:block">
                  {renderDocumentParagraphs(draftContent)}
                  
                  {/* Quick Edit CTA bar in Document View */}
                  <div className="pt-4 flex justify-end print:hidden no-print">
                    <button
                      type="button"
                      onClick={() => setActiveMode("editor")}
                      className="text-xs text-purple-700 font-bold hover:text-purple-900 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-purple-50 transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{t("உரையைத் திருத்த இங்கே கிளிக் செய்யவும்", "Click here to edit draft text directly")}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                    <span className="font-medium">{t("வரைவு உரையை நேரடியாகத் திருத்துங்கள்:", "Edit draft legal pleadings:")}</span>
                    <span className="text-[11px] font-mono text-slate-400">{charCount} {t("எழுத்துக்கள்", "chars")}</span>
                  </div>
                  <textarea
                    value={draftContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onBlur={handleContentBlur}
                    rows={18}
                    className="w-full p-4 sm:p-5 text-[15px] md:text-[16px] text-slate-900 bg-white border border-purple-300 rounded-xl leading-[1.75] font-sans focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-600 transition shadow-inner"
                    style={{ overflowWrap: 'anywhere', wordBreak: 'normal', whiteSpace: 'pre-wrap' }}
                    placeholder="சட்ட வரைவு விவரங்கள் இங்கே தோன்றும்..."
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      {t("மாற்றங்கள் தானாகவே சேமிக்கப்படும்.", "Edits are automatically saved and synced.")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveMode("document")}
                      className="btn-primary-purple !py-1 !px-3 !text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{t("ஆவணத் தோற்றத்திற்கு மாறு", "Done Editing")}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Tamper-Proof Cryptographic Security Seal */}
            {sealInfo && (
              <div className="mt-8 pt-4 border-t border-slate-200">
                <div className="p-3.5 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 text-[10px] print:border print:border-slate-300 print:text-slate-900 print:bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold tracking-wider text-slate-200 uppercase font-mono">
                        NILAM360 SHA-256 VERIFIABLE LEGAL RECORD SEAL
                      </p>
                      <p className="text-slate-400 font-mono text-[9px] mt-0.5" style={{ overflowWrap: 'anywhere' }}>
                        HASH: {sealInfo.sha256Hash} • TIME: {new Date(sealInfo.timestamp).toLocaleDateString(langMode === "ta" ? "ta-IN" : "en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-emerald-300 font-mono text-[9px]">
                    <QrCode className="h-3.5 w-3.5" />
                    <span>TAMPER-PROOF RECORD</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right Column: AI Refiner and Instructions panel (4 cols) */}
      <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1 print:hidden no-print">
        
        {/* AI Prompt Refiner Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
            <div className="p-1.5 bg-purple-50 text-purple-800 rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
              {t("மனுவை மேம்படுத்தும் AI", "AI Legal Draft Refiner")}
            </h3>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {t(
                "சட்டப்பிரிவுகளைச் சேர்க்க, தொனியை மாற்ற அல்லது வாடிக்கையாளரின் குறிப்பிட்ட நிபந்தனைகளைச் சேர்க்க எளிய தமிழில் கட்டளைகளை வழங்கவும்.",
                "Provide instructions in Tamil or English to add legal provisions, adjust tone, or include specific facts."
              )}
            </p>

            {/* Quick Prompt Tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {t("விரைவு வழிகாட்டுதல்கள் (Quick Prompts):", "Quick Prompts:")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyQuickPrompt("பிரிவு 77A மற்றும் போலி ஆவண ரத்து வழிகாட்டுதல்களைச் சேர்க்கவும்")}
                  className="px-2 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-200 border border-slate-200 rounded text-[10px] font-medium text-slate-700 transition"
                >
                  + பிரிவு 77A சேர்க்க
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickPrompt("குற்றவியல் நடவடிக்கை மற்றும் போலி ஆவண பதிவு எச்சரிக்கையைச் சேர்க்கவும்")}
                  className="px-2 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-200 border border-slate-200 rounded text-[10px] font-medium text-slate-700 transition"
                >
                  + குற்றவியல் எச்சரிக்கை
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickPrompt("7 நாட்களுக்குள் ஆவணங்களை ஒப்படைக்க கோரிக்கை வைக்கவும்")}
                  className="px-2 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-200 border border-slate-200 rounded text-[10px] font-medium text-slate-700 transition"
                >
                  + 7 நாள் அவகாசம்
                </button>
              </div>
            </div>

            <form onSubmit={handleRefine} className="space-y-3.5">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder={t(
                  "எ.கா: 'எதிர்த்தரப்பினர் போலியாகப் பதிவு செய்தால் குற்றவியல் நடவடிக்கை எடுக்கப்படும் என எச்சரிக்கும் பத்தியைச் சேர்க்கவும்.'",
                  "e.g., 'Add a paragraph warning criminal prosecution if opposing party creates fraudulent encumbrances.'"
                )}
                className="w-full p-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-600 transition leading-relaxed"
              />
              {errorMessage && (
                <p className="text-xs text-rose-600 font-bold">{errorMessage}</p>
              )}
              <button
                type="submit"
                disabled={isRefining || !instructions.trim()}
                className="btn-primary-purple w-full !py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefining ? 'animate-spin' : ''}`} />
                <span>{t("மனுவின் வரைவை மேம்படுத்து", "Refine Legal Draft")}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Guidance Reference Panel */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-display">
              {t("பயனுள்ள சட்டப்பிரிவுகள் (ஆலோசனைகள்):", "Applicable Legal Provisions:")}
            </h4>
          </div>
          
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-1.5">
              <ChevronRight className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
              <span className="font-medium">
                <strong>பிரிவு 77A (பத்திரப்பதிவு சட்டம்):</strong> போலி ஆவணங்களை ரத்து செய்ய மாவட்டப் பதிவாளர்களுக்கு அதிகாரம் அளித்தல்.
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <ChevronRight className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
              <span className="font-medium">
                <strong>UDR சர்வே பிழை திருத்தம்:</strong> வருவாய் கோட்டாட்சியரை (RDO) நேரடியாக அணுகி பட்டா திருத்தம் பெறுதல்.
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <ChevronRight className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
              <span className="font-medium">
                <strong>பிரிவு 34 (Specific Relief Act):</strong> சொத்துரிமையை நிலைநாட்ட உரிமையியல் நீதிமன்றத்தில் பிரகடன வழக்கு.
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

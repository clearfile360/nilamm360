import React, { useState, useEffect } from "react";
import { PropertyCase, Stage1Data, Stage6Data } from "../types";
import { RiskGauge } from "./StatWidgets";
import { PrecedentAndStrategyPanel } from "./PrecedentAndStrategyPanel";
import { CaseUpdateModal } from "./CaseUpdateModal";
import { useLanguage } from "../lib/languageContext";
import { 
  Scale, FileText, CheckCircle, AlertCircle, ArrowRight, MapPin, 
  User, ShieldAlert, Gavel, Calendar, IndianRupee, HelpCircle, FileCheck,
  Landmark, ChevronRight, ShieldCheck, Sparkles, AlertTriangle, Globe, PlusCircle, Clock
} from "lucide-react";

interface AnalysisDashboardProps {
  key?: any;
  caseData: PropertyCase;
  onUpdateCase: (updatedCase: PropertyCase, historyDesc?: string) => void;
}

export function AnalysisDashboard({ caseData, onUpdateCase }: AnalysisDashboardProps) {
  const { langMode, t } = useLanguage();
  const [availableDocs, setAvailableDocs] = useState<string[]>([]);
  const [missingDocs, setMissingDocs] = useState<string[]>([]);
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [tempCategory, setTempCategory] = useState(caseData.stage1?.category || "வருவாய் / Revenue");
  const [tempSpecificType, setTempSpecificType] = useState(caseData.stage1?.specificType || "");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    if (caseData) {
      setAvailableDocs(Array.isArray(caseData.stage6?.available) ? caseData.stage6.available : []);
      setMissingDocs(Array.isArray(caseData.stage6?.missing) ? caseData.stage6.missing : []);
      setTempCategory(caseData.stage1?.category || "வருவாய் / Revenue");
      setTempSpecificType(caseData.stage1?.specificType || "");
    }
  }, [caseData]);

  const handleTranslateCase = async () => {
    setIsTranslating(true);
    setTranslateError(null);
    try {
      const res = await fetch("/api/translate-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseData,
          targetLanguageMode: langMode
        })
      });
      if (!res.ok) {
        throw new Error("Translation endpoint unavailable or returned an error.");
      }
      const translated = await res.json();
      if (translated && typeof translated === "object" && translated.id) {
        onUpdateCase(translated, `மொழி தேர்வு மாற்றப்பட்டது: ${langMode.toUpperCase()}`);
      } else {
        throw new Error("Invalid response from translation service.");
      }
    } catch (err: any) {
      console.warn("Translation Notice:", err);
      setTranslateError(t("மொழிமாற்றம் தற்போது கிடைக்கவில்லை. அசல் வழக்குத் தரவு காண்பிக்கப்படுகிறது.", "Translation currently unavailable. Displaying original case content."));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveCategory = () => {
    const updatedCase: PropertyCase = {
      ...caseData,
      stage1: {
        category: tempCategory,
        specificType: tempSpecificType
      }
    };
    onUpdateCase(updatedCase, `முதன்மையான பிரிவு மாற்றப்பட்டது: "${tempCategory}" (${tempSpecificType})`);
    setIsEditingCategory(false);
  };

  const handleToggleDoc = (doc: string, currentlyAvailable: boolean) => {
    let newAvailable = [...availableDocs];
    let newMissing = [...missingDocs];

    if (currentlyAvailable) {
      newAvailable = newAvailable.filter(d => d !== doc);
      if (!newMissing.includes(doc)) {
        newMissing.push(doc);
      }
    } else {
      newMissing = newMissing.filter(d => d !== doc);
      if (!newAvailable.includes(doc)) {
        newAvailable.push(doc);
      }
    }

    setAvailableDocs(newAvailable);
    setMissingDocs(newMissing);

    const updatedCase: PropertyCase = {
      ...caseData,
      stage6: {
        available: newAvailable,
        missing: newMissing
      }
    };
    onUpdateCase(updatedCase, `ஆதார பட்டியல்: "${doc}" மாற்றப்பட்டது: ${currentlyAvailable ? "இல்லை" : "உள்ளது"}`);
  };

  const getCategoryColor = (cat: string) => {
    const c = cat?.toLowerCase() || "";
    if (c.includes("revenue") || c.includes("வருவாய்")) {
      return "bg-purple-100 text-purple-900 border-purple-200";
    } else if (c.includes("registration") || c.includes("பதிவு") || c.includes("பத்திர")) {
      return "bg-indigo-100 text-indigo-900 border-indigo-200";
    } else if (c.includes("family") || c.includes("inheritance") || c.includes("குடும்ப") || c.includes("வாரிசு")) {
      return "bg-sky-100 text-sky-900 border-sky-200";
    } else if (c.includes("government") || c.includes("அரசு")) {
      return "bg-amber-100 text-amber-900 border-amber-200";
    } else if (c.includes("public") || c.includes("பொது")) {
      return "bg-rose-100 text-rose-900 border-rose-200";
    } else if (c.includes("litigation") || c.includes("நீதிமன்ற") || c.includes("வழக்கு")) {
      return "bg-red-100 text-red-900 border-red-200";
    }
    return "bg-slate-100 text-slate-900 border-slate-200";
  };

  const scrollToSection = (id: string, stageNum: number) => {
    setActiveStage(stageNum);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const authoritySteps = Array.isArray(caseData.stage7) 
    ? caseData.stage7 
    : (typeof caseData.stage7 === "object" && caseData.stage7?.route ? caseData.stage7.route : []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px] min-[1440px]:grid-cols-[240px_minmax(0,1fr)_320px] gap-6 items-start text-slate-900 w-full min-w-0">
      
      {/* 1. Left Sidebar: Stage Navigation (Analysis Framework) */}
      <nav className="w-full bg-white border border-slate-200 rounded-xl flex flex-col p-3.5 shadow-xs sticky top-20 z-10 print:hidden no-print lg:col-span-1">
        <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-200">
          <Scale className="h-3.5 w-3.5 text-purple-800" />
          <h2 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">
            {t("மதிப்பீட்டுக் கட்டமைப்பு", "Assessment Framework")}
          </h2>
        </div>
        
        <div className="space-y-0.5 max-h-[350px] lg:max-h-none overflow-y-auto pr-1">
          {[
            { num: "00", name: t("வழக்கு அடையாளங்கள்", "Case Profile & Intake"), id: "stage-00" },
            { num: "01", name: t("வழக்கின் பிரிவு", "Dispute Classification"), id: "stage-01" },
            { num: "02", name: t("மூலப் பிரச்சனை", "Root Cause & Issue"), id: "stage-02" },
            { num: "03", name: t("சொத்து வகை", "Dispute Subject"), id: "stage-03" },
            { num: "04", name: t("தகராறு நிகழ்வு", "Timeline & Cause of Action"), id: "stage-04" },
            { num: "05", name: t("பாதிக்கப்பட்ட உரிமை", "Rights & Obligations"), id: "stage-05" },
            { num: "06", name: t("ஆவணங்கள் வரைபடம்", "Evidence & Documents"), id: "stage-06" },
            { num: "07", name: t("வருவாய் அதிகாரி வழி", "Jurisdiction & Route"), id: "stage-07" },
            { num: "08", name: t("பரிகார வழிமுறை", "Legal Remedy"), id: "stage-08" },
            { num: "09", name: t("அச்சுறுத்தல் வீதம்", "Risk & Urgency Rating"), id: "stage-09" },
            { num: "10", name: t("வழங்கப்படும் தீர்வுகள்", "Deliverables & Packages"), id: "stage-10" },
            { num: "11", name: t("முன்மாதிரி தீர்ப்புகள்", "Precedent Intelligence"), id: "stage-11" },
            { num: "12", name: t("சட்ட உத்தி சிமுலேட்டர்", "Strategy Simulator"), id: "stage-11" }
          ].map((stg, i) => {
            const isHighlighted = activeStage === i;
            return (
              <button
                key={stg.num}
                type="button"
                onClick={() => scrollToSection(stg.id, i)}
                className={`w-full flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer text-left ${
                  isHighlighted 
                    ? "text-purple-900 bg-purple-50 border border-purple-200 font-bold" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <span className={`w-4.5 h-4.5 flex items-center justify-center rounded mr-2 text-[9px] font-bold shrink-0 ${
                  isHighlighted ? "bg-purple-800 text-white font-extrabold" : "border border-slate-200 text-slate-500 bg-slate-50"
                }`}>
                  {stg.num}
                </span>
                <span className="truncate text-[11px]">{stg.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 2. Central Case Data View */}
      <div className="w-full min-w-0 space-y-6 md:col-start-2 xl:col-start-2">

        {/* Language Adaptation Banner if case language differs from active mode */}
        {(() => {
          const storedLanguageMode = caseData?.languageMode || "ta";
          if (!caseData || storedLanguageMode === langMode) return null;
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 shadow-xs">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold">
                    {t(
                      "இந்த வழக்கு வேறு மொழியில் பகுப்பாய்வு செய்யப்பட்டது.",
                      "This case was analyzed in a different language mode."
                    )}
                  </p>
                  <p className="text-[11px] text-amber-800 font-medium">
                    {t(
                      `வழக்கு மொழி: ${storedLanguageMode.toUpperCase()} | தற்போதைய தேர்வு: ${langMode.toUpperCase()}`,
                      `Stored Case Mode: ${storedLanguageMode.toUpperCase()} | Active UI Mode: ${langMode.toUpperCase()}`
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTranslateCase}
                disabled={isTranslating}
                className="px-3.5 py-1.5 bg-amber-700 text-white rounded-xl text-xs font-bold hover:bg-amber-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isTranslating
                  ? t("மொழி மாற்றப்படுகிறது...", "Translating Case...")
                  : t("தேர்ந்தெடுக்கப்பட்ட மொழியில் மாற்று", "Adapt Case to Active Language")}
              </button>
            </div>
          );
        })()}
        {translateError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {translateError}
          </div>
        )}

        {/* Case Header Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 items-center mb-1.5">
                <span className="badge-ai-intel">
                  <span>AIEOS</span>
                  <ChevronRight className="h-2.5 w-2.5 text-purple-400 shrink-0" />
                  <span>Citizen360</span>
                  <ChevronRight className="h-2.5 w-2.5 text-purple-400 shrink-0" />
                  <span>{caseData.subWorkspace || caseData.stage0?.subWorkspace || "Property360"}</span>
                  <ChevronRight className="h-2.5 w-2.5 text-purple-400 shrink-0" />
                  <span>{caseData.module || caseData.stage0?.module || "Engine"}</span>
                </span>
                <span className="badge-neutral-status">
                  {t("வழக்கு ID", "Case ID")}: UK360-{(caseData.stage0?.district || "TN").toUpperCase().slice(0,3)}-{caseData.id?.slice(-4) || "0000"}
                </span>
                <span className="text-xs font-bold text-slate-600 break-words [overflow-wrap:anywhere]">
                  {t("சர்வே எண்", "Survey No")} #{caseData.stage0?.surveyNumber} • {caseData.stage0?.village}, {caseData.stage0?.district}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug font-display break-words [overflow-wrap:anywhere] [word-break:normal]">
                {caseData.stage0?.clientName} {t("அவர்களின் வழக்கு மேலாண்மை", "Case Management File")}
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium flex flex-wrap items-center gap-1.5 break-words">
                <Landmark className="h-3.5 w-3.5 text-purple-800 shrink-0" />
                <span>{t("வட்டம் (தாலுகா)", "Taluk")}: {caseData.stage0?.taluk || "N/A"} | {t("எதிர் தரப்பினர்", "Opposite Party")}: {caseData.stage0?.oppositeParty || "N/A"}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true)}
                className="btn-primary-purple"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{t("➕ வழக்கு அப்டேட்", "➕ Update Case")}</span>
              </button>

              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 self-start md:self-auto min-w-[130px]">
                <div className="text-left flex-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t("அச்சுறுத்தல் நிலை", "Threat Level")}
                  </span>
                  <span className="text-xs font-extrabold text-rose-700 block leading-tight">{caseData.stage9?.rating || "HIGH RISK"}</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-slate-900 leading-none">{caseData.stage9?.score || 45}</span>
                  <span className="text-[9px] text-slate-500 font-bold block">/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage 00 Card: Intake Identifiers */}
        <div id="stage-00" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 relative min-w-0">
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200">
            <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{t("நிலை 00", "Stage 00")}</span>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t("வாடிக்கையாளர் வழக்கு அடையாளங்கள்", "Client & Case Profile Identifiers")}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{t("வாடிக்கையாளர் பெயர்", "Client Name")}</span>
              <span className="font-bold text-slate-900 break-words [overflow-wrap:anywhere] [word-break:normal] block">{caseData.stage0?.clientName || "N/A"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{t("கைபேசி எண்", "Mobile Number")}</span>
              <span className="font-bold text-slate-900 break-words [overflow-wrap:anywhere] block">{caseData.stage0?.mobile || "N/A"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{t("சர்வே எண்", "Survey Number")}</span>
              <span className="font-bold text-slate-900 break-words [overflow-wrap:anywhere] block">{caseData.stage0?.surveyNumber || "N/A"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{t("கிராமம் & வட்டம் (தாலுகா)", "Village & Taluk")}</span>
              <span className="font-bold text-slate-900 break-words [overflow-wrap:anywhere] [word-break:normal] block">{caseData.stage0?.village}, {caseData.stage0?.taluk}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{t("மாவட்டம்", "District")}</span>
              <span className="font-bold text-slate-900 break-words [overflow-wrap:anywhere] block">{caseData.stage0?.district}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{t("எதிர் தரப்பினர்", "Opposite Party")}</span>
              <span className="font-bold text-rose-700 break-words [overflow-wrap:anywhere] [word-break:normal] block">{caseData.stage0?.oppositeParty || "N/A"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{t("வழக்கறிஞர் வழக்கு உள்ளதா?", "Pending Court Case?")}</span>
              <span className="font-bold text-slate-900 break-words [overflow-wrap:anywhere] block">
                {caseData.stage0?.existingAdvocate === "Yes" 
                  ? t(`ஆம் (${caseData.stage0?.existingCaseNumber || "நிலுவையில்"})`, `Yes (${caseData.stage0?.existingCaseNumber || "Pending"})`)
                  : t("இல்லை", "No")}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">{t("கால வரம்பு அச்சுறுத்தல்", "Limitation Risk")}</span>
              <span className={`font-bold block break-words ${caseData.stage0?.limitationRisk === "Yes" ? "text-rose-700" : "text-emerald-700"}`}>
                {caseData.stage0?.limitationRisk === "Yes" 
                  ? t("செயலில் உள்ள அச்சுறுத்தல்", "Active Limitation Threat") 
                  : t("எதுவுமில்லை", "None Detected")}
              </span>
            </div>
          </div>
        </div>

        {/* Stage 01 & 02 Card: Category & Root Cause */}
        <div id="stage-01" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 min-w-0">
          <div id="stage-02" className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{t("நிலை 01 & 02", "Stage 01 & 02")}</span>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t("உள் பகுப்பாய்வு & கண்டறிதல்", "Internal Classification & Root Cause Statement")}
            </h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {t("மூலப் பிரச்சனையின் அறிக்கை", "Root Cause Statement")}
              </label>
              <p className="text-xs text-slate-900 italic border-l-3 border-purple-700 pl-3 py-2 font-medium bg-purple-50/50 rounded-r-lg">
                "{caseData.stage2?.rootCauseStatement || t("பரஸ்பர ஒப்புதல் இன்றி பிரிக்கப்படாத சொத்துக்கு சர்ச்சை ஆவணம் செயல்படுத்தப்பட்டது.", "Disputed transaction executed without mutual consent on undivided ancestral property.")}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {t("வாடிக்கையாளர் கூறுவது", "Core Dispute Real Issue")}
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  "{caseData.stage2?.realIssue || t("எல்லை வரம்புகள் அல்லது உரிமை மாற்றம் தொடர்பாக முரண்பாடுகள் தெரிவிக்கப்பட்டுள்ளன.", "Inconsistencies reported regarding boundary survey and ownership mutation.")}"
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 group relative">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {t("முதன்மையான பிரிவு", "Primary Legal Category")}
                </span>
                {isEditingCategory ? (
                  <div className="space-y-2 mt-1">
                    <select
                      value={tempCategory}
                      onChange={(e) => setTempCategory(e.target.value)}
                      className="w-full text-xs font-semibold bg-white text-slate-900 border border-slate-300 rounded p-1.5 cursor-pointer focus:ring-1 focus:ring-purple-700"
                    >
                      <option value="Revenue" className="bg-white text-slate-900">வருவாய்த் துறை (Revenue)</option>
                      <option value="Registration" className="bg-white text-slate-900">பத்திரப்பதிவுத் துறை (Registration)</option>
                      <option value="Family / Inheritance" className="bg-white text-slate-900">குடும்பம் / வாரிசுரிமை (Family)</option>
                      <option value="Government Land" className="bg-white text-slate-900">அரசு நிலம் (Govt Land)</option>
                      <option value="Public Property" className="bg-white text-slate-900">பொதுச் சொத்து (Public)</option>
                      <option value="Litigation" className="bg-white text-slate-900">நீதிமன்ற வழக்கு (Litigation)</option>
                    </select>
                    <input
                      type="text"
                      value={tempSpecificType}
                      onChange={(e) => setTempSpecificType(e.target.value)}
                      placeholder={t("குறிப்பிட்ட தகராறு வகை", "Specific dispute type")}
                      className="w-full text-xs font-semibold bg-white text-slate-900 border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-purple-700"
                    />
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setTempCategory(caseData.stage1?.category || "வருவாய்");
                          setTempSpecificType(caseData.stage1?.specificType || "");
                          setIsEditingCategory(false);
                        }}
                        className="btn-ghost-action"
                      >
                        {t("ரத்துசெய்", "Cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCategory}
                        className="btn-primary-purple !py-1 !px-3 !text-[10px]"
                      >
                        {t("சேமி", "Save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded border ${getCategoryColor(caseData.stage1?.category)}`}>
                        {caseData.stage1?.category}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{caseData.stage1?.specificType}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTempCategory(caseData.stage1?.category || "வருவாய்");
                        setTempSpecificType(caseData.stage1?.specificType || "");
                        setIsEditingCategory(true);
                      }}
                      className="btn-ghost-action !py-0.5 !px-2 !text-[10px] opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      {t("மாற்று", "Edit")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stage 03, 04, 05 Card: Subject/Property, Cause of Action & Rights Matrix */}
        <div id="stage-03" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 min-w-0">
          <div id="stage-04" className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span id="stage-05" className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{t("நிலை 03, 04 & 05", "Stage 03, 04 & 05")}</span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t("வழக்கின் பொருள், வழக்கின் காரணம் (Cause of Action) & உரிமைகள் அணிவரிசை (Rights Matrix)", "Dispute Subject, Cause of Action & Rights Matrix")}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                {t("வழக்கின் பொருள் / சொத்து வகை", "Dispute Subject / Property Type")}
              </span>
              <span className="text-xs font-bold text-slate-900 block break-words [overflow-wrap:anywhere] [word-break:normal]">
                {typeof caseData.stage3 === "object" ? caseData.stage3?.subjectType : (caseData.stage3 || t("பூர்வீக சொத்து / சட்டப்பொருள்", "Ancestral Property / Legal Subject"))}
              </span>
              {typeof caseData.stage3 === "object" && caseData.stage3?.partyRelationshipMap && (
                <span className="block text-[10px] text-purple-900 font-semibold mt-1 break-words [overflow-wrap:anywhere]">
                  {t("உறவுமுறை", "Party Map")}: {caseData.stage3.partyRelationshipMap}
                </span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                {t("வழக்கின் காரணம் (Cause of Action)", "Cause of Action Timeline")}
              </span>
              {typeof caseData.stage4 === "object" && Array.isArray(caseData.stage4?.timelineEvents) ? (
                <div className="text-left space-y-1">
                  {caseData.stage4.timelineEvents.slice(0, 3).map((evt, idx) => (
                    <span key={idx} className="block text-[10px] font-medium text-slate-800 break-words [overflow-wrap:anywhere] [word-break:normal]">
                      • {evt}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-900 block break-words [overflow-wrap:anywhere]">{String(caseData.stage4 || t("தகராறு நிகழ்வு", "Dispute Event"))}</span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                {t("பாதிக்கப்பட்ட உரிமை & கடமை மீறல்", "Rights Violated & Duties Breached")}
              </span>
              {typeof caseData.stage5 === "object" ? (
                <div className="text-left text-[10px] space-y-1">
                  {Array.isArray(caseData.stage5?.rightsViolated) && caseData.stage5.rightsViolated.length > 0 && (
                    <span className="block font-bold text-rose-700 break-words [overflow-wrap:anywhere]">
                      {t("உரிமை மீறல்", "Violated Rights")}: {caseData.stage5.rightsViolated.join(", ")}
                    </span>
                  )}
                  {Array.isArray(caseData.stage5?.dutiesBreached) && caseData.stage5.dutiesBreached.length > 0 && (
                    <span className="block font-medium text-slate-700 break-words [overflow-wrap:anywhere]">
                      {t("கடமை மீறல்", "Breached Duties")}: {caseData.stage5.dutiesBreached.join(", ")}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs font-bold text-emerald-800 block break-words">{String(caseData.stage5 || t("பாதிக்கப்பட்ட உரிமை", "Protected Rights"))}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stage 06 Card: Interactive Evidence Matrix */}
        <div id="stage-06" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 min-w-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{t("நிலை 06", "Stage 06")}</span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t("ஆவணங்கள் வரைபடம் (ஊடாடும் சரிபார்ப்பு பட்டியல்)", "Document & Evidence Mapping Matrix")}
              </h4>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            {t(
              "ஆவணங்களை தேர்வு செய்யவும் அல்லது நீக்கவும். சிவப்பு நிறத்தில் உள்ளவை இல்லாத ஆவணங்களைக் குறிக்கின்றன.",
              "Check or uncheck documents. Red items indicate missing evidence that must be gathered."
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Available Documents */}
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                {t("தளத்தில் உள்ள ஆவணங்கள்", "Available Documents")} ({availableDocs.length})
              </span>
              {availableDocs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  {t("சரிபார்க்கப்பட்ட ஆவணங்கள் எதுவும் இல்லை.", "No available documents checked yet.")}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {availableDocs.map((doc, idx) => (
                    <label 
                      key={idx} 
                      className="flex items-start gap-2.5 p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100/70 transition text-xs font-medium text-emerald-900 min-w-0"
                    >
                      <input 
                        type="checkbox" 
                        checked={true}
                        onChange={() => handleToggleDoc(doc, true)}
                        className="mt-0.5 h-3.5 w-3.5 text-emerald-600 border-slate-300 rounded cursor-pointer accent-emerald-600 shrink-0"
                      />
                      <span className="break-words [overflow-wrap:anywhere] [word-break:normal] flex-1 min-w-0">{doc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Documents */}
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-2">
                {t("இல்லாத ஆவணங்கள் / சேவை வாய்ப்புகள்", "Missing Documents / Service Opportunities")} ({missingDocs.length})
              </span>
              {missingDocs.length === 0 ? (
                <p className="text-xs text-emerald-800 font-bold italic flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle className="h-4 w-4 shrink-0" /> {t("அனைத்து முக்கிய ஆதார ஆவணங்களும் உள்ளன!", "All key evidence documents are available!")}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {missingDocs.map((doc, idx) => (
                    <label 
                      key={idx} 
                      className="flex items-start gap-2.5 p-2 bg-rose-50/70 border border-rose-200 rounded-lg cursor-pointer hover:bg-rose-100/70 transition text-xs font-medium text-slate-700 min-w-0"
                    >
                      <input 
                        type="checkbox" 
                        checked={false}
                        onChange={() => handleToggleDoc(doc, false)}
                        className="mt-0.5 h-3.5 w-3.5 text-rose-600 border-slate-300 rounded cursor-pointer shrink-0"
                      />
                      <span className="line-through text-slate-400 break-words [overflow-wrap:anywhere] [word-break:normal] flex-1 min-w-0">{doc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stage 07 Card: Authority Route Steps */}
        <div id="stage-07" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 min-w-0">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{t("நிலை 07", "Stage 07")}</span>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t("வருவாய் மற்றும் பதிவு அதிகாரி வழிப்பாதை", "Jurisdictional Authority & Appeal Hierarchy")}
            </h4>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            {t(
              "தமிழ்நாடு நில வருவாய் விதிகளின்படி வழக்குகளின் தீர்வுக்காக அணுக வேண்டிய வரிசையான அரசு அலுவலகப் பாதை.",
              "Sequential hierarchy of Tamil Nadu revenue and registration authorities to approach for relief."
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2 w-full min-w-0">
            {authoritySteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-purple-300 transition min-w-0 max-w-full w-full">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 border border-purple-200 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">
                    {t(`படி ${idx + 1}`, `Step ${idx + 1}`)}
                  </span>
                  <span className="text-xs font-bold text-slate-900 break-words [overflow-wrap:anywhere] [word-break:normal] block">
                    {step}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 08 Card: Remedy Track Selection */}
        <div id="stage-08" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 min-w-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{t("நிலை 08", "Stage 08")}</span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t("முதன்மையான பரிகார வழிமுறை", "Primary Legal & Administrative Remedy")}
              </h4>
            </div>
            <span className="badge-ai-intel">
              {caseData.stage8?.category || t("அதிகாரபூர்வ அரசு நடவடிக்கை", "Official Revenue Action")}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-start min-w-0">
            <div className="p-2 bg-purple-100 rounded-lg border border-purple-200 text-purple-800 shrink-0">
              <FileCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t("முதன்மையான மனு படிவம்", "Primary Remedy Form / Petition")}
              </h4>
              <p className="text-xs font-bold text-slate-900 leading-snug break-words [overflow-wrap:anywhere] [word-break:normal]">
                {caseData.stage8?.primaryRemedy || t("வருவாய் விதிகளின் கீழ் பட்டா உட்பிரிவுக்கு எதிரான ஆட்சேபனை மனு.", "Objection representation under Tamil Nadu Revenue Rules against illegal mutation.")}
              </p>
            </div>
          </div>
        </div>

        {/* Stage 09: Threat Risk Gauge */}
        <div id="stage-09" className="grid grid-cols-1 md:grid-cols-3 gap-6 min-w-0">
          <div className="md:col-span-1 min-w-0">
            <RiskGauge score={caseData.stage9?.score || 45} rating={caseData.stage9?.rating || "Medium"} />
          </div>
          
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between text-slate-900 min-w-0">
            <div>
              <span className="text-[9px] font-extrabold text-rose-700 uppercase tracking-wider">
                {t("அச்சுறுத்தல் கண்டறிதல்", "Risk Factor Evaluation")}
              </span>
              <h4 className="text-xs font-bold text-slate-900 uppercase mt-1 mb-2">
                {t("இந்த மதிப்பெண் ஏன் கணக்கிடப்பட்டது:", "Why this threat score was calculated:")}
              </h4>
              <ul className="text-xs text-slate-600 space-y-1.5 font-medium">
                <li className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                  <span className="break-words [overflow-wrap:anywhere]">
                    <strong>{t("கால வரம்புச் சட்டத்தின் தாக்கம்:", "Limitation Period Impact:")}</strong>{" "}
                    {t("தமிழ்நாடு வருவாய் விதிகளின் கீழ் பட்டா மாறுதல் தாமதங்களின் நிலை.", "Status of delay under Limitation Act and TN Revenue rules.")}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                  <span className="break-words [overflow-wrap:anywhere]">
                    <strong>{t("கட்டுமானம் / சொத்து விற்பனை அச்சுறுத்தல்:", "Possession / Alienation Threat:")}</strong>{" "}
                    {t("எதிர்த்தரப்பினர் சொத்தை அனுபவத்தில் வைத்திருந்தால் அச்சுறுத்தல் அதிகமாகும்.", "Threat level increases if opposite party holds adverse possession.")}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                  <span className="break-words [overflow-wrap:anywhere]">
                    <strong>{t("ஆதாரங்களின் பற்றாக்குறை:", "Documentary Evidence Gap:")}</strong>{" "}
                    {t("மூலப்பத்திரம் இல்லாதது அரசு வழிமுறைகளில் தடையை அதிகரிக்கும்.", "Absence of parent title deeds increases procedural risks.")}
                  </span>
                </li>
              </ul>
            </div>
            
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium mt-4">
              <span className="break-words">{t("அச்சுறுத்தல் மதிப்பெண் தமிழ்நாடு வருவாய் சட்ட வழிகாட்டுதலின்படி கணக்கிடப்படுகிறது.", "Calculated using Tamil Nadu revenue dispute guidelines & statutory limitation rules.")}</span>
            </div>
          </div>
        </div>

        {/* Stage 11 & 12 Precedent Intelligence & Strategy Simulator Panel */}
        <div id="stage-11" className="pt-2 min-w-0">
          <PrecedentAndStrategyPanel caseData={caseData} />
        </div>

        {/* Case Updates & Impact History Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 min-w-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-800 shrink-0" />
                {t("வழக்கு அப்டேட்கள் & பதிப்புகள் வரலாறு", "Case Updates & Impact History")}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="btn-primary-purple !py-1.5 !px-3 !text-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{t("➕ வழக்கு அப்டேட்", "➕ Update Case")}</span>
            </button>
          </div>

          {Array.isArray(caseData.updates) && caseData.updates.length > 0 ? (
            <div className="space-y-3">
              {caseData.updates.map((evt, idx) => (
                <div key={evt.id || idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="badge-ai-intel">
                      {evt.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : ""}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 mt-1 break-words">{evt.title}</h5>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed break-words [overflow-wrap:anywhere]">{evt.description}</p>
                  {(evt.sourceAuthority || evt.documentRef || evt.dateOfOccurrence) && (
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-semibold pt-1">
                      {evt.dateOfOccurrence && <span>{t("தேதி", "Date")}: {evt.dateOfOccurrence}</span>}
                      {evt.sourceAuthority && <span>{t("துறை", "Authority")}: {evt.sourceAuthority}</span>}
                      {evt.documentRef && <span>{t("ஆவண எண்", "Ref")}: {evt.documentRef}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic font-medium p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
              {t("இந்த வழக்கிற்கு இதுவரை எந்த புதிய அப்டேட்டும் சேர்க்கப்படவில்லை. '➕ Update Case' பொத்தானை பயன்படுத்தி புதிய ஆவணம் அல்லது நிகழ்வைச் சேர்க்கவும்.", "No case updates recorded yet. Click '➕ Update Case' to record new documents or events.")}
            </p>
          )}

          {Array.isArray(caseData.versions) && caseData.versions.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                {t("AI பகுப்பாய்வு பதிப்புகள் (Versions)", "AI Analysis Versions")}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {caseData.versions.map((ver, idx) => (
                  <div key={ver.versionNumber || idx} className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] font-bold text-purple-900">
                      <span>Version v{ver.versionNumber}</span>
                      <span>{ver.createdAt ? new Date(ver.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                    <p className="text-[11px] text-purple-950 font-bold break-words">{ver.summaryOfChanges}</p>
                    <div className="text-[10px] text-purple-900 font-medium flex items-center justify-between pt-1">
                      <span>Risk: {ver.previousRiskScore ?? "-"}% -&gt; {ver.newRiskScore ?? "-"}%</span>
                      <span>Stages: {(ver.changedStages || []).join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Case Update Modal */}
        <CaseUpdateModal
          caseData={caseData}
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          onApplyUpdate={(updatedCase, historyDesc) => {
            onUpdateCase(updatedCase, historyDesc);
            setIsUpdateModalOpen(false);
          }}
        />

      </div>

      {/* 3. Right Sidebar: Recommended Packages & Billing */}
      <aside id="stage-10" className="w-full bg-white border border-slate-200 p-4 rounded-xl flex flex-col space-y-5 print:hidden no-print shadow-xs lg:col-span-2 xl:col-span-1 xl:col-start-3 sticky top-20">
        
        <h2 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-purple-800" />
          {t("நிலை 10 - வழங்கப்படும் தீர்வு", "Stage 10 - Deliverable Package")}
        </h2>
        
        {/* Package Card */}
        <div className="bg-purple-50/50 border border-purple-300 rounded-xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-purple-800 text-white text-[9px] font-extrabold rounded-bl-lg uppercase tracking-wider">
            {t("பரிந்துரைக்கப்படுகிறது", "Recommended")}
          </div>
          
          <div className="mt-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
              {t("சேவை நிலை", "Service Tier")}
            </span>
            <h5 className="text-xs font-bold text-slate-900 font-display mb-1.5 leading-tight">
              {caseData.stage10?.packageName || t("முழு ஆலோசனை சேவைத் தொகுப்பு", "Comprehensive Legal Solution Package")}
            </h5>
            <div className="text-xl font-bold text-purple-900 mb-3">{caseData.stage10?.priceRange || "₹8,500"}</div>
            
            <ul className="text-[11px] text-slate-700 space-y-1.5 mb-3 font-medium border-t border-purple-200 pt-2.5">
              <li className="flex items-start">
                <span className="text-purple-800 mr-1.5 font-bold">•</span>
                <span>{t("தனிப்பயன் வருவாய் ஆட்சேபனை வரைவு", "Custom Revenue Objection Draft")}</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-800 mr-1.5 font-bold">•</span>
                <span>{t("மாவட்ட பதிவாளர் போலி பத்திர ரத்து மனு", "District Registrar Fraud Cancellation Petition")}</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-800 mr-1.5 font-bold">•</span>
                <span>{t("சான்றளிக்கப்பட்ட ஆவணங்கள் சரிபார்ப்பு", "Certified Title Document Verification")}</span>
              </li>
            </ul>
          </div>

          <div className="p-2.5 bg-white border border-purple-200 rounded-lg mb-3">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              {t("சேவை விபரங்கள்", "Package Description")}
            </span>
            <p className="text-[10px] text-slate-700 font-medium leading-relaxed">
              {caseData.stage10?.description || t("சட்டரீதியான வருவாய் அறிவிப்பு மற்றும் காலவரிசைப்படியான நடவடிக்கை வழிகாட்டி.", "Includes statutory revenue petition drafting and step-by-step action roadmap.")}
            </p>
          </div>

          <div className="text-[11px] text-center text-purple-900 font-bold bg-purple-100 border border-purple-200 py-1.5 rounded-lg">
            {t("சேவை முன்மொழிவு தயார்", "Service Proposal Ready")}
          </div>
        </div>

        {/* Live Assistant prompt status log */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              {t("உதவியாளர் முனையம்", "Engine Terminal")}
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-[8px] font-bold text-emerald-800 uppercase tracking-wider">
                {t("செயல்பாட்டில் உள்ளது", "Engine Active")}
              </span>
            </div>
          </div>
          
          <div className="p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-mono text-slate-700 leading-normal">
            {`${caseData.stage0?.district || "மாவட்டத்தில்"} பூர்வீக நிலத் தகராறு பகுப்பாய்வு செய்யப்படுகிறது... ${caseData.stage9?.score || 45}% அச்சுறுத்தல் காரணிகளைக் கண்டறிதல்...`}
          </div>
        </div>

      </aside>

    </div>
  );
}

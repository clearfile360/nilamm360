import React, { useState } from "react";
import { PropertyCase, CaseUpdateEvent, CaseAnalysisVersion, ImpactSummary, UpdateEventType } from "../types";
import { useLanguage } from "../lib/languageContext";
import { supabase } from "../lib/supabase";
import { 
  PlusCircle, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, 
  FileText, Calendar, Landmark, Sparkles, Scale, X, Activity, Check
} from "lucide-react";

interface CaseUpdateModalProps {
  caseData: PropertyCase;
  isOpen: boolean;
  onClose: () => void;
  onApplyUpdate: (updatedCase: PropertyCase, historyDesc: string) => void;
}

export function CaseUpdateModal({ caseData, isOpen, onClose, onApplyUpdate }: CaseUpdateModalProps) {
  const { langMode, t } = useLanguage();

  // Form states
  const [eventType, setEventType] = useState<UpdateEventType>("New Document");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateOfOccurrence, setDateOfOccurrence] = useState("");
  const [sourceAuthority, setSourceAuthority] = useState("");
  const [documentRef, setDocumentRef] = useState("");

  // Step states: "form" | "loading" | "review"
  const [step, setStep] = useState<"form" | "loading" | "review">("form");
  const [error, setError] = useState<string | null>(null);

  // Analysis result states
  const [reanalyzedResult, setReanalyzedResult] = useState<{
    updatedCase: PropertyCase;
    impactSummary: ImpactSummary;
    newEvent: CaseUpdateEvent;
  } | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setEventType("New Document");
    setTitle("");
    setDescription("");
    setDateOfOccurrence("");
    setSourceAuthority("");
    setDocumentRef("");
    setStep("form");
    setError(null);
    setReanalyzedResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAnalyzeImpact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError(t("தயவுசெய்து தலைப்பு மற்றும் விவரத்தை உள்ளிடவும்.", "Please enter a title and description."));
      return;
    }

    setError(null);
    setStep("loading");

    const newEvent: CaseUpdateEvent = {
      id: "evt_" + Date.now(),
      timestamp: new Date().toISOString(),
      type: eventType,
      title: title.trim(),
      description: description.trim(),
      dateOfOccurrence: dateOfOccurrence.trim() || undefined,
      sourceAuthority: sourceAuthority.trim() || undefined,
      documentRef: documentRef.trim() || undefined,
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = sessionData?.session?.access_token;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/reanalyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          existingCase: caseData,
          newEvent,
          languageMode: langMode,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to perform impact re-analysis.");
      }

      const data = await response.json();
      const resultingCase = data.mergedCase || data.updatedCase;
      if (!resultingCase || !data.impactSummary) {
        throw new Error("Invalid response received from re-analysis service.");
      }

      setReanalyzedResult({
        updatedCase: resultingCase,
        impactSummary: data.impactSummary,
        newEvent,
      });
      setStep("review");
    } catch (err: any) {
      console.error("Reanalysis Error:", err);
      setError(err.message || t("மறுபகுப்பாய்வு தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.", "Re-analysis failed. Please try again."));
      setStep("form");
    }
  };

  const handleApplyUpdateClick = () => {
    if (!reanalyzedResult) return;

    const { updatedCase, impactSummary, newEvent } = reanalyzedResult;

    // 1. Append newEvent to updates[]
    const existingUpdates = Array.isArray(caseData.updates) ? caseData.updates : [];
    const updatedUpdates = [newEvent, ...existingUpdates];

    // 2. Create lightweight CaseAnalysisVersion
    const existingVersions = Array.isArray(caseData.versions) ? caseData.versions : [];
    const newVersion: CaseAnalysisVersion = {
      versionNumber: existingVersions.length + 1,
      createdAt: new Date().toISOString(),
      triggeredByEventId: newEvent.id,
      changedStages: impactSummary.stagesAffected || [6, 9, 11, 12],
      summaryOfChanges: impactSummary.summaryOfChanges || `Added update: ${newEvent.title}`,
      previousRiskScore: impactSummary.riskImpact?.previousScore ?? caseData.stage9?.score,
      newRiskScore: impactSummary.riskImpact?.newScore ?? updatedCase.stage9?.score,
      previousStrategy: impactSummary.strategyImpact?.previousStrategy ?? (typeof caseData.stage12 === "object" ? caseData.stage12?.strongestLegalRoute : undefined),
      newStrategy: impactSummary.strategyImpact?.newStrategy ?? (typeof updatedCase.stage12 === "object" ? updatedCase.stage12?.strongestLegalRoute : undefined),
      evidenceGapsAdded: impactSummary.evidenceGapsAdded || [],
      evidenceGapsResolved: impactSummary.evidenceGapsResolved || [],
    };
    const updatedVersions = [newVersion, ...existingVersions];

    // 3. Assemble complete updated PropertyCase
    const finalUpdatedCase: PropertyCase = {
      ...updatedCase,
      updates: updatedUpdates,
      versions: updatedVersions,
      // Clear translatedVariants so language mode adaptations re-trigger accurately
      translatedVariants: {},
      // Preserve original history, normalizer or parent app appends new entry
      history: Array.isArray(caseData.history) ? [...caseData.history] : [],
    };

    const historyDesc = `வழக்கு புதுப்பிப்பு: "${newEvent.title}" (${newEvent.type})`;
    onApplyUpdate(finalUpdatedCase, historyDesc);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="h-5 w-5 text-purple-300" />
            <div>
              <h3 className="text-base font-black tracking-tight leading-tight">
                {step === "review" 
                  ? t("தாக்க பகுப்பாய்வு மதிப்பாய்வு", "Impact Re-Analysis Review") 
                  : t("வழக்கு அப்டேட் சேர்க்கவும்", "Add Case Update & New Development")}
              </h3>
              <p className="text-xs text-purple-200 font-medium">
                {t("வழக்கு ID", "Case ID")}: UK360-{(caseData.stage0?.district || "TN").toUpperCase().slice(0,3)}-{caseData.id?.slice(-4) || "0000"} • {caseData.stage0?.clientName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-purple-200 hover:text-white hover:bg-purple-800 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-900">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs font-semibold">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* STEP 1: FORM INPUT */}
          {step === "form" && (
            <form onSubmit={handleAnalyzeImpact} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Event Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("அப்டேட் வகை (Type)", "Update Type")} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as UpdateEventType)}
                    className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  >
                    <option value="New Fact / Information">{t("புதிய தகவல் / காரணி (New Fact / Information)", "New Fact / Information")}</option>
                    <option value="New Document">{t("புதிய ஆவணம் / பத்திரம் (New Document)", "New Document")}</option>
                    <option value="Court Notice / Order">{t("நீதிமன்ற உத்தரவு / நோட்டீஸ் (Court Notice / Order)", "Court Notice / Order")}</option>
                    <option value="Authority Action">{t("அதிகாரிகள் நடவடிக்கை (Authority Action)", "Authority Action")}</option>
                    <option value="New Event">{t("புதிய நிகழ்வு (New Event)", "New Event")}</option>
                    <option value="General Update">{t("பொதுவான தகவல் (General Update)", "General Update")}</option>
                  </select>
                </div>

                {/* Event Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("தலைப்பு (Title)", "Event Title")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("எ.கா. வருவாய் வட்டாட்சியர் விளக்கம் ஆவணம் கிடைத்தது", "e.g., Received Tahsildar Enquired Summons Notice")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {t("விவரமான செய்தி (Description)", "Detailed Description")} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={t("புதிய ஆவணம் அல்லது நிகழ்வின் முழு சட்ட தகவல்களை பதிவு செய்யவும்...", "Provide complete legal facts, document details, or authority findings...")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date of Occurrence */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("நிகழ்ந்த தேதி (Date)", "Date of Occurrence")}
                  </label>
                  <input
                    type="date"
                    value={dateOfOccurrence}
                    onChange={(e) => setDateOfOccurrence(e.target.value)}
                    className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                </div>

                {/* Source Authority */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("அதிகாரம் / துறை (Authority)", "Source Authority")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("எ.கா. வட்டாட்சியர் / சப்-ரெஜிஸ்ட்ரார்", "e.g., Tahsildar / Sub-Registrar / High Court")}
                    value={sourceAuthority}
                    onChange={(e) => setSourceAuthority(e.target.value)}
                    className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                </div>

                {/* Document Reference */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {t("ஆவண எண் (Doc Ref)", "Document Reference")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("எ.கா. கடித எண் / மனு எண்", "e.g., Rc. No. 1024/2026 or WP No. 405/2026")}
                    value={documentRef}
                    onChange={(e) => setDocumentRef(e.target.value)}
                    className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-purple-600" />
                  {t("'Analyze Impact' கிளிக் செய்தால் AI இதன் சட்ட தாக்கங்களை கணிக்கும்.", "'Analyze Impact' runs AI calculation before applying to the case.")}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-extrabold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                  >
                    {t("ரத்துசெய்", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-900 text-white text-xs font-black rounded-xl hover:bg-purple-800 transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Sparkles className="h-4 w-4 text-purple-300" />
                    {t("சட்ட தாக்கத்தை பகுப்பாய்வு செய்", "Analyze Impact")}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 2: LOADING */}
          {step === "loading" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-800 rounded-full animate-spin"></div>
                <Sparkles className="h-6 w-6 text-purple-700 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">
                  {t("சட்ட தாக்கத்தை பகுப்பாய்வு செய்கிறது...", "Analyzing Impact with Legal AI...")}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md font-medium">
                  {t("ஆதாரங்கள், ஆபத்து அளவு, முன்மாதிரிகள் மற்றும் உத்திகளை மறுபரிசீலனை செய்கிறது.", "Evaluating evidence strength, risk rating shift, legal precedents, and strategy adjustments.")}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: IMPACT REVIEW / COMPARISON SCREEN */}
          {step === "review" && reanalyzedResult && (
            <div className="space-y-6">
              
              {/* Event Header Banner */}
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black text-purple-900 uppercase tracking-widest bg-purple-200 px-2 py-0.5 rounded inline-block mb-1">
                    {reanalyzedResult.newEvent.type}
                  </span>
                  <h4 className="text-sm font-black text-purple-950">
                    {reanalyzedResult.newEvent.title}
                  </h4>
                  <p className="text-xs text-purple-800 font-medium mt-0.5">
                    {reanalyzedResult.newEvent.description}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs font-bold text-purple-900 bg-white px-3 py-2 rounded-xl border border-purple-200 shadow-sm">
                  <div>{t("பாதிக்கப்பட்ட நிலைகள்", "Stages Affected")}</div>
                  <div className="flex gap-1 mt-1 justify-end">
                    {(reanalyzedResult.impactSummary.stagesAffected || [6, 9, 11, 12]).map((stg) => (
                      <span key={stg} className="px-2 py-0.5 bg-purple-900 text-white rounded text-[10px] font-black">
                        Stage {stg < 10 ? `0${stg}` : stg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* COMPARISON CARDS: RISK & STRATEGY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* RISK CHANGE */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      {t("அச்சுறுத்தல் மாற்றம் (Risk Change)", "Risk Score Change")}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">Stage 09</span>
                  </div>

                  <div className="flex items-center justify-around bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">{t("முந்தைய நிலை", "Before")}</span>
                      <span className="text-xl font-black text-slate-700">
                        {reanalyzedResult.impactSummary.riskImpact?.previousScore ?? caseData.stage9?.score ?? 50}%
                      </span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-purple-600 animate-pulse" />
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">{t("புதிய நிலை", "After")}</span>
                      <span className="text-xl font-black text-purple-900">
                        {reanalyzedResult.impactSummary.riskImpact?.newScore ?? reanalyzedResult.updatedCase.stage9?.score ?? 50}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">
                    {reanalyzedResult.impactSummary.riskImpact?.explanation || t("ஆபத்து மறுமதிப்பீடு செய்யப்பட்டது.", "Risk level recalculated.")}
                  </p>
                </div>

                {/* STRATEGY CHANGE */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-purple-700" />
                      {t("சட்ட உத்தி மாற்றம் (Strategy Change)", "Legal Strategy Shift")}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">Stage 12</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">{t("முந்தைய உத்தி (Before)", "Previous Strategy")}</span>
                      <p className="font-bold text-slate-700">
                        {reanalyzedResult.impactSummary.strategyImpact?.previousStrategy || (typeof caseData.stage12 === "object" ? caseData.stage12?.strongestLegalRoute : "Standard Legal Track")}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                      <span className="text-[10px] font-bold text-purple-800 block uppercase">{t("புதிய உத்தி (After)", "Updated Strategy")}</span>
                      <p className="font-bold text-purple-950">
                        {reanalyzedResult.impactSummary.strategyImpact?.newStrategy || (typeof reanalyzedResult.updatedCase.stage12 === "object" ? reanalyzedResult.updatedCase.stage12?.strongestLegalRoute : "Updated Legal Track")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAILED IMPACT BREAKDOWN */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 text-xs">
                
                {/* Why it changed */}
                <div>
                  <h5 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                    {t("காரணம் மற்றும் சாரம்சம் (Why it changed)", "Why Analysis Changed")}
                  </h5>
                  <p className="text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                    {reanalyzedResult.impactSummary.summaryOfChanges}
                  </p>
                </div>

                {/* Evidence Gaps Added vs Resolved */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Resolved Gaps */}
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                    <span className="text-[10px] font-black text-emerald-900 uppercase block mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {t("தீர்க்கப்பட்ட ஆதார இடைவெளிகள்", "Resolved Evidence Gaps")}
                    </span>
                    {reanalyzedResult.impactSummary.evidenceGapsResolved && reanalyzedResult.impactSummary.evidenceGapsResolved.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 font-semibold text-emerald-950">
                        {reanalyzedResult.impactSummary.evidenceGapsResolved.map((gap, i) => (
                          <li key={i}>{gap}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-emerald-800 italic font-medium">{t("எந்த புதிய இடைவெளியும் முழுமையாக பூர்த்தி செய்யப்படவில்லை.", "No specific gaps resolved in this step.")}</p>
                    )}
                  </div>

                  {/* New Gaps Added */}
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                    <span className="text-[10px] font-black text-amber-900 uppercase block mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      {t("தேவைப்படும் புதிய ஆதாரங்கள்", "New Evidence Gaps Identified")}
                    </span>
                    {reanalyzedResult.impactSummary.evidenceGapsAdded && reanalyzedResult.impactSummary.evidenceGapsAdded.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 font-semibold text-amber-950">
                        {reanalyzedResult.impactSummary.evidenceGapsAdded.map((gap, i) => (
                          <li key={i}>{gap}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-amber-800 italic font-medium">{t("கூடுதல் ஆதார தேவைகள் எதுவும் உருவாகவில்லை.", "No new evidence gaps added.")}</p>
                    )}
                  </div>
                </div>

                {/* Recommended Next Actions */}
                <div>
                  <h5 className="font-bold text-slate-900 uppercase text-[11px] mb-1.5 flex items-center gap-1">
                    <Check className="h-4 w-4 text-purple-700" />
                    {t("பரிந்துரைக்கப்படும் அடுத்த கட்ட நடவடிக்கைகள்", "Recommended Next Actions")}
                  </h5>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                    {(reanalyzedResult.impactSummary.recommendedNextActions || []).map((act, i) => (
                      <div key={i} className="flex items-start gap-2 font-semibold text-slate-800">
                        <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-900 text-[10px] flex items-center justify-center font-black shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-extrabold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  {t("<- திருத்து", "<- Edit Details")}
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-extrabold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                  >
                    {t("ரத்துசெய்", "Cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyUpdateClick}
                    className="px-6 py-2.5 bg-emerald-700 text-white text-xs font-black rounded-xl hover:bg-emerald-800 transition flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    {t("அப்டேட்டை உறுதிசெய் (Apply Update)", "Apply Update to Case")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

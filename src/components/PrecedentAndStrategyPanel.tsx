import React, { useState } from "react";
import { PropertyCase, CaseReferenceItem } from "../types";
import { useLanguage } from "../lib/languageContext";
import { downloadStage11PDF, downloadStage12PDF } from "../lib/pdfExport";
import { 
  Scale, BookOpen, CheckCircle, AlertCircle, ArrowRight, Gavel, 
  Sparkles, ShieldCheck, ShieldAlert, Award, FileText, Landmark,
  Zap, ChevronDown, ChevronUp, ChevronRight, Search, Layers, HelpCircle, Target,
  Crosshair, Lightbulb, ListOrdered, CheckSquare, XCircle, ArrowUpRight, Download, Loader2
} from "lucide-react";

interface PrecedentAndStrategyPanelProps {
  key?: any;
  caseData: PropertyCase;
}

export function PrecedentAndStrategyPanel({ caseData }: PrecedentAndStrategyPanelProps) {
  const { langMode, t } = useLanguage();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stage11" | "stage12">("stage11");
  const [issueFilter, setIssueFilter] = useState<string>("All");
  const [isExporting11, setIsExporting11] = useState(false);
  const [isExporting12, setIsExporting12] = useState(false);

  const handleExportStage11 = async () => {
    try {
      setIsExporting11(true);
      await downloadStage11PDF(caseData);
    } catch (err) {
      console.error("Failed to export Stage 11 PDF:", err);
    } finally {
      setIsExporting11(false);
    }
  };

  const handleExportStage12 = async () => {
    try {
      setIsExporting12(true);
      await downloadStage12PDF(caseData);
    } catch (err) {
      console.error("Failed to export Stage 12 PDF:", err);
    } finally {
      setIsExporting12(false);
    }
  };

  const stage11 = caseData.stage11;
  const stage12 = caseData.stage12;

  const govOrders = stage11?.authoritiesSummary?.governmentOrders || [];
  const circs = stage11?.authoritiesSummary?.circulars || [];
  const similarCases: CaseReferenceItem[] = Array.isArray(stage11?.similarCases) ? stage11.similarCases : [];

  const filteredCases = issueFilter === "All" 
    ? similarCases 
    : similarCases.filter(c => (c.disputeIssueCategory || "").toLowerCase().includes(issueFilter.toLowerCase()));

  const selectedCase = similarCases.find(c => (c.caseId || c.id) === selectedCaseId) || similarCases[0] || null;

  const successPercentage = stage12?.strongestLegalRoute?.successProbabilityPercentage ?? stage11?.successProbability?.percentage ?? 85;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-slate-900 space-y-6">
      
      {/* Top Banner Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-3.5 bg-purple-700 rounded mr-1"></span>
              <span className="badge-ai-intel">
                <Sparkles className="h-3 w-3 text-purple-700" />
                STAGE 11 & 12 • LEGAL INTELLIGENCE ENGINE
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight font-display text-slate-900">
              {t("முன்மாதிரி தீர்ப்புகள் & சட்ட உத்தி சிமுலேட்டர்", "Precedent Intelligence & Legal Strategy Simulator")}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {t(
                "மெட்ராஸ் உயர் நீதிமன்றத் தீர்ப்புகள், தமிழ்நாடு அரசாணைகள் & வெற்றி வாய்ப்பு கணிப்பு.",
                "Madras High Court precedents, Tamil Nadu GOs, and AI strategy simulation."
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 p-3.5 rounded-xl shrink-0">
            <div>
              <span className="text-[9px] font-extrabold text-purple-900 uppercase tracking-widest block">
                {t("கணிக்கப்பட்ட வெற்றி வாய்ப்பு", "Simulated Success Probability")}
              </span>
              <span className="text-xs font-bold text-slate-800 block">
                {t("வலுவான சட்ட நிலை", "Strong Legal Standing")}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-800 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
              {successPercentage}%
            </div>
          </div>
        </div>

        {/* Tab Selection & Export buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("stage11")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "stage11"
                  ? "bg-purple-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>{t("நிலை 11 - முன்மாதிரி தீர்ப்புகள் (Precedents)", "Stage 11 - Precedent Intelligence")}</span>
            </button>

            <button
              onClick={() => setActiveTab("stage12")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "stage12"
                  ? "bg-purple-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <Target className="h-4 w-4 text-purple-600" />
              <span>{t("நிலை 12 - சட்ட உத்தி சிமுலேட்டர் (Strategy)", "Stage 12 - Strategy Simulator")}</span>
            </button>
          </div>

          <div>
            {activeTab === "stage11" ? (
              <button
                onClick={handleExportStage11}
                disabled={isExporting11}
                className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                title="Export Stage 11 Precedent Intelligence Report as PDF"
              >
                {isExporting11 ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-700" />
                    <span>{t("PDF தயாராகிறது...", "Generating Stage 11 PDF...")}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-purple-700" />
                    <span>{t("நிலை 11 PDF பதிவிறக்கம்", "Export Stage 11 PDF")}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleExportStage12}
                disabled={isExporting12}
                className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                title="Export Stage 12 Legal Strategy Simulator as PDF"
              >
                {isExporting12 ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-700" />
                    <span>{t("PDF தயாராகிறது...", "Generating Stage 12 PDF...")}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-purple-700" />
                    <span>{t("நிலை 12 PDF பதிவிறக்கம்", "Export Stage 12 PDF")}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STAGE 11 CONTENT */}
      {activeTab === "stage11" && (
        <div className="space-y-6">
          {similarCases.length === 0 && govOrders.length === 0 && circs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">
                {t("முன்மாதிரி தீர்ப்புகள் கிடைக்கவில்லை", "No precedent intelligence available")}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t(
                  "இந்த வழக்கிற்கான முன்மாதிரி தீர்ப்புகள் அல்லது அரசாணைகள் பதிவு செய்யப்படவில்லை.",
                  "No similar court precedents, Government Orders, or circulars are indexed for this specific case analysis."
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stat Grid for Precedents */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {t("ஒத்த தீர்ப்புகள்", "Similar Judgments")}
                  </span>
                  <div className="text-xl font-bold text-purple-900 flex items-center gap-2">
                    <span>{similarCases.length}</span>
                    <span className="text-xs font-semibold text-slate-500">{t("தீர்ப்புகள்", "Cases Found")}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {t("சராசரி ஒற்றுமை வீதம்", "Avg Similarity Score")}
                  </span>
                  <div className="text-xl font-bold text-emerald-700">
                    {stage11?.averageSimilarityScore || (similarCases.length > 0 ? Math.round(similarCases.reduce((acc, c) => acc + (c.similarityScore || 0), 0) / similarCases.length) : 0)}%
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {t("உயர் நீதிமன்றத் தீர்ப்புகள்", "High Court Rulings")}
                  </span>
                  <div className="text-xl font-bold text-slate-900">
                    {stage11?.authoritiesSummary?.highCourtCount || similarCases.filter(c => (c.court || "").toLowerCase().includes("high court") || (c.court || "").toLowerCase().includes("madras")).length} {t("தீர்ப்புகள்", "Rulings")}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {t("அரசாணைகள் & சுற்றறிக்கைகள்", "Govt Orders & Circulars")}
                  </span>
                  <div className="text-xl font-bold text-slate-900">
                    {govOrders.length + circs.length} {t("சான்றுகள்", "Authorities")}
                  </div>
                </div>
              </div>

              {/* Main Precedent Reference Library & Comparison */}
              {similarCases.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Case List */}
                  <div className="lg:col-span-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span>{t("முக்கிய தீர்ப்புகளின் நூலகம்", "Precedent Library")}</span>
                      <span className="text-[10px] text-purple-800 font-bold">{filteredCases.length} items</span>
                    </h3>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {filteredCases.map((c, idx) => {
                        const currentId = c.caseId || c.id || `case_${idx}`;
                        const isSelected = (selectedCase?.caseId || selectedCase?.id) === currentId;
                        const itemTitle = c.title || c.caseName || t("வழக்கு தலைப்பு கிடைக்கவில்லை", "Case Title Not Available");
                        const itemCitation = c.citation || c.citationNumber || t("சான்றெண் பெறப்படவில்லை", "Citation Not Available");
                        const itemCategory = c.disputeIssueCategory || (Array.isArray(c.issuesCompared) ? c.issuesCompared.join(", ") : "") || t("வகை குறிப்பிடப்படவில்லை", "Category Not Specified");
                        
                        return (
                          <div
                            key={currentId}
                            onClick={() => setSelectedCaseId(currentId)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                              isSelected
                                ? "bg-purple-50/70 border-purple-400 shadow-xs ring-1 ring-purple-300"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {itemCitation}
                              </span>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <span>{c.similarityScore ?? 0}%</span>
                                <span className="text-[9px] font-normal">{t("ஒற்றுமை", "Match")}</span>
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
                              {itemTitle}
                            </h4>

                            <p className="text-[10px] text-slate-500 line-clamp-1 font-medium">
                              {itemCategory}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Case Deep-Dive Viewer */}
                  {selectedCase && (
                    <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="border-b border-slate-200 pb-3 flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                            {selectedCase.citation || selectedCase.citationNumber || t("சான்றெண் பெறப்படவில்லை", "Citation Not Available")}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                            {selectedCase.title || selectedCase.caseName || t("வழக்கு தலைப்பு கிடைக்கவில்லை", "Case Title Not Available")}
                          </h3>
                          <p className="text-[11px] text-purple-900 font-semibold mt-0.5">
                            {[selectedCase.court, selectedCase.judge, selectedCase.year].filter(Boolean).join(" • ") || t("நீதிமன்ற விவரம் பெறப்படவில்லை", "Court Info Not Available")}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xl font-extrabold text-emerald-700">{selectedCase.similarityScore ?? 0}%</span>
                          <span className="text-[9px] text-slate-500 block font-bold">{t("ஒற்றுமை மதிப்பெண்", "Similarity Score")}</span>
                        </div>
                      </div>

                      {/* Factual Similarity */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          {t("நிகழ்வு ஒற்றுமை (Factual Similarity)", "Factual Similarity")}
                        </span>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {selectedCase.factualSimilarity || selectedCase.whyItMatters || t("நிகழ்வு ஒற்றுமை விவரம் பெறப்படவில்லை", "Factual similarity details not available")}
                        </p>
                      </div>

                      {/* Key Legal Holdings */}
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                          {t("நீதிமன்றத்தின் முக்கிய சட்டத் தீர்ப்புரைகள் (Key Legal Holdings)", "Key Legal Holdings")}
                        </span>
                        <ul className="space-y-1.5 text-xs text-slate-800 font-medium">
                          {(Array.isArray(selectedCase.keyLegalHoldings) && selectedCase.keyLegalHoldings.length > 0) ? (
                            selectedCase.keyLegalHoldings.map((h, idx) => (
                              <li key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                                <Gavel className="h-3.5 w-3.5 text-purple-700 mt-0.5 shrink-0" />
                                <span>{h}</span>
                              </li>
                            ))
                          ) : selectedCase.courtReasoningSummary ? (
                            <li className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                              <Gavel className="h-3.5 w-3.5 text-purple-700 mt-0.5 shrink-0" />
                              <span>{selectedCase.courtReasoningSummary}</span>
                            </li>
                          ) : (
                            <li className="text-slate-500 text-xs italic bg-white p-2.5 rounded-lg border border-slate-200">
                              {t("முக்கிய சட்டத் தீர்ப்புரைகள் கிடைக்கவில்லை", "Key legal holdings not available")}
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Strategic Value */}
                      <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl">
                        <span className="text-[9px] font-bold text-purple-900 uppercase tracking-wider block mb-1">
                          {t("இந்த வழக்கிற்கு இதன் பயன்பாடு (Strategic Value)", "Strategic Value for Current Case")}
                        </span>
                        <p className="text-xs text-purple-950 font-medium leading-relaxed">
                          {selectedCase.strategicValue || selectedCase.whyItMatters || t("பயன்பாட்டு உத்தி விவரம் கிடைக்கவில்லை", "Strategic value not available")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-500 italic">
                    {t("முன்மாதிரி தீர்ப்புகள் கிடைக்கவில்லை", "No precedent intelligence available")}
                  </p>
                </div>
              )}

              {/* Statutory Authorities: GOs & Circulars */}
              {(govOrders.length > 0 || circs.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Government Orders */}
                  {govOrders.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                        <Landmark className="h-4 w-4 text-purple-700" />
                        {t("அரசாணைகள் (Government Orders - G.O.s)", "Government Orders (G.O.s)")}
                      </h4>

                      <div className="space-y-2.5">
                        {govOrders.map((go: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{go.orderNumber}</span>
                              <span className="text-[9px] text-slate-500 font-mono">{go.date}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 font-medium">{go.subject}</p>
                            <p className="text-[10px] text-purple-950 font-medium bg-purple-50/70 p-2 rounded border border-purple-200 mt-1">
                              <strong>{t("பயன்பாடு:", "Relevance:")}</strong> {go.relevance}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Circulars */}
                  {circs.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                        <FileText className="h-4 w-4 text-purple-700" />
                        {t("சுற்றறிக்கைகள் (Official Circulars)", "Official Revenue & Land Circulars")}
                      </h4>

                      <div className="space-y-2.5">
                        {circs.map((circ: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{circ.circularNumber}</span>
                              <span className="text-[9px] text-slate-500 font-mono">{circ.date}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 font-medium">{circ.subject}</p>
                            <p className="text-[10px] text-indigo-950 font-medium bg-indigo-50/70 p-2 rounded border border-indigo-200 mt-1">
                              <strong>{t("பயன்பாடு:", "Relevance:")}</strong> {circ.relevance}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* STAGE 12 CONTENT */}
      {activeTab === "stage12" && (
        <div className="space-y-6">
          {!stage12 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">
                {t("சட்ட உத்தி சிமுலேஷன் கிடைக்கவில்லை", "No legal strategy simulation available")}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t(
                  "இந்த வழக்கிற்கான சட்ட உத்தி சிமுலேஷன் விவரங்கள் இன்னும் உருவாக்கப்படவில்லை.",
                  "Legal strategy simulation details have not been generated for this case."
                )}
              </p>
            </div>
          ) : (
            <>
              {/* 12.1 Strongest Legal Route Card */}
              {stage12.strongestLegalRoute && (
                <div className="bg-purple-50/40 border-2 border-purple-300 rounded-xl p-5 shadow-xs relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 bg-purple-800 text-white text-[9px] font-extrabold rounded uppercase tracking-wider">
                      12.1 {t("மிக வலுவான சட்ட வழிமுறை", "STRONGEST LEGAL ROUTE")}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {t("மிக உயர்ந்த வெற்றி வாய்ப்பு", "Highest Success Probability")}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-tight font-display mb-2">
                    {stage12.strongestLegalRoute.routeName}
                  </h3>

                  {stage12.strongestLegalRoute.justification && (
                    <p className="text-xs text-slate-700 font-medium leading-relaxed mb-3 bg-white p-3 rounded-lg border border-purple-200">
                      <strong>{t("ஏன் இந்த வழிமுறை?:", "Why this Route?:")}</strong> {stage12.strongestLegalRoute.justification}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600 border-t border-purple-200 pt-3">
                    {stage12.strongestLegalRoute.routeType && (
                      <span>{t("வகை:", "Route Type:")} {stage12.strongestLegalRoute.routeType}</span>
                    )}
                    {stage12.strongestLegalRoute.timeToResolutionEst && (
                      <span className="text-purple-900 font-bold">{t("எதிர்பார்க்கப்படும் கால அளவு:", "Estimated Resolution:")} {stage12.strongestLegalRoute.timeToResolutionEst}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Grid of 12.3 Evidence Gaps & 12.4 Counterarguments */}
              {((stage12.evidenceGapsToFill && stage12.evidenceGapsToFill.length > 0) || (stage12.likelyOppositeCounterarguments && stage12.likelyOppositeCounterarguments.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 12.3 Evidence Gaps to Fill */}
                  {stage12.evidenceGapsToFill && stage12.evidenceGapsToFill.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-3">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        12.3 {t("நிரப்பப்பட வேண்டிய ஆதார இடைவெளிகள்", "Evidence Gaps to Fill")}
                      </h4>

                      <div className="space-y-3">
                        {stage12.evidenceGapsToFill.map((eg, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{eg.missingElement}</span>
                              {eg.urgency && (
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                  eg.urgency === "High" ? "bg-rose-50 text-rose-800 border border-rose-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}>
                                  {eg.urgency} {t("அவசரம்", "Urgency")}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium">
                              <strong>{t("பெறும் வழிமுறை:", "How to Obtain:")}</strong> {eg.howToObtain}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 12.4 Opposing Counterarguments & Rebuttal Strategies */}
                  {stage12.likelyOppositeCounterarguments && stage12.likelyOppositeCounterarguments.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-3">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        12.4 {t("எதிர்த்தரப்பின் சாத்தியமான வாதங்கள் & பதில் உத்தி", "Counterargument Simulator & Rebuttals")}
                      </h4>

                      <div className="space-y-3">
                        {stage12.likelyOppositeCounterarguments.map((ca, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold text-rose-700 uppercase block">{t(`எதிர்த்தரப்பு வாதம் ${i + 1}`, `Opposing Argument ${i + 1}`)}:</span>
                            <p className="text-xs font-bold text-slate-900">"{ca.argument}"</p>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase block mt-1">{t("AI பதில் உத்தி (Rebuttal)", "AI Rebuttal Strategy")}:</span>
                            <p className="text-xs text-slate-800 font-medium bg-emerald-50/60 p-2 rounded border border-emerald-200">
                              {ca.rebuttalStrategy}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 12.5 Additional Recommended Proof & 12.6 Priority Next Actions */}
              {((stage12.recommendedAdditionalProof && stage12.recommendedAdditionalProof.length > 0) || (stage12.priorityNextActions && stage12.priorityNextActions.length > 0)) && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Additional Recommended Proof */}
                  {stage12.recommendedAdditionalProof && stage12.recommendedAdditionalProof.length > 0 && (
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-3">
                        <CheckSquare className="h-4 w-4 text-purple-700" />
                        12.5 {t("கூடுதல் சாட்சியங்கள் & ஆவணப் பரிந்துரைகள்", "Additional Recommended Evidence")}
                      </h4>

                      <div className="space-y-2.5">
                        {stage12.recommendedAdditionalProof.map((ap, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                            <div className="p-1.5 bg-purple-100 text-purple-900 border border-purple-200 rounded-lg shrink-0 text-[11px] font-bold">
                              #{i + 1}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{ap.title}</span>
                              <span className="text-[10px] text-purple-800 font-semibold block">{ap.type}</span>
                              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{ap.purpose}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 12.6 Priority Next Actions Roadmap */}
                  {stage12.priorityNextActions && stage12.priorityNextActions.length > 0 && (
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-3">
                        <ListOrdered className="h-4 w-4 text-purple-700" />
                        12.6 {t("அடுத்தடுத்த முதன்மை நடவடிக்கைகள்", "Priority Action Roadmap")}
                      </h4>

                      <div className="space-y-3">
                        {stage12.priorityNextActions.map((pa, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-purple-800 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                              {pa.stepNumber || i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                <span className="text-xs font-bold text-slate-900">{pa.action}</span>
                                <span className="text-[9px] font-bold text-purple-900 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded">
                                  {pa.timeline}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold block">
                                {t("அணுக வேண்டிய அதிகாரி", "Target Authority")}: {pa.targetAuthority}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}

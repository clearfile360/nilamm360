import {
  Env,
  jsonResponse,
  getGeminiClient,
  sanitizePromptInput,
  generateContentWithRetry,
  cleanAndParseJson,
  validateGeminiModel
} from "../lib/helpers";

export const onRequestOptions = async () => {
  return jsonResponse({}, 200);
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    let body: any = {};
    try {
      body = await context.request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON request body." }, 400);
    }

    const { existingCase, newEvent, languageMode: reqLangMode, langMode, model } = body;
    const validatedModel = validateGeminiModel(model || existingCase?.selectedModel);

    if (!existingCase || typeof existingCase !== "object") {
      return jsonResponse({ error: "existingCase object is required for re-analysis." }, 400);
    }

    if (!newEvent || !newEvent.title || !newEvent.description) {
      return jsonResponse({ error: "newEvent with title and description is required for re-analysis." }, 400);
    }

    const rawLang = reqLangMode || langMode || existingCase.languageMode || "dual";
    const languageMode = (rawLang === "ta" || rawLang === "tamil") ? "ta" : (rawLang === "en" || rawLang === "english") ? "en" : "dual";

    const safeNewEvent = {
      type: sanitizePromptInput(String(newEvent.type || "General Update").slice(0, 100)),
      title: sanitizePromptInput(String(newEvent.title).slice(0, 200)),
      description: sanitizePromptInput(String(newEvent.description).slice(0, 5000)),
      dateOfOccurrence: sanitizePromptInput(String(newEvent.dateOfOccurrence || "").slice(0, 50)),
      sourceAuthority: sanitizePromptInput(String(newEvent.sourceAuthority || "").slice(0, 100)),
      documentRef: sanitizePromptInput(String(newEvent.documentRef || "").slice(0, 100)),
    };

    const ai = getGeminiClient(context.env);

    const prompt = `
You are the Master Legal AI Engine for the UNIKORN360 / NILAM360 PROPERTY & DISPUTE ANALYSIS PLATFORM.

An advocate/client is updating an existing property case with a NEW FACT / EVENT / DOCUMENT / COURT ORDER.

### EXISTING PROPERTY CASE:
${JSON.stringify(existingCase)}

### NEW CASE UPDATE EVENT:
- Type: ${safeNewEvent.type}
- Title: ${safeNewEvent.title}
- Description: ${safeNewEvent.description}
- Date: ${safeNewEvent.dateOfOccurrence || "N/A"}
- Source Authority: ${safeNewEvent.sourceAuthority || "N/A"}
- Document Ref: ${safeNewEvent.documentRef || "N/A"}

### ACTIVE LANGUAGE MODE: ${languageMode}

---

### INSTRUCTIONS:
1. Re-evaluate only the stages and fields affected by this new update. Do NOT invent facts outside the existing case and new event.
2. Maintain all unaffected case data (Intake, Stage 0, Stage 1, Stage 2 real issue unless altered, Stage 3, Stage 4, Stage 5, Stage 7, Stage 8, Stage 10) unchanged.
3. Recalculate:
   - Stage 06 (Evidence): Move resolved documents to available proof, update missing proof, adjust evidenceStrength ("Weak" | "Moderate" | "Strong" | "Decisive").
   - Stage 09 (Risk & Urgency): Recalculate risk score (0-100), rating ("Low" | "Medium" | "High" | "Critical"), update risk factors.
   - Stage 11 (Precedent Intelligence): Update applicable precedents, similarity scores, and success probability.
   - Stage 12 (Strategy Simulator): Update strongest legal route, counterarguments, and priority action items.
   - clientFacingReply: Update summary, actionableAdvice, and keyFindings matching languageMode (${languageMode}).
   - immediateAction: Update authorityToApproach, nextSteps, and timeframe.
4. Respond in JSON format with exactly two top-level keys: "updatedCase" and "impactSummary".

Format:
\`\`\`json
{
  "updatedCase": { ...updated PropertyCase... },
  "impactSummary": {
    "newFacts": ["string"],
    "stagesAffected": [6, 9, 11, 12],
    "evidenceImpact": "string",
    "riskImpact": {
      "previousScore": 45,
      "newScore": 65,
      "explanation": "string"
    },
    "precedentImpact": "string",
    "governmentOrderImpact": "string",
    "strategyImpact": {
      "previousStrategy": "string",
      "newStrategy": "string",
      "explanation": "string"
    },
    "evidenceGapsAdded": ["string"],
    "evidenceGapsResolved": ["string"],
    "recommendedNextActions": ["string"],
    "summaryOfChanges": "string"
  }
}
\`\`\`
`;

    const response = await generateContentWithRetry(ai, {
      model: validatedModel,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    const parsed = cleanAndParseJson(text);

    if (!parsed || !parsed.updatedCase) {
      return jsonResponse({ error: "Failed to generate structured re-analysis from AI model." }, 500);
    }

    parsed.updatedCase.selectedModel = validatedModel;

    const prevRisk = existingCase?.stage9?.score ?? 50;
    const newRisk = parsed.updatedCase?.stage9?.score ?? prevRisk;
    
    const impactSummary = parsed.impactSummary || {
      newFacts: [safeNewEvent.title],
      stagesAffected: [6, 9, 11, 12],
      evidenceImpact: "Evidence assessment updated based on new document/fact.",
      riskImpact: {
        previousScore: prevRisk,
        newScore: newRisk,
        explanation: `Risk score updated from ${prevRisk}% to ${newRisk}%.`,
      },
      precedentImpact: "Relevant precedents updated.",
      governmentOrderImpact: "N/A",
      strategyImpact: {
        previousStrategy: existingCase?.stage12?.strongestLegalRoute || "Standard Legal Approach",
        newStrategy: parsed.updatedCase?.stage12?.strongestLegalRoute || "Updated Legal Approach",
        explanation: "Strategy refined based on new case development.",
      },
      evidenceGapsAdded: [],
      evidenceGapsResolved: [],
      recommendedNextActions: parsed.updatedCase?.immediateAction?.nextSteps || [],
      summaryOfChanges: `Re-analyzed case with event: ${safeNewEvent.title}`,
    };

    return jsonResponse({
      updatedCase: parsed.updatedCase,
      impactSummary,
    });
  } catch (error: any) {
    console.error("Error in /api/reanalyze Cloudflare Function:", error);
    return jsonResponse({ error: error.message || "Internal server error during re-analysis." }, 500);
  }
};

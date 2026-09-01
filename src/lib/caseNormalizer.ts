import { 
  PropertyCase, 
  Stage1Data, 
  Stage2Data, 
  Stage3LegalMap, 
  Stage4Timeline, 
  Stage5RightsMatrix, 
  Stage6Data, 
  Stage7JurisdictionMap, 
  Stage8Data, 
  Stage9Data, 
  Stage10Data, 
  Stage11PrecedentIntelligence, 
  Stage12StrategySimulator, 
  CaseHistoryEntry, 
  ClientFacingReply, 
  DocumentsRequired, 
  ImmediateAction, 
  ServicePackage, 
  CustomDocumentDraft,
  CaseUpdateEvent,
  CaseAnalysisVersion
} from "../types";

/**
 * Normalizes raw/legacy PropertyCase objects from Supabase or localStorage
 * into a fully structurally safe PropertyCase.
 *
 * IMPORTANT: Preserves all existing valid data and only repairs missing
 * or malformed nested structures to prevent React runtime rendering errors.
 */
export function normalizePropertyCase(rawCase: any): PropertyCase {
  if (!rawCase || typeof rawCase !== "object") {
    return createDefaultCase("empty_case");
  }

  // Basic metadata
  const id = String(rawCase.id || `case_${Date.now()}`);
  const createdAt = typeof rawCase.createdAt === "string" ? rawCase.createdAt : (typeof rawCase.created_at === "string" ? rawCase.created_at : new Date().toISOString());
  const rawDescription = typeof rawCase.rawDescription === "string" ? rawCase.rawDescription : (typeof rawCase.description === "string" ? rawCase.description : "");
  
  const languageMode = (rawCase.languageMode === "en" || rawCase.languageMode === "dual" || rawCase.languageMode === "ta")
    ? rawCase.languageMode
    : "ta";

  // Helper to ensure array of strings
  const ensureStringArray = (val: any): string[] => {
    if (Array.isArray(val)) {
      return val.map(v => String(v ?? "")).filter(s => s.length > 0);
    }
    if (typeof val === "string" && val.trim()) {
      return [val.trim()];
    }
    return [];
  };

  // Intake / Stage0 (always object)
  const rawIntake = (rawCase.intake && typeof rawCase.intake === "object") 
    ? rawCase.intake 
    : ((rawCase.stage0 && typeof rawCase.stage0 === "object") ? rawCase.stage0 : {});

  const stage0 = {
    clientName: typeof rawIntake.clientName === "string" && rawIntake.clientName ? rawIntake.clientName : "வாடிக்கையாளர் / Client",
    mobile: typeof rawIntake.mobile === "string" ? rawIntake.mobile : "",
    surveyNumber: typeof rawIntake.surveyNumber === "string" ? rawIntake.surveyNumber : "",
    village: typeof rawIntake.village === "string" ? rawIntake.village : "",
    taluk: typeof rawIntake.taluk === "string" ? rawIntake.taluk : "",
    district: typeof rawIntake.district === "string" && rawIntake.district ? rawIntake.district : "தமிழ்நாடு / Tamil Nadu",
    oppositeParty: typeof rawIntake.oppositeParty === "string" ? rawIntake.oppositeParty : "",
    partyRelationship: typeof rawIntake.partyRelationship === "string" ? rawIntake.partyRelationship : "",
    courtOrForum: typeof rawIntake.courtOrForum === "string" ? rawIntake.courtOrForum : "",
    existingAdvocate: typeof rawIntake.existingAdvocate === "string" ? rawIntake.existingAdvocate : "",
    existingCaseNumber: typeof rawIntake.existingCaseNumber === "string" ? rawIntake.existingCaseNumber : "",
    limitationRisk: typeof rawIntake.limitationRisk === "string" ? rawIntake.limitationRisk : "Medium",
    workspace: rawIntake.workspace || rawCase.workspace,
    subWorkspace: rawIntake.subWorkspace || rawCase.subWorkspace,
    module: rawIntake.module || rawCase.module,
    engine: rawIntake.engine || rawCase.engine,
  };
  const intake = { ...stage0 };

  // Stage 1 (always object, category & specificType string fallbacks)
  const rawStage1 = (rawCase.stage1 && typeof rawCase.stage1 === "object") ? rawCase.stage1 : {};
  const stage1: Stage1Data = {
    category: typeof rawStage1.category === "string" ? rawStage1.category : (typeof rawCase.stage1 === "string" ? rawCase.stage1 : "வருவாய் / Revenue"),
    specificType: typeof rawStage1.specificType === "string" ? rawStage1.specificType : "",
  };

  // Stage 2 (always object)
  const rawStage2 = (rawCase.stage2 && typeof rawCase.stage2 === "object") ? rawCase.stage2 : {};
  const stage2: Stage2Data = {
    realIssue: typeof rawStage2.realIssue === "string" ? rawStage2.realIssue : (typeof rawCase.stage2 === "string" ? rawCase.stage2 : ""),
    rootCauseStatement: typeof rawStage2.rootCauseStatement === "string" ? rawStage2.rootCauseStatement : "",
  };

  // Stage 3 (preserve legacy string or normalize structured object)
  let stage3: string | Stage3LegalMap;
  if (typeof rawCase.stage3 === "object" && rawCase.stage3 !== null) {
    stage3 = {
      subjectType: typeof rawCase.stage3.subjectType === "string" ? rawCase.stage3.subjectType : "நிலம் / Property",
      partyRelationshipMap: typeof rawCase.stage3.partyRelationshipMap === "string" ? rawCase.stage3.partyRelationshipMap : "",
    };
  } else if (typeof rawCase.stage3 === "string" && rawCase.stage3.trim()) {
    stage3 = rawCase.stage3;
  } else {
    stage3 = "நிலம் / Property";
  }

  // Stage 4 (if object: timelineEvents string[]; if string: legacy string or wrap)
  let stage4: string | Stage4Timeline;
  if (typeof rawCase.stage4 === "object" && rawCase.stage4 !== null) {
    stage4 = {
      timelineEvents: ensureStringArray(rawCase.stage4.timelineEvents),
    };
  } else if (typeof rawCase.stage4 === "string" && rawCase.stage4.trim()) {
    stage4 = {
      timelineEvents: [rawCase.stage4],
    };
  } else {
    stage4 = {
      timelineEvents: [],
    };
  }

  // Stage 5 (rightsViolated, dutiesBreached, legalObligations, possibleLiabilities, availableProtections always string[])
  let stage5: Stage5RightsMatrix;
  if (typeof rawCase.stage5 === "object" && rawCase.stage5 !== null) {
    stage5 = {
      rightsViolated: ensureStringArray(rawCase.stage5.rightsViolated),
      dutiesBreached: ensureStringArray(rawCase.stage5.dutiesBreached),
      legalObligations: ensureStringArray(rawCase.stage5.legalObligations),
      possibleLiabilities: ensureStringArray(rawCase.stage5.possibleLiabilities),
      availableProtections: ensureStringArray(rawCase.stage5.availableProtections),
    };
  } else if (typeof rawCase.stage5 === "string" && rawCase.stage5.trim()) {
    stage5 = {
      rightsViolated: [rawCase.stage5],
      dutiesBreached: [],
      legalObligations: [],
      possibleLiabilities: [],
      availableProtections: [],
    };
  } else {
    stage5 = {
      rightsViolated: [],
      dutiesBreached: [],
      legalObligations: [],
      possibleLiabilities: [],
      availableProtections: [],
    };
  }

  // Stage 6 (all array fields always string[])
  const rawStage6 = (rawCase.stage6 && typeof rawCase.stage6 === "object") ? rawCase.stage6 : {};
  const stage6: Stage6Data = {
    available: ensureStringArray(rawStage6.available),
    missing: ensureStringArray(rawStage6.missing),
    documentary: ensureStringArray(rawStage6.documentary),
    electronic: ensureStringArray(rawStage6.electronic),
    witnesses: ensureStringArray(rawStage6.witnesses),
    officialRecords: ensureStringArray(rawStage6.officialRecords),
    evidenceStrength: typeof rawStage6.evidenceStrength === "string" ? rawStage6.evidenceStrength : "Moderate",
  };

  // Stage 7 (preserve array, structured object route: string[], or legacy string to route: [string])
  let stage7: string[] | Stage7JurisdictionMap;
  if (Array.isArray(rawCase.stage7)) {
    stage7 = ensureStringArray(rawCase.stage7);
  } else if (typeof rawCase.stage7 === "object" && rawCase.stage7 !== null) {
    stage7 = {
      route: ensureStringArray(rawCase.stage7.route),
      primaryAuthority: typeof rawCase.stage7.primaryAuthority === "string" ? rawCase.stage7.primaryAuthority : "",
      appellateAuthority: typeof rawCase.stage7.appellateAuthority === "string" ? rawCase.stage7.appellateAuthority : "",
      forumType: typeof rawCase.stage7.forumType === "string" ? rawCase.stage7.forumType : "",
    };
  } else if (typeof rawCase.stage7 === "string" && rawCase.stage7.trim()) {
    stage7 = [rawCase.stage7.trim()];
  } else {
    stage7 = [];
  }

  // Stage 8 (always object, primaryRemedy string fallback, alternativeOptions string[])
  const rawStage8 = (rawCase.stage8 && typeof rawCase.stage8 === "object") ? rawCase.stage8 : {};
  const stage8: Stage8Data = {
    category: typeof rawStage8.category === "string" ? rawStage8.category : "",
    primaryRemedy: typeof rawStage8.primaryRemedy === "string" && rawStage8.primaryRemedy 
      ? rawStage8.primaryRemedy 
      : (typeof rawCase.stage8 === "string" ? rawCase.stage8 : "பரிகார மனு / Legal Petition"),
    remedyType: typeof rawStage8.remedyType === "string" ? rawStage8.remedyType : "",
    alternativeOptions: ensureStringArray(rawStage8.alternativeOptions),
  };

  // Stage 9 (factors always string[], score numeric fallback, rating string fallback)
  const rawStage9 = (rawCase.stage9 && typeof rawCase.stage9 === "object") ? rawCase.stage9 : {};
  const stage9: Stage9Data = {
    factors: ensureStringArray(rawStage9.factors),
    score: typeof rawStage9.score === "number" ? rawStage9.score : (Number(rawStage9.score) || 45),
    rating: typeof rawStage9.rating === "string" && rawStage9.rating ? rawStage9.rating : "Medium",
    limitationStatus: typeof rawStage9.limitationStatus === "string" ? rawStage9.limitationStatus : "",
    urgencyLevel: typeof rawStage9.urgencyLevel === "string" ? rawStage9.urgencyLevel : "",
  };

  // Stage 10 (always object, deliverablesList string[])
  const rawStage10 = (rawCase.stage10 && typeof rawCase.stage10 === "object") ? rawCase.stage10 : {};
  const stage10: Stage10Data = {
    packageName: typeof rawStage10.packageName === "string" ? rawStage10.packageName : "Professional Legal Package",
    priceRange: typeof rawStage10.priceRange === "string" ? rawStage10.priceRange : "Standard",
    description: typeof rawStage10.description === "string" ? rawStage10.description : "",
    deliverablesList: ensureStringArray(rawStage10.deliverablesList),
  };

  // Stage 11 (similarCases, governmentOrders, circulars, factsComparison, issuesCompared, legalPrinciples must be arrays)
  let stage11: Stage11PrecedentIntelligence | undefined = undefined;
  if (rawCase.stage11 && typeof rawCase.stage11 === "object") {
    const rawS11 = rawCase.stage11;
    const rawSimilarCases = Array.isArray(rawS11.similarCases) ? rawS11.similarCases : [];
    
    const similarCases = rawSimilarCases.map((sc: any, idx: number) => {
      if (!sc || typeof sc !== "object") return sc;

      // Normalize keyLegalHoldings: existing array or [courtReasoningSummary] if present
      let keyLegalHoldings: string[] = [];
      if (Array.isArray(sc.keyLegalHoldings) && sc.keyLegalHoldings.length > 0) {
        keyLegalHoldings = ensureStringArray(sc.keyLegalHoldings);
      } else if (typeof sc.courtReasoningSummary === "string" && sc.courtReasoningSummary.trim()) {
        keyLegalHoldings = [sc.courtReasoningSummary.trim()];
      }

      // Normalize disputeIssueCategory: existing value or issuesCompared.join(", ")
      let disputeIssueCategory = "";
      if (typeof sc.disputeIssueCategory === "string" && sc.disputeIssueCategory.trim()) {
        disputeIssueCategory = sc.disputeIssueCategory.trim();
      } else if (Array.isArray(sc.issuesCompared) && sc.issuesCompared.length > 0) {
        disputeIssueCategory = sc.issuesCompared.map((i: any) => String(i)).filter(Boolean).join(", ");
      }

      // Normalize factualSimilarity: existing value or summarize factsComparison
      let factualSimilarity = "";
      if (typeof sc.factualSimilarity === "string" && sc.factualSimilarity.trim()) {
        factualSimilarity = sc.factualSimilarity.trim();
      } else if (Array.isArray(sc.factsComparison) && sc.factsComparison.length > 0) {
        factualSimilarity = sc.factsComparison
          .map((f: any) => {
            if (!f || typeof f !== "object") return String(f || "");
            const feat = f.feature ? `${f.feature}: ` : "";
            const curr = f.currentCase || "";
            const ref = f.referenceCase || "";
            if (curr && ref) return `${feat}${curr} vs ${ref}`;
            return `${feat}${curr || ref}`;
          })
          .filter(Boolean)
          .join("; ");
      }

      const caseId = String(sc.caseId || sc.id || `case_${idx + 1}`);
      const title = String(sc.title || sc.caseName || "");
      const citation = String(sc.citation || sc.citationNumber || "");
      const court = String(sc.court || "");
      const judge = String(sc.judge || "");
      const year = sc.year || "";
      const state = String(sc.state || "");
      const bench = String(sc.bench || "");
      const caseType = String(sc.caseType || "");
      const similarityScore = typeof sc.similarityScore === "number" ? sc.similarityScore : 0;
      const strategicValue = String(sc.strategicValue || sc.whyItMatters || "");

      return {
        ...sc,
        caseId,
        id: sc.id || caseId,
        title,
        caseName: sc.caseName || title,
        citation,
        citationNumber: sc.citationNumber || citation,
        court,
        judge,
        year,
        state,
        bench,
        caseType,
        similarityScore,
        disputeIssueCategory,
        keyLegalHoldings,
        factualSimilarity,
        strategicValue,
        whyItMatters: sc.whyItMatters || strategicValue,
        factsComparison: Array.isArray(sc.factsComparison) ? sc.factsComparison : [],
        issuesCompared: Array.isArray(sc.issuesCompared) ? sc.issuesCompared : [],
        legalPrinciples: ensureStringArray(sc.legalPrinciples),
      };
    });

    const rawAuth = (rawS11.authoritiesSummary && typeof rawS11.authoritiesSummary === "object") 
      ? rawS11.authoritiesSummary 
      : {};

    const governmentOrders = Array.isArray(rawAuth.governmentOrders) ? rawAuth.governmentOrders : [];
    const circulars = Array.isArray(rawAuth.circulars) ? rawAuth.circulars : [];

    stage11 = {
      ...rawS11,
      similarCases,
      similarCasesCount: similarCases.length,
      averageSimilarityScore: typeof rawS11.averageSimilarityScore === "number" 
        ? rawS11.averageSimilarityScore 
        : (similarCases.length > 0 
            ? Math.round(similarCases.reduce((acc: number, c: any) => acc + (c.similarityScore || 0), 0) / similarCases.length) 
            : 0),
      relevantStatutes: ensureStringArray(rawS11.relevantStatutes),
      authoritiesSummary: {
        ...rawAuth,
        governmentOrders,
        circulars,
      },
    };
  }

  // Stage 12 (all array fields must be arrays, all nested objects have safe defaults)
  let stage12: Stage12StrategySimulator | undefined = undefined;
  if (rawCase.stage12 && typeof rawCase.stage12 === "object") {
    const rawS12 = rawCase.stage12;

    const evidenceGapsToFill = Array.isArray(rawS12.evidenceGapsToFill)
      ? rawS12.evidenceGapsToFill.map((eg: any) => {
          if (eg && typeof eg === "object") {
            return {
              missingElement: String(eg.missingElement || ""),
              howToObtain: String(eg.howToObtain || ""),
              urgency: String(eg.urgency || "Medium"),
            };
          }
          return { missingElement: String(eg || ""), howToObtain: "", urgency: "Medium" };
        })
      : [];

    const priorityNextActions = Array.isArray(rawS12.priorityNextActions)
      ? rawS12.priorityNextActions.map((pa: any, idx: number) => {
          if (pa && typeof pa === "object") {
            return {
              stepNumber: typeof pa.stepNumber === "number" ? pa.stepNumber : idx + 1,
              action: String(pa.action || ""),
              targetAuthority: String(pa.targetAuthority || ""),
              timeline: String(pa.timeline || ""),
            };
          }
          return { stepNumber: idx + 1, action: String(pa || ""), targetAuthority: "", timeline: "" };
        })
      : [];

    const likelyOppositeCounterarguments = Array.isArray(rawS12.likelyOppositeCounterarguments)
      ? rawS12.likelyOppositeCounterarguments.map((ca: any) => {
          if (ca && typeof ca === "object") {
            return {
              argument: String(ca.argument || ""),
              rebuttalStrategy: String(ca.rebuttalStrategy || ""),
            };
          }
          return { argument: String(ca || ""), rebuttalStrategy: "" };
        })
      : Array.isArray(rawS12.anticipatedCounterarguments)
      ? rawS12.anticipatedCounterarguments.map((arg: any) => ({
          argument: typeof arg === "string" ? arg : String(arg?.argument || ""),
          rebuttalStrategy: typeof arg === "object" ? String(arg?.rebuttalStrategy || "") : ""
        }))
      : [];

    const recommendedAdditionalProof = Array.isArray(rawS12.recommendedAdditionalProof)
      ? rawS12.recommendedAdditionalProof.map((ap: any) => {
          if (ap && typeof ap === "object") {
            return {
              type: String(ap.type || "Document"),
              title: String(ap.title || ""),
              purpose: String(ap.purpose || ""),
            };
          }
          return { type: "Document", title: String(ap || ""), purpose: "" };
        })
      : [];

    stage12 = {
      ...rawS12,
      riskMitigationSteps: ensureStringArray(rawS12.riskMitigationSteps),
      evidenceGapsToFill,
      priorityNextActions,
      likelyOppositeCounterarguments,
      recommendedAdditionalProof,
      anticipatedCounterarguments: ensureStringArray(rawS12.anticipatedCounterarguments),
      timelineMilestones: Array.isArray(rawS12.timelineMilestones) ? rawS12.timelineMilestones : [],
      mostPersuasivePrecedents: ensureStringArray(rawS12.mostPersuasivePrecedents),
      strongestLegalRoute: (rawS12.strongestLegalRoute && typeof rawS12.strongestLegalRoute === "object") 
        ? rawS12.strongestLegalRoute 
        : {
            routeName: "",
            justification: "",
            routeType: "",
            timeToResolutionEst: "",
          },
    };
  }

  // documentsRequired (all array fields always arrays)
  const rawDocsReq = (rawCase.documentsRequired && typeof rawCase.documentsRequired === "object") ? rawCase.documentsRequired : {};
  const documentsRequired: DocumentsRequired = {
    mandatory: ensureStringArray(rawDocsReq.mandatory),
    revenue: ensureStringArray(rawDocsReq.revenue),
    family: ensureStringArray(rawDocsReq.family),
    court: ensureStringArray(rawDocsReq.court),
    other: ensureStringArray(rawDocsReq.other),
    available: ensureStringArray(rawDocsReq.available),
    missing: ensureStringArray(rawDocsReq.missing),
    optional: ensureStringArray(rawDocsReq.optional),
  };

  // immediateAction (all array fields always arrays)
  const rawAction = (rawCase.immediateAction && typeof rawCase.immediateAction === "object") ? rawCase.immediateAction : {};
  const immediateAction: ImmediateAction = {
    within24Hours: ensureStringArray(rawAction.within24Hours),
    within7Days: ensureStringArray(rawAction.within7Days),
    within30Days: ensureStringArray(rawAction.within30Days),
    authorityToApproach: typeof rawAction.authorityToApproach === "string" ? rawAction.authorityToApproach : "",
    nextSteps: ensureStringArray(rawAction.nextSteps),
    timeframe: typeof rawAction.timeframe === "string" ? rawAction.timeframe : "",
  };

  // servicePackage (deliverables arrays always arrays)
  const rawServicePkg = (rawCase.servicePackage && typeof rawCase.servicePackage === "object") ? rawCase.servicePackage : {};
  const servicePackage: ServicePackage = {
    recommendedPackage: typeof rawServicePkg.recommendedPackage === "string" ? rawServicePkg.recommendedPackage : "",
    deliverables: ensureStringArray(rawServicePkg.deliverables),
    professionalFee: typeof rawServicePkg.professionalFee === "string" ? rawServicePkg.professionalFee : "",
    expectedOutcome: typeof rawServicePkg.expectedOutcome === "string" ? rawServicePkg.expectedOutcome : "",
    feeRange: typeof rawServicePkg.feeRange === "string" ? rawServicePkg.feeRange : "",
    recommendedTrack: typeof rawServicePkg.recommendedTrack === "string" ? rawServicePkg.recommendedTrack : "",
  };

  // customDocumentDraft (fully preserve both documentTitle/title and documentContent/content)
  const rawDraft = (rawCase.customDocumentDraft && typeof rawCase.customDocumentDraft === "object") ? rawCase.customDocumentDraft : {};
  const resolvedDraftTitle = typeof rawDraft.documentTitle === "string" && rawDraft.documentTitle.trim()
    ? rawDraft.documentTitle
    : (typeof rawDraft.title === "string" && rawDraft.title.trim() ? rawDraft.title : "சட்ட அறிவிப்பு / மனு");
  const resolvedDraftContent = typeof rawDraft.documentContent === "string"
    ? rawDraft.documentContent
    : (typeof rawDraft.content === "string" ? rawDraft.content : "");

  const customDocumentDraft: CustomDocumentDraft = {
    title: resolvedDraftTitle,
    documentTitle: resolvedDraftTitle,
    category: typeof rawDraft.category === "string" ? rawDraft.category : "",
    content: resolvedDraftContent,
    documentContent: resolvedDraftContent,
    sha256Hash: typeof rawDraft.sha256Hash === "string" ? rawDraft.sha256Hash : "",
    timestamp: typeof rawDraft.timestamp === "string" ? rawDraft.timestamp : undefined,
    verificationUrl: typeof rawDraft.verificationUrl === "string" ? rawDraft.verificationUrl : undefined,
    sections: Array.isArray(rawDraft.sections) ? rawDraft.sections : [],
  };

  // clientFacingReply (fully preserve problemIdentified, legalPosition, etc.)
  const rawReply = (rawCase.clientFacingReply && typeof rawCase.clientFacingReply === "object") ? rawCase.clientFacingReply : {};
  const clientFacingReply: ClientFacingReply = {
    problemIdentified: typeof rawReply.problemIdentified === "string" ? rawReply.problemIdentified : "",
    legalPosition: typeof rawReply.legalPosition === "string" ? rawReply.legalPosition : "",
    immediateNextStep: typeof rawReply.immediateNextStep === "string" ? rawReply.immediateNextStep : "",
    expectedAuthority: typeof rawReply.expectedAuthority === "string" ? rawReply.expectedAuthority : "",
    estimatedTimeline: typeof rawReply.estimatedTimeline === "string" ? rawReply.estimatedTimeline : "",
    summary: typeof rawReply.summary === "string" ? rawReply.summary : "",
    actionableAdvice: typeof rawReply.actionableAdvice === "string" ? rawReply.actionableAdvice : "",
    keyFindings: ensureStringArray(rawReply.keyFindings),
  };

  // canonical timestamps & revision
  const updatedAt = typeof rawCase.updatedAt === "string" 
    ? rawCase.updatedAt 
    : (typeof rawCase.updated_at === "string" ? rawCase.updated_at : createdAt);
  const revisionNumber = typeof rawCase.revisionNumber === "number"
    ? rawCase.revisionNumber
    : (typeof rawCase.revision_number === "number" ? rawCase.revision_number : 1);

  // history (always array, preserve existing entries)
  const history: CaseHistoryEntry[] = Array.isArray(rawCase.history)
    ? rawCase.history.filter((h: any) => h && typeof h === "object")
    : [];

  // updates (always array)
  const updates: CaseUpdateEvent[] = Array.isArray(rawCase.updates)
    ? rawCase.updates.filter((u: any) => u && typeof u === "object")
    : [];

  // versions (always array)
  const versions: CaseAnalysisVersion[] = Array.isArray(rawCase.versions)
    ? rawCase.versions.filter((v: any) => v && typeof v === "object")
    : [];

  // translatedVariants (default to {}, recursively normalize if present)
  const translatedVariants: any = {};
  if (rawCase.translatedVariants && typeof rawCase.translatedVariants === "object") {
    for (const lang of ["ta", "en", "dual"] as const) {
      if (rawCase.translatedVariants[lang] && typeof rawCase.translatedVariants[lang] === "object") {
        translatedVariants[lang] = normalizePropertyCase(rawCase.translatedVariants[lang]);
      }
    }
  }

  return {
    id,
    createdAt,
    updatedAt,
    revisionNumber,
    rawDescription,
    workspace: rawCase.workspace,
    subWorkspace: rawCase.subWorkspace,
    module: rawCase.module,
    engine: rawCase.engine,
    intake,
    stage0,
    stage1,
    stage2,
    stage3,
    stage4,
    stage5,
    stage6,
    stage7,
    stage8,
    stage9,
    stage10,
    stage11,
    stage12,
    clientFacingReply,
    documentsRequired,
    immediateAction,
    servicePackage,
    customDocumentDraft,
    languageMode,
    selectedModel: typeof rawCase.selectedModel === "string" ? rawCase.selectedModel : (typeof rawIntake.selectedModel === "string" ? rawIntake.selectedModel : undefined),
    translatedVariants,
    history,
    updates,
    versions,
  };
}

/**
 * Safely merges two versions of a PropertyCase (e.g. active local/memory state vs freshly fetched cloud state).
 * 
 * Rules:
 * 1. Timestamp & Revision Comparison: The version with the newer updatedAt/createdAt is the primary base.
 * 2. Non-Destructive Field Retention: Never overwrite populated rich fields (customDocumentDraft,
 *    clientFacingReply, documentsRequired, immediateAction, stage11, stage12) with empty/blank values.
 * 3. History & Version De-duplication: Combine history, updates, and versions cleanly.
 */
export function mergePropertyCases(caseA: PropertyCase, caseB: PropertyCase): PropertyCase {
  const normA = normalizePropertyCase(caseA);
  const normB = normalizePropertyCase(caseB);

  const timeA = new Date(normA.updatedAt || normA.createdAt || 0).getTime();
  const timeB = new Date(normB.updatedAt || normB.createdAt || 0).getTime();

  // Primary is the newer version, fallback is the older version
  const primary = timeB > timeA ? normB : normA;
  const secondary = timeB > timeA ? normA : normB;

  // 1. Merge customDocumentDraft safely
  const pDraft = primary.customDocumentDraft || {};
  const sDraft = secondary.customDocumentDraft || {};
  const pDraftText = (pDraft.documentContent || pDraft.content || "").trim();
  const sDraftText = (sDraft.documentContent || sDraft.content || "").trim();

  // If primary has text, keep primary. If primary is blank but secondary has text, preserve secondary!
  const draftSource = pDraftText ? pDraft : (sDraftText ? sDraft : pDraft);
  const draftTitle = draftSource.documentTitle || draftSource.title || sDraft.documentTitle || sDraft.title || "சட்ட அறிவிப்பு / மனு";
  const draftContent = pDraftText || sDraftText || "";

  const customDocumentDraft: CustomDocumentDraft = {
    ...sDraft,
    ...pDraft,
    title: draftTitle,
    documentTitle: draftTitle,
    content: draftContent,
    documentContent: draftContent,
    category: pDraft.category || sDraft.category || "",
    sha256Hash: pDraft.sha256Hash || sDraft.sha256Hash || "",
    sections: (pDraft.sections && pDraft.sections.length > 0) ? pDraft.sections : (sDraft.sections || []),
    timestamp: pDraft.timestamp || sDraft.timestamp,
    verificationUrl: pDraft.verificationUrl || sDraft.verificationUrl,
  };

  // 2. Merge clientFacingReply safely
  const pReply = primary.clientFacingReply || {};
  const sReply = secondary.clientFacingReply || {};
  const clientFacingReply: ClientFacingReply = {
    problemIdentified: pReply.problemIdentified || sReply.problemIdentified || "",
    legalPosition: pReply.legalPosition || sReply.legalPosition || "",
    immediateNextStep: pReply.immediateNextStep || sReply.immediateNextStep || "",
    expectedAuthority: pReply.expectedAuthority || sReply.expectedAuthority || "",
    estimatedTimeline: pReply.estimatedTimeline || sReply.estimatedTimeline || "",
    summary: pReply.summary || sReply.summary || "",
    actionableAdvice: pReply.actionableAdvice || sReply.actionableAdvice || "",
    keyFindings: (pReply.keyFindings && pReply.keyFindings.length > 0) ? pReply.keyFindings : (sReply.keyFindings || []),
  };

  // 3. Merge documentsRequired safely
  const pDocs = primary.documentsRequired || {};
  const sDocs = secondary.documentsRequired || {};
  const documentsRequired: DocumentsRequired = {
    mandatory: (pDocs.mandatory && pDocs.mandatory.length > 0) ? pDocs.mandatory : (sDocs.mandatory || []),
    revenue: (pDocs.revenue && pDocs.revenue.length > 0) ? pDocs.revenue : (sDocs.revenue || []),
    family: (pDocs.family && pDocs.family.length > 0) ? pDocs.family : (sDocs.family || []),
    court: (pDocs.court && pDocs.court.length > 0) ? pDocs.court : (sDocs.court || []),
    other: (pDocs.other && pDocs.other.length > 0) ? pDocs.other : (sDocs.other || []),
    available: (pDocs.available && pDocs.available.length > 0) ? pDocs.available : (sDocs.available || []),
    missing: (pDocs.missing && pDocs.missing.length > 0) ? pDocs.missing : (sDocs.missing || []),
    optional: (pDocs.optional && pDocs.optional.length > 0) ? pDocs.optional : (sDocs.optional || []),
  };

  // 4. Merge immediateAction safely
  const pAction = primary.immediateAction || {};
  const sAction = secondary.immediateAction || {};
  const immediateAction: ImmediateAction = {
    within24Hours: (pAction.within24Hours && pAction.within24Hours.length > 0) ? pAction.within24Hours : (sAction.within24Hours || []),
    within7Days: (pAction.within7Days && pAction.within7Days.length > 0) ? pAction.within7Days : (sAction.within7Days || []),
    within30Days: (pAction.within30Days && pAction.within30Days.length > 0) ? pAction.within30Days : (sAction.within30Days || []),
    authorityToApproach: pAction.authorityToApproach || sAction.authorityToApproach || "",
    nextSteps: (pAction.nextSteps && pAction.nextSteps.length > 0) ? pAction.nextSteps : (sAction.nextSteps || []),
    timeframe: pAction.timeframe || sAction.timeframe || "",
  };

  // 5. Merge servicePackage safely
  const pPkg = primary.servicePackage || {};
  const sPkg = secondary.servicePackage || {};
  const servicePackage: ServicePackage = {
    recommendedPackage: pPkg.recommendedPackage || sPkg.recommendedPackage || "",
    deliverables: (pPkg.deliverables && pPkg.deliverables.length > 0) ? pPkg.deliverables : (sPkg.deliverables || []),
    professionalFee: pPkg.professionalFee || sPkg.professionalFee || "",
    expectedOutcome: pPkg.expectedOutcome || sPkg.expectedOutcome || "",
    feeRange: pPkg.feeRange || sPkg.feeRange || "",
    recommendedTrack: pPkg.recommendedTrack || sPkg.recommendedTrack || "",
  };

  // 6. History deduplication (ordered chronologically)
  const historyMap = new Map<string, CaseHistoryEntry>();
  [...(secondary.history || []), ...(primary.history || [])].forEach((entry) => {
    if (entry && entry.id) {
      historyMap.set(entry.id, entry);
    } else if (entry && entry.timestamp) {
      historyMap.set(`${entry.timestamp}_${entry.description}`, entry);
    }
  });
  const history = Array.from(historyMap.values()).sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  );

  // 7. Updates & Versions deduplication
  const updatesMap = new Map<string, CaseUpdateEvent>();
  [...(secondary.updates || []), ...(primary.updates || [])].forEach((u) => {
    if (u && u.id) updatesMap.set(u.id, u);
  });
  const updates = Array.from(updatesMap.values()).sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  );

  const versionsMap = new Map<number, CaseAnalysisVersion>();
  [...(secondary.versions || []), ...(primary.versions || [])].forEach((v) => {
    if (v && typeof v.versionNumber === "number") versionsMap.set(v.versionNumber, v);
  });
  const versions = Array.from(versionsMap.values()).sort((a, b) => b.versionNumber - a.versionNumber);

  // 8. Translated variants
  const translatedVariants = {
    ...(secondary.translatedVariants || {}),
    ...(primary.translatedVariants || {})
  };

  const latestUpdatedAt = new Date(Math.max(timeA, timeB)).toISOString();
  const revisionNumber = Math.max(primary.revisionNumber || 1, secondary.revisionNumber || 1) + (timeB !== timeA ? 1 : 0);

  return {
    ...secondary,
    ...primary,
    updatedAt: latestUpdatedAt,
    revisionNumber,
    customDocumentDraft,
    clientFacingReply,
    documentsRequired,
    immediateAction,
    servicePackage,
    stage11: primary.stage11 || secondary.stage11,
    stage12: primary.stage12 || secondary.stage12,
    selectedModel: primary.selectedModel || secondary.selectedModel,
    history,
    updates,
    versions,
    translatedVariants,
  };
}

function createDefaultCase(id: string): PropertyCase {
  const now = new Date().toISOString();
  return {
    id,
    createdAt: now,
    rawDescription: "",
    intake: { clientName: "வாடிக்கையாளர்", mobile: "", district: "தமிழ்நாடு", oppositeParty: "", existingAdvocate: "", existingCaseNumber: "", limitationRisk: "Medium" },
    stage0: { clientName: "வாடிக்கையாளர்", mobile: "", district: "தமிழ்நாடு", oppositeParty: "", existingAdvocate: "", existingCaseNumber: "", limitationRisk: "Medium" },
    stage1: { category: "வருவாய் / Revenue", specificType: "" },
    stage2: { realIssue: "", rootCauseStatement: "" },
    stage3: "நிலம் / Property",
    stage4: { timelineEvents: [] },
    stage5: { rightsViolated: [], dutiesBreached: [], legalObligations: [], possibleLiabilities: [], availableProtections: [] },
    stage6: { available: [], missing: [], documentary: [], electronic: [], witnesses: [], officialRecords: [], evidenceStrength: "Moderate" },
    stage7: [],
    stage8: { category: "", primaryRemedy: "பரிகார மனு", alternativeOptions: [] },
    stage9: { factors: [], score: 45, rating: "Medium" },
    stage10: { packageName: "Standard", priceRange: "Standard", description: "", deliverablesList: [] },
    clientFacingReply: { summary: "", actionableAdvice: "", keyFindings: [] },
    documentsRequired: { available: [], missing: [], optional: [] },
    immediateAction: { authorityToApproach: "", nextSteps: [], timeframe: "" },
    servicePackage: { deliverables: [], feeRange: "", recommendedTrack: "" },
    customDocumentDraft: { title: "சட்ட பத்திரம்", category: "", content: "", sections: [] },
    languageMode: "ta",
    translatedVariants: {},
    history: [],
    updates: [],
    versions: [],
  };
}

export interface AIModelOption {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  description: string;
  descriptionTamil: string;
  recommended?: boolean;
  tier: "flagship" | "fast" | "efficient";
}

export const AVAILABLE_MODELS: AIModelOption[] = [
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    shortName: "3.7 Flash",
    badge: "Recommended • Master Legal",
    description: "Google's most capable high-speed reasoning model for complex statutory interpretation and multi-stage legal synthesis.",
    descriptionTamil: "கூகுளின் அதிவேக உயர்தர பகுப்பாய்வு மாடல் - சிக்கலான சட்ட விதிகள் மற்றும் 12-கட்ட தீர்வுக்காக பரிந்துரைக்கப்படுகிறது.",
    recommended: true,
    tier: "flagship"
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    shortName: "3.6 Flash",
    badge: "Balanced • Fast",
    description: "Highly stable, rapid response model optimized for property dispute classification and document drafting.",
    descriptionTamil: "சொத்து வகைப்பாடு மற்றும் சட்ட நோட்டீஸ் வரைவுகளுக்கு உகந்த சமநிலையான அதிவேக மாடல்.",
    tier: "fast"
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    shortName: "3.5 Flash",
    badge: "Ultra Fast • Lightweight",
    description: "Lightweight and ultra-low latency model for rapid case summaries and quick client advisory briefs.",
    descriptionTamil: "விரைவான வழக்கு சுருக்கம் மற்றும் வாடிக்கையாளர் வழிகாட்டுதலுக்கான இலகுரக மாடல்.",
    tier: "efficient"
  }
];

export const ALLOWED_MODEL_IDS = AVAILABLE_MODELS.map(m => m.id);
export const DEFAULT_MODEL_ID = "gemini-3.7-flash";

export function getValidatedModel(modelId?: string): string {
  if (modelId && ALLOWED_MODEL_IDS.includes(modelId)) {
    return modelId;
  }
  return DEFAULT_MODEL_ID;
}

export function getModelDetails(modelId?: string): AIModelOption {
  const validId = getValidatedModel(modelId);
  return AVAILABLE_MODELS.find(m => m.id === validId) || AVAILABLE_MODELS[0];
}

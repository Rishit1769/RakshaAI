import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

let genAI: GoogleGenerativeAI | null = null;
let resolvedChatModelName: string | null = null;

type ChatHistoryItem = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

const CLASSIFY_SYSTEM_PROMPT = `You are an emergency classification AI for RakshaAI, a women's safety platform.
Given a description of an emergency situation, classify it into exactly one of these categories:
harassment, assault, medical_emergency, kidnapping_risk, cyberstalking, suspicious_activity, general_danger, stalking, theft

Also provide:
- severity: critical | high | medium | low
- confidence: 0.0 to 1.0
- immediateActions: 2-3 brief actionable safety tips (array of strings)

Respond ONLY with valid JSON matching this schema:
{"category": string, "severity": string, "confidence": number, "immediateActions": string[]}`;

const RISK_SYSTEM_PROMPT = `You are a safety risk analysis AI for RakshaAI.
Given location context and recent incident data, provide a risk assessment.

Respond ONLY with valid JSON matching this schema:
{"riskLevel": "safe"|"low"|"moderate"|"high"|"critical", "riskScore": number (0-1), "riskFactors": string[], "safetyRecommendations": string[], "avoidAreas": string[]}`;

const SAFETY_ASSISTANT_HISTORY: ChatHistoryItem[] = [
  {
    role: 'user',
    parts: [{ text: 'You are a safety assistant for a women\'s safety and disaster relief platform. You help users with emergency guidance, safety tips, resource information, and emotional support. Always prioritize user safety. Keep responses concise, calm, and actionable. Never provide harmful information.' }],
  },
  {
    role: 'model',
    parts: [{ text: 'Understood. I\'m your safety assistant. I\'m here to help you with emergency guidance, safety information, and support. How can I assist you today?' }],
  },
];

export interface ClassifyResult {
  category: string;
  severity: string;
  confidence: number;
  immediateActions: string[];
}

export interface RiskAnalysisResult {
  riskLevel: string;
  riskScore: number;
  riskFactors: string[];
  safetyRecommendations: string[];
  avoidAreas: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const CHAT_MODEL_CANDIDATES = [
  'gemini-2.5-flash-lite',
] as const;

function getGenAI(): GoogleGenerativeAI {
  const apiKey = env.GEMINI_API_KEY.trim();
  if (!apiKey) {
    throw new AppError('GEMINI_API_KEY environment variable is not set.', 503);
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }

  return genAI;
}

function parseJsonResponse<T>(text: string): T {
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean) as T;
}

function getModel(model: string) {
  return getGenAI().getGenerativeModel({ model });
}

function mapHistory(messages: ChatMessage[]): ChatHistoryItem[] {
  return messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.content }],
  }));
}

export async function classifyEmergency(description: string): Promise<ClassifyResult> {
  const result = await generateWithFallback([
    { text: CLASSIFY_SYSTEM_PROMPT },
    { text: `Emergency description: ${description}` },
  ]);

  return parseJsonResponse<ClassifyResult>(result.response.text());
}

export async function analyzeRisk(
  latitude: number,
  longitude: number,
  context: { recentIncidents: number; safeZonesNearby: number; timeOfDay?: string }
): Promise<RiskAnalysisResult> {
  const prompt = `Location: ${latitude}, ${longitude}
Recent incidents in 2km radius (30 days): ${context.recentIncidents}
Safe zones nearby: ${context.safeZonesNearby}
Time of day: ${context.timeOfDay ?? 'unknown'}

Provide a safety risk analysis for this location.`;

  const result = await generateWithFallback([
    { text: RISK_SYSTEM_PROMPT },
    { text: prompt },
  ]);

  return parseJsonResponse<RiskAnalysisResult>(result.response.text());
}

async function generateWithFallback(parts: Array<{ text: string }>) {
  let lastError: unknown;

  for (const candidate of CHAT_MODEL_CANDIDATES) {
    try {
      const model = getModel(candidate);
      const result = await model.generateContent(parts);
      resolvedChatModelName = candidate;
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  console.error('[Gemini Error] All model candidates failed', lastError);
  throw new AppError('AI service temporarily unavailable.', 503);
}

async function startChatSession(history: ChatMessage[]) {
  const candidates = resolvedChatModelName
    ? [resolvedChatModelName, ...CHAT_MODEL_CANDIDATES.filter((item) => item !== resolvedChatModelName)]
    : [...CHAT_MODEL_CANDIDATES];

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const session = getModel(candidate).startChat({
        history: [...SAFETY_ASSISTANT_HISTORY, ...mapHistory(history)],
        generationConfig: { maxOutputTokens: 1000 },
      });
      resolvedChatModelName = candidate;
      return session;
    } catch (error) {
      lastError = error;
    }
  }

  console.error('[Gemini Error] Unable to create chat session', lastError);
  throw new AppError('AI service temporarily unavailable.', 503);
}

export async function chatWithAssistant(_userId: string, history: ChatMessage[], message: string): Promise<string> {
  if (!message.trim()) {
    throw new AppError('A message is required.', 400);
  }

  const session = await startChatSession(history);

  try {
    const result = await session.sendMessage(message.trim());
    return result.response.text();
  } catch (error: any) {
    console.error('[Gemini Error] Full error:', JSON.stringify(error, null, 2));
    console.error('[Gemini Error] Message:', error?.message);
    console.error('[Gemini Error] Status:', error?.status);
    throw new AppError('AI service temporarily unavailable.', 503);
  }
}

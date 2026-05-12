import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

// Lazy singleton — only initialize when API key is available
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return genAI;
}

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

function parseJsonResponse<T>(text: string): T {
  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean) as T;
}

export async function classifyEmergency(description: string): Promise<ClassifyResult> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent([
    { text: CLASSIFY_SYSTEM_PROMPT },
    { text: `Emergency description: ${description}` },
  ]);

  const text = result.response.text();
  return parseJsonResponse<ClassifyResult>(text);
}

export async function analyzeRisk(
  latitude: number,
  longitude: number,
  context: { recentIncidents: number; safeZonesNearby: number; timeOfDay?: string }
): Promise<RiskAnalysisResult> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Location: ${latitude}, ${longitude}
Recent incidents in 2km radius (30 days): ${context.recentIncidents}
Safe zones nearby: ${context.safeZonesNearby}
Time of day: ${context.timeOfDay ?? 'unknown'}

Provide a safety risk analysis for this location.`;

  const result = await model.generateContent([
    { text: RISK_SYSTEM_PROMPT },
    { text: prompt },
  ]);

  const text = result.response.text();
  return parseJsonResponse<RiskAnalysisResult>(text);
}

export async function chatWithAssistant(messages: ChatMessage[]): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const SAFETY_CONTEXT = `You are RakshaAI Assistant, a compassionate AI for women's safety.
You provide safety tips, emotional support, legal rights information, and emergency guidance.
Keep responses concise (max 150 words). If there is an immediate danger, always advise calling emergency services first.
Do not provide harmful, illegal, or unverified information.`;

  // Build chat history (exclude the last user message — that's the new prompt)
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role as 'user' | 'model',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: SAFETY_CONTEXT }] },
      { role: 'model', parts: [{ text: 'Understood. I am RakshaAI Assistant, ready to help with safety guidance.' }] },
      ...history,
    ],
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  return result.response.text();
}

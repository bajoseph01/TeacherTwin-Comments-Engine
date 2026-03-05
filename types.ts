export enum Phase {
  ANALYSIS = 'ANALYSIS',
  PRODUCTION = 'PRODUCTION',
}

export interface PersonaProfile {
  tone: string;
  vocabulary: string[];
  structure: string;
  formatting: string;
  isReady: boolean;
  rawSamples?: string; // Added to store Phase 1 context for gender mapping
}

export interface StudentData {
  id: string;
  name: string;
  subjectData?: Record<string, string>; // e.g., "Exam": "80", "Oral": "60"
  generatedComment?: string;
}

export interface AnalysisResponse {
  tone: string;
  vocabulary: string[];
  structure: string;
  formatting: string;
}

export interface FileInput {
  mimeType: string;
  data: string; // base64
}

// Map output from Gemini
export interface GeminiCommentResponse {
  comment: string;
}
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PersonaProfile, AnalysisResponse, FileInput, StudentData } from '../types';

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION_CORE = `
You are the "TeacherTwin," an advanced Style-Transfer AI.
Your purpose: Analyze teacher writing samples to build a "Persona Profile" and generate new comments indistinguishable from the teacher's voice.
Constraints:
- STRICT South African/British English (Practise, Colour, Centre).
- NO Raw marks in text unless requested. Use qualitative descriptors.
- NO Hallucinations: Do not mention missing data columns.
- Gender Check: Infer carefully.
`;

const FAILING_THRESHOLD = 50;
const BORDERLINE_THRESHOLD = 55;

const parseNumericMark = (value: string): number | null => {
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const detectRiskAreasFromMarks = (marks: Record<string, string>): string[] => {
  const risks: string[] = [];

  Object.entries(marks).forEach(([subject, value]) => {
    const numeric = parseNumericMark(value);
    if (numeric === null) return;

    if (numeric < FAILING_THRESHOLD) {
      risks.push(`${subject} (${numeric}%) - below pass mark`);
      return;
    }

    if (numeric <= BORDERLINE_THRESHOLD) {
      risks.push(`${subject} (${numeric}%) - close to pass threshold`);
    }
  });

  return risks;
};

const buildParentAlertSentence = (riskAreas: string[]): string => {
  if (riskAreas.length === 0) return '';
  const areaSummary = riskAreas.join('; ');
  return `Formal parent alert: Immediate support is required in ${areaSummary}. These risk areas should be addressed with parents as a priority.`;
};

const ensureParentAlertInComment = (comment: string, riskAreas: string[]): string => {
  const trimmed = (comment || '').trim();
  if (riskAreas.length === 0) return trimmed;

  const hasAlertLanguage = /parent alert|immediate support|priority|urgent|risk area|below pass|at risk/i.test(trimmed);
  if (hasAlertLanguage) return trimmed;

  const alert = buildParentAlertSentence(riskAreas);
  if (!trimmed) return alert;
  return `${trimmed} ${alert}`;
};

export const analyzeWritingStyle = async (textSamples: string, files: FileInput[] = []): Promise<AnalysisResponse> => {
  if (!apiKey) throw new Error("API Key missing");

  const promptText = `
    Analyze the provided teacher report card comments (in text and/or attached documents).
    Extract the following strictly:
    1. Tone & Voice (adjectives describing the persona).
    2. Vocabulary Bank (distinctive words used).
    3. Structural Formula (how the comment is built).
    4. Formatting Rules (brackets, capitalization quirks, UK/US spelling).
  `;

  const parts: any[] = [];
  
  // Add file parts
  files.forEach(file => {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    });
  });

  // Add text part (instruction + raw text samples)
  const fullTextPrompt = `
    ${promptText}

    ${textSamples ? `Additional Raw Text Samples:\n"${textSamples}"` : ''}
  `;
  
  parts.push({ text: fullTextPrompt });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      tone: { type: Type.STRING },
      vocabulary: { type: Type.ARRAY, items: { type: Type.STRING } },
      structure: { type: Type.STRING },
      formatting: { type: Type.STRING },
    },
    required: ["tone", "vocabulary", "structure", "formatting"],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CORE,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResponse;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

// DIRECT VISION GENERATION WITH MULTI-IMAGE & CONTEXT SUPPORT
export const generateBulkComments = async (
  persona: PersonaProfile,
  files: FileInput[]
): Promise<StudentData[]> => {
  if (!apiKey) throw new Error("API Key missing");

  const prompt = `
    Analyze these ${files.length} marksheet image(s). Identify each student row.
    
    TASK 1: MULTI-IMAGE TRAJECTORY ANALYSIS
    You have been provided with multiple images. 
    - One likely contains the Current Term's specific marks.
    - Another may contain Year-to-Date (YTD) averages or Previous Term data.
    - CROSS-REFERENCE these images. Look for the student's name across images.
    - Determine the Trajectory: Is it Rising? Falling? Consistent?
    - Mention this trend in the comment (e.g. "She has improved significantly since Term 1" or "His marks have dipped slightly").
    
    TASK 2: GENDER ACCURACY (CONTEXT LOOK-BACK)
    I have provided the "Raw Past Samples" used to train this persona below.
    - Step 1: Scan these samples to create a mental "Gender Map" (Name -> He/She) based on pronouns used previously.
    - Step 2: If a student from the new images appears in this map, you MUST use the same gender.
    - Step 3: For new names, infer culturally or avoid gendered pronouns if ambiguous.
    
    TASK 3: PERSONA APPLICATION
    Generate a comment for each student applying this style:
    Tone: ${persona.tone}
    Vocabulary: ${persona.vocabulary.join(', ')}
    Structure: ${persona.structure}
    Formatting: ${persona.formatting}

    TASK 4: THRESHOLD RISK DETECTION AND PARENT ALERTS
    - You MUST inspect each available mark carefully.
    - If any mark is below ${FAILING_THRESHOLD}%, flag it as failing.
    - If any mark is from ${FAILING_THRESHOLD}% to ${BORDERLINE_THRESHOLD}% inclusive, flag it as close to failing.
    - For any flagged learner, include an explicit formal warning in the generated comment.
    - The warning must be decisive but professional and must clearly point out the concern to parents.
    - Keep the warning aligned with the teacher persona style.
    
    RAW PAST SAMPLES FOR GENDER MAPPING:
    """
    ${persona.rawSamples || "No text samples provided. Rely on visual context or cultural inference."}
    """
    
    CRITICAL INSTRUCTION:
    Do not simply extract data. Use VISUAL REASONING.
    - Look at the colors (e.g. Red often means fail/concern, Green means good).
    - Look for anomalies (e.g. 0/10 in homework vs 90% in Exam).
    
    Output Format:
    Return a JSON Array where each object contains:
    - name: The student's name
    - comment: The generated comment.
    - riskAreas: Array of strings for all detected failing/near-failing areas.
    - parentAlertRequired: true if riskAreas has one or more items, else false.
  `;

  const parts: any[] = [];

  // Add all image files
  files.forEach(file => {
      parts.push({
          inlineData: {
              mimeType: file.mimeType,
              data: file.data
          }
      });
  });

  // Add the prompt text
  parts.push({ text: prompt });

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        comment: { type: Type.STRING },
        riskAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        parentAlertRequired: { type: Type.BOOLEAN },
      },
      required: ["name", "comment", "riskAreas", "parentAlertRequired"],
    },
  };

  try {
    // Use Gemini 3.1 Flash-Lite Preview to stay on the free-tier path.
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CORE,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const rawData = JSON.parse(text);
    
    return rawData.map((item: any, index: number) => {
      const riskAreas = Array.isArray(item.riskAreas)
        ? item.riskAreas.filter((x: unknown) => typeof x === 'string')
        : [];

      return {
        id: `generated-${Date.now()}-${index}`,
        name: item.name,
        generatedComment: ensureParentAlertInComment(item.comment || '', riskAreas),
        riskAreas,
        parentAlertRequired: riskAreas.length > 0 || Boolean(item.parentAlertRequired),
      };
    });

  } catch (error) {
    console.error("Bulk Generation failed:", error);
    throw error;
  }
};

export const generateStudentComment = async (
  persona: PersonaProfile,
  studentName: string,
  marks: Record<string, string>
): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");

  const riskAreas = detectRiskAreasFromMarks(marks);
  const marksString = Object.entries(marks)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const riskDirective = riskAreas.length > 0
    ? `
    RISK ALERT REQUIRED:
    The following performance areas are near/failing the ${FAILING_THRESHOLD}% threshold:
    ${riskAreas.map(x => `- ${x}`).join('\n')}
    Include an explicit, formal, decisive warning for parents while preserving the teacher persona tone.
    `
    : '';

  const prompt = `
    Generate a report card comment for student: ${studentName}.
    Data: [${marksString}]
    
    Apply the following Persona strictly:
    Tone: ${persona.tone}
    Vocabulary: ${persona.vocabulary.join(', ')}
    Structure: ${persona.structure}
    Formatting: ${persona.formatting}
    
    Remember: British English. No raw numbers in the output text unless specifically asked. Focus on the qualitative performance based on the numbers.
    ${riskDirective}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CORE,
      },
    });

    return ensureParentAlertInComment(response.text || "Error generating comment.", riskAreas);
  } catch (error) {
    console.error("Generation failed:", error);
    return "Generation failed. Please check API key or quota.";
  }
};

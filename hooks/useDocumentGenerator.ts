import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';

export enum WizardState {
  IDLE,
  PLANNING, // AI is creating the questionnaire
  GATHERING, // User is filling out the form
  GENERATING, // AI is creating the final document
  PREVIEW, // User is viewing/downloading the document
  ERROR,
}

export interface FormQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'signature' | 'initials' | 'checkbox';
  // for signatures/initials to show consent modal
  summary?: string;
  // for multi-party signatures
  partyName?: string;
}

export interface GenerationPlan {
  questions: FormQuestion[];
  document_template: string;
}

const PLANNING_SYSTEM_INSTRUCTION = `You are an expert legal AI assistant. Your primary task is to create a personalized questionnaire to generate a legal document based on the user's request.
1.  **Search**: Use the Google Search tool to find a high-quality, comprehensive, and relevant legal document template from a reputable source that matches the user's request.
2.  **Analyze**: Thoroughly analyze the structure, key clauses, and required information of the template you found.
3.  **Generate JSON**: Based on your analysis, generate a JSON object that defines the questions needed to gather all necessary information. Your response MUST be ONLY the raw JSON object and nothing else.

The JSON object must have two keys: "questions" and "document_template".
- "questions" must be an array of objects. Each object needs an "id" (unique, camelCase), a "label" (the question for the user), and a "type" ('text', 'textarea', 'date', 'checkbox', 'signature', 'initials').
- For "signature" or "initials" types, you MUST also include a "partyName" (e.g., "Landlord," "Tenant," "Client") and a "summary" key explaining precisely what the party is agreeing to when they sign.
- "document_template" must be a string containing the full, professional legal document structure with placeholders corresponding to the question ids, formatted like "{questionId}". This template should be derived from the best-in-class example you found via search.`;

const GENERATION_SYSTEM_INSTRUCTION = `You are a legal document generation assistant. You will be given a professional document template and a JSON object of answers. Your task is to meticulously fill in the template with the provided answers to create a complete, final legal document.
- Replace every placeholder like "{questionId}" with the corresponding value from the answers JSON.
- If an answer is empty or not provided, leave the placeholder or an appropriate blank space (e.g., "_________").
- The answers object may contain signature or initial data as base64 data URLs for images. You MUST insert these as Markdown images using the format: "![Signature of {partyName}]({dataUrl})". Do not just paste the data URL as text.
- Format the final document professionally using Markdown for headings, lists, and bold text, consistent with the provided template's structure.
- Retain all original boilerplate language, legal clauses, and formatting from the template.
- Your response must be ONLY the final, complete Markdown document text and nothing else. Do not add any commentary.`;

export const REVISION_SYSTEM_INSTRUCTION = `You are an expert legal document editor AI. You will be provided with a legal document and a set of revision instructions. Your task is to meticulously apply the revision instructions to the document.

**CRITICAL RULES**:
1.  **Preserve Legal Integrity**: Maintain the legal accuracy, tone, and overall integrity of the document. Do not introduce legally ambiguous or incorrect phrasing.
2.  **Strictly Follow Instructions**: Only make the changes explicitly requested in the "REVISION INSTRUCTIONS". Do not add, remove, or modify anything beyond what is necessary to fulfill the instructions.
3.  **Output Full Document**: Your response MUST be the complete, revised legal document in Markdown format. Do NOT output only the changes or commentary.
4.  **Formatting**: Ensure consistent Markdown formatting throughout the revised document.
5.  **Placeholders**: If instructions refer to placeholders (e.g., "{partyName}"), retain their placeholder format unless the instruction specifically tells you to replace them with actual values.
6.  **Unclear Instructions**: If an instruction is unclear or could compromise the document's legal validity, make a reasonable interpretation that favors legal soundness and note the interpretation.

Your output must be ONLY the final, complete Markdown document.`;

export const useDocumentGenerator = () => {
    const [wizardState, setWizardState] = useState<WizardState>(WizardState.IDLE);
    const [plan, setPlan] = useState<GenerationPlan | null>(null);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [finalDocument, setFinalDocument] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const aiRef = useRef<GoogleGenAI | null>(null);

    const getAiInstance = useCallback(() => {
        if (!aiRef.current) {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable not set.");
            }
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        }
        return aiRef.current;
    }, []);

    const startGenerationPlan = useCallback(async (prompt: string) => {
        setWizardState(WizardState.PLANNING);
        setError(null);
        try {
            const ai = getAiInstance();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: PLANNING_SYSTEM_INSTRUCTION,
                    tools: [{googleSearch: {}}]
                }
            });
            
            let jsonText = response.text.trim();
            // Handle potential markdown code block wrapping from the model
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.substring(7, jsonText.length - 3).trim();
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.substring(3, jsonText.length - 3).trim();
            }
            
            const parsedPlan = JSON.parse(jsonText) as GenerationPlan;

            if (!parsedPlan.questions || !parsedPlan.document_template) {
                throw new Error("AI returned an invalid plan. Missing 'questions' or 'document_template'.");
            }
            
            setPlan(parsedPlan);
            setAnswers({});
            setFinalDocument(null);
            setWizardState(WizardState.GATHERING);

        } catch (e) {
            console.error("Document planning error:", e);
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Failed to create document plan. The AI may have been unable to find a suitable template or returned an unexpected format. ${errorMessage}`);
            setWizardState(WizardState.ERROR);
        }
    }, [getAiInstance]);

    const generateFinalDocument = useCallback(async (finalAnswers: Record<string, any>) => {
        if (!plan) {
            setError("Cannot generate document without a plan.");
            setWizardState(WizardState.ERROR);
            return;
        }

        setWizardState(WizardState.GENERATING);
        setError(null);
        setAnswers(finalAnswers);

        try {
            const ai = getAiInstance();
            const generationPrompt = `Template: \n${plan.document_template}\n\nAnswers:\n${JSON.stringify(finalAnswers)}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: generationPrompt,
                config: {
                    systemInstruction: GENERATION_SYSTEM_INSTRUCTION,
                }
            });

            setFinalDocument(response.text);
            setWizardState(WizardState.PREVIEW);

        } catch (e) {
            console.error("Document generation error:", e);
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Failed to generate final document. ${errorMessage}`);
            setWizardState(WizardState.ERROR);
        }

    }, [plan, getAiInstance]);


    const reset = useCallback(() => {
        setWizardState(WizardState.IDLE);
        setPlan(null);
        setAnswers({});
        setFinalDocument(null);
        setError(null);
    }, []);

    return { 
        wizardState,
        plan,
        finalDocument,
        error,
        startGenerationPlan,
        generateFinalDocument,
        reset,
        getAiInstance // Expose the AI instance getter
    };
};
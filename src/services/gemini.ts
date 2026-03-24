import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ResearchResult {
  overview: string;
  simplifiedConcept: string;
  researchGap: string;
  currentStudy: string;
  flowchart: string; // Mermaid syntax
  slides: { title: string; content: string[] }[];
  citations: { 
    title: string; 
    url: string;
    journal: string;
    date: string;
    authors: string[];
  }[];
  furtherResearch: {
    ideas: string;
    workflow: string; // Mermaid syntax for the research workflow
  };
}

export async function analyzeResearch(input: string | { data: string; mimeType: string }) {
  const model = "gemini-3-flash-preview";
  
  const prompt = typeof input === 'string' 
    ? `Analyze the following research topic: "${input}". 
       1. Search for exactly 15 central research citations on NCBI, PubMed, and other reputable sources.
       2. Simplify the core concept for a general audience.
       3. Identify the "Research Gap" (what is currently unknown or missing in the field).
       4. Describe the "Current Study" focus (what recent research is specifically addressing).
       5. Create a flowchart in Mermaid syntax explaining the process or concept.
       6. Generate a set of 5 slides for a presentation overview.
       7. Provide a "Further Research Ideas" section explaining 3-5 potential future studies or projects, including a "Workflow" (Mermaid syntax) for one of these ideas.
       Return the result in JSON format.`
    : `Analyze the attached research article.
       1. Extract key findings and simplify the core concept.
       2. Identify the "Research Gap" addressed by this paper or remaining in the field.
       3. Summarize the "Current Study" methodology and focus.
       4. Find exactly 15 related central citations on NCBI/PubMed.
       5. Create a flowchart in Mermaid syntax explaining the methodology or concept.
       6. Generate a set of 5 slides for a presentation overview.
       7. Provide a "Further Research Ideas" section explaining 3-5 potential future studies or projects, including a "Workflow" (Mermaid syntax) for one of these ideas.
       Return the result in JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: typeof input === 'string' 
      ? [{ parts: [{ text: prompt }] }]
      : [{ parts: [{ inlineData: input }, { text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING },
          simplifiedConcept: { type: Type.STRING },
          researchGap: { type: Type.STRING, description: "What is missing or unknown in current research" },
          currentStudy: { type: Type.STRING, description: "Focus of the current research or study" },
          flowchart: { type: Type.STRING, description: "Mermaid.js flowchart syntax starting with 'graph TD' or similar" },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "content"]
            }
          },
          citations: {
            type: Type.ARRAY,
            description: "A list of exactly 15 relevant research citations.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                journal: { type: Type.STRING },
                date: { type: Type.STRING, description: "Publication date (e.g., 2023 or March 2024)" },
                authors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of main authors" }
              },
              required: ["title", "url", "journal", "date", "authors"]
            }
          },
          furtherResearch: {
            type: Type.OBJECT,
            properties: {
              ideas: { type: Type.STRING },
              workflow: { type: Type.STRING }
            },
            required: ["ideas", "workflow"]
          }
        },
        required: ["overview", "simplifiedConcept", "researchGap", "currentStudy", "flowchart", "slides", "citations", "furtherResearch"]
      },
      tools: [{ googleSearch: {} }]
    }
  });

  return JSON.parse(response.text) as ResearchResult;
}

export async function analyzeProject(name: string, description: string, files: { data: string; mimeType: string }[], links: string[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze the research project: "${name}".
       Description: ${description}
       Links: ${links.join(', ')}
       
       I have also attached ${files.length} research documents.
       
       1. Synthesize all provided information (files, links, and description) to provide a comprehensive overview.
       2. Simplify the core concept for a general audience.
       3. Identify the "Research Gap" across all provided materials.
       4. Describe the "Current Study" focus of this project.
       5. Create a flowchart in Mermaid syntax explaining the project's methodology or concept.
       6. Generate a set of 5 slides for a presentation overview.
       7. Provide a "Further Research Ideas" section explaining 3-5 potential future studies or projects, including a "Workflow" (Mermaid syntax) for one of these ideas.
       8. Search for exactly 15 additional central research citations on NCBI/PubMed related to this project.
       Return the result in JSON format.`;

  const contents = [
    { parts: [{ text: prompt }] },
    ...files.map(file => ({ parts: [{ inlineData: file }] }))
  ];

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          ...files.map(file => ({ inlineData: file }))
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING },
          simplifiedConcept: { type: Type.STRING },
          researchGap: { type: Type.STRING },
          currentStudy: { type: Type.STRING },
          flowchart: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "content"]
            }
          },
          citations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                journal: { type: Type.STRING },
                date: { type: Type.STRING },
                authors: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "url", "journal", "date", "authors"]
            }
          },
          furtherResearch: {
            type: Type.OBJECT,
            properties: {
              ideas: { type: Type.STRING },
              workflow: { type: Type.STRING }
            },
            required: ["ideas", "workflow"]
          }
        },
        required: ["overview", "simplifiedConcept", "researchGap", "currentStudy", "flowchart", "slides", "citations", "furtherResearch"]
      },
      tools: [{ googleSearch: {} }]
    }
  });

  return JSON.parse(response.text) as ResearchResult;
}

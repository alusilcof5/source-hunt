// ─── agent.js ────────────────────────────────────────────────────────
// Responsible for: system prompt, Gemini API call with Google Search
// tool, filtering rules, response parsing.
// Zero UI logic here.

const API_BASE  = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL     = "gemini-2.0-flash";

/**
 * System instructions sent to the model on every request.
 * Defines the agent's identity and hard filtering rules.
 */
const SYSTEM_PROMPT = `Eres un asistente de investigación académica para estudiantes de secundaria.
Tu misión: usar Google Search para encontrar fuentes fiables sobre el tema que te indiquen.

REGLAS DE FILTRADO OBLIGATORIAS:
- SÍ incluir: artículos científicos, revistas académicas, estudios universitarios,
  sitios .edu y .gov, instituciones oficiales, libros de autores reconocidos.
- NO incluir bajo ningún concepto: Wikipedia, blogs sin autor identificado,
  redes sociales, webs comerciales, foros, PDFs de origen desconocido.

FORMATO DE RESPUESTA:
Devuelve SOLO un objeto JSON válido, sin texto antes ni después, sin bloques de código.
Estructura exacta:
{
  "sources": [
    {
      "title": "Título claro y descriptivo",
      "url": "https://...",
      "summary": "Una frase explicando qué trata y por qué es útil para un trabajo escolar",
      "type": "artículo" | "libro" | "estudio" | "revista" | "institución"
    }
  ]
}

Genera entre 4 y 8 fuentes. Todas deben tener URL real.`;

/**
 * @typedef {{ title: string, url: string, summary: string, type: string }} Source
 */

/**
 * Calls Gemini with the Google Search tool enabled.
 * Emits progress events so the UI can show live agent activity.
 *
 * @param {string}   topic    - Research topic from the student
 * @param {string}   level    - School level (ESO, Bachillerato, etc.)
 * @param {string}   apiKey   - Gemini API key
 * @param {Function} onStep   - Callback(message: string) for live log updates
 * @returns {Promise<Source[]>}
 */
export const searchSources = async (topic, level, apiKey, onStep) => {
  onStep("Preparando consulta de búsqueda...");

  const userPrompt = buildPrompt(topic, level);

  onStep(`Llamando a Google Search con: "${topic}"`);

  const raw = await callGemini(userPrompt, apiKey, onStep);

  onStep("Filtrando fuentes no fiables...");

  const sources = parseResponse(raw);

  if (sources.length === 0) {
    throw new Error("No se encontraron fuentes fiables. Prueba con otro tema.");
  }

  onStep(`✅ ${sources.length} fuentes verificadas listas`);

  return sources;
};

// ─── Private helpers ──────────────────────────────────────────────────

const buildPrompt = (topic, level) =>
  `Busca fuentes académicas fiables para un trabajo escolar de nivel ${level} sobre: "${topic}".
   Prioriza fuentes en español si las hay, pero también incluye fuentes en inglés si son relevantes.`;

/**
 * Calls the Gemini API with Google Search grounding tool.
 * Returns the raw text content from the model.
 */
const callGemini = async (userPrompt, apiKey, onStep) => {
  const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    tools: [
      { google_search: {} },
    ],
    contents: [
      { role: "user", parts: [{ text: userPrompt }] },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `Error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();

  // Gemini may return multiple candidates; take the first
  const candidate = data.candidates?.[0];

  if (!candidate) {
    throw new Error("El modelo no devolvió ninguna respuesta.");
  }

  // Signal if the model actually used the search tool
  const usedSearch = candidate.content?.parts?.some(p => p.functionCall) ?? false;
  if (usedSearch) onStep("Google Search ejecutado — procesando resultados...");

  // Extract text from all parts
  const text = candidate.content?.parts
    ?.filter(p => p.text)
    .map(p => p.text)
    .join("") ?? "";

  if (!text) {
    throw new Error("La respuesta del agente llegó vacía. Inténtalo de nuevo.");
  }

  return text;
};

/**
 * Parses raw model output into an array of Source objects.
 * Strips markdown fences if the model added them despite instructions.
 */
const parseResponse = raw => {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Find the JSON object in the response
  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) return [];

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return (parsed.sources ?? []).filter(isValidSource);
  } catch {
    return [];
  }
};

/**
 * Guards against malformed source objects from the model.
 * @param {unknown} s
 * @returns {s is Source}
 */
const isValidSource = s =>
  s &&
  typeof s.title   === "string" && s.title.trim()   !== "" &&
  typeof s.url     === "string" && s.url.startsWith("http") &&
  typeof s.summary === "string" && s.summary.trim() !== "";

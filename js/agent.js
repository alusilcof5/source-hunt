const API_BASE = "https://generativelanguage.googleapis.com/v1/models";
const MODEL = "gemini-2.0-flash-lite";

const SYSTEM_PROMPT = `Eres un asistente de investigación académica para estudiantes de primaria y secundaria.
Tu misión: encontrar fuentes académicas fiables sobre el tema que te indiquen.

REGLAS DE FILTRADO OBLIGATORIAS:
- SÍ incluir: artículos científicos, revistas académicas, estudios universitarios,
  sitios .edu y .gov, instituciones oficiales, libros de autores reconocidos.
- NO incluir bajo ningún concepto: Wikipedia, blogs sin autor identificado,
  redes sociales, webs comerciales, foros, PDFs de origen desconocido.
- Todas las URLs deben ser reales y verificables. Si no conoces la URL exacta de una fuente,
  no la incluyas. Es mejor devolver menos fuentes que inventar URLs.

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

Genera entre 4 y 8 fuentes. Todas deben tener URL real y verificable.`;

/**
 * @typedef {{ title: string, url: string, summary: string, type: string }} Source
 */

export const searchSources = async (topic, level, apiKey, onStep) => {
  onStep("Preparando consulta...");
  const userPrompt = buildPrompt(topic, level);
  onStep(`Consultando fuentes académicas sobre: "${topic}"`);
  const raw = await callGemini(userPrompt, apiKey, onStep);
  onStep("Filtrando fuentes no fiables...");
  const sources = parseResponse(raw);
  if (sources.length === 0) {
    throw new Error("No se encontraron fuentes fiables. Prueba con otro tema o sé más específico.");
  }
  onStep(`✅ ${sources.length} fuentes verificadas listas`);
  return sources;
};

const buildPrompt = (topic, level) =>
  `Busca fuentes académicas fiables para un trabajo escolar de nivel ${level} sobre: "${topic}".
   Prioriza fuentes en español si las hay, pero también incluye fuentes en inglés si son relevantes.
   Recuerda: solo URLs reales que existan de verdad.`;

const callGemini = async (userPrompt, apiKey, onStep) => {
  const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      role: "user",
      parts: [{ text: SYSTEM_PROMPT + "\n\n---\n\n" + userPrompt }]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Gemini API error:", response.status, JSON.stringify(data, null, 2));

    const apiMsg  = data?.error?.message ?? "";
    const apiCode = data?.error?.status  ?? "";

    if (response.status === 429) {
      if (apiCode === "RESOURCE_EXHAUSTED") {
        throw new Error(`Cuota agotada (${apiMsg}). Revisa tu proyecto en Google Cloud Console.`);
      }
      throw new Error(`Error 429 — ${apiMsg || "límite alcanzado."}`);
    }
    if (response.status === 400) throw new Error(`Petición inválida: ${apiMsg}`);
    if (response.status === 403) throw new Error(`API Key sin permisos: ${apiMsg}`);
    throw new Error(apiMsg || `Error ${response.status}`);
  }

  const candidate = data?.candidates?.[0];
  if (!candidate) throw new Error("El modelo no devolvió ninguna respuesta.");

  const text = candidate.content?.parts?.filter(p => p.text).map(p => p.text).join("") ?? "";
  if (!text) throw new Error("La respuesta llegó vacía. Inténtalo de nuevo.");

  onStep("Respuesta recibida — procesando...");
  return text;
};

const parseResponse = raw => {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return (parsed.sources ?? []).filter(isValidSource);
  } catch { return []; }
};

const isValidSource = s =>
  s &&
  typeof s.title   === "string" && s.title.trim()   !== "" &&
  typeof s.url     === "string" && s.url.startsWith("http") &&
  typeof s.summary === "string" && s.summary.trim() !== "";
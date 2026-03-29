// ─── ui.js ───────────────────────────────────────────────────────────
// Responsible for: all DOM manipulation and rendering.
// Zero business or agent logic here.

/**
 * @typedef {{ title: string, url: string, summary: string, type: string }} Source
 */

// ─── DOM refs ────────────────────────────────────────────────────────
export const dom = {
  apiKey:       () => document.getElementById("apiKey"),
  topicInput:   () => document.getElementById("topicInput"),
  searchBtn:    () => document.getElementById("searchBtn"),
  errorBox:     () => document.getElementById("errorBox"),
  loading:      () => document.getElementById("loading"),
  loadingTitle: () => document.getElementById("loadingTitle"),
  loadingSub:   () => document.getElementById("loadingSub"),
  toolLogBody:  () => document.getElementById("toolLogBody"),
  results:      () => document.getElementById("results"),
  sourcesList:  () => document.getElementById("sourcesList"),
  resultsSub:   () => document.getElementById("resultsSub"),
  copyBtn:      () => document.getElementById("copyBtn"),
  newSearchBtn: () => document.getElementById("newSearchBtn"),
  levelRow:     () => document.getElementById("levelRow"),
};

// ─── Error ───────────────────────────────────────────────────────────
export const showError = msg => {
  const box = dom.errorBox();
  box.textContent = "⚠️ " + msg;
  box.classList.add("visible");
};

export const hideError = () =>
  dom.errorBox().classList.remove("visible");

// ─── Loading ─────────────────────────────────────────────────────────
export const showLoading = () =>
  dom.loading().classList.add("visible");

export const hideLoading = () =>
  dom.loading().classList.remove("visible");

export const setLoadingTitle = title =>
  (dom.loadingTitle().textContent = title);

/**
 * Appends a new line to the live agent activity log.
 * @param {string} message
 */
export const logStep = message => {
  const body = dom.toolLogBody();
  const line = document.createElement("div");
  line.className = "log-line";
  line.textContent = message;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
};

export const clearLog = () =>
  (dom.toolLogBody().innerHTML = "");

// ─── Search button state ──────────────────────────────────────────────
export const setSearching = on => {
  const btn = dom.searchBtn();
  btn.disabled = on;
  btn.textContent = on ? "⏳ Buscando..." : "Buscar fuentes fiables";
};

// ─── Type badge helper ────────────────────────────────────────────────
const TYPE_SLUG = {
  "artículo":    "articulo",
  "libro":       "libro",
  "estudio":     "estudio",
  "revista":     "revista",
  "institución": "institucion",
};

const badgeClass = type =>
  `type-badge type-badge--${TYPE_SLUG[type] ?? "articulo"}`;

// ─── Source card builder ──────────────────────────────────────────────
const buildSourceCard = (source, index) => {
  const card = document.createElement("div");
  card.className = "source-card";
  card.style.animationDelay = `${index * 0.08}s`;

  const typeLabel = source.type ?? "artículo";

  card.innerHTML = `
    <div class="source-num">${String(index + 1).padStart(2, "0")}</div>
    <div class="source-body">
      <div class="source-top">
        <span class="source-title">${escapeHtml(source.title)}</span>
        <span class="${badgeClass(typeLabel)}">${escapeHtml(typeLabel)}</span>
      </div>
      <p class="source-summary">${escapeHtml(source.summary)}</p>
      <a class="source-url" href="${escapeHtml(source.url)}" target="_blank" rel="noopener">
        🔗 ${escapeHtml(source.url)}
      </a>
    </div>`;

  return card;
};

// ─── Render sources ───────────────────────────────────────────────────
export const renderSources = (sources, topic) => {
  const list = dom.sourcesList();
  list.innerHTML = "";
  sources.forEach((s, i) => list.appendChild(buildSourceCard(s, i)));

  dom.resultsSub().textContent =
    `${sources.length} fuentes fiables encontradas para "${topic}"`;

  dom.results().style.display = "block";
};

// ─── Copy to clipboard ────────────────────────────────────────────────
export const copySourcesAsText = sources => {
  const text = sources
    .map((s, i) =>
      `${i + 1}. ${s.title}\n   ${s.summary}\n   ${s.url}`
    )
    .join("\n\n");

  navigator.clipboard.writeText(text).then(() => {
    const btn = dom.copyBtn();
    btn.textContent = "✅ Copiado";
    setTimeout(() => (btn.textContent = "Copiar lista"), 2000);
  });
};

// ─── Reset ────────────────────────────────────────────────────────────
export const resetUI = () => {
  dom.topicInput().value = "";
  dom.results().style.display = "none";
  clearLog();
  dom.topicInput().focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ─── Utility ──────────────────────────────────────────────────────────
const escapeHtml = str =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ─── main.js ─────────────────────────────────────────────────────────
// Orchestrator: wires up agent, UI and state. No business logic here.

import { searchSources } from "./agent.js";
import {
  dom,
  showError, hideError,
  showLoading, hideLoading, setLoadingTitle, logStep, clearLog,
  setSearching,
  renderSources, copySourcesAsText, resetUI,
} from "./ui.js";

// ─── Config ───────────────────────────────────────────────────────────
const STORAGE_KEY = "sourcehunt_apikey";

const LOADING_TITLES = [
  "Buscando en internet... ",
  "El agente está usando Google Search ",
  "Evaluando fiabilidad de fuentes... ",
  "¡Casi listo! ",
];

// ─── State ────────────────────────────────────────────────────────────
const state = {
  level:   "ESO",
  sources: [],
};

// ─── Storage ──────────────────────────────────────────────────────────
const saveKey = key => localStorage.setItem(STORAGE_KEY, key);
const loadKey = ()  => localStorage.getItem(STORAGE_KEY) ?? "";

// ─── Level selector ───────────────────────────────────────────────────
dom.levelRow().addEventListener("click", e => {
  const btn = e.target.closest(".level-btn");
  if (!btn) return;
  document.querySelectorAll(".level-btn")
    .forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.level = btn.dataset.level;
});

// ─── Search ───────────────────────────────────────────────────────────
dom.searchBtn().addEventListener("click", handleSearch);
dom.topicInput().addEventListener("keydown", e => {
  if (e.key === "Enter") handleSearch();
});

async function handleSearch() {
  hideError();

  const apiKey = dom.apiKey().value.trim();
  const topic  = dom.topicInput().value.trim();

  if (!apiKey) return showError("Introduce tu API Key de Gemini primero.");
  if (!topic)  return showError("Escribe el tema de tu trabajo antes de continuar.");
  if (topic.length < 3) return showError("El tema es demasiado corto.");

  saveKey(apiKey);
  setSearching(true);
  clearLog();
  showLoading();
  dom.results().style.display = "none";

  // Rotate loading title while waiting
  let titleIdx = 0;
  setLoadingTitle(LOADING_TITLES[0]);
  const titleTimer = setInterval(
    () => setLoadingTitle(LOADING_TITLES[++titleIdx % LOADING_TITLES.length]),
    2200
  );

  try {
    state.sources = await searchSources(
      topic,
      state.level,
      apiKey,
      logStep,             // live step callback → tool log in UI
    );

    renderSources(state.sources, topic);
    dom.results().scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    showError(err.message);
  } finally {
    clearInterval(titleTimer);
    hideLoading();
    setSearching(false);
  }
}

// ─── Copy ─────────────────────────────────────────────────────────────
dom.copyBtn().addEventListener("click", () =>
  copySourcesAsText(state.sources)
);

// ─── New search ───────────────────────────────────────────────────────
dom.newSearchBtn().addEventListener("click", () => {
  state.sources = [];
  resetUI();
});

// ─── Init ─────────────────────────────────────────────────────────────
dom.apiKey().value = loadKey();

# 🔍 SourceHunt

Agente que busca fuentes académicas fiables en internet usando **Gemini + Google Search**.
Diseñado para estudiantes de ESO/Bachillerato que necesitan fuentes para sus trabajos.

## Concepto clave: Tool Use + Búsqueda web

Este agente ilustra el ciclo **pensar → actuar → observar**:
1. El modelo recibe el tema del trabajo
2. Decide usar la herramienta `google_search` para buscar
3. Evalúa los resultados y filtra fuentes no fiables
4. Devuelve una lista estructurada con resumen y enlace

## Estructura del proyecto

```
sourcehunt/
├── index.html            # Estructura HTML
├── css/
│   └── styles.css        # Estilos (tema explorador, amber sobre verde oscuro)
├── js/
│   ├── agent.js          # Gemini API + Google Search tool + parser + validación
│   ├── ui.js             # DOM: log en vivo, tarjetas de fuentes, copiar
│   └── main.js           # Orquestador: conecta agente + UI + estado
├── .env.example          # Plantilla de variables de entorno
├── .gitignore
└── README.md
```

## Cómo usarlo

1. Clona o descarga el proyecto
2. Copia `.env.example` a `.env.local` y añade tu API key
3. Sirve el proyecto con un servidor local:
   ```bash
   npx serve .
   ```
4. Abre el navegador, introduce tu API key de Gemini,
   escribe el tema de tu trabajo y pulsa **Buscar fuentes fiables**

## Consigue tu API Key de Gemini

Regístrate gratis en [aistudio.google.com](https://aistudio.google.com/app/apikey).
El plan gratuito es suficiente para este proyecto.

## Notas técnicas

- **Sin dependencias**: HTML + CSS + JS puro con ES Modules
- **Tool use real**: usa la herramienta `google_search` nativa de Gemini
- **SOLID**: cada fichero tiene una única responsabilidad
- **Log en vivo**: la UI muestra cada paso del agente en tiempo real
- **Filtrado estricto**: el system prompt excluye Wikipedia y blogs sin autor
- La API key se guarda en `localStorage`, nunca en el servidor
# source-hunt

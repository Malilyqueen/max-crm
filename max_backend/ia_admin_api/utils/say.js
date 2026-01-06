// utils/say.js
import { exec } from "child_process";

/**
 * Fait parler le texte via PowerShell (Windows uniquement).
 * Gère les apostrophes simples (') et accents pour éviter les crashs.
 * @param {string} text
 */
export function say(text = "") {
  if (!text || typeof text !== "string") return;

  // Nettoyage et échappement
  const safeText = text
    .replace(/[’‘]/g, "'")       // apostrophes typographiques → simples
    .replace(/'/g, "''")         // apostrophes simples → doublées pour PowerShell
    .replace(/["“”]/g, "")       // guillemets → supprimés
    .replace(/[éèêë]/g, "e")     // accents principaux
    .replace(/[àâä]/g, "a")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[\n\r]/g, " ")     // suppression retours à la ligne
    .trim()
    .slice(0, 500);              // sécurité : max 500 caractères

  const command = `powershell -ExecutionPolicy Bypass -Command `
    + `"Add-Type -AssemblyName System.Speech; `
    + `$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; `
    + `$s.Volume = 100; $s.Rate = 0; `
    + `$s.Speak('${safeText}')"`; 

  exec(command, (err) => {
    if (err) {
      console.error("❌ Erreur voix :", err.message);
    } else {
      console.log("🗣️ Synthèse vocale OK :", safeText);
    }
  });
}

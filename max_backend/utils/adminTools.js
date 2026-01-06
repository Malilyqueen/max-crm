import fs from 'fs';
import path from 'path';

export function scanAndSummarize(folderPath) {
  if (!fs.existsSync(folderPath)) return "📁 Dossier introuvable.";

  const content = fs.readdirSync(folderPath, { withFileTypes: true });

  if (!content.length) return "Le dossier est vide.";

  return content.map(f => `- ${f.isDirectory() ? "📁" : "📄"} ${f.name}`).join("\n");
}

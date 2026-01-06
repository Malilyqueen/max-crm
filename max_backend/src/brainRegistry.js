// src/brainRegistry.js
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAINS = ["ecommerce", "coach", "btp", "logistique", "b2b"];

export async function loadBrain(brainName) {
  const name = BRAINS.includes(brainName) ? brainName : "ecommerce";
  const base = path.join(__dirname, "..", "brains", name);

  const [ontologyRaw, mappingRaw] = await Promise.all([
    fs.readFile(path.join(base, "ontology.yaml"), "utf8"),
    fs.readFile(path.join(base, "mapping.json"), "utf8"),
  ]);

  let mapping = {};
  try { mapping = JSON.parse(mappingRaw); } catch (e) {}

  return {
    name,
    ontology: ontologyRaw,
    mapping,
    n8nDir: path.join(base, "n8n"),
  };
}

export async function getActiveBrain() {
  const envName = process.env.BRAIN_ACTIVE || "ecommerce";
  return loadBrain(envName);
}

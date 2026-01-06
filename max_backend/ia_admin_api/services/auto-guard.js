import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getMode } from "./mode.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config/auto.json"), "utf8"));
const counter = new Map(); // tenant -> { windowStart, count }

export function isAutoEnabled() {
  return !!cfg.enabled;
}

export function isAllowed(code) {
  return cfg.allowed.includes(code);
}

export function withinSchedule(now = new Date()) {
  const [sh, sm] = cfg.schedule.start.split(":").map(Number);
  const [eh, em] = cfg.schedule.end.split(":").map(Number);
  const s = new Date(now); s.setHours(sh, sm, 0, 0);
  const e = new Date(now); e.setHours(eh, em, 0, 0);
  return now >= s && now <= e;
}

export function rateLimit(tenant, now = Date.now()) {
  const hour = 3600_000;
  let state = counter.get(tenant);
  if (!state || now - state.windowStart > hour) {
    state = { windowStart: now, count: 0 };
    counter.set(tenant, state);
  }
  if (state.count >= cfg.rateLimitPerHour) return false;
  state.count++;
  return true;
}

export function shouldAutoRun({ role, code }) {
  if (getMode() !== "auto") return false;
  if (role !== "admin") return false;
  if (!isAutoEnabled()) return false;
  if (!isAllowed(code)) return false;
  return true;
}
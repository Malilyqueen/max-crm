export function deepMask(obj){
  const rx = /secret|token|key|password|apikey|email/i;
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepMask);
  const out = {};
  for (const [k,v] of Object.entries(obj)) {
    if (rx.test(k)) out[k] = "•••••";
    else if (typeof v === "object") out[k] = deepMask(v);
    else out[k] = v;
  }
  return out;
}
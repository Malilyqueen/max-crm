let MODE = "assist"; // "assist" | "auto"

export function getMode() {
  return MODE;
}

export function setMode(next) {
  MODE = next === "auto" ? "auto" : "assist";
}
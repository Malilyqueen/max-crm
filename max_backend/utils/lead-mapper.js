// utils/lead-mapper.js
export function mapLead(raw, client = "default") {
  const normalized = {};
  
  // Détection intelligente
  const emailKey = Object.keys(raw).find(k => k.toLowerCase().includes("mail") || k.toLowerCase() === "email");
  const firstNameKey = Object.keys(raw).find(k => k.toLowerCase().includes("prenom") || k.toLowerCase().includes("firstname"));
  const lastNameKey = Object.keys(raw).find(k => k.toLowerCase().includes("nom") || k.toLowerCase().includes("lastname"));
  const statusKey = Object.keys(raw).find(k => k.toLowerCase().includes("statut") || k.toLowerCase().includes("status"));

  // Remplissage des champs Espo
  normalized.firstName = raw[firstNameKey] || "";
  normalized.lastName = raw[lastNameKey] || raw.name || "—";
  normalized.status = raw[statusKey] || "New";

  // Emails → format Espo
  const email = raw[emailKey] ? raw[emailKey].toLowerCase().trim() : "";
  if (email) {
    normalized.emailAddressData = [{ emailAddress: email, primary: true }];
  }

  return normalized;
}

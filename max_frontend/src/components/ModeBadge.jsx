export default function ModeBadge({ mode="assist" }) {
  const color = mode === "ro" ? "#999" : mode === "auto" ? "#2aa84a" : "#f0ad4e";
  const label = mode === "ro" ? "Read-Only" : mode === "auto" ? "Auto" : "Assisté";
  return <span style={{padding:"4px 8px",borderRadius:8,background:color,color:"#fff",fontWeight:600}}>{label}</span>;
}
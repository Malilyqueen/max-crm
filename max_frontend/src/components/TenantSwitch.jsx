export default function TenantSwitch({ onChange }) {
  const tenants = [
    ["Damath (Logistique)", "damath_xxx_change_me"],
    ["Michele Care (E-commerce)", "mcare_xxx_change_me"],
    ["Coach Vero (Coaching)", "coach_xxx_change_me"],
    ["Admin (tout)", "admin_xxx_change_me"],
  ];
  const cur = localStorage.getItem("TENANT_KEY") || "";

  return (
    <div style={{ position: "fixed", right: 12, top: 12, display: "flex", gap: 8, background: "rgba(0,0,0,.05)", padding: 8, borderRadius: 8 }}>
      <select
        value={cur}
        onChange={(e) => {
          const val = e.target.value;
          localStorage.setItem("TENANT_KEY", val);
          onChange?.(val);
          location.reload();
        }}
      >
        <option value="">— choisir un tenant —</option>
        {tenants.map(([label, key]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}

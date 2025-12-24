import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export function useBrain(apiBase = "") {
  const [menu, setMenu] = useState([]);
  const [abilities, setAbilities] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await apiGet(`${apiBase}/api/brain/menu`);
        const a = await apiGet(`${apiBase}/api/brain/abilities`);
        setMenu(m.menu || []);
        setAbilities(a.abilities || {});
        setTenant(m.tenant || null);
      } catch (e) {
        setErr(e?.error || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase]);

  return { menu, abilities, tenant, loading, err };
}

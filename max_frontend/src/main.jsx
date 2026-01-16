import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// MVP1: Clean old TENANT_KEY (legacy)
// L'auth utilise maintenant auth-storage avec JWT
if (localStorage.getItem("TENANT_KEY")) {
	console.log('[MVP1] Nettoyage ancien TENANT_KEY');
	localStorage.removeItem("TENANT_KEY");
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

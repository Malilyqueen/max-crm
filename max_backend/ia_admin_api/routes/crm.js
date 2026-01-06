import express from "express";
const router = express.Router();

router.get("/contact", (req, res) => {
  res.json({
    ok:true,
    contact: {
      id:"c-001",
      fullname:"Jean Dupont",
      email:"jean.dupont@entreprise.com",
      phone:"+33 1 23 45 67 89",
      company:"Entreprise SAS",
      status:"Lead chaud",
      score:94,
      lastInteraction:"2025-11-05T11:02:00Z"
    },
    tasks: [
      { id:"t-01", title:"Envoyer un email de suivi personnalisé", badge:"Suggéré par M.A.X.", priority:"haute", type:"workflow" },
      { id:"t-02", title:"Planifier appel de qualification",        badge:"Suggéré par M.A.X.", priority:"moyenne", type:"manual" },
      { id:"t-03", title:"Mettre à jour le score d'engagement",     badge:"Automatique",       priority:"basse",  type:"auto" }
    ]
  });
});

export default router;
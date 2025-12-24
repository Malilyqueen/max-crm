import React from "react";

export default function TasksView() {
  const tasks = [
    { id: "t1", title: "Relancer Alice", due: "2025-09-26", done: false },
    { id: "t2", title: "Appel Karim", due: "2025-09-24", done: true },
  ];

  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Tâches</h2>
        <div className="flex items-center gap-2">
          <select className="glass rounded-xl px-3 py-2 text-sm outline-none focus:shadow-focus">
            <option value="">Toutes</option>
            <option value="today">Aujourd’hui</option>
            <option value="overdue">En retard</option>
            <option value="done">Terminées</option>
          </select>
          <button className="btn pill px-3 py-2 rounded-lg hover:bg-white/15">+ Nouvelle tâche</button>
        </div>
      </div>

      <ul className="grid gap-2">
        {tasks.map((t) => (
          <li key={t.id} className="glass rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked={t.done} className="h-5 w-5 rounded-md" />
              <div>
                <div className={`font-medium ${t.done ? "line-through text-white/60" : ""}`}>
                  {t.title}
                </div>
                <div className="text-xs text-white/60">Échéance: {t.due}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn pill px-2.5 py-1.5 rounded-md hover:bg-white/15 text-xs">
                Détails
              </button>
              <button className="btn pill px-2.5 py-1.5 rounded-md hover:bg-white/15 text-xs">
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

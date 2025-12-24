import React from "react";

export default function DealsView() {
  const deals = [
    { id: "d1", name: "Lumina - Suite Pro", amount: "24 000 €", stage: "Prospect" },
    { id: "d2", name: "GreenPulse - Annual", amount: "48 000 €", stage: "Negotiation" },
    { id: "d3", name: "NovaTech - Starter", amount: "12 000 €", stage: "Won" },
  ];

  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Deals</h2>
        <button className="btn pill px-3 py-2 rounded-lg hover:bg-white/15">+ Nouveau deal</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {["Prospect", "Negotiation", "Won"].map((stage) => (
          <div key={stage}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm uppercase tracking-wide text-white/60">{stage}</h3>
              <span className="tag text-xs rounded-md px-2 py-0.5">
                {deals.filter((d) => d.stage === stage).length}
              </span>
            </div>
            <div className="min-h-[200px] glass rounded-xl p-3 space-y-2">
              {deals
                .filter((d) => d.stage === stage)
                .map((d) => (
                  <div key={d.id} className="glass rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs text-white/60">{d.amount}</div>
                      </div>
                      <span className="tag text-xs rounded-md px-2 py-1">{d.stage}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren) {
  return (
    <div className="rounded-xl2 border border-macrea-line/70 bg-macrea-card/70 shadow-inset hover:shadow-glow transition-shadow p-4">
      {children}
    </div>
  );
}

export function CardTitle({ children }: PropsWithChildren) {
  return <div className="text-sm uppercase tracking-wider text-macrea-mute">{children}</div>;
}

export function CardValue({ children }: PropsWithChildren) {
  return <div className="text-3xl font-extrabold text-macrea-neon drop-shadow">{children}</div>;
}
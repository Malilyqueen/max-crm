import { PropsWithChildren } from "react";

interface CardSectionProps extends PropsWithChildren {
  className?: string;
}

export function CardSection({ className = '', children, ...props }: CardSectionProps) {
  return (
    <section
      className={`rounded-2xl border border-white/5 bg-[rgba(20,24,28,0.9)] ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
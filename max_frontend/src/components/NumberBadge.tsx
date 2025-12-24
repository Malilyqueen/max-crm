interface NumberBadgeProps {
  number: number;
  size?: 'sm' | 'md' | 'lg';
}

export function NumberBadge({ number, size = 'md' }: NumberBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0`}>
      {number}
    </div>
  );
}

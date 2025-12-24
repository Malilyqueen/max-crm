import { useState, useEffect } from 'react';

interface RangeSelectorProps {
  value: string;
  onChange: (range: string, from?: string, to?: string) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('reporting-range');
    if (saved) {
      try {
        const { range, from, to } = JSON.parse(saved);
        if (range === 'custom' && from && to) {
          setCustomFrom(from);
          setCustomTo(to);
          onChange(range, from, to);
        } else if (['7d', '30d', '90d'].includes(range)) {
          onChange(range);
        }
      } catch (e) {
        // Ignore invalid localStorage data
      }
    }
  }, []);

  const handleRangeChange = (range: string) => {
    if (range === 'custom') {
      // Custom range - use current custom dates if available
      const from = customFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = customTo || new Date().toISOString().split('T')[0];
      setCustomFrom(from);
      setCustomTo(to);
      onChange(range, from, to);
      localStorage.setItem('reporting-range', JSON.stringify({ range, from, to }));
    } else {
      // Preset range
      onChange(range);
      localStorage.setItem('reporting-range', JSON.stringify({ range }));
    }
  };

  const handleCustomDateChange = (from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
    onChange('custom', from, to);
    localStorage.setItem('reporting-range', JSON.stringify({ range: 'custom', from, to }));
  };

  return (
    <div className="flex gap-2">
      {["7d","30d","90d"].map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded ${value===v ? "bg-white/10" : "bg-transparent border"}`}
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
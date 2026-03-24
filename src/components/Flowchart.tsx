import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter',
});

interface FlowchartProps {
  chart: string;
}

export const Flowchart: React.FC<FlowchartProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    <div className="flex justify-center p-4 bg-white rounded-xl border border-zinc-200 overflow-auto max-h-[600px]">
      <div key={chart} className="mermaid" ref={ref}>
        {chart}
      </div>
    </div>
  );
};

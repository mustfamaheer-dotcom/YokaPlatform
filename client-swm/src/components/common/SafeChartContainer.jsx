import React, { useRef, useState, useEffect } from 'react';

/**
 * SafeChartContainer
 * Prevents Recharts "The width(0) and height(0) of chart should be greater than 0"
 * by ensuring children are only mounted once the container has a measured positive width.
 *
 * Uses ResizeObserver + polling fallback to handle cases where the container
 * starts hidden (e.g. inside an inactive Ant Design Tab pane on mobile).
 */
export default function SafeChartContainer({
  height = 280,
  minHeight,
  children,
  className,
  style
}) {
  const containerRef = useRef(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const tryMeasure = () => {
      const w = el.getBoundingClientRect().width || el.offsetWidth;
      if (w > 0) {
        setMeasuredWidth(Math.round(w));
        setIsReady(true);
        return true;
      }
      return false;
    };

    // Immediate check — works on desktop where tabs are already painted
    if (tryMeasure()) return;

    // ResizeObserver — fires when container becomes visible / resizes
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (tryMeasure()) {
          ro.disconnect();
          clearInterval(pollRef.current);
        }
      });
      ro.observe(el);

      // Polling fallback every 200 ms for up to 5 s (handles mobile tab activation)
      let attempts = 0;
      pollRef.current = setInterval(() => {
        attempts += 1;
        if (tryMeasure() || attempts > 25) {
          clearInterval(pollRef.current);
          ro.disconnect();
          // Last-resort: just show with assumed width so chart renders
          if (attempts > 25) {
            setMeasuredWidth(300);
            setIsReady(true);
          }
        }
      }, 200);

      return () => {
        ro.disconnect();
        clearInterval(pollRef.current);
      };
    }

    // Fallback: no ResizeObserver — show anyway
    setMeasuredWidth(300);
    setIsReady(true);
  }, []);

  const numHeight = typeof height === 'number' ? height : 280;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        minWidth: 0,
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: minHeight || (typeof height === 'number' ? `${height}px` : '200px'),
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style
      }}
    >
      {isReady && measuredWidth > 0 ? (
        typeof children === 'function' ? (
          children({ width: measuredWidth, height: numHeight })
        ) : (
          children
        )
      ) : (
        <div
          style={{
            width: '100%',
            height: typeof height === 'number' ? `${height}px` : height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(248, 250, 252, 0.5)',
            borderRadius: 8
          }}
        />
      )}
    </div>
  );
}

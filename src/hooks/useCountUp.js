import { useEffect, useRef, useState } from "react";

export function useCountUp(target, { duration = 1400, run = false, decimals = 0 } = {}) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!run || typeof target !== "number") return;

    setValue(0);
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = target * eased;
      setValue(decimals > 0 ? +current.toFixed(decimals) : Math.round(current));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [run, target, duration, decimals]);

  return value;
}

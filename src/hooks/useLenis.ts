import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * Attach a Lenis smooth-scroll instance to an arbitrary scrollable element
 * (or the window if no ref is passed). Pass the element via `wrapper`; the
 * element itself acts as both wrapper and content (Lenis figures it out).
 */
export function useLenis<T extends HTMLElement>(
  wrapperRef?: React.RefObject<T | null>
) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const target = wrapperRef?.current ?? undefined;
    const lenis = new Lenis({
      wrapper: target as HTMLElement | undefined,
      content: target as HTMLElement | undefined,
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [wrapperRef]);

  return lenisRef;
}

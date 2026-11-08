import React, { useEffect, useState, useRef } from 'react';

/**
 * Hook to track overall page scroll percentage (0 to 100)
 */
export function usePageScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (totalHeight > 0) {
            const current = (window.scrollY / totalHeight) * 100;
            setProgress(Math.min(Math.max(current, 0), 100));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}

/**
 * Hook to track parallax scroll offset for floating elements
 */
export function useScrollParallax(speed = 0.1): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setOffset(window.scrollY * speed);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return offset;
}

/**
 * Hook to trigger animations when element enters viewport
 */
export function useInView(options: IntersectionObserverInit = { threshold: 0.12 }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(el);
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [options.threshold]);

  return [ref, isInView] as const;
}

interface ScrollRevealProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

/**
 * Declarative component for scroll-triggered reveal animations
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delayMs = 0,
  className = '',
  direction = 'up',
}) => {
  const [ref, inView] = useInView();

  const getTransform = () => {
    if (inView) return 'translate3d(0, 0, 0) scale(1)';
    switch (direction) {
      case 'up':
        return 'translate3d(0, 32px, 0)';
      case 'down':
        return 'translate3d(0, -32px, 0)';
      case 'left':
        return 'translate3d(32px, 0, 0)';
      case 'right':
        return 'translate3d(-32px, 0, 0)';
      case 'none':
        return 'translate3d(0, 0, 0) scale(0.96)';
      default:
        return 'translate3d(0, 32px, 0)';
    }
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: getTransform(),
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
};

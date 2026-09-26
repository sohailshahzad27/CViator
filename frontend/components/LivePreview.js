// frontend/components/LivePreview.js
// ---------------------------------------------------------------
// Renders the chosen template at exact A4 dimensions (so the preview
// matches the PDF) and scales it down with a CSS transform whenever the
// column is narrower than 210mm.
//
// It also owns two things the document itself shouldn't know about:
//
//   1. Sample content. When the CV is still empty we preview realistic
//      demo data so the layout can be judged — clearly labelled, visually
//      dimmed, and never written to the resume being auto-saved.
//   2. Overflow warning. Both templates are strict single-page A4 with
//      overflow:hidden, which means surplus content is silently dropped
//      from the exported PDF. We measure the content height and say so.
// ---------------------------------------------------------------

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import TemplateClassic from './templates/TemplateClassic';
import TemplateModern from './templates/TemplateModern';
import { isEffectivelyEmpty } from '../utils/resume';
import { DEMO_RESUME } from '../utils/demoData';
import { Badge } from './ui';

const templates = {
  classic: TemplateClassic,
  modern: TemplateModern,
};

const A4_WIDTH_PX = 793.7; // 210mm at 96dpi
const A4_HEIGHT_PX = 1122.5; // 297mm at 96dpi

// SSR-safe layout effect: useLayoutEffect on the client, no-op on the server.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function LivePreview({ resume, template, showChrome = true }) {
  const Template = templates[template] || TemplateClassic;
  const wrapperRef = useRef(null);
  const pageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [overflowing, setOverflowing] = useState(false);

  // Empty CV → preview sample content instead of a blank sheet.
  const isDemo = isEffectivelyEmpty(resume);
  const data = isDemo ? DEMO_RESUME : resume;

  // Measure rendered content against the fixed page box. scrollHeight still
  // reports full content height on an overflow:hidden element.
  const measure = useCallback(() => {
    const page = pageRef.current?.querySelector('[data-cv-page]');
    // clientHeight is 0 while the panel is display:none (the mobile
    // Edit/Preview toggle) — measuring then would wrongly report "fits".
    if (!page || !page.clientHeight) return;
    setOverflowing(page.scrollHeight > page.clientHeight + 4);
  }, []);

  useIsoLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return undefined;
    const update = () => {
      const w = el.clientWidth;
      if (w) setScale(Math.min(1, w / A4_WIDTH_PX)); // never enlarge
      // Width changes also cover hidden → visible, so re-check the page fit.
      measure();
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const raf = requestAnimationFrame(measure);
    // Web fonts land after first paint and change the content height.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [data, template, measure]);

  return (
    <div className="flex min-w-0 flex-col">
      {showChrome && (
        <div className="mb-2.5 flex min-h-[1.5rem] flex-wrap items-center gap-2">
          {isDemo && (
            <>
              <Badge tone="ochre">Sample CV</Badge>
              <span className="text-xs text-ink-muted">
                Filling in the form replaces this with your own.
              </span>
            </>
          )}
          {!isDemo && overflowing && (
            <>
              <Badge tone="danger">Over one page</Badge>
              <span className="text-xs text-ink-muted">
                Content past the page edge won&apos;t appear in the PDF — trim a section.
              </span>
            </>
          )}
          {!isDemo && !overflowing && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              Fits on one page
            </span>
          )}
        </div>
      )}

      <div ref={wrapperRef} className="w-full">
        {/* Reserves the scaled height so surrounding layout doesn't jump. */}
        <div
          style={{ width: '100%', height: A4_HEIGHT_PX * scale, position: 'relative' }}
        >
          <div
            ref={pageRef}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: 'top center',
              width: `${A4_WIDTH_PX}px`,
              height: `${A4_HEIGHT_PX}px`,
              background: '#ffffff',
              borderRadius: '2px',
              overflow: 'hidden',
              opacity: isDemo ? 0.62 : 1,
              transition: 'opacity 200ms ease',
            }}
            className="shadow-page ring-1 ring-line"
          >
            <Template resume={data} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(LivePreview);

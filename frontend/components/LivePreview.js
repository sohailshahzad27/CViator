// frontend/components/LivePreview.js
// ---------------------------------------------------------------
// Thin wrapper that picks a template by name and renders it on a
// clean A4-looking "paper" sheet. No extra chrome — the toolbar
// and headings live in the parent page.
//
// Memoized so it only re-renders when its `resume`/`template` props
// change. The parent uses `useDeferredValue` to throttle preview
// updates while the user types.
// ---------------------------------------------------------------

import { memo } from 'react';
import TemplateClassic from './templates/TemplateClassic';
import TemplateModern from './templates/TemplateModern';

const templates = {
  classic: TemplateClassic,
  modern: TemplateModern,
};

function LivePreview({ resume, template }) {
  const Template = templates[template] || TemplateClassic;

  return (
    <div className="mx-auto w-full max-w-[820px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <Template resume={resume} />
    </div>
  );
}

export default memo(LivePreview);

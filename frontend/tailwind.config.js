// frontend/tailwind.config.js
// Design system tokens for Cviator.
//
// The visual language is "institutional records + printed document": warm
// paper neutrals, ink-black text, hairline rules instead of drop shadows,
// and a single deep-pine accent. Colour values live here (not scattered
// across components) so the whole product shifts from one place.
//
// Tailwind's default palette is kept alongside these tokens so nothing
// breaks mid-migration, but new UI should use the semantic names below.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
    './utils/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        paper:   '#F7F5F0',   // app background (warm, not cold grey)
        surface: '#FFFFFF',
        inset:   '#FBFAF7',   // subtle recessed fill

        // Text
        ink: {
          DEFAULT: '#191815', // primary
          soft:    '#46443D', // secondary
          muted:   '#6F6C62', // meta / tertiary (AA on paper)
        },

        // Hairlines
        line: {
          DEFAULT: '#E3DFD5',
          strong:  '#CBC6B8',
        },

        // Accent — deep pine. Institutional, not generic SaaS indigo.
        accent: {
          DEFAULT: '#1E4B3A',
          hover:   '#163A2C',
          soft:    '#E8F0EA',
          ink:     '#143327',
        },

        // Attention (pending approvals, sample-data notices)
        ochre: {
          DEFAULT: '#8A5A18',
          soft:    '#FBF1DC',
          line:    '#EBD9B4',
        },

        // Destructive / errors
        danger: {
          DEFAULT: '#8C2F26',
          soft:    '#FAEBE8',
          line:    '#EBC8C2',
        },
      },

      fontFamily: {
        // Editorial serif — wordmark and page titles only.
        display: ['"Instrument Serif"', 'Georgia', 'Times New Roman', 'serif'],
        sans:    ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },

      fontSize: {
        // Tighter small sizes for dense record/meta text.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },

      borderRadius: {
        // Restrained scale — no pill-shaped everything.
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
      },

      boxShadow: {
        // Panels use hairlines, not shadows. Shadows are for things that
        // genuinely float above the page.
        pop:   '0 8px 24px -6px rgba(25, 24, 21, 0.18), 0 2px 6px -2px rgba(25, 24, 21, 0.10)',
        sheet: '0 24px 60px -12px rgba(25, 24, 21, 0.28)',
        page:  '0 1px 2px rgba(25, 24, 21, 0.06), 0 8px 24px -16px rgba(25, 24, 21, 0.25)',
      },

      transitionTimingFunction: {
        snap: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },

      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 180ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 140ms ease-out',
      },
    },
  },
  plugins: [],
};

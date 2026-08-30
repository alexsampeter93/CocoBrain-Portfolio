/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5E6D3',
        coco: {
          dark: '#2B211C',
          mid: '#6B4530',
          light: '#C99B6E',
        },
        brain: {
          pink: '#F2939E',
          glow: '#E98FA0',
        },

        /**
         * La atmósfera del tramo editorial, leída de las variables que escribe
         * `Backdrops` según el acto.
         *
         * Van como colores de Tailwind y no como clases sueltas para poder
         * escribir `text-ink-soft` o `border-rule` igual que cualquier otro
         * color. El valor cambia con el scroll; el nombre no.
         */
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
        },
        accent: 'var(--accent)',
        surface: 'var(--surface)',
        rule: 'var(--rule)',
      },

      /**
       * Tres voces, cada una con un trabajo. La escala vive en `index.css`.
       *
       * `display` es Outfit, autoalojada. `body` es la pila del sistema
       * MIENTRAS la tipografía de cuerpo siga sin decidirse: es esta línea, y
       * solo esta, la que hay que cambiar el día que se elija. `meta` es la
       * monoespaciada de cada plataforma.
       */
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        body: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
        meta: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Cascadia Mono', 'monospace'],
        // Se conservan por compatibilidad con lo ya escrito. `sans` apunta a la
        // voz de cuerpo y `mono` a la de metadatos: así el código antiguo sigue
        // diciendo lo mismo que el nuevo.
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Cascadia Mono', 'monospace'],
      },

      fontSize: {
        display: ['var(--step-display)', { lineHeight: '0.94', letterSpacing: '-0.035em' }],
        title: ['var(--step-title)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
        lead: ['var(--step-lead)', { lineHeight: '1.35', letterSpacing: '-0.012em' }],
        body: ['var(--step-body)', { lineHeight: '1.68' }],
        meta: ['var(--step-meta)', { lineHeight: '1.1', letterSpacing: '0.16em' }],
      },

      spacing: {
        area: 'var(--gap-area)',
        block: 'var(--gap-block)',
        gutter: 'var(--gutter)',
      },

      maxWidth: {
        read: '34rem', // una columna de lectura: ~68 caracteres
        editorial: '78rem',
      },
    },
  },
  plugins: [],
}

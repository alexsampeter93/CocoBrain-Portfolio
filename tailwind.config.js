/**
 * ── UN TOKEN TIENE QUE ACEPTAR UNA OPACIDAD (fase 11D) ──────────────────────
 *
 * Los colores del editorial eran la cadena `'var(--ink)'` a secas, y con eso
 * Tailwind **no puede generar el modificador de opacidad**: `text-ink/85` no
 * produce ninguna regla. Ni un aviso, ni un error de build — la clase
 * sencillamente no existe en el CSS compilado y el elemento hereda el color
 * de su padre.
 *
 * Llevaba así desde siempre y no se veía porque en modo claro el color
 * heredado ERA el correcto: el titular de un puesto de Experiencia salía en
 * la tinta oscura igual, solo que sin su 85%. Se destapó al construir el modo
 * noche, donde lo heredado sigue siendo oscuro sobre un suelo oscuro y el
 * nombre de la empresa desaparece — medido, `rgb(43,33,28)` a opacidad 1 con
 * `--ink` valiendo #F8EDEF en toda la cadena de ancestros.
 *
 * Son DOCE usos repartidos por seis archivos, todos muertos en silencio.
 *
 * La forma de función es la que Tailwind documenta para esto: sin modificador
 * devuelve el `var()` de siempre —así que nada de lo que ya funcionaba cambia—
 * y con modificador envuelve el token en `color-mix`, que es lo único que
 * sabe mezclar un color que no se conoce hasta que el navegador lo resuelve.
 */
/*
  Y la comprobacion NO puede ser `opacityValue === undefined`, que fue el
  primer intento y salio peor que el fallo: SIN modificador Tailwind no pasa
  `undefined`, pasa la cadena `var(--tw-text-opacity)`. Con esa comprobacion,
  `Number(...)` daba NaN y el `text-ink` de toda la vida se compilaba como
  `color-mix(in srgb, var(--ink) NaN%, transparent)`, o sea invalido. Se vio
  mirando el CSS generado, que es la unica forma de ver esto.
*/
const token = (name) => ({ opacityValue }) => {
  const alpha = Number(opacityValue)
  return Number.isFinite(alpha)
    ? `color-mix(in srgb, var(${name}) ${alpha * 100}%, transparent)`
    : `var(${name})`
}

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
          /*
            El tercer coco de la paleta de §7, que no tenia nombre en Tailwind
            y si se usaba: es el acento del acto 5. Lo estrena el oficio de la
            portada en 11E, donde el `light` no llegaba al contraste minimo.
          */
          warm: '#8A5A3C',
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
          DEFAULT: token('--ink'),
          soft: token('--ink-soft'),
          faint: token('--ink-faint'),
        },
        accent: token('--accent'),
        indigo: token('--indigo'),
        // Lo señalado: el área activa, el subrayado del HUD y el anillo de
        // foco. Rosa en la mente, añil en el editorial. Ver `index.css`.
        mark: token('--mark'),
        surface: token('--surface'),
        rule: token('--rule'),
        // El mismo oscuro que ya cierra y abre el telón de navegar (12B.1).
        // Fijo, sin variante por `[data-ground]`: un telón tiene que ser el
        // mismo oscuro se mire desde donde se mire, o deja de leerse como uno.
        curtain: token('--curtain'),
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
        chapter: ['var(--step-chapter)', { lineHeight: '0.82', letterSpacing: '-0.055em' }],
        folio: ['var(--step-folio)', { lineHeight: '1', letterSpacing: '-0.02em' }],
        project: ['var(--step-project)', { lineHeight: '0.88', letterSpacing: '-0.045em' }],
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
        /**
         * ── LAS MEDIDAS DE LECTURA VAN EN CARACTERES (fase 10B) ───────────
         *
         * `read` eran 34rem con el comentario "~68 caracteres". Era verdad
         * mientras el cuerpo midió 17,3 px y dejó de serlo en cuanto subió:
         * un ancho en `rem` es una promesa sobre PÍXELES, y lo que hace
         * legible una línea es cuántos CARACTERES tiene, no cuánto mide.
         *
         * En `ch` la medida se ata al cuerpo del propio elemento, así que
         * sobrevive a cualquier cambio de escala futuro sin recalibrarse.
         *
         * Y hay dos, porque un texto grande necesita la línea más corta: a
         * 25,6 px, 66 caracteres son 850 px y el ojo pierde el renglón al
         * volver. Medido antes de la fase, las medidas del editorial iban de
         * 44 a 171 caracteres por línea —cinco anchos distintos, ninguno
         * declarado— porque salían del `col-span` que tocara y no de una
         * decisión.
         */
        /**
         * Y OJO CON `ch`: es el ancho del glifo CERO, que en una tipografía
         * proporcional es bastante más ancho que la letra media. Medido en
         * esta pila de cuerpo, 66ch dan **78-84 caracteres reales**, no 66.
         * Los dos valores de abajo están calibrados contra la medición, no
         * contra la unidad: 56ch salen 66 caracteres y 44ch salen 53.
         */
        read: '56ch', // cuerpo de lectura   -> ~66 caracteres
        'read-lead': '44ch', // texto grande -> ~53 caracteres
        editorial: 'var(--editorial-max)',
      },
    },
  },
  plugins: [],
}

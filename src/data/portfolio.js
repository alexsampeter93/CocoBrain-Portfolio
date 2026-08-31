/**
 * EL CONTENIDO EDITORIAL. Todo lo que se lee despacio vive aquí.
 *
 * ════════════════════════════════════════════════════════════════════════
 *  ESTE ARCHIVO ES UN FORMULARIO. Rellenarlo es lo único que queda para
 *  que el portfolio tenga contenido; no hay que tocar ningún componente.
 *
 *  Cada campo vacío se dibuja solo como un hueco etiquetado en la página,
 *  así que se puede ir rellenando por partes y ver el resultado a cada
 *  paso. Lo que no esté aquí, no se publica.
 * ════════════════════════════════════════════════════════════════════════
 *
 * ## Qué es este archivo y qué no
 *
 * `knowledge.js` y `network.js` son la MENTE: conocimientos, relaciones, la
 * red que se explora dentro del cerebro. Este archivo es el PORTFOLIO: lo que
 * Alex ha hecho, dónde, cuándo y cómo. Son dos cosas distintas y por eso están
 * en dos archivos.
 *
 * El puente entre los dos existe y va en una sola dirección: desde aquí se
 * NOMBRAN conocimientos por su `id`. Un proyecto declara `stack: ['react']` y
 * un grupo de habilidades declara `knowledge: ['react', 'vite']`. Nunca al
 * revés: la red no sabe que existe un portfolio, y así puede seguir
 * dibujándose sola.
 *
 * La escena 3D **no lee nada de este archivo**. Ni un título, ni una fecha, ni
 * un párrafo. El 3D contesta *qué es esto, con qué se relaciona, dónde estoy*;
 * esto contesta *qué hizo, cómo, cuándo y con quién*.
 *
 * ## Está vacío a propósito
 *
 * Los campos existen, la interfaz sabe pintarlos y ninguno tiene contenido.
 * Rellenar esto es trabajo de Alex: inventarle una experiencia laboral o un
 * proyecto a alguien es la única cosa que un portfolio no puede permitirse.
 *
 * ## Sobre las tecnologías y las habilidades
 *
 * Que una tecnología esté en `knowledge.js` significa que SE USA EN ESTA WEB.
 * No significa que sea una habilidad que Alex pueda afirmar en una entrevista, y
 * las dos cosas no se pueden confundir: parte de este código no lo ha escrito
 * él, y alguna de las dieciocho puede ser algo que aquí aparezca dos veces y en
 * su carrera ninguna.
 *
 * Por eso las habilidades TÉCNICAS se declaran AQUÍ, una por una, y no se
 * derivan de la red. `skillGroups` es una afirmación personal; `knowledge.js`
 * es un inventario del proyecto. Y las habilidades NO técnicas —cómo trabaja,
 * no con qué— viven aparte, en `strengths`: son un eje distinto y no tienen
 * ninguna relación con el grafo.
 *
 * Donde falta contenido, la interfaz lo dice —no lo disimula—, para que al
 * mirar la página se vea exactamente qué queda por escribir.
 *
 * ════════════════════════════════════════════════════════════════════════
 *  FASE 5B — preparación técnica, sin contenido todavía
 *
 *  Esta ronda no añade texto: añade CAMPOS. Cada uno documentado con qué
 *  espera y por qué existe, para que rellenarlos más adelante sea escribir,
 *  no diseñar. Los componentes que los leen (`AboutArea`, `SkillsArea`,
 *  `ProjectsArea`) ya saben pintarlos y ya muestran un hueco marcado como
 *  pendiente mientras estén vacíos.
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * ── SOBRE MÍ ────────────────────────────────────────────────────────────
 *
 * La jerarquía es headline → resumen → cuerpo → secundarios, y la interfaz la
 * respeta: el titular ocupa el ancho de la pantalla, el resumen va en una
 * columna de lectura, y formación y principios son bloques laterales.
 *
 * - `headline`   dos o tres palabras. Es un TITULAR, no una frase
 * - `summary`    una o dos frases. Lo que se lee si no se lee nada más
 * - `body`       párrafos. La versión larga
 * - `manifesto`  las frases que resumen CocoBrain como idea. No son un CTA ni
 *                un eslogan de adorno: cierran el bloque de CocoBrain del
 *                cuerpo, y por eso van aparte de `body` —necesitan el
 *                tratamiento de destacado, no el de párrafo—. Se pintan con la
 *                misma clase que ya usa la coda de Contacto
 * - `focus`      una o dos frases. A qué tipo de trabajo se dedica, o querría
 *                dedicarse — el ENFOQUE, no la biografía. Distinto de
 *                `summary`: el resumen dice quién es, esto dice hacia dónde
 *                mira
 * - `interests`  lista corta de strings. Áreas que le interesan más allá de
 *                lo que ya usa en esta web —no repite el stack, lo amplía—
 * - `stack`      ids de `knowledge.js`. Las dos o tres tecnologías con las
 *                que Alex se identifica más, NO el inventario completo: para
 *                eso ya está la red y `SkillsArea`. Un subconjunto pequeño y
 *                elegido, no una copia
 * - `cta`        { label, href } — un único enlace de cierre: a proyectos, al
 *                CV o al correo. Se enseña solo si las dos partes existen
 * - `education`  { title, place, period, note }
 * - `principles` { title, body } — cómo trabaja. Tres o cuatro como mucho
 */
/**
 * FASE 5B — CONTENIDO: contenido real de Alex, en sus palabras.
 *
 * `stack` y `cta` se quedan vacíos: no se ha proporcionado ninguna tecnología
 * destacada ni un enlace de cierre, y deducirlos de lo que dice `summary` sería
 * inventar una declaración que nadie ha hecho.
 *
 * En `education` conviven los dos ciclos formativos y la formación adicional
 * —cursos y programas—. No se separan en dos listas porque eso pediría un
 * encabezado nuevo, y esta ronda es de contenido: el centro va en `place` y la
 * duración en `note`, que ya distinguen una cosa de la otra al leerlas. Ni
 * centros ni fechas de los ciclos: no se han dado, así que quedan vacíos.
 */
export const about = {
  headline: 'De la logística al software.',
  summary:
    'Durante varios años desarrollé mi trayectoria profesional en el mundo de la logística y el almacén. Con el tiempo decidí cambiar de rumbo y convertir mi interés por la tecnología en una nueva etapa profesional. Estudié Desarrollo de Aplicaciones Multiplataforma (DAM) y, durante mis prácticas en OVEUN, tuve mi primera experiencia profesional directamente relacionada con el desarrollo de software. Actualmente estoy construyendo mi camino como desarrollador junior, aprendiendo continuamente y explorando diferentes formas de crear aplicaciones y experiencias digitales.',
  body: [
    'Cuando desarrollo una aplicación, no me centro únicamente en conseguir que haga aquello para lo que fue creada. También me importa cómo se presenta, cómo se utiliza y qué sensación transmite.',
    'Me gusta buscar ese equilibrio entre funcionalidad y cuidado por los detalles: que una aplicación sea útil, clara y fácil de utilizar, pero que también tenga personalidad y resulte agradable de ver.',
    'No quiero limitarme a un único tipo de desarrollo. Mis proyectos son una muestra de esa curiosidad: desde aplicaciones de escritorio y herramientas orientadas a usuarios, hasta aplicaciones web y videojuegos.',
    'Cada proyecto me permite aprender algo diferente, probar nuevas herramientas y descubrir nuevas formas de convertir una idea en algo que realmente funcione.',
    'CocoBrain nació como una idea personal y poco a poco se convirtió en una forma de crear, experimentar y dar identidad a todo lo que construyo.',
    'Un nombre, una mascota, unos colores y una manera de entender los proyectos. Un espacio donde la tecnología, la creatividad y la curiosidad pueden encontrarse para transformar una idea en algo tangible.',
    'Para mí, CocoBrain representa una forma de avanzar: aprender, probar, equivocarse, volver a empezar y buscar siempre una manera de llevar cada proyecto un poco más lejos.',
  ],
  manifesto: [
    'Nuestra mayor inspiración fue una vez nuestra mayor debilidad.',
    'Construido sobre aquello que nos hace diferentes.',
  ],
  focus: 'Desarrollo de software, desarrollo de aplicaciones, experiencias digitales y aprendizaje continuo.',
  interests: [
    'Desarrollo de aplicaciones',
    'Desarrollo web',
    'Inteligencia artificial',
    'Automatización',
    'Experiencias digitales',
    'Nuevas tecnologías',
    'Creación de proyectos propios',
  ],
  stack: [],
  cta: { label: '', href: '' },
  education: [
    {
      title: 'Desarrollo de Aplicaciones Multiplataforma (DAM)',
      place: '',
      period: '',
      note: 'Ciclo Formativo de Grado Superior · Desarrollo de software',
    },
    {
      title: 'Actividades Físicas y Deportivas (TAFAD)',
      place: '',
      period: '',
      note: 'Ciclo Formativo de Grado Superior',
    },
    {
      title: 'Generación Digital / Agentes del Cambio',
      place: 'Maude Studio',
      period: '',
      note: '375 horas',
    },
    {
      title: 'Desarrollo con IA',
      place: 'BIGschool — Brais Moure',
      period: '',
      note: '6 horas',
    },
    {
      title: 'Ciberseguridad',
      place: 'BIGschool — Brais Moure',
      period: '',
      note: '6 horas',
    },
  ],
  principles: [
    {
      title: 'Aprender haciendo',
      body: 'Construir, probar y equivocarse forma parte del proceso.',
    },
    {
      title: 'Funcionalidad con intención',
      body: 'Una aplicación debe funcionar, pero también debe estar pensada para quien la utiliza.',
    },
    {
      title: 'Cuidar los detalles',
      body: 'Pequeñas decisiones pueden cambiar por completo cómo se percibe un proyecto.',
    },
    {
      title: 'Seguir explorando',
      body: 'Cada proyecto es una oportunidad para aprender algo nuevo.',
    },
  ],
}

/**
 * ── EXPERIENCIA ─────────────────────────────────────────────────────────
 *
 * No es una línea de tiempo con puntitos. La presentación es una CADENA: cada
 * puesto es un nodo grande con su periodo a un lado y un filete vertical que lo
 * une con el siguiente, igual que las conexiones de la red. La trayectoria se
 * lee como lo que es —una cosa lleva a la siguiente— sin recurrir al cliché.
 *
 * - `company`, `role`, `period` — el encabezado
 * - `summary`          una frase: qué era ese trabajo
 * - `responsibilities` lista corta
 * - `achievements`     lista corta. Lo que cambió por haber estado ahí
 * - `stack`            ids de `knowledge.js`. Si un id no existe en la red, se
 *                      muestra igualmente como texto: la experiencia no puede
 *                      depender de que la red esté completa
 *
 * Cubre exactamente lo que se pide de una experiencia laboral —puesto,
 * empresa, fechas, descripción, responsabilidades, tecnologías, logros—. No se
 * ha añadido ningún campo en esta ronda: no hacía falta ninguno.
 *
 * ## FASE 5B.2 — qué falta a propósito
 *
 * `period` lleva la DURACIÓN, no un rango de fechas: es el dato que existe. Y
 * el de OVEUN va vacío porque tampoco se ha dado la duración.
 *
 * `responsibilities`, `achievements` y `stack` quedan vacíos en los cuatro. Los
 * tres puestos de logística no traen tareas ni logros declarados —y ninguno era
 * un trabajo técnico, así que atribuirles tecnología sería falsear la
 * trayectoria—, y de OVEUN falta todo salvo qué fue: el puesto exacto, lo que
 * se hizo allí y con qué se completa cuando se revisen los datos reales.
 */
export const experience = [
  {
    company: 'Vegalsa',
    role: 'Operario de logística',
    period: '3 años',
    summary: 'Experiencia profesional desarrollada en el ámbito de la logística y el almacén.',
    responsibilities: [],
    achievements: [],
    stack: [],
  },
  {
    company: 'Leroy Merlin',
    role: 'Operario de logística',
    period: '1 año',
    summary: 'Experiencia profesional desarrollada en el ámbito de la logística y el almacén.',
    responsibilities: [],
    achievements: [],
    stack: [],
  },
  {
    company: 'Inditex',
    role: 'Almacén',
    // La condición —media jornada— es un dato del puesto y no había campo para
    // ella. Va aquí, al lado de la duración, en vez de añadir un campo nuevo
    // que solo usaría una de las cuatro entradas.
    period: '2 años · media jornada',
    summary: 'Experiencia profesional desarrollada en el ámbito del almacén y la logística.',
    responsibilities: [],
    achievements: [],
    stack: [],
  },
  {
    company: 'OVEUN',
    role: 'Prácticas profesionales del ciclo DAM',
    period: '',
    summary:
      'Primera experiencia profesional directamente relacionada con el desarrollo de software.',
    responsibilities: [],
    achievements: [],
    stack: [],
  },
]

/**
 * ── PROYECTOS ───────────────────────────────────────────────────────────
 *
 * El área más importante junto con la escena, y la única que no se maqueta en
 * columnas: cada proyecto ocupa el ancho entero y se lee en tiempos —qué era,
 * para qué, qué problema había, qué hice, qué salió—.
 *
 * - `id`, `title`, `tagline`, `year`
 * - `category`     un texto corto: "aplicación web", "herramienta",
 *                  "experimento"… Libre, no hay una lista cerrada
 * - `status`       "en producción", "en pausa", "archivado"… También libre
 * - `objective`    una frase: qué se proponía el proyecto. Distinto de
 *                  `problem`: el objetivo es la meta, el problema es lo que
 *                  la hacía necesaria
 * - `problem`, `solution`, `role`   los tres bloques del caso
 * - `outcome`      resultados y aprendizajes
 * - `features`     lista corta. Características destacadas, si el proyecto
 *                  las tiene y merece la pena nombrarlas aparte del relato
 * - `stack`        ids de `knowledge.js`
 * - `media`        UN ARRAY, no un objeto suelto. Admite tres formas de
 *                  elemento y se pueden mezclar:
 *
 *                      { kind: 'image', src: '/img/projects/x.webp', alt: '' }
 *                      { kind: 'video', src: '/video/x.mp4', poster: '' }
 *                      { kind: 'scene', id: 'x' }  ← objeto 3D propio, sin
 *                                                    implementar todavía: se
 *                                                    dibuja como hueco
 *
 *                  El primer elemento ocupa el hueco principal del proyecto;
 *                  el resto, si los hay, se enseña debajo en una fila
 *                  pequeña. Un proyecto sin `media` sigue mostrando el hueco
 *                  con su proporción, así que unos pueden tener imágenes y
 *                  otros no sin que la composición se rompa
 * - `links`        { demo, github, video } — solo las claves que existan.
 *                  Admite además cualquier otra clave: se enseña igual
 *
 * No inventa nada de esto: los tres primeros proyectos que se escriban deciden
 * qué campos usan. Uno puede no tener `features`, otro puede no tener vídeo.
 *
 * ## FASE 5B.3 — los tres proyectos reales
 *
 * Tres formas distintas de construir software, y ese es el argumento de la
 * sección: un gestor de escritorio con IA, una aplicación de gestión clásica y
 * un videojuego para navegador. No hace falta decirlo en ninguna ficha; se lee
 * de las tres juntas.
 *
 * **Qué falta a propósito, en los tres:**
 *
 * - `problem` — solo lo tiene Zalent. ActiHome y el juego no parten de un
 *   problema declarado, y escribirles uno sería inventar la motivación de un
 *   proyecto ajeno. El bloque simplemente no se dibuja
 * - `media` — array vacío. Los assets llegan en la fase visual, y hasta
 *   entonces cada proyecto enseña su hueco con la proporción correcta
 * - `links` — las tres claves declaradas y vacías. Se rellenan cuando existan
 *   las URLs; mientras no haya ninguna, no se dibuja ningún enlace
 *
 * En `stack` conviven ids de la red y texto suelto, que es lo que el esquema
 * admite: `react`, `vite` y `javascript` existen en `knowledge.js` y se
 * nombran por id para que el puente funcione; Tauri, Rust, Spring o Phaser no
 * están en la red —esta web no los usa— y van como texto.
 */
export const projects = [
  {
    id: 'zalent',
    title: 'Zalent',
    tagline: 'Gestión de talento local-first con IA.',
    year: '2026',
    category: 'Aplicación de escritorio / IA',
    status: 'En desarrollo',
    objective:
      'Convertir grandes cantidades de CVs en información estructurada para poder buscar, comparar y gestionar candidatos con ayuda de IA, manteniendo los datos en el equipo de quien la usa.',
    problem:
      'Gestionar grandes cantidades de CVs puede convertirse en un proceso lento y difícil de organizar. Buscar perfiles concretos, comparar candidatos o comprobar su encaje con una oferta obliga a revisar mucha información manualmente.',
    solution:
      'Zalent convierte los CVs en perfiles estructurados y permite buscar, comparar y gestionar talento desde una única aplicación, combinando extracción automática de información, búsqueda semántica, matching entre candidatos y ofertas y gestión de procesos de selección. El enfoque es local-first: los datos de los candidatos viven en el equipo del usuario, la búsqueda semántica puede funcionar localmente y la IA generativa local es opcional.',
    role: 'Desarrollo completo',
    outcome:
      'Proyecto desarrollado desde cero como exploración de una herramienta de gestión de talento local-first con IA.',
    features: [
      'Importación y parsing de CVs: convierte grandes cantidades de documentos en fichas estructuradas con nombre, contacto, skills, años de experiencia, estudios, idiomas y último puesto.',
      'Búsqueda semántica en lenguaje natural, con los resultados ordenados por relevancia y la evidencia que los respalda.',
      'Matching CV ↔ oferta: puntúa la base de candidatos según su encaje con una oferta, explica los motivos y señala las carencias.',
      'Pipeline de selección tipo Kanban por vacante, con notas e historial por candidato.',
      'Aprendizaje por feedback: las valoraciones sobre los matches ajustan el ranking a las preferencias del usuario.',
      'Privacidad y RGPD: los datos se mantienen en local, con borrado real, anonimización y avisos de retención.',
      'OCR integrado en el proceso de extracción de información de los documentos.',
    ],
    stack: [
      'Tauri v2',
      'Rust',
      'react',
      'TypeScript',
      'vite',
      'CSS',
      'SQLite',
      'Transformers.js',
      'ONNX',
      'Ollama',
      'Qwen2.5 7B',
      'pdf.js',
      'Mammoth',
    ],
    media: [],
    links: { demo: '', github: '', video: '' },
  },

  {
    id: 'actihome',
    title: 'ActiHome',
    tagline: 'Aplicación de escritorio para la gestión y reserva de alojamientos turísticos.',
    year: '2026',
    category: 'Aplicación de escritorio',
    status: 'Proyecto de fin de ciclo',
    objective:
      'Gestionar y reservar alojamientos turísticos desde una aplicación de escritorio, con roles distintos para quien administra y quien reserva.',
    problem: '',
    solution:
      'La aplicación reúne la gestión de alojamientos y el ciclo de reserva en un único sitio, con dos roles —ADMIN y CUSTOMER— que la usan de forma distinta. Está construida sobre Spring Boot pero no levanta ningún servidor web: arranca el contexto de Spring y abre directamente una ventana de Swing, con la persistencia en MySQL a través de Spring Data JPA. El proyecto se migró de Spring Boot 2.2.2 y Java 11 a Spring Boot 3.5.3 y Java 17.',
    role: 'Desarrollo completo',
    outcome:
      'Proyecto de fin de ciclo desarrollado desde cero, iniciado en febrero de 2026 y retomado en agosto de 2026.',
    features: [
      'Gestión de alojamientos.',
      'Reserva de alojamientos.',
      'Alquiler de alojamientos.',
      'Intercambio de alojamientos.',
      'Estaciones que cambian la interfaz visual de la aplicación.',
      'Dos roles de usuario: ADMIN y CUSTOMER.',
    ],
    stack: ['Java 17', 'Spring Boot 3.5.3', 'Spring Data JPA', 'MySQL', 'Java Swing'],
    media: [],
    links: { demo: '', github: '', video: '' },
  },

  {
    id: 'cata-trufa',
    title: 'Las aventuras de Cata y Trufa',
    tagline: 'Una aventura cozy protagonizada por dos perras carlinas.',
    year: '2026',
    category: 'Videojuego web 2D',
    status: 'En desarrollo',
    objective:
      'Un juego de aventura 2D con vista cenital para navegador, protagonizado por Trufa y Cata, dos perras carlinas.',
    problem: '',
    solution:
      'Se controla a una de las dos protagonistas y se puede cambiar de personaje en cualquier momento. Cada una tiene una habilidad especial, y hay retos pensados para combinar las capacidades de las dos. El movimiento es en ocho direcciones y sin gravedad, y el tono es cozy, relajado y familiar.',
    role: 'Desarrollo completo',
    outcome:
      'Juego desarrollado desde cero como proyecto personal para explorar el desarrollo de videojuegos web 2D.',
    features: [
      'Exploración.',
      'Pequeñas misiones.',
      'Puzles.',
      'Recogida de objetos.',
      'Interacción con el entorno.',
      'Cambio entre personajes en cualquier momento.',
      'Retos que combinan las habilidades de las dos protagonistas.',
    ],
    stack: [
      'Phaser 3',
      'javascript',
      'ES modules',
      'vite',
      'Phaser Arcade Physics',
      'Tiled',
      'localStorage',
    ],
    media: [],
    links: { demo: '', github: '', video: '' },
  },
]

/**
 * ── HABILIDADES ─────────────────────────────────────────────────────────
 *
 * Dos ejes, y ninguno sustituye al otro.
 *
 * ## `skillGroups` — tecnología, agrupada por profesión
 *
 * Para quien no quiera recorrer la red nodo a nodo. Es la MISMA información
 * que hay en `knowledge.js`, ordenada de otra manera, no información nueva.
 *
 * **`kind` en `knowledge.js` no se toca.** Ahí `kind` es la familia técnica que
 * decide el COLOR del nodo en la escena —`graphics`, `tooling`, `format`—, y
 * eso es una clasificación visual. Lo de aquí es una clasificación
 * PROFESIONAL: "Frontend", "Backend", "Bases de datos". Son dos ejes distintos
 * y el mismo conocimiento cae en los dos: React es `framework` para la escena y
 * "Frontend" para un reclutador. Mezclarlos obligaría a elegir uno y perder el
 * otro.
 *
 * - `id`, `label`
 * - `note`       una línea: qué significa saber esto. Opcional
 * - `knowledge`  ids de `knowledge.js`. De aquí sale la lista Y el enlace con
 *                la red: al enfocar un grupo se pueden encender sus nodos
 *
 * Mientras esté vacío, `SkillsArea` no inventa una clasificación: enseña la red
 * entera tal cual está, ordenada por peso, y dice claramente que la agrupación
 * profesional está pendiente.
 *
 * ## `strengths` — cómo trabaja, no con qué
 *
 * El otro eje: fortalezas que no son una tecnología —resolución de problemas,
 * aprendizaje, organización, trabajo en equipo…—. No tienen ninguna relación
 * con el grafo, así que no llevan `knowledge`: son una afirmación sobre la
 * FORMA de trabajar, no sobre las herramientas.
 *
 * **No se asume ninguna.** El array empieza vacío a propósito: qué fortalezas
 * declarar es una decisión personal, no algo que se pueda deducir del código de
 * esta web.
 *
 * - `id`, `label`   el nombre de la fortaleza
 * - `body`          una o dos frases: qué significa en la práctica, con un
 *                   ejemplo si aporta algo. Opcional
 */
export const skillGroups = []
export const strengths = []

/**
 * ── CV ──────────────────────────────────────────────────────────────────
 *
 * Ni un PDF incrustado ni una copia de todo lo anterior. Es el resumen
 * profesional en una pantalla, con la descarga a un lado.
 *
 * - `summary`   el párrafo de cabecera de un currículum
 * - `file`      ruta al PDF en `public/`. Vacío = no se ofrece la descarga
 * - `updated`   'marzo 2026'. Un CV sin fecha no se cree
 * - `highlights` tres o cuatro líneas: lo que se lee en diez segundos
 */
export const cv = {
  summary: '',
  file: '',
  updated: '',
  highlights: [],
}

/**
 * ── CONTACTO ────────────────────────────────────────────────────────────
 *
 * El cierre, y por eso no es un área con nodo: es a donde llegas cuando ya has
 * visto todo lo demás. Un formulario aquí sobraría —nadie rellena formularios
 * en un portfolio— así que es un correo y los enlaces que importen.
 *
 * - `email`
 * - `links`  { label, href } — GitHub, LinkedIn, o cualquier otro perfil
 *            profesional. No hay campos dedicados para cada red: es la misma
 *            estructura genérica para todas, así que añadir una más adelante
 *            —Behance, un blog, lo que sea— no pide tocar el componente.
 *            Ejemplo de forma, sin datos: { label: 'GitHub', href: '' }
 */
export const contact = {
  email: '',
  links: [],
}

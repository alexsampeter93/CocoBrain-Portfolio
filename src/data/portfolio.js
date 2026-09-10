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
  /**
   * TRES PÁRRAFOS, NO UN BLOQUE.
   *
   * Estaban unidos en una sola cadena porque el campo se pintaba en un único
   * `<p>`: once líneas seguidas antes del primer respiro. El texto es EL MISMO,
   * palabra por palabra; lo único que cambia es que vuelve a tener las pausas
   * que ya tenía cuando Alex lo escribió.
   */
  summary: [
    'Durante varios años desarrollé mi trayectoria profesional en el mundo de la logística y el almacén. Con el tiempo decidí cambiar de rumbo y convertir mi interés por la tecnología en una nueva etapa profesional.',
    'Estudié Desarrollo de Aplicaciones Multiplataforma (DAM) y, durante mis prácticas en OVEUN, tuve mi primera experiencia profesional directamente relacionada con el desarrollo de software.',
    'Actualmente estoy construyendo mi camino como desarrollador junior, aprendiendo continuamente y explorando diferentes formas de crear aplicaciones y experiencias digitales.',
  ],
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
      place: 'Ilerna',
      period: '2023 – 2025',
      note: 'Ciclo Formativo de Grado Superior · Desarrollo de software',
    },
    {
      title: 'Actividades Físicas y Deportivas (TAFAD)',
      place: 'Liceo La Paz',
      period: '2014 – 2016',
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
    track: 'logistica',
    /**
     * EL NOMBRE SALE DEL CV.
     *
     * Aquí ponía "Vegalsa" —así lo nombró Alex al dictar la trayectoria— y el
     * CV dice "VEGOSUPERMERCADOS", con unas fechas que cuadran con los tres
     * años declarados: septiembre de 2022 a octubre de 2025.
     *
     * No se dio por hecho que fueran lo mismo, se preguntó, y Alex lo ha
     * confirmado: es el mismo empleo. Se queda el nombre del CV para que la web
     * y el documento descargable digan lo mismo — si un reclutador abre los dos
     * y no coinciden, el que pierde credibilidad es el candidato.
     */
    company: 'Vegosupermercados',
    role: 'Profesional de logística',
    // La duración la dijo Alex; las fechas están en el CV. Ahora que existen
    // las dos, manda la fecha: es el dato comprobable.
    period: 'Septiembre 2022 – Octubre 2025',
    summary: 'Experiencia profesional desarrollada en el ámbito de la logística y el almacén.',
    // Las dos que aparecen literalmente en el CV. Ni una más.
    responsibilities: ['Manejo de aplicaciones para pedidos online.', 'Gestión de almacén.'],
    achievements: [],
    stack: [],
  },
  {
    track: 'logistica',
    company: 'Leroy Merlin',
    role: 'Profesional de logística',
    period: 'Mayo 2021 – Marzo 2022',
    summary: 'Experiencia profesional desarrollada en el ámbito de la logística y el almacén.',
    responsibilities: [
      'Gestión de almacén.',
      'Preparación de pedidos online a través de aplicaciones informáticas.',
    ],
    achievements: [],
    stack: [],
  },
  {
    track: 'logistica',
    company: 'Inditex',
    role: 'Almacén',
    /**
     * La condición —media jornada— es un dato del puesto y no había campo para
     * ella. Va aquí, al lado de la duración, en vez de añadir un campo nuevo
     * que solo usaría una de las cuatro entradas.
     *
     * Y aquí SÍ se queda la duración en años: este empleo no está en el CV, así
     * que no hay fechas que poner. Deducirlas de los huecos entre los otros dos
     * sería inventarlas.
     */
    period: '2 años · media jornada',
    summary: 'Experiencia profesional desarrollada en el ámbito del almacén y la logística.',
    // El CV no recoge este empleo, así que no hay responsabilidades que citar.
    responsibilities: [],
    achievements: [],
    stack: [],
  },
  {
    track: 'software',
    /**
     * FASE 5D.1 — el hueco que llevaba tres fases abierto, cerrado.
     *
     * Estaba sin fechas, sin responsabilidades y sin tecnologías porque el CV
     * anterior no recogía este empleo. El CV NUEVO sí, y con todo: el nombre
     * completo de la empresa, el puesto, las fechas y las dos tareas. Nada de
     * esto se ha deducido — está escrito en el documento que se descarga desde
     * esta misma web.
     */
    company: 'OVEUN Software & Tech',
    role: 'Desarrollador · Prácticas',
    period: 'Febrero 2026 – Mayo 2026',
    summary:
      'Primera experiencia profesional directamente relacionada con el desarrollo de software.',
    responsibilities: [
      'Desarrollo de aplicaciones de escritorio con Python y PySide6.',
      'Maquetación de interfaces con HTML.',
    ],
    achievements: [],
    // Las dos que nombra el CV. `Python` existe además en `skillGroups`; PySide6
    // y HTML no, y aquí no hace falta que existan: el stack de un empleo se
    // pinta con respaldo de texto igual que el de un proyecto.
    stack: ['Python', 'PySide6', 'HTML'],
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
 *
 *                  Cualquiera de las tres formas admite además `ratio`, la
 *                  proporción CSS de su marco (`'2 / 1'`). Sin ella manda la
 *                  del sitio donde se pinta —16/10—, que es lo correcto para
 *                  una captura de aplicación. Se declara cuando el asset tiene
 *                  otra y recortarlo perdería contenido: ver el juego
 *
 *                  **Vídeo.** `{ kind: 'video', src, poster, alt }`. Se pinta
 *                  con el MISMO marco que una captura —misma sombra, misma
 *                  inclinación, mismo abanico— y sin controles, sin sonido y
 *                  en bucle: es una captura que se mueve, no un reproductor.
 *                  `poster` es obligatorio en la práctica, porque es lo que se
 *                  ve mientras carga. Se reproduce SOLO mientras está en
 *                  pantalla —ver `useVideoPlayback`— y con movimiento reducido
 *                  se queda en el póster y aparecen los controles nativos, que
 *                  es devolverle la decisión al visitante en vez de esconderle
 *                  el contenido.
 *
 *                  Para prepararlo, con ffmpeg:
 *
 *                      ffmpeg -ss 12 -t 10 -i grabacion.mp4 \
 *                        -vf "scale=1280:-2,fps=30" -an \
 *                        -c:v libx264 -crf 30 -preset slow \
 *                        -movflags +faststart public/video/zalent.mp4
 *
 *                  Diez segundos a 1280 px y sin audio pesan unos 150 KB —
 *                  medido sobre el demo real de Zalent, que en origen son
 *                  2560 × 1440 a 60 fps y 21 MB. Más largo no aporta: lo que
 *                  hay que demostrar cabe en diez segundos, y el visitante no
 *                  va a esperar más.
 *
 *                  Y `focus: [x, y]`, en porcentaje: el punto de la imagen
 *                  que DEMUESTRA el proyecto. De ahí sale el origen del
 *                  acercamiento al pasar el cursor, así que la imagen se
 *                  acerca hacia lo que hay que ver en vez de hacia su centro
 *                  geométrico. Opcional: una captura sin un punto importante
 *                  —una pantalla de acceso centrada— no lo lleva
 *
 *                  **El número de elementos decide la composición.** El
 *                  escenario tiene un reparto por cantidad, de una a cinco
 *                  secundarias (`STAGE_LAYOUTS` en `ProjectsArea`), y el
 *                  abanico las recoge midiendo dónde han quedado. Añadir una
 *                  captura es añadir una entrada aquí: no hay que escribir
 *                  ninguna animación nueva
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
 * - `media` — vacío hasta la fase visual. **Cerrado en 5D.0 y 5E**: los tres
 *   proyectos llevan ya capturas reales de su propia aplicación, tres cada
 *   uno. No es simetría buscada: es que los tres tenían material suficiente
 *   y ninguno tenía un cuarto que contara algo nuevo
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
    /**
     * El emblema tridimensional del proyecto. Es IDENTIDAD, no evidencia: lo
     * que demuestra que el proyecto existe son sus capturas, que están unas
     * líneas más abajo. Ver `EditorialObject`.
     */
    object3d: '/models/zalent_icon_3d.glb',
    title: 'Zalent',
    tagline: 'Gestión de talento local-first con IA.',
    year: 'Junio 2026',
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
    /**
     * FASE 5E — capturas REALES de la aplicación.
     *
     * Siete disponibles en `Assets/Zalent/`, todas con los datos de ejemplo
     * ficticios de la propia aplicación —los correos son `@example.com`—, así
     * que ninguna filtra a nadie.
     *
     * Tres, y cada una contesta una pregunta distinta:
     *
     *     busqueda-       QUÉ ES Y QUÉ  una consulta escrita en lenguaje
     *     semantica       TIENE DE       natural, su resultado con el % de
     *                     PARTICULAR     encaje y el fragmento del CV que lo
     *                                    justifica, con la palabra resaltada
     *     asistente-ia    CÓMO AYUDA     el panel de IA local sobre una ficha
     *                                    con sus campos extraídos
     *     bloqueo         POR QUÉ        la contraseña maestra y el cifrado en
     *                     LOCAL-FIRST    el propio equipo
     *
     * Las otras —importar, vacantes, pipeline y panel— se quedan fuera por lo
     * mismo: a 245 px de miniatura son pantallas medio vacías. El kanban
     * además es lo menos distintivo que tiene un gestor de talento.
     *
     * **FASE 5F — la principal cambia.** Estaba la lista de candidatos, que
     * enseña la forma de la aplicación con el buscador VACÍO. La de búsqueda
     * semántica enseña esa misma forma —barra lateral, marca, lista, ficha con
     * los campos extraídos— y además el buscador USADO: la consulta, el 47% de
     * encaje, el bloque "Por qué encaja" y el fragmento del CV con la palabra
     * resaltada. Es un superconjunto, no un intercambio: donde la anterior
     * decía "esto es una lista", esta dice "esto busca por significado".
     * Sale de `Zalent/docs/img/`, que es la carpeta que Alex documentó, y va
     * a su ancho nativo —1338— porque el hueco se pinta a 487 y subirla a
     * 1600 sería inventar píxeles.
     *
     * Se conserva la barra de título de la ventana, igual que en ActiHome: las
     * dos son aplicaciones de escritorio y se enseñan como tales.
     */
    media: [
      /*
        ── EL VÍDEO VA PRIMERO, Y ESO ES LA DECISIÓN ────────────────────────

        La captura de búsqueda semántica enseña el RESULTADO; el vídeo enseña
        que el resultado APARECE. En un buscador por significado eso es
        exactamente lo que hay que demostrar, y es lo único que una imagen fija
        no puede: se escribe "almacen", se pulsa buscar, y Olaz contesta con
        tres candidatos ordenados por relevancia y su porcentaje de encaje.

        Elegido midiendo, no al azar: de los 84 segundos de la grabación, el
        tramo 45–55 es el único que contiene la consulta y su respuesta
        seguidas. Antes está la importación de CVs y después el pipeline.
      */
      {
        kind: 'video',
        src: '/video/zalent.mp4',
        poster: '/img/projects/zalent-video.webp',
        alt: 'Búsqueda semántica de Zalent en funcionamiento: se escribe una consulta en lenguaje natural y aparecen los candidatos ordenados por relevancia con su porcentaje de encaje.',
      },
      {
        kind: 'image',
        src: '/img/projects/zalent-busqueda-semantica.webp',
        // Hacia el bloque "Por qué encaja · 47%" con el fragmento del CV resaltado.
        focus: [68, 72],
        alt: 'Búsqueda semántica en Zalent: una consulta en lenguaje natural, el candidato con su porcentaje de encaje y el fragmento del CV que lo justifica.',
      },
      {
        kind: 'image',
        src: '/img/projects/zalent-asistente-ia.webp',
        // Hacia el panel del asistente de IA local.
        focus: [72, 62],
        alt: 'Ficha de un candidato en Zalent, con los campos extraídos del CV y el panel del asistente de IA local.',
      },
      {
        kind: 'image',
        src: '/img/projects/zalent-bloqueo.webp',
        alt: 'Pantalla de bloqueo de Zalent, con la contraseña maestra y el aviso de cifrado en el propio equipo.',
      },
    ],
    links: { demo: '', github: '', video: '' },
  },

  {
    id: 'actihome',
    /**
     * El emblema tridimensional del proyecto. Es IDENTIDAD, no evidencia: lo
     * que demuestra que el proyecto existe son sus capturas, que están unas
     * líneas más abajo. Ver `EditorialObject`.
     */
    object3d: '/models/actihome_icon_3d_v2.glb',
    title: 'ActiHome',
    tagline: 'Aplicación de escritorio para la gestión y reserva de alojamientos turísticos.',
    year: 'Febrero 2026',
    category: 'Aplicación de escritorio',
    status: 'Proyecto de fin de ciclo',
    objective:
      'Gestionar y reservar alojamientos turísticos desde una aplicación de escritorio, con roles distintos para quien administra y quien reserva.',
    problem: '',
    solution:
      'La aplicación reúne la gestión de alojamientos y el ciclo de reserva en un único sitio, con dos roles —ADMIN y CUSTOMER— que la usan de forma distinta. Está construida sobre Spring Boot pero no levanta ningún servidor web: arranca el contexto de Spring y abre directamente una ventana de Swing, con la persistencia en una base de datos H2 embebida a través de Spring Data JPA y un perfil alternativo para MySQL. El proyecto se migró de Spring Boot 2.2.2 y Java 11 a Spring Boot 3.5.3 y Java 17.',
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
    /**
     * FASE 5D.1 — el stack, corregido contra el código.
     *
     * Aquí ponía solo "MySQL", y la ventana "Acerca de" de la propia aplicación
     * decía "H2 embebida". Se fue a mirar el proyecto en vez de elegir una:
     *
     *     application.yaml         jdbc:h2:file:${user.home}/.actihome/…
     *                              ;MODE=MySQL          ← el POR DEFECTO
     *     application-mysql.yaml   jdbc:mysql://localhost:3306/actihome
     *     pom.xml                  h2 · mysql-connector-j · flyway-core
     *                              flyway-mysql · flatlaf 3.7.2
     *                              miglayout-swing 11.4.2
     *
     * O sea que no había que elegir: las DOS son ciertas. H2 es la de por
     * defecto —y de hecho existe el archivo `~/.actihome` en la máquina— y
     * MySQL es un perfil alternativo real. El `MODE=MySQL` de la URL de H2
     * explica además de dónde venía la confusión.
     *
     * Y entran FlatLaf, MigLayout y Flyway, que estaban en el pom desde el
     * principio y no en el portfolio.
     */
    stack: [
      'Java 17',
      'Spring Boot 3.5.3',
      'Spring Data JPA',
      'H2',
      'MySQL',
      'Flyway',
      'Java Swing',
      'FlatLaf',
      'MigLayout',
    ],
    /**
     * FASE 5D.0 — capturas REALES de la aplicación.
     *
     * Son las únicas de los tres proyectos: existen en `Assets/ActiHome/` y no
     * hay ninguna de Zalent ni del juego. La regla del portfolio es que una
     * captura real gana a cualquier objeto decorativo, así que aquí no hace
     * falta nada más.
     *
     * Tres de once, elegidas porque enseñan cosas DISTINTAS: el acceso con la
     * marca, el catálogo funcionando, y una segunda estación para que se vea
     * que la interfaz cambia entera. Las otras ocho repiten pantalla o
     * variante.
     *
     * La ficha "Acerca de" se queda fuera a propósito, y no por composición:
     * declara "Spring Data JPA sobre H2 embebida" mientras el stack de arriba
     * dice MySQL. Publicar las dos cosas a la vez sería enseñarle a un
     * reclutador una contradicción sobre el propio proyecto. Se resuelve
     * cuando Alex diga cuál es la buena.
     */
    media: [
      /*
        ── EL INTERCAMBIO, QUE NINGUNA CAPTURA PODÍA ENSEÑAR ────────────────

        Es la característica más distintiva de ActiHome y no aparecía en
        ninguna de las tres capturas, porque es un PROCESO: se elige un
        alojamiento propio, se propone a cambio de otro, se confirma y la
        propuesta se envía. Eso son cuatro pantallas, o diez segundos.

        Del minuto y medio de grabación, el tramo 55–63 es el que lo contiene
        entero.

        **Y abre con el splash de CocoBrain**, recortado: en la grabación
        original esa lámina aparece pequeña en mitad del escritorio, con el
        fondo de pantalla y los iconos alrededor. Aquí se recorta a la lámina
        y nada más —medido, `crop=972:656:866:391`— así que lo que se ve es la
        marca presentando la aplicación, no el escritorio de nadie.
      */
      {
        kind: 'video',
        src: '/video/actihome.mp4',
        poster: '/img/projects/actihome-video.webp',
        alt: 'ActiHome en funcionamiento: la presentación de CocoBrain y el intercambio de un alojamiento por otro, desde la propuesta hasta el envío.',
      },
      {
        kind: 'image',
        src: '/img/projects/actihome-catalogo.webp',
        // Hacia las tarjetas de alojamiento con sus precios.
        focus: [55, 62],
        alt: 'Catálogo de ActiHome con el filtro de estaciones, las tarjetas de alojamiento y sus precios por noche.',
      },
      {
        kind: 'image',
        src: '/img/projects/actihome-acceso.webp',
        alt: 'Pantalla de acceso de ActiHome, con la marca a la izquierda y el formulario de entrada a la derecha.',
      },
      {
        kind: 'image',
        src: '/img/projects/actihome-mensajes.webp',
        alt: 'Pantalla de mensajes de ActiHome con la paleta de otoño, distinta a la del catálogo.',
      },
    ],
    links: { demo: '', github: '', video: '' },
  },

  {
    id: 'cata-trufa',
    /**
     * El emblema tridimensional del proyecto. Es IDENTIDAD, no evidencia: lo
     * que demuestra que el proyecto existe son sus capturas, que están unas
     * líneas más abajo. Ver `EditorialObject`.
     */
    object3d: '/models/cata_trufa_combined_3.glb',
    title: 'Las aventuras de Cata y Trufa',
    tagline: 'Una aventura cozy protagonizada por dos perras carlinas.',
    year: 'Junio 2026',
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
    /**
     * FASE 5E — capturas REALES del juego.
     *
     * Trece disponibles en `Assets/CATA Y TRUFA/`. Tres, y en este orden:
     *
     *     parque    QUE ES UN JUEGO   las dos carlinas, el marcador de mision,
     *                                 el dialogo con retrato y los botones de
     *                                 accion, todo en el mismo cuadro
     *     casa      QUE ESTA HECHO    el interior cenital completo, con las
     *               A MANO            dos camas rotuladas CATA y TRUFA
     *     armario   QUE TIENE         una pestaña por protagonista y un traje
     *               SISTEMAS          equipable
     *
     * Fuera: cuatro con el damero de tiles sin pintar, dos con el aviso de
     * "captura copiada" de Windows encima, y cuatro variantes de calle que
     * repiten lo que ya cuenta la del parque.
     *
     * **El marco del navegador se recorta.** El juego corre en el navegador y
     * las capturas traen la pestaña y `localhost:5180`: eso es el entorno de
     * desarrollo, no el producto. El contenido empieza en y=151, medido, y de
     * ahi salen 1920 x 960 — 2/1, que es la proporcion que declara cada
     * elemento. ActiHome y Zalent SI conservan su barra de ventana porque son
     * aplicaciones de escritorio y esa ventana es parte de lo que se entrega.
     */
    media: [
      /*
        ── EL JUEGO, EN MOVIMIENTO ─────────────────────────────────────────

        Un videojuego es lo único de los tres proyectos que una captura no
        puede representar: lo que define un juego es qué pasa cuando lo
        tocas. El tramo 63–73 tiene las dos carlinas recorriendo el estanque,
        objetos que se recogen, una colmena que reacciona —"¡Las abejas salen
        volando!"— y la indicación de nadar.

        **Sin el marco del navegador.** El juego se grabó en una ventana con
        su barra de pestañas y `localhost` a la vista, igual que las capturas
        de la fase 5E. El lienzo empieza en y=192, medido sobre un fotograma,
        y de ahí sale un recorte de 2496 × 1248 que es exactamente 2:1 — la
        misma proporción que declaran las capturas de este proyecto.

        No he encontrado en la grabación un momento inequívoco de CAMBIO de
        personaje, que era lo ideal. Lo que sí demuestra este tramo es la
        mecánica que lo rodea: las dos protagonistas en el mundo, moviéndose y
        provocando reacciones.
      */
      {
        kind: 'video',
        ratio: '2 / 1',
        src: '/video/cata-trufa.mp4',
        poster: '/img/projects/cata-trufa-video.webp',
        alt: 'Las aventuras de Cata y Trufa en movimiento: las dos carlinas recorriendo el estanque, recogiendo objetos y provocando que las abejas salgan de la colmena.',
      },
      {
        kind: 'image',
        ratio: '2 / 1',
        src: '/img/projects/cata-trufa-parque.webp',
        // Hacia las dos carlinas.
        focus: [55, 70],
        alt: 'Escena del juego en el parque: las dos carlinas, el marcador de misión y un diálogo con un personaje.',
      },
      {
        kind: 'image',
        ratio: '2 / 1',
        src: '/img/projects/cata-trufa-casa.webp',
        // Hacia las dos carlinas y sus camas.
        focus: [27, 62],
        alt: 'Interior de la casa en vista cenital, con las dos protagonistas y sus camas rotuladas.',
      },
      {
        kind: 'image',
        ratio: '2 / 1',
        src: '/img/projects/cata-trufa-armario.webp',
        alt: 'El armario del juego, con una pestaña para cada protagonista y un traje equipable.',
      },
    ],
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
/**
 * FASE 5B.5 — la agrupación profesional, con el stack real.
 *
 * Cada tecnología está aquí porque se puede señalar dónde se usa: o aparece en
 * el CV, o está en uno de los tres proyectos, o está en esta web. Nada más.
 *
 * **Ni niveles, ni años, ni porcentajes.** El esquema no los admite y no se han
 * declarado: decir "React avanzado" sería inventar una medida que nadie ha
 * tomado. Lo que sí dice cada grupo, en su `note`, es DÓNDE se ha usado — que
 * es el dato que un reclutador puede comprobar y que además no exagera nada.
 *
 * Los ids que existen en la red van por su id (`react`, `three`, `git`…) para
 * que sigan siendo el mismo nodo que se enciende dentro del cerebro. El resto
 * va como texto, que es lo que `SkillGroup` admite desde esta fase.
 */
export const skillGroups = [
  {
    id: 'languages',
    label: 'Lenguajes',
    /**
     * FASE 5F — Python deja de ser "del ciclo".
     *
     * La nota se escribió en 5B.5, cuando la única constancia de Python era el
     * ciclo. El CV nuevo que entró en 5D.1 trae las prácticas de OVEUN, donde
     * se usó para desarrollar aplicaciones de escritorio: la nota se había
     * quedado corta, no equivocada. Se corrige lo justo.
     */
    note: 'JavaScript en el juego y en esta web, Java en ActiHome, TypeScript en Zalent y Python en el ciclo y en las prácticas de OVEUN.',
    knowledge: ['javascript', 'Java', 'TypeScript', 'Python'],
  },
  {
    id: 'frontend',
    label: 'Frontend y web',
    note: 'Zalent y este portfolio están construidos con React; el 3D de esta web y el juego son las dos formas en que he trabajado el lienzo.',
    knowledge: ['react', 'vite', 'HTML', 'CSS', 'three', 'r3f', 'gsap', 'Phaser 3'],
  },
  {
    id: 'desktop',
    label: 'Escritorio y backend',
    /**
     * FASE 5F — entra PySide6, y con él un tercer camino.
     *
     * Cumple el criterio del grupo sin ampliarlo: "o aparece en el CV, o está
     * en uno de los tres proyectos, o está en esta web". PySide6 aparece en el
     * CV, en las prácticas de OVEUN, junto a Python.
     *
     * Va como TEXTO y no como id: `knowledge.js` son los dieciocho
     * conocimientos que dibujan la red dentro del cerebro —todos de esta web—
     * y PySide6 no es uno de ellos. Es el mismo tratamiento que ya tienen
     * `Spring Boot`, `Tauri` o `Java Swing`.
     *
     * Y HTML ya estaba, en "Frontend y web": la otra mitad de esta cuestión
     * llevaba resuelta desde 5B.5.
     */
    note: 'Tres caminos distintos hasta una ventana: ActiHome sobre Spring y Swing, Zalent sobre Tauri y Rust, y las prácticas de OVEUN sobre Python y PySide6.',
    knowledge: ['Spring Boot', 'Spring Data JPA', 'Java Swing', 'Tauri', 'Rust', 'PySide6'],
  },
  {
    id: 'data',
    label: 'Datos',
    note: 'MySQL en ActiHome, SQLite en Zalent y Oracle SQL Developer en el ciclo.',
    knowledge: ['MySQL', 'SQLite', 'Oracle SQL Developer'],
  },
  {
    id: 'local-ai',
    label: 'IA en local',
    note: 'La parte de Zalent que corre en el equipo del usuario: extracción, búsqueda semántica y modelos sin salir de la máquina.',
    knowledge: ['Transformers.js', 'ONNX', 'Ollama'],
  },
  {
    id: 'tooling',
    label: 'Herramientas',
    note: 'Control de versiones, el editor del ciclo y el editor de mapas del juego.',
    knowledge: ['git', 'Visual Studio', 'Tiled'],
  },
]

/**
 * FASE 5B.5 — las fortalezas, en las palabras que ya ha usado Alex.
 *
 * Ninguna sale de una lista de tópicos de currículum. Las tres primeras son
 * literalmente el perfil de su CV —"la curiosidad, el aprendizaje continuo y el
 * deseo de convertir ideas en aplicaciones funcionales"— y las dos últimas
 * salen de los párrafos que él mismo escribió para `about.body`.
 *
 * No llevan nivel, ni porcentaje, ni años: nada de eso se ha declarado y
 * deducirlo sería inventarlo.
 */
export const strengths = [
  {
    id: 'curiosidad',
    label: 'Curiosidad',
    body: 'Es lo que empieza la mayoría de mis proyectos: probar una herramienta que no conozco y ver hasta dónde llega.',
  },
  {
    id: 'aprendizaje',
    label: 'Aprendizaje continuo',
    body: 'Cada proyecto me obliga a aprender algo que no sabía, y buena parte del motivo por el que lo empiezo es justamente ese.',
  },
  {
    id: 'ideas-a-aplicaciones',
    label: 'Convertir ideas en aplicaciones',
    body: 'Me interesa llegar hasta el final: que la idea acabe siendo algo que se pueda abrir y usar, no un experimento a medias.',
  },
  {
    id: 'presentacion',
    label: 'Cuidado por la presentación',
    body: 'No me basta con que funcione. También me importa cómo se presenta, cómo se utiliza y qué sensación transmite.',
  },
  {
    id: 'terrenos-distintos',
    label: 'Moverme entre terrenos distintos',
    body: 'Escritorio, web y videojuego. Prefiero cambiar de tipo de proyecto antes que quedarme en uno solo.',
  },
]

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
/**
 * FASE 5B.5 — el resumen sale del CV, no de una redacción nueva.
 *
 * `summary` es LITERALMENTE el apartado "Perfil" del CV de Alex. Es la frase
 * que él ya usa para presentarse, así que la web y el documento dicen lo mismo
 * —que es justo lo que se espera de los dos— sin que nadie tenga que escribir
 * una segunda versión que después se desincronice.
 *
 * `file` sigue vacío A PROPÓSITO, y ahora por un motivo concreto.
 *
 * El PDF existe y está verificado, pero lleva dentro el TELÉFONO y la DIRECCIÓN
 * POSTAL de Alex. Conectarlo aquí no es "enlazar un documento": es publicar los
 * dos datos que este mismo portfolio ha decidido no enseñar, en un archivo que
 * puede descargar cualquiera — y, en cuanto hubiera un commit, dejarlos en el
 * historial de git de forma permanente, donde borrarlos después no los quita.
 *
 * Se preguntó antes de tocar nada y Alex decidió preparar una versión sin esos
 * datos. Con el email y el LinkedIn hay de sobra para que alguien escriba.
 *
 * Cuando exista, conectarlo es una línea:
 *
 *     public/cv/<archivo>.pdf   →   file: '/cv/<archivo>.pdf'
 *
 * `updated` va con él: un CV con fecha y sin archivo sería una fecha que no
 * describe nada. Y no se deduce de la fecha del archivo — eso dice cuándo se
 * copió, no de cuándo es el currículum.
 *
 * Y no está el teléfono, ni la dirección postal, ni los idiomas médicos ni nada
 * del CV que no tenga por qué ser público. El CV completo es el documento; esto
 * es la introducción.
 */
export const cv = {
  summary:
    'En proceso de formación como desarrollador multiplataforma. Me impulso por la curiosidad, el aprendizaje continuo y el deseo de convertir ideas en aplicaciones funcionales.',
  /**
   * FASE 5D.1 — el CV ya está conectado.
   *
   * Es el documento NUEVO, el que Alex preparó sin el teléfono ni la dirección
   * postal: su bloque de contacto se queda en el correo, "A Coruña" y el
   * LinkedIn. Por eso ahora sí se publica — el motivo por el que no se conectó
   * el anterior era exactamente ese, y ya no existe.
   *
   * `updated` se queda VACÍO a propósito. El documento no lleva ninguna fecha
   * de actualización: lleva las fechas de los empleos y de los estudios, que
   * son otra cosa. Y las tres fechas que sí tiene el archivo —creación,
   * copia, modificación— dicen cuándo se movió el fichero, no de cuándo es el
   * currículum. `CvArea` solo enseña la fecha si existe, así que un CV sin
   * fecha no enseña una fecha falsa: no enseña ninguna.
   */
  file: '/cv/alejandro-sampedro-calo.pdf',
  /**
   * ── LA PORTADA ES UNA CAPTURA DEL DOCUMENTO REAL, NO UNA ETIQUETA ────────
   *
   * Hasta aquí la hoja de la sección llevaba "Curriculum Vitae" escrito como
   * titular — correcto mientras no había PDF, y ya no: el archivo existe, así
   * que lo que la hoja tiene que enseñar es SU PORTADA, no su nombre.
   *
   * No es un PDF incrustado —esa regla sigue en pie, y sigue significando lo
   * mismo: nada de `<iframe>`, nada de visor nativo cambiando tipografía y
   * scroll dentro de la página—. Es una CAPTURA, exactamente el mismo trato
   * que ya reciben las tres aplicaciones de Proyectos: una imagen real de lo
   * que hay, no una ilustración de lo que podría haber.
   *
   * Generada una vez con `.shots/cv-preview.mjs` —Playwright, con el Edge del
   * sistema y no el Chromium que trae por defecto, que no lleva visor de PDF—
   * y recortada contra el fondo del visor. 792×1122, que es A4 casi exacto:
   * por eso la hoja no necesita recortar nada, solo llenar su propio marco.
   */
  preview: {
    // `kind` no es decorativo: `MediaViewer.canView()` exige 'image' o
    // 'video' para aceptar el elemento, y sin él `viewer.open()` filtra la
    // lista a cero y no abre nada — en silencio, sin ningún error.
    kind: 'image',
    src: '/img/cv-preview.webp',
    srcSet: '/img/cv-preview-sm.webp 480w, /img/cv-preview.webp 780w',
    alt: 'Portada del currículum de Alex',
  },
  updated: '',
  highlights: [
    'Programador DAM. Ciclo Formativo de Grado Superior en Desarrollo de Aplicaciones Multiplataforma, Ilerna, 2023 – 2025.',
    'Tres proyectos propios construidos desde cero: una aplicación de escritorio con IA, una aplicación de gestión y un videojuego web.',
    'Prácticas del ciclo DAM en OVEUN: la primera experiencia profesional directamente relacionada con el desarrollo de software.',
    'Experiencia previa en logística y almacén en Vegosupermercados, Leroy Merlin e Inditex.',
    'Castellano nativo · gallego CELGA 4 · inglés medio.',
  ],
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
/**
 * FASE 5B.5 — solo lo que es profesional y público.
 *
 * El CV trae además un teléfono y una dirección postal. No entran: un portfolio
 * es una página abierta e indexable, y ninguna de las dos cosas hace falta para
 * que alguien escriba. Quien las necesite las tiene en el documento.
 *
 * No hay GitHub porque no se ha dado ninguno. Cuando exista, es una línea más
 * en `links`: el componente no distingue unas redes de otras.
 */
export const contact = {
  email: 'alejsamcalo@hotmail.com',
  links: [
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/alejandro-sampedro-calo-77a738133',
    },
  ],
}

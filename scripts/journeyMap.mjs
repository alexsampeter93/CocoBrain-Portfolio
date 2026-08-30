/**
 * EL PUENTE ENTRE "PROGRESO" Y "SCROLL", PARA LAS HERRAMIENTAS.
 *
 * Todos los scripts colocan el recorrido haciendo scroll a una fracción de la
 * pista. Eso valía mientras el progreso avanzaba a scroll constante; desde que
 * la tabla reparte el presupuesto —el descenso cuesta menos pantallas y el hub
 * muchas más— la fracción de pista y el progreso son dos números distintos.
 *
 * Se importa la tabla de verdad en vez de copiar el reparto aquí. Una
 * herramienta de diagnóstico con su propia copia de un dato es peor que no
 * tenerla: mide una web que no existe, y no avisa. Ya pasó con las paradas
 * escritas a mano que se desfasaron cuando cambió el recorrido.
 */
export { warp, unwarp } from '../src/journey/stages.js'

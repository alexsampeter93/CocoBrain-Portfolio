# 02 · El caso de los tirones

> Seis intentos para arreglar un problema. Cinco fueron por el camino
> equivocado. Esto va de por qué.

El síntoma era siempre el mismo: **el scroll iba a trompicones y la escena se
movía como lenta**. Tardé seis rondas en resolverlo, y merece la pena escribir
por qué, porque el error de método fue más caro que cualquiera de los errores
de código.

## El dato que llevaba mintiéndome desde el principio

El contador marcaba **146 fps**. Con esa cifra delante, descarté el
rendimiento y me puse a buscar el problema en la lógica. Fue el razonamiento
correcto sobre el dato equivocado.

Un contador de fps enseña la **media**. Y una media de 146 esconde
perfectamente un frame de 90 ms cada segundo, que es exactamente lo que se ve
como tirón. El ojo no percibe promedios: percibe el peor caso.

Así que lo primero que debería haber hecho —y lo hice el quinto— fue cambiar
el instrumento. Un medidor del **peor frame del último segundo**:

```js
if (elapsed > worst) worst = elapsed
if (now - windowStart > 1000) {
  mostrar(worst)
  worst = 0
  windowStart = now
}
```

En cuanto lo puse, salió **más de 80 ms de forma sostenida**. Eso son 10 fps.
No era un tirón ocasional, la escena se estaba ahogando. Y esa cifra la tenía
disponible desde el primer día.

**La lección: si el dato que estás mirando no explica lo que ves, el problema
está en el instrumento, no en tu interpretación.**

## Lo que sí encontré por el camino

Las primeras cinco rondas no fueron inútiles: cada una destapó un fallo real.
Lo que pasa es que ninguno era *el* fallo.

**Dos relojes desincronizados.** GSAP y el motor de render tienen cada uno su
`requestAnimationFrame`, y no hay garantía de orden entre ellos. La cámara se
dibujaba con un valor que a veces era de este frame y a veces del anterior.
Se arregla no copiando el número, sino persiguiéndolo con amortiguación: da
igual que llegue tarde, lo que se dibuja nunca salta.

**La cámara se paraba en cada punto de la tabla.** Dos tramos seguidos con
`ease: 'in'` (que es `k * k`) significa que el primero termina lanzado y el
siguiente empieza clavado. Sustituido por una única `CatmullRomCurve3`.

**El encuadre se recalculaba contra un número cambiante.** El tamaño del
personaje salía del tamaño del canvas, y el canvas se mide otra vez cada vez
que se fija y se suelta el contenedor.

**Un recorrido del grafo entero por frame** para tocar cuatro opacidades, y un
`new Vector3()` en el bucle de render generando basura a sesenta objetos por
segundo.

Todos reales. Ninguno explicaba 80 ms.

## Los dos que no estaban en el JavaScript

Aquí es donde el método falló de verdad. Llevaba cinco rondas leyendo
componentes de React y ni una vez había abierto la hoja de estilos.

```css
html { scroll-behavior: smooth; }
```

Esta regla hace que **el navegador anime cada desplazamiento** con su propia
curva de unos 300 ms. Cada muesca de la rueda arrancaba una animación que la
siguiente interrumpía, mientras el recorrido leía una posición que no paraba
quieta.

```css
body { background-attachment: fixed; }
```

Peor. Un fondo así obliga a **repintar el fondo de toda la ventana en cada
frame de desplazamiento** y le quita al navegador el camino rápido, ese en el
que el scroll lo resuelve la tarjeta gráfica sola. Con un canvas de WebGL a
pantalla completa encima, se paga dos veces.

Se consigue el mismo efecto visual con un elemento `position: fixed` detrás de
todo, que el navegador compone una vez y reutiliza. Coste de scroll: cero.

**La lección: el problema no tiene por qué estar en la capa donde lo estás
buscando.**

## Y por fin la causa gorda

Un solo comando:

```bash
npx gltf-transform inspect public/preview/olaz-thinker.glb
```

**1.008.256 triángulos.** El presupuesto que fija este mismo proyecto son
400.000 en escritorio y 60.000 en móvil. Iba a dos veces y media del límite de
escritorio.

Y de propina: tres texturas de 2048 × 2048 ocupando **67 MB de memoria de la
tarjeta**, y el material marcado como `doubleSided`, que desactiva el descarte
de caras traseras —o sea, la mitad de los triángulos se estaban rasterizando
mirando hacia el lado contrario, para no verse nunca.

| | Antes | Después |
|---|---|---|
| Triángulos | 1.008.256 | 120.980 |
| Memoria de texturas | 67 MB | 16,8 MB |
| Archivo | 4,25 MB | 827 KB |

**Un comando. Disponible desde el primer día.** Antes de tocar una línea de
código había que haber mirado con qué estábamos trabajando.

## El error que era mío, no del asset

Tenía el `dpr` topado en 2, que suena a límite razonable. En una pantalla
grande, a 1900 × 1100 de ventana, eso son **8,4 millones de píxeles** que hay
que sombrear en cada frame con iluminación HDRI y materiales PBR.

El fallo de razonamiento: **`dpr` no dice cuánto trabajo hay, dice cuánto
trabajo hay por píxel de CSS**. El trabajo real es el área, y el área depende
del tamaño de la ventana, que no controlo.

Así que ahora se fija el área y se deduce el `dpr`:

```js
const affordable = Math.sqrt(PIXEL_BUDGET / (innerWidth * innerHeight))
```

La raíz está porque el `dpr` escala el área al cuadrado. Es al revés de como
suele hacerse, y es el orden correcto.

## Lo que me llevo

1. **Comprueba el instrumento antes que la hipótesis.** Cinco rondas
   trabajando sobre una media que escondía justo lo que buscaba.
2. **Mide los assets antes de escribir código.** `inspect` tarda dos segundos.
3. **El fallo no tiene por qué estar en tu capa.** Dos de las causas eran CSS.
4. **Varias causas pequeñas se disfrazan de una grande.** Cada arreglo mejoraba
   un poco, lo justo para hacerme creer que iba bien encaminado.
5. **Un presupuesto que no se comprueba no existe.** El límite de 400.000
   triángulos estaba escrito en la documentación del proyecto desde el
   principio. Escribirlo no sirve de nada si nadie lo mide.

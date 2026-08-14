# 00 · La arquitectura del recorrido

> Fase 0 — el esqueleto. Sin modelos, sin texturas, sin efectos.

## De dónde venía

Tenía una web que técnicamente hacía casi todo lo que quería: cargaba un
modelo 3D, la cámara se movía con el scroll, había nodos, había un cerebro.
Y aun así estaba mal. Se enganchaba, las transiciones se veían sucias, en
móvil las cosas se solapaban, y cada vez que arreglaba algo se rompía otra
cosa en otro sitio.

Lo importante no es esa lista de síntomas. Lo importante es que durante
semanas los traté como bugs sueltos, y no lo eran: eran el mismo problema
saliendo por cinco sitios distintos.

## Los tres fallos

**1. La coreografía estaba repartida por el código.**

Por «coreografía» me refiero a esto: en cada momento del scroll, dónde está la
cámara, hacia dónde mira y qué se ve. Esa información estaba escrita en
condicionales dentro de cinco archivos distintos. Un `if (progress > 0.4)`
aquí, un `fadeRange={[0.34, 0.62]}` allá, un número mágico en otro sitio.

Nadie tenía la foto completa, yo incluido. Así que cuando movía el momento en
el que aparece el cerebro, no había forma de saber qué más dependía de ese
número. Lo descubría rompiéndolo.

**2. El scroll pasaba por React.**

Esto merece explicación porque es el error más caro y el menos evidente.

Yo guardaba el progreso del scroll en un `useState`. Parece lo natural: es un
dato que cambia, React sirve para eso. El problema es la frecuencia. El scroll
dispara unas 60 veces por segundo, y cada `setState` obliga a React a
recorrer el árbol de componentes entero para ver qué ha cambiado.

O sea: 60 veces por segundo estaba reconstruyendo la aplicación completa para
mover una cámara. Ese era el tirón.

La lección general: **React es bueno decidiendo _qué_ hay en pantalla, y es el
sitio equivocado para un número que cambia en cada frame.** Ese número va a un
objeto normal de JavaScript, fuera de React, y lo lee directamente el bucle de
dibujado.

**3. El responsive era un parche.**

No había diseño de móvil. Había un `compact ? 0.56 : 0.42` suelto en cada
archivo, con valores elegidos a ojo y sin ninguna relación entre ellos. Por
eso en móvil unas piezas se movían y otras no: cada una tenía su propia idea
de dónde estaba todo.

## La idea que lo ordena todo: un solo número

Todo el recorrido es **un número entre 0 y 1**. Cero es arriba del todo, uno es
el final. Se llama `progress` y vive en `src/journey/clock.js`.

De ese número sale absolutamente todo lo demás. La posición de la cámara, hacia
dónde mira, qué se ve y con cuánta opacidad. Nada más tiene estado propio.

Esto tiene una consecuencia que vale oro: **es imposible que dos cosas se
desincronicen**. Si todo se calcula del mismo número, todo va siempre a la vez.
Antes tenía una animación para la cámara y otra para el desvanecido, y cada una
con su propio reloj; cuando una llegaba tarde, se veía.

## La tabla

`src/journey/stages.js` es el archivo central del proyecto. Contiene dos cosas.

**Los puntos por los que pasa la cámara.** Cada uno dice: en qué punto del
recorrido (`at`), dónde está la cámara (`position`) y hacia dónde mira
(`target`).

```js
{
  at: 0.38,
  position: hand.clone().add(new Vector3(0.02, 0.06, 1.3)),
  target: hand.clone(),
}
```

Entre dos puntos se **interpola**: si vamos por 0.19, que está justo a mitad
entre el punto de 0.00 y el de 0.38, la cámara se coloca justo en medio de las
dos posiciones. Eso es lo que hace `lerpVectors`, y es toda la matemática que
hay aquí: mezclar dos posiciones en la proporción que toque.

**Cuándo aparece y desaparece cada capa.** Igual de simple:

```js
mascot: { in: null, out: [0.40, 0.54] },
mind:   { in: [0.44, 0.64], out: null },
```

La mascota se va entre 0.40 y 0.54. El interior aparece entre 0.44 y 0.64. Los
tramos se solapan a propósito: el interior ya está entrando cuando la mascota
todavía no ha terminado de irse, y ese solape es lo que evita el parpadeo entre
una cosa y otra.

### Un detalle que arregla un bug concreto

En la versión anterior, la cámara se acercaba al cerebro de la mano y aun así
todo parecía «muy lejos». Al mirar la tabla se ve por qué en dos segundos:
**la mirada se iba hacia el fondo desde el primer píxel de scroll.** La cámara
pasaba cerca del cerebro, pero nunca llegaba a apuntarle. No era un fallo de
distancia, era un fallo de a dónde miraba.

Ahora la mirada se queda clavada en el cerebro hasta 0.38, y solo entonces se
abre hacia el fondo. Un cambio de una línea, en un archivo, y el problema
desaparece. Esa es la ventaja real de tener la coreografía en una tabla.

### El interpolador suave

Aparece una función llamada `ramp` que sale por todas partes:

```js
const t = (value - start) / (end - start)   // 0 a 1
return t * t * (3 - 2 * t)
```

La primera línea convierte «voy por 0.47 dentro del tramo 0.44–0.64» en «voy
por el 15% de este tramo». La segunda es un *smoothstep*: coge ese 0 a 1 y le
quita las esquinas, de forma que arranque despacio, acelere en medio y frene al
final. Un desvanecido lineal se nota como un interruptor; este se nota como un
movimiento.

## Por qué cajas de colores

Esta fase no tiene ni un solo modelo 3D. Todo son cápsulas y esferas de
colores planos, en `src/three/Blockout.jsx`.

Es a propósito, y es lo que llevaba meses saltándome.

Sirve para responder a una única pregunta: **¿la coreografía funciona?** ¿El
ritmo del scroll está bien? ¿El encuadre está a buena distancia? ¿Se entiende
que estás entrando por el cerebro?

Si con cajas eso está mal, con modelos va a estar exactamente igual de mal —
solo que además tardará ocho segundos en cargar y ya no habrá forma de saber
si el problema es la cámara o la malla. Ese fue mi error durante semanas:
confundir «la transición está mal programada» con «el modelo se ve feo».

Las cajas ocupan el hueco exacto de sus modelos, porque las dos cosas leen la
posición del mismo sitio: `src/layout/tokens.js`. Cuando llegue Olaz, entra en
el hueco que ya está validado.

## `tokens.js`: dónde está cada cosa

Un archivo con la geometría del mundo, en dos juegos: `regular` y `compact`.

```js
regular: {
  mascot:    { position: [1.75, -0.15, 0], height: 3.1 },
  handBrain: { position: [0.95, 0.4, 0.85], size: 0.44 },
  mind:      { center: [0, 0, -11], radius: 3.4 },
}
```

Aquí no se decide cómo se ve nada, solo **dónde está**. La cámara, los
desvanecidos y los nodos salen todos de estos números, así que mover a Olaz
medio metro ya no puede descuadrar nada más.

Y el móvil deja de ser un parche: es una columna más de la misma tabla.

Los nodos son el mejor ejemplo. Antes eran coordenadas absolutas escritas a
mano, así que en móvil —donde el cerebro es más pequeño— unos se metían dentro
del modelo y otros se salían de pantalla. Ahora cada nodo guarda una
**dirección** y un **factor**, y el tamaño real lo pone `mind.radius`. La
constelación se adapta sola conservando la forma.

## Lo que he borrado

Diez archivos. Seis no los importaba nadie desde hacía semanas
(`CameraRig`, `GrowingNetwork`, `Logo3D`, `Title3D`, `Hero`, `HeroCopy`) y
cuatro los sustituye la arquitectura nueva (`Scene`, `ScrollJourney`,
`useScrollProgress`, `state/journey`).

Lo que sí he conservado es todo lo que ya tenía problemas resueltos dentro:
el encuadre automático y la mirada al cursor de `Mascot3D`, las esferas
invisibles de contacto de `NeuralNodes` para que los nodos se puedan pulsar con
el dedo, el desvanecido por material de `FloatingBrain`. Eso vuelve en las
fases 1 y 2, ya enchufado a la tabla.

El código borrado sigue en el historial de git. Borrar no es limpiar si lo que
borras funcionaba.

## Cómo compruebo que esta fase está bien

Abajo del todo hay una barra de desarrollo (`StageReadout`) que enseña el tramo
y el progreso con tres decimales. Sin ver el número no se puede decir «la
entrada llega tarde», solo «algo va raro», y con eso no se corrige nada.

La fase 0 está terminada cuando, en móvil y en escritorio:

- [ ] El recorrido va de 0 a 1 sin un solo enganchón
- [ ] La cápsula de Olaz está bien encuadrada al empezar
- [ ] La cámara se acerca **al cerebro de la mano** y se entiende que entra por ahí
- [ ] La constelación aparece sin parpadeos y se lee como un sitio, no como puntos sueltos
- [ ] La navegación mueve la cámara, no salta al texto de abajo

## Siguiente

Fase 1: Olaz de verdad en el hueco de la cápsula, y el cerebro luminoso en el
hueco de la puerta. Nada de la tabla debería tener que cambiar.

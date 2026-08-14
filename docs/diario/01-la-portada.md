# 01 · Olaz en el hueco

> Fase 1 — la portada con el modelo real. El interior sigue en cajas.

La fase 0 dejó un hueco con forma de cápsula y una coreografía validada. Esta
fase es meter a Olaz dentro sin tocar la tabla. Que no haya hecho falta cambiar
ni una fila de `stages.js` es la señal de que la fase 0 sirvió para algo.

## El error del encuadre que se movía

El modelo hay que escalarlo, porque viene con el tamaño que le dio el
generador. La versión anterior lo hacía así:

```js
const fit = Math.min(
  (viewport.height * fillHeight) / size.y,
  (viewport.width * fillWidth) / size.x,
)
```

`viewport` es un dato que da React Three Fiber: cuánto mundo se ve, en
unidades, **a la distancia a la que está la cámara**. Y ahí está el problema,
porque en esta web la cámara se mueve durante todo el recorrido.

O sea: mientras te acercabas, el personaje se reescalaba solo. No mucho, pero
lo suficiente para que la aproximación se sintiera rara sin poder decir por
qué. Parte de esa sensación de que «todo baila» venía de aquí.

Ahora Olaz mide lo que dice `tokens.mascot.height` y no cambia nunca:

```js
const fit = Math.min(height / size.y, maxWidth / size.x)
```

`maxWidth` sigue haciendo falta porque un móvil es muy estrecho: se calcula una
vez desde el campo de visión de la cámara y la proporción de la pantalla, no
desde dónde está la cámara ahora.

## Medir en vez de adivinar

El cerebro que Olaz sostiene en la mano es **la puerta**: es a donde va la
cámara y por donde se entra. Su posición tiene que ser exacta.

El problema es que no hay nada a lo que agarrarse. La malla viene fusionada en
una sola pieza, sin huesos ni puntos nombrados: no puedo pedirle «dame la
posición de la mano». Lo único que tengo son unas coordenadas que ajusté a ojo
sobre el modelo, `{ x: -0.53, y: 0.23, z: 0.66 }`.

La clave es que esas coordenadas son **locales**, del propio modelo. Y como el
cerebro cuelga del mismo grupo que se escala, si el personaje crece el cerebro
crece con él y sigue en la mano. Eso sobrevive a cualquier cambio de encuadre.

Lo que no sobrevive es su posición **en el mundo**, que es la que necesita la
cámara. Así que en vez de escribirla a mano, la mido:

```js
group.updateWorldMatrix(true, false)
onAnchor(group.localToWorld(anchorLocal.clone()))
```

`localToWorld` coge un punto expresado en coordenadas del modelo y lo traduce a
coordenadas del mundo, aplicando la escala y la posición del grupo. Se hace una
vez, justo después de encuadrar, y el resultado sube hasta el recorrido de la
cámara, que se reconstruye con la posición de verdad.

El valor que hay en `tokens.handBrain` sigue ahí, pero ahora es solo el número
con el que se trabaja hasta que el modelo carga.

La regla general que saco: **si un dato depende de la geometría, se mide; solo
se escribe a mano lo que es una decisión de diseño.** Dónde quiero a Olaz es
una decisión. Dónde acaba su mano, no.

## Apagar, no desmontar

`GlowingBrain` tenía esto al final:

```js
if (fade <= 0.01) return null
```

Parece razonable: si no se ve, no lo dibujes. Pero devolver `null` en React
**desmonta** el objeto, y al volver a montarlo hay que recrear la geometría, el
material y recompilar su shader. Eso son varios frames perdidos, y justo en el
momento en que la cámara está pasando por encima.

Ahora se apaga con `visible = false`. Sigue en memoria, no se dibuja, y volver
cuesta cero. La misma regla que en `World.jsx`: nada se monta ni se desmonta
mientras se hace scroll.

## Detalles que ya estaban resueltos y he conservado

- **La mirada al cursor se mide en pantalla, no en el mundo.** Intenté tres
  veces hacerlo en 3D con `unproject` y no funcionaba: con `near 0.1` y
  `far 100`, el punto que devuelve cae a 0.4 unidades de la cámara,
  prácticamente encima, y el ángulo apenas variaba dos grados. En pantalla es
  trivial y además es lo correcto conceptualmente: «te está mirando a ti» es
  una relación entre dos puntos de la pantalla.
- **El giro está limitado a 65°.** Más allá se lee como «se ha dado la vuelta»,
  no como «te está mirando».
- **El cuerpo se inclina al girar.** Sin eso parece un maniquí sobre un plato
  giratorio.
- **Gestos de reposo a intervalos irregulares** (5,5 a 11 segundos). A intervalo
  fijo el ojo detecta el patrón enseguida y deja de leerse como espontáneo.
- **`pointer-events-none` en el texto de la portada.** Está por encima del
  canvas; sin eso se come todos los clics y el personaje deja de responder al
  cursor. Fue un bug real que costó tres intentos localizar.

## Materiales

Dos líneas, y son las que más cambian el resultado:

```js
object.material.metalness = 0
object.material.envMapIntensity = 1.25
```

El generador exporta un mapa metálico que bajo iluminación HDRI deja el coco
con brillo de plástico barato. Anulándolo y subiendo la respuesta al entorno,
el volumen aparece solo.

Y el HDRI es la pieza gorda: casi toda la luz de la escena sale de ahí. Cuando
iluminaba con tres focos sueltos los modelos se veían mal y llegué a pensar que
los assets no servían. Sí servían.

## El tirón que no era rendimiento

Durante días di por hecho que los tirones eran coste: demasiados triángulos,
demasiados efectos. Lo que me sacó del error fue un dato que parecía no
encajar: **el contador marcaba 60 fps de mínimo y aun así la cámara se paraba
a medias**.

Si van sobrados de frames, el problema no es cuánto cuesta dibujar. Es *qué* se
dibuja en cada uno. Y el fallo estaba escrito en la tabla, a la vista:

```js
{ at: 0.38, position: …, ease: 'in' },
{ at: 0.56, position: …, ease: 'in' },
```

`ease: 'in'` es `k * k`: arranca parado y termina a velocidad máxima. Dos
tramos seguidos con arranque suave significa que el primero **acaba lanzado** y
el siguiente **empieza clavado**. La cámara se detenía en seco en cada punto de
la tabla.

Lo que hay que entender es que **una animación puede pasar por todas las
posiciones correctas y aun así verse mal**, porque el ojo no lee posiciones,
lee velocidades. Un cambio brusco de velocidad se ve como un tirón aunque la
trayectoria sea perfecta.

Y había un segundo problema del mismo tipo, más escondido: los tramos tenían
duraciones parecidas pero distancias muy distintas. El tercero era **3,6 veces
más rápido** que el segundo. Eso también es un cambio de velocidad, y también
se ve.

La solución es una `CatmullRomCurve3`: una curva que pasa por todos los puntos
encadenando la velocidad y la dirección entre ellos. No hay tramos, hay un solo
vuelo. Y de paso el recorrido deja de ser una polilínea con esquinas.

```js
new CatmullRomCurve3(positions, false, 'centripetal')
```

`centripetal` importa. El Catmull-Rom normal se pasa de frenada cuando dos
puntos están muy juntos —y los dos del acercamiento al cerebro lo están—, así
que la cámara habría hecho un bucle alrededor del cerebro en vez de acercarse.
La variante centrípeta está diseñada justo para que eso no pase.

Los tiempos los he repartido según la **distancia** de cada tramo, no a ojo. El
único desequilibrio que queda es a propósito: el acercamiento es el tramo más
lento, porque es el plano en el que hay que mirar.

## Estado

- [x] Olaz en el hueco, encuadrado y sin reescalarse al acercarse
- [x] El cerebro de la mano brilla y la cámara va a su posición medida
- [x] El titular se desvanece desde el reloj, sin renders
- [x] Vuelve la pantalla de carga
- [ ] Olaz colgado en el preloader — falta la imagen sobre blanco puro

## Siguiente

Antes de la fase 2 hubo que parar a resolver los tirones del scroll, que
resultaron ser cinco problemas distintos apilados. Está contado en
[02 · El caso de los tirones](02-el-caso-de-los-tirones.md), que es la entrada
que más enseña de las tres.

Luego sí: sustituir las cajas del interior por el universo neuronal de verdad.
Fondo propio, nodos con jerarquía y conexiones con luz.

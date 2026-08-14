# 03 · El universo neuronal

> Fase 2 — se van las cajas de colores. Entra el interior de verdad.

## Lo que faltaba no eran los nodos

Los nodos ya estaban desde hacía semanas, y aun así la escena no se sostenía.
Mi diagnóstico durante todo ese tiempo fue "hay que mejorar los nodos", y era
falso. Lo que faltaba era **el sitio donde están**.

Detrás de la constelación se veía el crema de la página. Y un objeto sin
entorno siempre se lee como un recorte, por muy bien resuelto que esté: el
cerebro y los nodos no parecían estar *dentro* de nada, parecían pegados sobre
una web.

Esto es lo mismo que ya había aprendido con el HDRI en la portada, y no lo
apliqué aquí: **lo que rodea a un objeto pesa más en cómo se ve que el objeto
mismo**.

## El telón, y el truco que lo hace funcionar

El fondo es una esfera enorme centrada en el cerebro, dibujada por dentro
(`side: BackSide`) porque la cámara está metida en ella.

El detalle que decide si esto funciona o no es **dónde va el resplandor**. Un
degradado pintado sobre la esfera se movería con ella, y en cuanto la cámara
gira se nota que hay una bola ahí. Lo que quiero es que el halo esté siempre
centrado en el cerebro, mire donde mire.

Se resuelve en el sombreador con un producto escalar:

```glsl
vec3 ray = normalize(vWorld - cameraPosition);
vec3 toCenter = normalize(uCenter - cameraPosition);
float align = dot(ray, toCenter);
```

`ray` es hacia dónde mira este píxel. `toCenter` es dónde queda el cerebro
desde la cámara. El producto escalar de dos vectores normalizados **es el
coseno del ángulo que forman**: vale 1 si apuntan igual, 0 si son
perpendiculares, −1 si son opuestos.

Así que `align` responde exactamente a la pregunta "¿cuánto se acerca este
píxel a la dirección del cerebro?", y con eso el halo se calcula solo, en cada
frame, sin depender de dónde esté la cámara.

Merece la pena quedarse con esto: **el producto escalar es la herramienta
básica para "cuánto coincide una dirección con otra"**, y aparece por todas
partes en gráficos.

### Por qué no es negro

La tentación era hacer un vacío negro con puntos, que es lo que hace todo el
mundo. Pero la marca es cálida, y eso la habría convertido en otra web de tech
oscuro.

Los tonos son marrones muy profundos (`#160F0C`) con una entrada de rosa
quemado hacia el centro. Se lee como estar dentro de algo orgánico y con
temperatura, no dentro de un vacío. Es de las decisiones que menos código
llevan y más cambian el resultado.

## Jerarquía: por qué se leían como puntos

El segundo problema era que **los cinco nodos importantes eran del mismo tamaño
que el polvo del fondo**. Sin diferencia de tamaño no hay dónde mirar, y el ojo
lo interpreta como ruido en vez de como estructura.

Antes las medidas eran absolutas: `0.055` de radio, `0.34` de zona sensible.
Ahora todas salen del radio de la constelación:

```js
const nodeRadius = radius * NODE_SCALE   // 0.038
const hitRadius  = radius * HIT_SCALE    // 0.11
```

Dos cosas se arreglan de golpe. Los nodos principales pasan a ser más del doble
de grandes que antes, así que hay jerarquía; y en móvil, donde el radio es
menor, todo se encoge conservando las proporciones en vez de salirse de
pantalla.

Además cada nodo lleva ahora un halo aditivo alrededor. Un punto emisivo pelado
se lee como un píxel encendido; con halo se lee como algo que **emite** luz.

## La lección de los assets, otra vez

`brain-orb.glb` tenía **320.336 triángulos** para ser una bola de menos de dos
unidades en pantalla. Simplificado a 53.142 sin ninguna diferencia visible.

Y había ocho modelos en `public/preview/` que no usaba nadie: los cinco trozos
del montaje que descarté, dos versiones del logotipo en 3D y una pose alterna
del personaje de un millón de triángulos. **15 MB en el repositorio para nada.**

Ahora la carpeta pesa 1,4 MB. Los originales siguen en `Assets/`, que no entra
en git, así que cualquiera de esos se puede regenerar cuando haga falta.

Después de lo de la fase anterior, esto lo hice antes de escribir código en vez
de después. Va calando.

## Estado

- [x] Cerebro real flotando, con su propia luz
- [x] Fondo propio: ya es un sitio, no unos puntos sobre una web
- [x] Nodos con jerarquía y tamaño relativo al espacio
- [x] Conexiones curvas con pulsos recorriéndolas
- [x] Los pulsos obsesivos siguen ahí: van y vuelven por la misma conexión sin
      resolverse nunca. Es el guiño, y es la razón de que la web exista

## Siguiente

Fase 3: que la navegación enfoque cada nodo. Ahora te lleva al interior, pero
no al nodo concreto que has pulsado.

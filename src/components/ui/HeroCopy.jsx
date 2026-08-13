/**
 * Texto de la portada cuando el titular es la escena 3D.
 * El logotipo lo pone el modelo, así que aquí solo va lo que tiene que ser
 * texto real: el h1 para lectores de pantalla y buscadores, y el eslogan.
 */
export default function HeroCopy() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col justify-end px-6 pb-12 sm:px-10 sm:pb-16">
      <h1 className="sr-only">CocoBrain — portfolio de Alex, desarrollador web</h1>

      <div className="mx-auto w-full max-w-6xl">
        <p className="max-w-md text-balance text-xl leading-[1.3] tracking-[-0.01em] sm:text-2xl">
          Nuestra mayor <em className="not-italic text-coco-light">inspiración</em> fue una
          vez nuestra mayor <em className="not-italic text-coco-light">debilidad</em>.
        </p>

        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-coco-mid">
          Soy Alex. Construyo webs y aplicaciones, y las firmo como CocoBrain.
        </p>

        <a
          href="#contenido"
          className="mt-7 inline-block border-b-2 border-coco-dark pb-1 text-[15px] font-medium text-coco-dark transition-colors hover:border-brain-glow hover:text-brain-glow"
        >
          Ver proyectos
        </a>
      </div>
    </section>
  )
}

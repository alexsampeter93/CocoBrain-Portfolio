import PortfolioSection from './PortfolioSection'
import { PendingList } from './Pending'
import { skillGroups } from '../../data/portfolio'
import { knowledgeById } from '../../data/network'
import { knowledge } from '../../data/knowledge'

/**
 * HABILIDADES — la red, para quien no quiera recorrer la red.
 *
 * ## Los dos ejes, otra vez
 *
 * Esta sección agrupa por CATEGORÍA PROFESIONAL —Frontend, Backend, Bases de
 * datos— y la escena agrupa por FAMILIA TÉCNICA, que es la que decide el color
 * de cada nodo. Son dos clasificaciones distintas del mismo conjunto y ninguna
 * sustituye a la otra: React es `framework` para la escena y "Frontend" para
 * quien lee un currículum.
 *
 * Por eso los grupos viven en `portfolio.js` y no en `knowledge.js`, y por eso
 * `kind` no se toca. Cada grupo NOMBRA ids de la red; la red no sabe que estos
 * grupos existen.
 *
 * ## Qué pasa mientras no haya grupos
 *
 * Sin grupos definidos no se inventa una clasificación: se enseña la red entera
 * tal cual está, ordenada por peso, y se dice claramente que la agrupación
 * profesional está pendiente. Es información verdadera —esos conocimientos
 * existen y están en la escena— presentada sin fingir una estructura que nadie
 * ha decidido.
 */

function SkillGroup({ group }) {
  const items = group.knowledge
    .map((id) => knowledgeById.get(id))
    .filter(Boolean)

  return (
    <div className="border-t border-rule pt-8">
      <h3 className="text-lead font-display font-medium text-ink">{group.label}</h3>
      {group.note && <p className="mt-3 max-w-read text-body text-ink-soft">{group.note}</p>}

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
        {items.map((item) => (
          <li key={item.id} className="font-meta text-meta uppercase text-ink-faint">
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SkillsArea({ index }) {
  return (
    <PortfolioSection
      id="skills"
      act="4"
      index={index}
      label="Habilidades"
      title="Lo que sé hacer"
      /**
       * El subtítulo cambia según haya grupos declarados o no, y no es un
       * detalle de estilo: es la diferencia entre una afirmación cierta y una
       * falsa.
       *
       * Con grupos, la sección dice lo que Alex sabe hacer, porque lo ha
       * declarado él. Sin grupos, lo único que hay debajo es el inventario de
       * esta web —tecnologías que están en el repositorio, parte de ellas
       * escritas por otra mano— y presentarlas como "lo que sé hacer" sería
       * ponerle en la boca una afirmación que no ha hecho.
       */
      lead={
        skillGroups.length > 0
          ? 'Lo mismo que hay dentro del cerebro, ordenado para leerse de un vistazo.'
          : undefined
      }
    >
      {skillGroups.length > 0 ? (
        <div className="mt-area grid gap-block md:grid-cols-2">
          {skillGroups.map((group) => (
            <SkillGroup key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <div className="mt-block space-y-block">
          <PendingList
            label="agrupación profesional"
            note="Frontend, Backend, Bases de datos, Herramientas… Cada grupo nombra conocimientos de la red por su id; la clasificación técnica de la escena no se toca."
          />

          {/*
            Mientras tanto, el inventario de esta web. No es relleno —son las
            tecnologías que de verdad se usan en el repositorio— pero tampoco es
            una lista de habilidades, y el encabezado tiene que decir cuál de las
            dos cosas es.
          */}
          <div className="border-t border-rule pt-8">
            <h3 className="font-meta text-meta uppercase text-ink-faint">
              Tecnologías usadas en esta web
            </h3>
            <p className="mt-3 max-w-read text-body text-ink-faint">
              Es el inventario del proyecto, no una declaración de habilidades.
              Esa la escribe Alex arriba.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
              {[...knowledge]
                .sort((a, b) => b.weight - a.weight)
                .map((item) => (
                  <li
                    key={item.id}
                    className="font-meta text-meta uppercase"
                    // El peso se lee en la opacidad, igual que en la escena se
                    // lee en el tamaño del nodo.
                    style={{ color: item.weight === 3 ? 'var(--ink)' : 'var(--ink-faint)' }}
                  >
                    {item.label}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </PortfolioSection>
  )
}

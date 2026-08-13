import { Component } from 'react'

/**
 * Muestra el error en pantalla en vez de dejar la página en blanco.
 *
 * Un fallo dentro del Canvas deja el DOM vacío y desde fuera es
 * indistinguible de "no carga". Con esto el mensaje se lee sin abrir la
 * consola del navegador.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="fixed inset-0 z-[100] overflow-auto bg-cream p-6 sm:p-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-[13px] text-coco-mid">Ha fallado la escena</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
            {this.state.error.message || 'Error desconocido'}
          </h2>
          <pre className="mt-6 whitespace-pre-wrap break-words rounded-lg bg-coco-dark/5 p-4 text-[12px] leading-relaxed text-coco-mid">
            {this.state.error.stack}
          </pre>
        </div>
      </div>
    )
  }
}

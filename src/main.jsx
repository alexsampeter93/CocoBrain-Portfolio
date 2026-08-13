import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import './index.css'

/**
 * Captura de fallos que un error boundary de React no ve: excepciones del
 * bucle de render de WebGL, promesas rechazadas y descargas fallidas.
 *
 * Existe porque estos fallos dejan la página en blanco y desde fuera son
 * indistinguibles de "no carga". Aquí al menos sale el mensaje en pantalla.
 */
function reportFatal(message) {
  let panel = document.getElementById('cb-fatal')
  if (!panel) {
    panel = document.createElement('pre')
    panel.id = 'cb-fatal'
    panel.style.cssText =
      'position:fixed;inset:auto 0 0 0;z-index:9999;max-height:45vh;overflow:auto;margin:0;' +
      'padding:16px;background:#2B211C;color:#F5E6D3;font:12px/1.5 ui-monospace,monospace;' +
      'white-space:pre-wrap;word-break:break-word'
    document.body.appendChild(panel)
  }
  panel.textContent += `${message}\n`
}

window.addEventListener('error', (event) => {
  reportFatal(event.message || String(event.error))
})

window.addEventListener('unhandledrejection', (event) => {
  reportFatal(`Promesa rechazada: ${event.reason?.message ?? event.reason}`)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

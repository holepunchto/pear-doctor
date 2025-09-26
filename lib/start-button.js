/* eslint-env browser */

customElements.define(
  'start-button',
  class extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this._started = false
    }

    set started(value) {
      this._started = value
      this.setAttribute('started', value)
      this.render()
    }

    get started() {
      return this._started
    }

    render() {
      this.shadowRoot.innerHTML = `
      <style>
        #start-button {
          background: #151517;
          color: #B0D944;
          border: 0.0625rem solid #B0D944;
          padding: 0.35rem 0.75rem;
          border-radius: 0.3rem;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.3s ease, transform 0.2s ease;
          text-align: center;
          font-size: 0.75rem;
        }

        #start-button:hover {
          transform: translateY(-0.125rem);
        }

        #start-button:active {
          transform: translateY(0.0625rem);
        }

        #start-button:focus {
          outline: none;
        }
      </style>
      <button id="start-button">${this._started ? 'Reset' : 'Start'}</button>
    `
      this.attachEventListeners()
    }

    attachEventListeners() {
      const button = this.shadowRoot.querySelector('#start-button')
      button.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('button-click', {
            detail: { started: this._started }
          })
        )
      })
    }

    static get observedAttributes() {
      return ['started']
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'started') {
        this._started = newValue === 'true'
        this.render()
      }
    }
  }
)

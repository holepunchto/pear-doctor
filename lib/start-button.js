/* eslint-env browser */

customElements.define('start-button', class extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this._started = false
  }

  set started (value) {
    this._started = value
    this.setAttribute('started', value)
    this.render()
  }

  get started () {
    return this._started
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        #start-button {
          background: #151517;
          color: #B0D944;
          border: 1px solid #B0D944;
          padding: 0.4rem 0.8rem;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.3s ease, transform 0.2s ease;
          text-align: center;
          font-size: 0.9rem;
        }

        #start-button:hover {
          transform: translateY(-2px);
        }

        #start-button:active {
          transform: translateY(1px);
        }

        #start-button:focus {
          outline: none;
        }
      </style>
      <button id="start-button">${this._started ? 'Reset' : 'Start'}</button>
    `
    this.attachEventListeners()
  }

  attachEventListeners () {
    const button = this.shadowRoot.querySelector('#start-button')
    button.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('button-click', { detail: { started: this._started } }))
    })
  }

  static get observedAttributes () {
    return ['started']
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'started') {
      this._started = newValue === 'true'
      this.render()
    }
  }
})

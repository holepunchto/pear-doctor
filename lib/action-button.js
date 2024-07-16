/* eslint-env browser */

customElements.define('action-button', class extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.action = this.getAttribute('action') || 'default'
    this.type = this.getAttribute('type') || 'default'
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        #action-button {
          background: #151517;
          color: #b0d944;
          border: 1px solid #b0d944;
          padding: 0.4rem 0.8rem;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.3s ease, transform 0.2s ease;
          text-align: center;
          font-size: 0.9rem;
        }

        #action-button:hover {
          transform: translateY(-2px);
        }

        #action-button:active {
          transform: translateY(1px);
        }

        #action-button:focus {
          outline: none;
        }
      </style>
      <button id="action-button">${this.type} ${this.action}</button>
    `
    this.attachEventListeners()
  }

  attachEventListeners () {
    const button = this.shadowRoot.querySelector('#action-button')
    button.addEventListener('click', () => {
      this.handleButtonClick()
    })
  }

  handleButtonClick () {
    this.dispatchEvent(new CustomEvent('action-button-click', {
      detail: { action: this.action, type: this.type }
    }))
  }
})

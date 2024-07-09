/* eslint-env browser */

customElements.define('media-button', class extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.action = this.getAttribute('action') || 'status'
    this.type = this.getAttribute('type') || 'microphone'
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        #media-button {
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

        #media-button:hover {
          transform: translateY(-2px);
        }

        #media-button:active {
          transform: translateY(1px);
        }

        #media-button:focus {
          outline: none;
        }
      </style>
      <button id="media-button">${this.type} ${this.action}</button>
    `
    this.attachEventListeners()
  }

  attachEventListeners () {
    const button = this.shadowRoot.querySelector('#media-button')
    button.addEventListener('click', () => {
      this.handleButtonClick()
    })
  }

  handleButtonClick () {
    this.dispatchEvent(new CustomEvent('media-button-click', {
      detail: { action: this.action, type: this.type }
    }))
  }
})

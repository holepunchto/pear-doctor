/* eslint-env browser */

customElements.define('action-button', class extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.action = this.getAttribute('action') || ''
    this.type = this.getAttribute('type') || ''
    this.href = this.getAttribute('href') || null
    this.applink = this.getAttribute('applink') || null
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        .action-button {
          background: #151517;
          color: #b0d944;
          border: 0.0625rem solid #b0d944;
          padding: 0.35rem 0.75rem;
          border-radius: 0.3rem;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.3s ease, transform 0.2s ease;
          text-align: center;
          font-size: 0.75rem;
          display: inline-block;
          text-decoration: none;
        }

        .action-button:hover {
          transform: translateY(-0.125rem);
        }

        .action-button:active {
          transform: translateY(0.0625rem);
        }

        .action-button:focus {
          outline: none;
        }

         .action-button[href] {
          text-decoration: underline;
        }
      </style>
      ${this.href
        ? `<a id="action-button" class="action-button" href="${this.#parseLink(this.href)}">${this.type} ${this.action}</a>`
        : `<button id="action-button" class="action-button">${this.type}&nbsp;${this.action}</button>`}
    `
    this.attachEventListeners()
  }

  attachEventListeners () {
    const button = this.shadowRoot.querySelector('#action-button')
    if (this.href) {
      button.addEventListener('click', (event) => {
        this.handleButtonClick(event)
      })
    } else {
      button.addEventListener('click', () => {
        this.handleButtonClick()
      })
    }
  }

  handleButtonClick (event) {
    if (!this.href) {
      this.dispatchEvent(new CustomEvent('action-button-click', {
        detail: { action: this.action, type: this.type }
      }))
    }
  }

  #parseLink (link) {
    const pattern = '[app-key]'
    if (link.includes(pattern) && this.applink) return link.replace(pattern, this.applink)
  }
})

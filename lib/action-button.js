/* eslint-env browser */

customElements.define(
  'action-button',
  class extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.icon = this.getAttribute('icon') || ''
      this.action = this.getAttribute('action') || ''
      this.type = this.getAttribute('type') || ''
      this.href = this.getAttribute('href') || null
      this.applink = this.getAttribute('applink') || null
    }

    connectedCallback() {
      this.render()
      this.attachEventListeners()
    }

    disconnectedCallback() {
      this.removeEventListeners()
    }

    render() {
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

        .mr {
          margin-right: 0.5rem;
        }
      </style>
      ${
        this.href
          ? `<a id="action-button" class="action-button" href="${this.#parseLink(this.href)}">${this.type} ${this.action}</a>`
          : `<button id="action-button" class="action-button">${this.icon ? `<span class="icon mr">${this.icon}</span>` : ''}${this.type}&nbsp;${this.action}</button>`
      }
    `
    }

    attachEventListeners() {
      this.removeEventListeners()

      const button = this.shadowRoot.querySelector('#action-button')
      button.addEventListener('click', (event) => {
        this.handleButtonClick(event)
      })
    }

    removeEventListeners() {
      const button = this.shadowRoot.querySelector('#action-button')
      if (button) {
        button.removeEventListener('click', this.handleButtonClick.bind(this))
      }
    }

    handleButtonClick(event) {
      if (!this.href) {
        this.dispatchEvent(
          new CustomEvent('action-button-click', {
            detail: { action: this.action, type: this.type }
          })
        )
      }
    }

    #parseLink(link) {
      const pattern = '[app-key]'
      if (link.includes(pattern) && this.applink) return link.replaceAll(pattern, this.applink)
      return link
    }
  }
)

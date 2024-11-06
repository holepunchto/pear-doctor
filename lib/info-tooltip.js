/* eslint-env browser */

customElements.define('info-tooltip', class extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.applink = this.getAttribute('applink') || null
  }

  set infoText (value) {
    this._infoText = value
    this.render()
  }

  get infoText () {
    return this._infoText
  }

  sanitize (html) {
    const template = document.createElement('template')
    template.innerHTML = html
    return template.content.cloneNode(true)
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        .info-container {
          position: relative;
          margin-right: 2rem;
        }

        .info-icon {
          background: #151517;
          color: #B0D944;
          border: 0.0625rem solid #B0D944;
          border-radius: 50%;
          padding: 0.0625rem 0.25rem;
          font-size: 0.625rem;
          font-weight: bold;
          cursor: pointer;
          user-select: none;
          z-index: 1;
        }

        .tooltip-text {
          visibility: hidden;
          width: 20rem; /* Fixed width */
          background-color: #151517;
          color: #B0D944;
          text-align: center;
          border-radius: 0.3rem;
          padding: 0.3rem;
          position: absolute;
          bottom: 125%;
          left: 50%;
          margin-left: -10rem;
          opacity: 0;
          transition: opacity 0.3s;
          border: 0.0625rem solid #B0D944;
          white-space: break-spaces;
          z-index: 99;
        }

        @media (max-width: 768px) {
          .tooltip-text {
            width: 60vw;
            margin-left: -30vw;
          }
        }

        .info-container:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
          padding: 1rem;
        }

        a, a:visited, a:hover, a:active {
          color: #B0D944;
        }
      </style>
      <div class="info-container">
        <span class="info-icon">i</span>
        <span class="tooltip-text"></span>
      </div>
    `

    const tooltip = this.shadowRoot.querySelector('.tooltip-text')
    tooltip.innerHTML = ''
    tooltip.appendChild(this.sanitize(this.#parseLink(this.infoText)))

    const icon = this.shadowRoot.querySelector('.info-icon')
    icon.addEventListener('mouseover', () => this.#setPosition())
    icon.addEventListener('focus', () => this.#setPosition())
  }

  #setPosition () {
    const tooltip = this.shadowRoot.querySelector('.tooltip-text')

    tooltip.style.left = '50%'
    tooltip.style.marginLeft = window.innerWidth <= 768 ? '-30vw' : '-10rem'
    tooltip.style.right = 'auto'
    tooltip.style.top = 'auto'
    tooltip.style.bottom = '125%'

    setTimeout(() => {
      const boundingRect = tooltip.getBoundingClientRect()
      const iconRect = this.shadowRoot.querySelector('.info-icon').getBoundingClientRect()

      if (boundingRect.right > window.innerWidth) {
        tooltip.style.left = 'auto'
        tooltip.style.right = '0'
        tooltip.style.marginLeft = '0'
      }

      if (boundingRect.left < 0) {
        tooltip.style.left = '0'
        tooltip.style.marginLeft = '0'
      }

      if (iconRect.top < boundingRect.height) {
        tooltip.style.bottom = 'auto'
        tooltip.style.top = '125%'
      }
    }, 0)
  }

  static get observedAttributes () {
    return ['info-text']
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'info-text') {
      this.infoText = newValue
    }
  }

  connectedCallback () {
    this.render()
  }

  #parseLink (link) {
    const pattern = '[app-key]'
    if (link.includes(pattern) && this.applink) return link.replaceAll(pattern, this.applink)
  }
})

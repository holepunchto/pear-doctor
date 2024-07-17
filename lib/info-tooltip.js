/* eslint-env browser */

customElements.define('info-tooltip', class extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
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
        .tooltip-container {
          position: relative;
          display: inline-block;
          transform: translateY(-66%);
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
        }

        .tooltip-text {
          visibility: hidden;
          width: 25rem;
          background-color: #151517;
          color: #B0D944;
          text-align: center;
          border-radius: 0.3rem;
          padding: 0.3rem;
          position: absolute;
          bottom: 125%;
          left: 50%;
          margin-left: -6.25rem;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .tooltip-container:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
          border: 0.0625rem solid #B0D944;
          padding: 1rem;
          z-index: 10;
        }

        a, a:visited, a:hover, a:active {
          color: #B0D944;
        }
      </style>
      <div class="tooltip-container">
        <span class="info-icon">i</span>
        <span class="tooltip-text">${this.infoText}</span>
      </div>
    `
    const tooltip = this.shadowRoot.querySelector('.tooltip-text')
    tooltip.innerHTML = ''
    tooltip.appendChild(this.sanitize(this.infoText))
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
})

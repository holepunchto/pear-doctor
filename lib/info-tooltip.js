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
          border: 1px solid #B0D944;
          border-radius: 50%;
          padding: 1px 3px;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          user-select: none;
        }

        .tooltip-text {
          visibility: hidden;
          width: 400px;
          background-color: #151517;
          color: #B0D944;
          text-align: center;
          border-radius: 5px;
          padding: 5px;
          position: absolute;
          bottom: 125%;
          left: 50%;
          margin-left: -100px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .tooltip-container:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
          border: 1px solid #B0D944;
          padding: 1rem;
          z-index: 10;
        }
      </style>
      <div class="tooltip-container">
        <span class="info-icon">i</span>
        <span class="tooltip-text">${this.infoText}</span>
      </div>
    `
    this.shadowRoot.querySelector('.tooltip-text').textContent = this.infoText
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

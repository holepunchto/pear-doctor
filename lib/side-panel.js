/* eslint-env browser */

customElements.define('side-panel', class extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        .side-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          user-select: none;
        }
        .version {
          font-size: 0.8rem;
          color: #b0d944;
          margin-top: 0.5rem;
        }
        .logo {
          transform: scale(3);
          position: fixed;
          bottom: 200px;
          right: 150px;
          z-index: -1;
        }
      </style>
      <div class="side-panel">
        <div class="logo"><img id="mode" src="/assets/logo.svg"/></div>
      </div>
    `
  }
})

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
          transform: scale(2.3);
          position: fixed;
          bottom: 8rem;
          right: 8rem;
          z-index: -1;
          display: block;
        }
        @media (min-width: 1300px) {
          .logo {
            transform: scale(2.3);
          }
        }
        @media (min-width: 1199px) and (max-width: 1299px) {
          .logo {
            transform: scale(2.2);
          }
        }
        @media (min-width: 1099px) and (max-width: 1199px) {
          .logo {
            transform: scale(2.1);
          }
        }
        @media (min-width: 999px) and (max-width: 1099px) {
          .logo {
            transform: scale(2.0);
          }
        }
        @media (max-width: 999px) {
          .logo {
             display: none;
          }
        }
      </style>
      <div class="side-panel">
        <div class="logo"><img id="mode" src="/assets/logo.svg"/></div>
      </div>
    `
  }
})

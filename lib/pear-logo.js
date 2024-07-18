/* eslint-env browser */

customElements.define('pear-logo', class extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.render()
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
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
          user-select: none;
        }
        @media (min-width: 1300px) {
          .logo {
            transform: scale(2.2);
            opacity: 1;
          }
        }
        @media (min-width: 1199px) and (max-width: 1299px) {
          .logo {
            transform: scale(2.15);
            opacity: 1;
          }
        }
        @media (min-width: 1099px) and (max-width: 1199px) {
          .logo {
            transform: scale(2.1);
            opacity: 1;
          }
        }
        @media (min-width: 999px) and (max-width: 1099px) {
          .logo {
            transform: scale(2.05);
            opacity: 1;
          }
        }
        @media (min-width: 999px) and (max-width: 1099px) {
          .logo {
            transform: scale(2.0);
            opacity: 1;
          }
        }
        @media (min-width: 899px) and (max-width: 999px) {
          .logo {
            transform: scale(1.95);
            opacity: 0.5;
          }
        }
        @media (min-width: 799px) and (max-width: 899px) {
          .logo {
            transform: scale(1.90);
            opacity: 0.4;
          }
        }
        @media (min-width: 699px) and (max-width: 799px) {
          .logo {
            transform: scale(1.85);
            opacity: 0.3;
          }
        }
        @media (max-width: 699px) {
          .logo {
            transform: scale(1.80);
            opacity: 0.2;
          }
        }
      </style>
      <div class="logo">
        <img id="mode" src="/assets/logo.svg"/>
      </div>
    `
  }
})

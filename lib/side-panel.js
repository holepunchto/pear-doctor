/* eslint-env browser */

class SidePanel extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.render()
  }

  set os (value) {
    this._os = value
    this.render()
  }

  get os () {
    return this._os
  }

  set platform (value) {
    this._platform = value
    this.render()
  }

  get platform () {
    return this._platform
  }

  set app (value) {
    this._app = value
    this.render()
  }

  get app () {
    return this._app
  }

  render () {
    this.shadowRoot.innerHTML = `
      <style>
        .side-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem;
          user-select: none;
        }
        .version {
          font-size: 0.8rem;
          color: #b0d944;
          margin-top: 0.5rem;
        }
        .logo {
          margin-bottom: 0.5rem;
        }
      </style>
      <div class="side-panel">
        <div class="logo"><img id="mode" src="/assets/logo.svg"/></div>
        <div id="os-version" class="version">${this.os || ''}</div>
        <div id="platform-version" class="version">${this.platform || ''}</div>
        <div id="app-version" class="version">${this.app || ''}</div>
      </div>
    `
  }
}

customElements.define('side-panel', SidePanel)

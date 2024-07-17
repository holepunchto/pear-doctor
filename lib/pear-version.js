/* eslint-env browser, node */

import os from 'os'

customElements.define('pear-version', class extends HTMLElement {
  constructor () {
    super()
    this.template = document.createElement('template')
    this.template.innerHTML = `
      <style>
        :host > div {
          position: fixed;
          top: 4rem;
          right: 2rem;
          font-size: .6rem;
          background: #1a1a1a;
          color: white;
          opacity: 1;
          padding: 0.5rem;
          padding-top: 0;
          padding-bottom: 0;
          border-radius: .35rem;
          border: 0.0625rem solid #3a4816;
          transition: top 0.3s;
          display: block;
          min-width: 16rem;
        }
      </style>
      <div>
        <p id="platform-version"></p>
        <p id="app-version"></p>
        <p id="os-version"></p>
      </div>
    `
    this.root = this.attachShadow({ mode: 'open' })
    this.root.appendChild(this.template.content.cloneNode(true))
  }

  connectedCallback () {
    if (!this.osVersion) this.osVersion = `${os.platform()} ${os.arch()} ${os.release()}`
  }

  get platformVersion () {
    return this.shadowRoot.querySelector('#platform-version').innerText
  }

  get appVersion () {
    return this.shadowRoot.querySelector('#app-version').innerText
  }

  get osVersion () {
    return this.shadowRoot.querySelector('#os-version').innerText
  }

  set platformVersion (value) {
    this.root.querySelector('#platform-version').innerText = `Pear Runtime ${value}`
  }

  set appVersion (value) {
    this.root.querySelector('#app-version').innerText = `Pear Doctor ${value}`
  }

  set osVersion (value) {
    this.root.querySelector('#os-version').innerText = `OS Platform ${value}`
  }
})

/* eslint-env browser */

customElements.define('pear-version', class extends HTMLElement {
  constructor () {
    super()
    this.template = document.createElement('template')
    this.template.innerHTML = `
      <style>
        :host > div {
          position: fixed;
          top: 96vh;
          font-size: .6rem;
          background: #1a1a1a;
          color: white;
          opacity: 1;
          padding: 8px;
          padding-top: 0px;
          padding-bottom: 0px;
          border-radius: .35rem;
          border: 1px solid #3a4816;
          transition: top 0.3s;
          display: block;
        }

        :host > div:hover {
          top: 92vh;
          transition: top 0.3s;
        }
      </style>
      <div>
        <p id="platform-version"></p>
        <p id="app-version"></p>
      </div>
    `
    this.root = this.attachShadow({ mode: 'open' })
    this.root.appendChild(this.template.content.cloneNode(true))
  }

  get platformVersion () {
    return this.shadowRoot.querySelector('#platform-version').innerText
  }

  get appVersion () {
    return this.shadowRoot.querySelector('#app-version').innerText
  }

  set platformVersion (value) {
    this.root.querySelector('#platform-version').innerText = `Pear Runtime ${value}`
  }

  set appVersion (value) {
    this.root.querySelector('#app-version').innerText = `Pear Doctor ${value}`
  }
})

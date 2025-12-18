/* eslint-env browser */
/* global customElements */

customElements.define(
  'pear-links',
  class PearLinks extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.shadowRoot.innerHTML = `
          <style>
            ul {
              list-style-type: none;
              display: none;
            }
            ul.enabled {
              display: block;
            }
            li {
              margin-bottom: 1em;
            }
            div {
              margin-bottom: 1em;
            }
            label {
              padding-left: 2.5rem;
            }
            input[type="text"] {
              width: 25rem;
            }
            .app-key-input-container {
              margin-top: 3em;
              margin-bottom: 2em;
            }
          </style>
          <div class="app-key-input-container">
            <label for="app-key"><strong>Enter Pear Doctor &lt;app-key&gt;: </strong></label>
            <input type="text" id="app-key" name="app-key" />
          </div>
          <div>
            <ul id="link-list">
              <li>
                <strong>Link:</strong>
                <a id="link1" href="#">pear://&lt;app-key&gt;</a>
              </li>
              <li>
                <strong>Fragment:</strong>
                <a id="link2" href="#">pear://&lt;app-key&gt;/#fragment</a>
              </li>
              <li>
                <strong>Entrypoint:</strong>
                <a id="link3" href="#">pear://&lt;app-key&gt;/nested/entrypoint.html</a>
              </li>
              <li>
                <strong>Entrypoint fragment:</strong>
                <a id="link4" href="#">pear://&lt;app-key&gt;/nested/entrypoint.html#fragment</a>
              </li>
            </ul>
          </div>
        `

      this.shadowRoot
        .querySelector('#app-key')
        .addEventListener('input', this.updateLinks.bind(this))
    }

    updateLinks(event) {
      const appKey = event.target.value
      const linkList = this.shadowRoot.querySelector('#link-list')

      if (appKey.trim() !== '') {
        linkList.classList.add('enabled')
      } else {
        linkList.classList.remove('enabled')
      }

      this.shadowRoot.querySelector('#link1').href = `pear://${appKey}`
      this.shadowRoot.querySelector('#link2').href = `pear://${appKey}/#fragment`
      this.shadowRoot.querySelector('#link3').href = `pear://${appKey}/nested/entrypoint.html`
      this.shadowRoot.querySelector('#link4').href =
        `pear://${appKey}/nested/entrypoint.html#fragment`
      this.shadowRoot.querySelector('#link5').href =
        `pear://${appKey}/xeb7mugj8sbaytkf5qqu9z1snegtibqneysssdqu35em4zw3ou9wcmz8ha4er6e759tams9eeebo6j6ueifyb4oaeohnijbyxfzessxjneaqs8ux`
    }

    createElement(html) {
      const template = document.createElement('template')
      template.innerHTML = html
      this.shadowRoot.appendChild(template.content.cloneNode(true))
    }
  }
)

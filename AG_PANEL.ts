// ==UserScript==
// @name         爱果面板TS重制版
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://pc.xuexi.cn/points/my-points.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=xuexi.cn
// @grant        none
// ==/UserScript==

;(() => {
  'use strict'
  // 爱果接口
  interface IAGResponse<T> {
    code: number
    msg: string
    data: T | undefined
  }

  type UserInfo = {
    uid: number
    nick: string
    avatarMediaUrl: string
    gmtActive: number
    orgIds: []
    info?: string
    hint?: string
  }

  interface IAGRequest {
    request<T = any>(url: string, options: requestOptions): Promise<T>
  }

  type requestOptions = {
    type: 'get' | 'post'
    data?: object
    baseUrl?: string
    credentials?: RequestCredentials
  }

  class AGRequest<T> implements IAGRequest {
    private static instance: AGRequest<IAGResponse<Object>>
    private constructor() {}

    static getInstance(): AGRequest<IAGResponse<Object>> {
      if (!AGRequest.instance) {
        AGRequest.instance = new AGRequest()
      }
      return AGRequest.instance
    }

    async request<T = any>(url: string, options: requestOptions = { type: 'get' }): Promise<T> {
      const { baseUrl, type, data, credentials } = options
      const body: RequestInit = {
        method: type,
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: credentials,
      }

      if (options.type.toUpperCase() !== 'GET') {
        body.body = JSON.stringify(data)
      }
      let resData
      try {
        const response = await fetch(baseUrl ? baseUrl : `http://127.0.0.1:4523/m1/2172851-0-default/AG${url}`, body)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        resData = await response.json()
        if (!resData || typeof resData !== 'object') {
          throw new Error('Unexpected response data format')
        }
      } catch (error) {
        console.error(error)
      } finally {
        return resData
      }
    }
  }

  // 爱果存储
  class AGStorage {
    private static PREFIX = 'AG_STORAGE_'

    static set(key: string, value: number | string | object, type: 'local' | 'session' = 'local'): void {
      key = AGStorage.PREFIX.concat(key.toUpperCase())
      if (value instanceof Object && value !== null) value = JSON.stringify(value)
      type === 'local' ? localStorage.setItem(key, String(value)) : sessionStorage.setItem(key, String(value))
    }

    static append(key: string, value: number | string | object, type: 'local' | 'session' = 'local'): void {
      const storage = this.get(key, type, true)
      if (storage === undefined) this.set(key, value, type)
      if (value instanceof Object && value !== null) {
        const newObject = Object.assign({}, storage, value)
        this.set(key, newObject, type)
      }
    }

    static get(key: string, type: 'local' | 'session' = 'local', parse: boolean = false): string | object | null {
      key = AGStorage.PREFIX.concat(key.toUpperCase())
      const result = type === 'local' ? localStorage.getItem(key) : sessionStorage.getItem(key)
      return parse && result ? JSON.parse(result) : result
    }

    static increase(key: string, type: 'local' | 'session'): number {
      const value = Number(this.get(key))
      if (isNaN(value)) throw new Error('error:非数字不可自增')
      this.set(key, value + 1, type)
      return Number(this.get(key))
    }

    static remove(key: string, type: 'local' | 'session'): void {
      key = AGStorage.PREFIX.concat(key.toUpperCase())
      type === 'local' ? localStorage.removeItem(key) : sessionStorage.removeItem(key)
    }
    static clear(): void {
      const handler = (instance: Storage) => {
        Object.keys(instance).forEach((item) => {
          if (item.startsWith(AGStorage.PREFIX)) {
            instance.removeItem(item)
          }
        })
      }
      handler(localStorage)
      handler(sessionStorage)
    }
  }

  // 爱果元素
  abstract class AAGElement {
    protected abstract setStyle(attributes: { [key: string]: string }, important: 'important' | undefined): boolean

    protected abstract setText(text: string): void

    protected abstract setAttr(key: string, value: boolean | string | number): void

    protected abstract getStyle(...attributes: Array<string>): {
      [key: string]: string
    }
    protected abstract getAttr(key: string): string

    protected abstract elementMountTo(
      mountElement: AGElement | HTMLElement,
      append: boolean,
      position: 'top' | 'bottom' | 'insert',
      insertBefore?: HTMLElement | AGElement,
    ): boolean

    protected abstract toHTMLElement(): HTMLElement
  }

  class AGElement extends AAGElement {
    private element: HTMLElement

    // 建造者模式
    public static builder(
      tagOrSelector: HTMLElement | string,
      tagClass?: string,
      tagId?: string,
      tagAttributes?: { [key: string]: string },
    ) {
      const builder = class AGElementBuilder {
        private instance: AGElement
        constructor(
          tagOrSelector: HTMLElement | string,
          tagClass?: string,
          tagId?: string,
          tagAttributes?: { [key: string]: string },
        ) {
          this.instance = new AGElement(tagOrSelector, tagClass, tagId, tagAttributes)
        }

        attr(key: string, value: boolean | string | number) {
          this.instance.setAttr(key, String(value))
          return this
        }
        style(attributes: { [key: string]: string }, important: 'important' | undefined = 'important') {
          this.instance.setStyle(attributes)
          return this
        }
        text(text: string) {
          this.instance.setText(text)
          return this
        }

        build() {
          return this.instance
        }
      }

      return new builder(tagOrSelector, tagClass, tagId, tagAttributes)
    }

    constructor(
      tagOrSelector: HTMLElement | string,
      tagClass?: string,
      tagId?: string,
      tagAttributes?: { [key: string]: string },
    ) {
      super()
      let element: HTMLElement | null = null
      if (tagOrSelector instanceof HTMLElement) {
        element = tagOrSelector
      } else if (typeof tagOrSelector === 'string') {
        if (
          tagOrSelector.startsWith('.') ||
          tagOrSelector.startsWith('#') ||
          (tagOrSelector.startsWith('[') && tagOrSelector.endsWith(']'))
        )
          element = document.querySelector(tagOrSelector)
        else element = document.createElement(tagOrSelector)
      }
      this.element = element as HTMLElement
      if (tagClass) this.element.setAttribute('class', tagClass)
      if (tagId) this.element.setAttribute('id', tagId)
      if (tagAttributes) {
        for (const key in tagAttributes) {
          if (tagAttributes.hasOwnProperty(key)) {
            this.element.setAttribute(key, tagAttributes[key])
          }
        }
      }
    }

    setAttr(key: string, value: boolean | string | number): void {
      this.element.setAttribute(key, String(value))
    }

    setStyle(attributes: { [key: string]: string }, important: 'important' | undefined = 'important'): boolean {
      const keys = Object.keys(attributes)
      if (!keys.length) return false
      for (const key of keys) {
        if (key in this.element.style) {
          this.element.style.setProperty(key.replace(/([A-Z])/g, '-$1').toLowerCase(), attributes[key], important)
        }
      }
      return true
    }

    setText(text: string): void {
      this.element.innerHTML = text
    }

    getStyle(...attributes: Array<string>): { [key: string]: string } {
      if (!attributes.length) return {}
      const result: { [key: string]: string } = {}
      const elementStyle = window.getComputedStyle(this.element, null)
      for (const key of attributes) {
        switch (key) {
          case 'innerHTML':
            result[key] = this.element.innerHTML
            break
          case 'textContent':
            result[key] = this.element.textContent || ''
            break
          case 'innerText':
            result[key] = this.element.innerText
            break
          default:
            const camelKey = key.replace(/-([a-z])/g, (match, letter) => {
              return letter.toUpperCase()
            })
            if (Object.prototype.hasOwnProperty.call(elementStyle, camelKey)) {
              result[camelKey] = elementStyle.getPropertyValue(key)
            }
        }
      }
      return result
    }

    getAttr(key: string) {
      return this.element.getAttribute(key) as string
    }

    elementMountTo(
      mountElement: HTMLElement | AGElement,
      append: boolean = false,
      position: 'top' | 'bottom' | 'insert' = 'bottom',
      insertBefore?: HTMLElement | AGElement,
    ): boolean {
      if (!mountElement) return false
      if (mountElement instanceof AGElement) mountElement = mountElement.element
      if (insertBefore && insertBefore instanceof AGElement) insertBefore = insertBefore.element
      if (!append) {
        let selector = ''
        if (this.element.id) selector = `#${this.element.id}`
        if (this.element.className) {
          selector = this.element.className
            .split(' ')
            .map((className) => `.${className}`)
            .join('')
        }
        if (selector) document.querySelectorAll(selector).forEach((item) => item.remove())
      }
      switch (position) {
        case 'top':
          mountElement.prepend(this.element)
          break
        case 'bottom':
          mountElement.append(this.element)
          break
        case 'insert':
          if (insertBefore) {
            mountElement.insertBefore(this.element, insertBefore)
          } else new Error('error:insertBefore cannot be empty...')
          break
      }
      return true
    }

    toHTMLElement() {
      return this.element
    }

    static elementsMountTo(
      elements: Array<AGElement | HTMLElement>,
      mountElement: AGElement | HTMLElement,
      position: 'top' | 'bottom' | 'insert' = 'bottom',
      insertBefore?: HTMLElement | AGElement,
    ): boolean {
      if (!mountElement || !elements) return false
      elements.forEach((element) => {
        if (element instanceof AGElement) element = element.element
        if (mountElement instanceof AGElement) mountElement = mountElement.element
        if (insertBefore && insertBefore instanceof AGElement) insertBefore = insertBefore.element
        switch (position) {
          case 'top':
            mountElement.prepend(element)
            break
          case 'bottom':
            mountElement.append(element)
            break
          case 'insert':
            if (insertBefore) {
              mountElement.insertBefore(element, insertBefore)
            } else {
              throw new Error('error:insertBefore cannot be empty...')
            }
            break
        }
      })

      return true
    }

    static setStyles(
      elements: Array<AGElement | HTMLElement>,
      attributes: { [key: string]: string },
      important: 'important' | undefined = 'important',
    ) {
      const keys = Object.keys(attributes)
      if (!keys.length) return false
      elements.forEach((element) => {
        if (element instanceof AGElement) element = element.element
        for (const key of keys) {
          if (key in element.style) {
            element.style.setProperty(key.replace(/([A-Z])/g, '-$1').toLowerCase(), attributes[key], important)
          }
        }
      })

      return true
    }
  }

  // 爱果方法
  abstract class AAGMethods {
    protected abstract handlerAGError(): void
    protected abstract registerAGMessageListenerHandler(callback: (e: MessageEvent<any>) => {}): void
    protected abstract sendMessageToAGMessageListenerHandler(message: string): void

    protected abstract scrollElementIntoView(element: HTMLElement): void
    protected abstract waitForElement(selector: string): void
    protected abstract popup(message: string, title: string): void
  }

  class AGMethods extends AAGMethods {
    private popupElement: AGElement | undefined

    handlerAGError(): void {
      window.addEventListener('error', (event: ErrorEvent) => {
        console.error(event.error)
      })

      window.addEventListener('unhandledrejection', (event) => {
        console.error(event.reason)
      })
    }

    registerAGMessageListenerHandler(callback: (e: MessageEvent<any>) => {}): void {
      window.addEventListener('message', (e: MessageEvent<any>) => callback(e), false)
    }

    sendMessageToAGMessageListenerHandler(message: string): void {
      window.parent.postMessage(message, '*')
    }

    scrollElementIntoView(element: HTMLElement): void {
      const rect = element.getBoundingClientRect()
      const elementTop = rect.top + window.pageYOffset
      const viewportHeight = window.innerHeight
      const scrollY = elementTop - viewportHeight / 2 + rect.height / 2
      window.scrollTo(0, scrollY)
    }

    waitForElement(selector: string): Promise<unknown> {
      return new Promise((resolve) => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
              if (document.querySelector(selector)) {
                observer.disconnect()
                resolve(true)
              }
            }
          })
        })
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        })
      })
    }

    popup(message: string, title: string = '爱果'): void {
      if (!this.popupElement) {
        const ele = document.querySelector('.ag-popup') as HTMLElement
        this.popupElement = ele ? new AGElement(ele) : new AGElement('div', 'ag-popup')
        this.popupElement.elementMountTo(document.body, true)
      }

      const apPopupContent = new AGElement('div')
      const closeSpanEle = new AGElement('span')
      closeSpanEle.setText('×')

      const titleH3Ele = new AGElement('h3')
      titleH3Ele.setText(title)
      const messagePEle = new AGElement('p')
      messagePEle.setText(message)

      closeSpanEle.elementMountTo(apPopupContent)
      titleH3Ele.elementMountTo(apPopupContent)
      messagePEle.elementMountTo(apPopupContent)
      apPopupContent.elementMountTo(this.popupElement)

      let timer: number

      closeSpanEle.toHTMLElement().onclick = () => {
        console.log('关闭...')
        if (timer) {
          clearTimeout(timer)
          timer = 0
        }
        apPopupContent.toHTMLElement().remove()
      }

      timer = setTimeout(() => {
        apPopupContent.toHTMLElement().remove()
      }, 3000)
    }
  }

  // 爱果组件
  abstract class AAGComponent {
    protected abstract getInputsData(): object

    protected abstract saveToStorage(type: 'local' | 'session'): void

    protected abstract get instance(): AGElement
  }

  class AGComponent {
    static Form = class Form extends AAGComponent {
      private form: AGElement
      private inputs: { [key: string]: AGElement } = {}

      constructor() {
        super()
        this.form = new AGElement('form', 'ag-form')
      }

      addInput(
        type: string,
        labelText?: string,
        value?: string | number,
        name?: string,
        id?: string,
        checkboxLabelText?: string,
        checkboxValue?: boolean,
      ): boolean {
        const input = AGElement.builder('input')
          .attr('type', type)
          .attr('value', value ? value.toString() : '')
          .build()

        if (id) input.setAttr('id', id)
        if (name) input.setAttr('name', name)
        this.inputs[labelText || id || `input-${Object.keys(this.inputs).length}`] = input

        const line = new AGElement('div', 'form-line')

        const label = AGElement.builder('label')
          .text(labelText || '')
          .build()

        label.elementMountTo(line)
        input.elementMountTo(line)

        if (checkboxLabelText) {
          const checkbox = new AGElement('input')

          input.toHTMLElement().oninput = (e) => {
            const value = (e.target as HTMLInputElement).value
            if (value) checkbox.toHTMLElement().removeAttribute('disabled')
            else {
              ;(checkbox.toHTMLElement() as HTMLInputElement).checked = false
              checkbox.setAttr('disabled', 'true')
            }
          }

          checkbox.setAttr('type', 'checkbox')
          const checkboxLabel = AGElement.builder('label').text(checkboxLabelText).build()

          if (checkboxValue) (checkbox.toHTMLElement() as HTMLInputElement).checked = checkboxValue
          if (!(input.toHTMLElement() as HTMLInputElement).value) checkbox.setAttr('disabled', 'true')
          const checkboxContainer = new AGElement('div')
          checkbox.elementMountTo(checkboxContainer)
          checkboxLabel.elementMountTo(checkboxContainer)
          checkboxContainer.elementMountTo(line)
        }

        line.elementMountTo(this.form)
        return true
      }

      getInputsData(): {
        [key: string]: { value: string; checkbox: boolean }
      } {
        const result: {
          [key: string]: { value: string; checkbox: boolean }
        } = {}
        Object.keys(this.inputs).forEach((key) => {
          const ele = this.inputs[key].toHTMLElement() as HTMLInputElement
          const checkboxEle = ele.nextElementSibling?.firstChild as HTMLInputElement
          result[key] = {
            value: ele.value,
            checkbox: checkboxEle ? checkboxEle?.checked : false,
          }
        })
        return result
      }

      saveToStorage(type: 'local' | 'session' = 'local'): void {
        AGStorage.append('form_settings', this.getInputsData(), type)
      }

      get instance() {
        return this.form
      }
    }

    static Table = class Table extends AAGComponent {
      private table: AGElement
      private headers: Array<string> = []
      private rows: Array<Array<string | AGElement | HTMLInputElement>> = []

      constructor() {
        super()
        this.table = new AGElement('table', 'ag-table')
      }

      addHeader(...header: Array<string>) {
        this.headers = header
        const headerRow = new AGElement('tr')
        header.forEach((headerText) => {
          const headerCell = new AGElement('th')
          headerCell.setText(headerText)
          headerCell.elementMountTo(headerRow)
        })
        headerRow.elementMountTo(this.table)
      }

      addRow(...row: Array<string | AGElement | HTMLInputElement>) {
        this.rows.push(row)
        const rowElement = new AGElement('tr')
        row.forEach((cellItem) => {
          const cell = new AGElement('td')
          if (cellItem instanceof HTMLInputElement) new AGElement(cellItem).elementMountTo(cell)
          else if (cellItem instanceof AGElement) cellItem.elementMountTo(cell)
          else cell.setText(cellItem)
          cell.elementMountTo(rowElement)
        })
        rowElement.elementMountTo(this.table)
      }

      getInputsData() {
        const inputsData: { [key: string]: boolean } = {}
        for (const element of this.rows) {
          const label = element[0] as string
          const checkbox =
            element[1] instanceof AGElement ? (element[1].toHTMLElement() as HTMLInputElement).checked : false
          inputsData[label] = checkbox
        }
        return inputsData
      }

      saveToStorage(type: 'local' | 'session' = 'local'): void {
        AGStorage.append('table_settings', this.getInputsData(), type)
      }

      get instance() {
        return this.table
      }
    }
  }

  // 爱果样式
  abstract class AAGStyles {
    protected abstract mount(): void
  }

  class AGStyles extends AAGStyles {
    private AGStyles: string = `
        .ag-panel{
          font-size: 15px;
          width: 25px;
          height: 450px;
          position: fixed;
          z-index: 9999;
          left: 0;
          top: 0;
          background-color: #121212;
          border: 1px solid #434343;
          transition: width 0.5s ease;
          display: flex;
          color: #999999;
          border-radius: 0 5px 5px 0;
        }

        div.ag-menu-button{
          background-color: #121212;
          width: 25px;
          height: 100%;
          display: inline-flex;
          align-items: center;
          text-align: center;
          cursor: pointer;
          position: absolute;
          right: 0;
          top: 0;
          font-weight: bold;
          border-left: 1px solid #434343;
          border-radius: 0 5px 5px 0;
      }

        div.ag-popup{
          position: fixed;
          z-index: 99999;
          top: 0;
          max-width: 350px;
        }

        div.ag-popup>div{
          background-color: #121212e6;
          color: #ffffffe3;
          margin:10px;
          border: 1px solid  rgb(144 144 144) !important;
          border-radius:8px;
          min-width:300px;
          overflow: hidden;
        }

        div.ag-popup>div>span{
           position: absolute;
           right: 15px;
           font-size:20px;
           cursor:pointer;
        }

        div.ag-popup>div>h3{
          display: flex;
          justify-content:center;
          font-weight:bold;
          color:#ffffffe3;
          padding:3px;
          letter-spacing:5px;
          background-color:#292929;
        }

        div.ag-popup>div>p{
          padding:0 15px;
          margin-bottom:5px;
        }

        li.ag-options[ag-active="true"] { color:orange;  }
        li.ag-options:hover { color:orange; }
        li.ag-options { color:#999999; }
        .ag-row-margin-10 { margin:10px 0;}

        .ag-form {
          display: flex;
          flex-wrap:wrap;
        }

        .ag-form .form-line{
          margin:8px 5px;
          height:30px;
        }

        .ag-form .form-line div{
          position:relative;
          top:-25px;
          left:130px;
          width:60px;
          line-height:16px;
        }

        .ag-form .form-line div input{
          height:15px;
          width:15px;
        }

        .ag-form label {
          padding:0 3px;
        }

        .ag-form input {
          height:30px;
          border: 1px solid orange;
          border-radius: 5px;
          background:rgba(255, 0, 0, 0) !important;
          width:150px;
        }

        .ag-table{
          width:100%;
          text-align:center;
        }

        `
    private element: AGElement

    constructor() {
      super()
      const style = AGElement.builder('style', 'ag-style').text(this.AGStyles).build()
      this.element = style
    }

    mount() {
      this.element.elementMountTo(document.head)
    }
  }

  // 爱果用户
  abstract class AUser {}

  class User extends AUser {
    static isUser(params: object | null | string): boolean {
      if (!(params instanceof Object)) return false
      const keys = Object.keys(params)
      if (
        keys.length != 4 ||
        !keys.includes('uid') ||
        !keys.includes('nick') ||
        !keys.includes('address') ||
        !keys.includes('password')
      )
        return false
      return true
    }

    static coverText(text: string | number, leftShow: number, rightShow: number) {
      if (text == -1) return '...'
      const str = String(text)
      const result = `${str.substring(0, leftShow)}...${str.substring(str.length - rightShow, str.length)}`
      return result
    }
  }

  // 爱果面板
  abstract class APanel extends AGMethods {
    protected AGStyles: string
    protected abstract mount(): void
    protected abstract setStatusBarText(text: string): void
    protected abstract appendMessage(message: string): void

    constructor(styles?: string) {
      super()
      this.AGStyles = styles ? styles : ''
    }
  }

  class PanelImpl extends APanel {
    private static instance: PanelImpl
    private panel: AGElement
    private draw: AGElement
    private statusBar: AGElement
    private user: UserInfo
    private options: Array<{ label: string; event: Function }> = [
      {
        label: '前言',
        event: () => {
          console.log('前言 begin')
          const ulItem = AGElement.builder('ul', 'ag-draw')
            .style({
              paddingLeft: '20px',
              cursor: 'default',
              overflowX: 'hidden',
              margin: '0',
            })
            .build()

          const messages = [
            {
              textContent:
                '本工具为个人制作，仅供交流学习使用，请不要用于商业传播，否则后果自负！使用本工具即代表您同意本条款。',
              color: '',
              backgroundColor: '',
            },
            {
              textContent:
                '工具的初衷是为了让使用者释放双手，解决方案并未包含入侵的攻击和技术，仅模拟人工打开相应的任务进行操作，对程序本身不会造成任何影响，如果对平台技术层面有影响请转告我们。',
              color: '',
              backgroundColor: '',
            },
            {
              textContent:
                '使用者在使用本软件前已经得知可能涉嫌《非法入侵计算机信息系统罪》，但滥用本软件造成的—切后果自行承担!',
              color: '',
              backgroundColor: '',
            },
            {
              textContent:
                '使用方法：点击【开始任务】即可自动完成电脑端每日任务（除【登录】任务），期间可以切到后台，但不要最小化，中断后可以点击【开始/继续任务】即可继续任务。',
              color: 'white',
              backgroundColor: 'orange',
            },
          ]
          for (const item of messages) {
            const { textContent, color, backgroundColor } = item
            const liItem = AGElement.builder('li')
              .text(textContent)
              .style({
                color,
                backgroundColor,
                margin: '5px 0',
              })
              .build()

            liItem.elementMountTo(ulItem)
          }
          ulItem.elementMountTo(this.draw)
          console.log('前言 end')
        },
      },
      {
        label: '开始',
        event: () => {
          console.log('开始...')
          const divStatusBar = this.statusBar
          this.statusBar.setStyle({
            height: '30px',
            lineHeight: '30px',
          })
          this.setStatusBarText('未开始')

          const ulItem = AGElement.builder('ul', 'ag-draw')
            .style({
              fontSize: '15px',
              cursor: 'default',
              overflowX: 'hidden',
              color: 'orange',
              margin: '0',
              marginBottom: '15px',
              height: '332px',
              backgroundColor: '#1e1e1e',
              borderRadius: '10px',
              display: 'inline-table',
              listStyleType: 'decimal',
              paddingLeft: '25px',
            })
            .build()

          this.appendMessage(`已准备就绪...`)

          const buttonItem = AGElement.builder('button', 'ag-draw')
            .text('开始任务')
            .style({
              backgroundColor: '#e22b2b00',
              color: 'orange',
              border: '1px solid orange',
              borderRadius: '10px',
              height: '28px',
              fontSize: '14px',
              margin: '0 auto',
              padding: '0 70px',
              width: 'auto',
              cursor: 'pointer',
            })
            .build()

          buttonItem.toHTMLElement().onclick = () => {
            console.log('点击..')
          }

          divStatusBar.elementMountTo(this.draw)

          ulItem.elementMountTo(this.draw, true)

          buttonItem.elementMountTo(this.draw, true)
        },
      },
      {
        label: '配置',
        event: () => {
          console.log('配置　begin')

          const divRowOne = new AGElement('div', 'ag-draw')

          const localFormSettings: any = AGStorage.get('form_settings', 'local', true)
          const formSettings = new AGComponent.Form()
          formSettings.addInput('text', '地址', localFormSettings?.['地址']?.value)
          formSettings.addInput('password', '卡密', localFormSettings?.['卡密']?.value)

          formSettings.addInput(
            'password',
            '题库',
            localFormSettings?.['题库']?.value,
            '题库',
            undefined,
            '启用',
            localFormSettings?.['题库']?.checkbox,
          )
          formSettings.instance.elementMountTo(divRowOne)

          this.splitLine(divRowOne)

          const tableSettings = new AGComponent.Table()
          tableSettings.addHeader('任务', '启用')

          tableSettings.instance.elementMountTo(divRowOne)

          const tasks: Array<{
            name: string
            event: Function
            element: undefined | HTMLInputElement
          }> = [
            {
              name: '每日答题',
              event: () => {},
              element: undefined,
            },
            {
              name: '专项答题',
              event: () => {},
              element: undefined,
            },
            {
              name: '每周答题',
              event: () => {},
              element: undefined,
            },
            {
              name: '视听学习/时长',
              event: () => {},
              element: undefined,
            },
            {
              name: '我要选读文章',
              event: () => {},
              element: undefined,
            },
          ]
          const localTableSettings: any = AGStorage.get('table_settings', 'local', true)
          tasks.forEach((item) => {
            const { name } = item
            const checkbox = AGElement.builder('input').attr('type', 'checkbox').build()

            if (localTableSettings && typeof localTableSettings === 'object') {
              ;(checkbox.toHTMLElement() as HTMLInputElement).checked = localTableSettings?.[name]
            }
            tableSettings.addRow(name, checkbox)
          })

          divRowOne.elementMountTo(this.draw)
          this.splitLine(this.draw)

          const divRowTwo = AGElement.builder('div', 'ag-draw ag-row-margin-10')
            .style({
              display: 'flex',
              justifyContent: 'space-evenly',
            })
            .build()

          const buttonVerification = AGElement.builder('button')
            .text('验证')
            .style({
              backgroundColor: '#e22b2b00',
              color: 'rgb(0 201 0)',
              border: '1px solid rgb(0 201 0)',
              borderRadius: '10px',
              height: '28px',
              fontSize: '14px',
              width: '100px',
              cursor: 'pointer',
            })
            .build()

          buttonVerification.toHTMLElement().onclick = () => {
            console.log('验证配置')
          }

          const buttonSave = AGElement.builder('button')
            .text('保存')
            .style({
              backgroundColor: '#e22b2b00',
              color: 'orange',
              border: '1px solid orange',
              borderRadius: '10px',
              height: '28px',
              fontSize: '14px',
              width: '100px',
              cursor: 'pointer',
            })
            .build()

          buttonSave.toHTMLElement().onclick = () => {
            console.log('保存配置')
            formSettings.saveToStorage()
            tableSettings.saveToStorage()
          }

          buttonVerification.elementMountTo(divRowTwo)
          buttonSave.elementMountTo(divRowTwo)
          divRowTwo.elementMountTo(this.draw, true)

          console.log('配置　end')
        },
      },
      {
        label: '捐助',
        event: () => {
          console.log('捐助 begin')
          const ulItem = AGElement.builder('ul', 'ag-draw')
            .style({
              paddingLeft: '20px',
              cursor: 'default',
              overflowX: 'hidden',
              margin: '0',
            })
            .build()

          const messages = [
            {
              textContent: `基于TS重制的爱果面板开源了，喜欢代码或者对这块感兴趣的可以自己去看，Github地址：<a href='https://github.com/tqy845/AG_Currency'>https://github.com/tqy845/AG_Currency</a>`,
              color: '',
              backgroundColor: '',
            },
            {
              textContent: `教程/资源（Ｂ站）：<a href='https://space.bilibili.com/421403163'>全栈在学谭同学</a>`,
              color: '',
              backgroundColor: '',
            },
            {
              textContent: `教程/资源（抖音）：<a href='https://www.douyin.com/user/MS4wLjABAAAAy6urBE8O_sJ_DSMS_QR7Uu-Oxdb0LbaAH88UAGFB0dlfY2kbymHlUpj5vi88Rhys'>全栈在学谭同学</a>`,
              color: '',
              backgroundColor: '',
            },
            {
              textContent: `作品：<a href='https://qm.qq.com/cgi-bin/qm/qr?k=k1CvaaHVA96aedx5Ied0MdfEHBEG1Jx1&jump_from=webapi&authKey=yIYZHJNp9SdDb5FReSkLibAmYn5aX+3gyK/yeyABc0F+UXt/vMZiJm1VxTZu5zcn'>私有云/助农电商/学X通/智X树/学XX国</a>`,
              color: '',
              backgroundColor: '',
            },
          ]
          for (const item of messages) {
            const { textContent, color, backgroundColor } = item
            const liItem = AGElement.builder('li')
              .text(textContent)
              .style({
                color,
                backgroundColor,
                margin: '5px 0',
              })
              .build()

            liItem.elementMountTo(ulItem)
          }
          ulItem.elementMountTo(this.draw)

          this.splitLine(this.draw)

          const divDonation = new AGElement('div')
          divDonation.elementMountTo(this.draw, true)

          const divItem = AGElement.builder('div', 'ag-draw ag-row-margin-10')
            .style({
              display: 'flex',
              justifyContent: 'space-evenly',
            })
            .build()

          const imgArr = [
            {
              name: `微信`,
              src: 'https://i.328888.xyz/2023/01/30/8UXlo.png',
              color: `#05C160`,
            },
            {
              name: `支付宝`,
              src: 'https://i.328888.xyz/2023/01/30/8UpYA.png',
              color: `#1777FF`,
            },
          ]

          for (const item of imgArr) {
            const button = AGElement.builder('button')
              .text(item.name)
              .style({
                background: item.color,
                borderRadius: '5px',
                border: '1px solid white',
                color: 'white',
                height: '25px',
                lineHeight: '23px',
                cursor: 'pointer',
              })
              .build()

            button.toHTMLElement().onclick = () => {
              const divDonationItem = AGElement.builder('div', 'ag-draw donation')
                .style({
                  display: 'inline-flex',
                })
                .build()

              const spanMessage = AGElement.builder('span')
                .text(
                  '插件本身免费，但是你不会介意捐助我一杯咖啡or奶茶的吧？捐助的时候记得备注联系方式或邮箱，卡密会在我收到捐助后第一时间给你。对了，不同的捐助会有区别对待（额外的奖励等），包括但不限于本插件。',
                )
                .style({
                  backgroundColor: 'orange',
                  color: 'white',
                })
                .build()

              const imgPhoto = AGElement.builder('img')
                .attr('src', item.src)
                .style({
                  width: '50%',
                  height: '50%',
                })
                .build()

              spanMessage.elementMountTo(divDonationItem)
              imgPhoto.elementMountTo(divDonationItem)
              divDonationItem.elementMountTo(divDonation)
            }
            button.elementMountTo(divItem)
          }

          divItem.elementMountTo(this.draw, true)
          console.log('捐助 end')
        },
      },
    ]
    private columnLeft: AGElement = new AGElement('div')
    private columnRight: AGElement = new AGElement('div')
    private columnCenter: AGElement = new AGElement('div')
    private constructor(panelName: string) {
      super()

      // 初始化全局异常监听事件
      // this.handlerAGError();

      // 初始化全局样式
      new AGStyles().mount()

      // 初始化面板
      this.panel = AGElement.builder('ag-panel', panelName).build()

      // 初始化画板
      this.draw = AGElement.builder('div').build()

      // 初始化状态栏
      this.statusBar = AGElement.builder('div', 'ag-draw').build()

      // 初始化用户信息
      this.user = {
        uid: -1,
        nick: '',
        avatarMediaUrl: '',
        gmtActive: -1,
        orgIds: [],
      }
      Promise.resolve().then(async () => {
        await this.initUser()
        this.leftColumn()
        this.centerColumn()
        this.rightColumn()
      })

      AGElement.elementsMountTo([this.columnLeft, this.columnCenter, this.columnRight], this.panel)
    }

    private async initUser() {}

    private leftColumn() {
      // 左列
      this.columnLeft.setStyle({
        backgroundColor: '#292929',
        width: '150px',
        height: '100%',
        display: 'none',
      })

      {
        const rowOne = AGElement.builder('div')
          .style({
            height: '30px',
          })
          .build()

        const rowTwo = AGElement.builder('div')
          .style({
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          })
          .build()

        const rowTowItem = AGElement.builder('span')
          .text(this.user.nick)
          .style({
            height: '80px',
            width: '80px',
            backgroundColor: '#121212',
            borderRadius: '100%',
            display: 'block',
            lineHeight: '80px',
            textAlign: 'center',
            overflow: 'hidden',
            fontSize: '20px',
            cursor: 'default',
          })
          .build()
        rowTowItem.elementMountTo(rowTwo)

        const rowThree = AGElement.builder('div')
          .text(User.coverText(this.user.uid, 3, 3))
          .style({
            height: '20px',
            lineHeight: '20px',
            color: '#bfbfbf',
            textAlign: 'center',
            margin: '5px 0',
            fontSize: '18px',
            cursor: 'default',
          })
          .build()

        const rowFour = AGElement.builder('div')
          .text(`卡密次数: ${this.user.info} <span style='color:#2579cd;cursor:pointer'>说明</span>`)
          .style({
            height: '20px',
            lineHeight: '20px',
            textAlign: 'center',
            margin: '5px 0',
            fontSize: '13px',
            marginTop: '10px',
            cursor: 'default',
          })
          .build()

        rowFour.toHTMLElement().onclick = () => {
          const num = document.querySelectorAll(`.ag-popup>div`).length + 1
          this.popup(`${num} 这是一条测试信息...`)
        }
        AGElement.elementsMountTo([rowOne, rowTwo, rowThree, rowFour], this.columnLeft)
        const menu = AGElement.builder('ul')
          .style({
            listStyleType: 'none',
            letterSpacing: '10px',
            paddingLeft: '0',
            textAlign: 'center',
            marginTop: '20px',
          })
          .build()
        menu.elementMountTo(this.columnLeft)

        let agOptionsActive = AGStorage.get('options_active')
        for (const item of this.options) {
          const li = AGElement.builder('li', `ag-options`)
            .text(item.label)
            .style({
              cursor: 'pointer',
              height: '40px',
              lineHeight: '40px',
              fontSize: '16px',
            })
            .build()

          li.toHTMLElement().setAttribute('ag-title', item.label)
          li.toHTMLElement().onclick = () => {
            item.event()
            const ele = document.querySelector('[ag-active=true]')
            if (ele && ele instanceof HTMLElement) {
              AGElement.builder(ele).attr('ag-active', false).build()
            }
            li.setAttr('ag-active', 'true')
            const agTitle = li.getAttr('ag-title')
            if (agTitle) AGStorage.set('options_active', agTitle)
          }
          if (!agOptionsActive || item.label == agOptionsActive) {
            agOptionsActive = '1'
            setTimeout(() => li.toHTMLElement().click(), 0)
          }
          li.elementMountTo(menu, true)
        }
      }
    }

    private centerColumn() {
      // 中列
      this.columnCenter.setStyle({
        width: '425px',
        height: '100%',
        display: 'none',
      })

      {
        const rowOne = AGElement.builder('div')
          .text(`爱果 - 学XX国 v23.X.X`)
          .style({
            height: '30px',
            lineHeight: '30px',
            textAlign: 'center',
            fontSize: '15px',
          })
          .build()

        const rowTwo = this.draw
        rowTwo.setStyle({
          height: '420px',
          display: 'flex',
          padding: '0 15px',
          flexDirection: 'column',
        })

        AGElement.elementsMountTo([rowOne, rowTwo], this.columnCenter)
      }
    }

    private rightColumn() {
      this.columnRight.setText(`展开控制台`)
      this.columnRight.setStyle({
        backgroundColor: '#121212',
        width: '25px',
        height: '100%',
        display: 'inline-flex',
        alignItems: 'center',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'absolute',
        right: '0',
        top: '0',
        fontWeight: 'bold',
        borderLeft: '1px solid #434343',
        borderRadius: '0 5px 5px 0',
      })
      this.columnRight.toHTMLElement().onclick = () => {
        const styles = this.panel.getStyle('textContent')
        const status = styles['textContent'].includes('展开')
        let width = status ? '600px' : '25px'
        let textContent = status ? '收起控制台' : '展开控制台'
        let display = status ? 'block' : 'none'
        this.panel.setStyle({
          width,
        })
        setTimeout(
          () => {
            this.columnRight.setText(textContent)
            this.columnLeft.setStyle({
              display,
            })
            this.columnCenter.setStyle({
              display,
            })
          },
          status ? 200 : 0,
        )
      }
    }

    public static getInstance(panelName?: string) {
      console.log(`panel:实例化 begin`)
      if (panelName && !this.instance) this.instance = new PanelImpl(panelName)
      console.log(`panel:实例化 end`)
      return this.instance
    }

    public mount(): void {
      console.log('panel:挂载 begin')
      const result = this.panel.elementMountTo(document.body, false, 'top')
      console.log(`panel:挂载${result ? '成功' : '失败'} end`)
    }

    public setStatusBarText(text: string): void {
      Promise.resolve().then(() => {
        this.statusBar.setText(`状态栏：${text}`)
      })
    }

    public appendMessage(message: string): void {
      const liItem = AGElement.builder('li')
        .text(`${new Date().toLocaleTimeString()}：${message}`)
        .style({
          margin: '5px 0',
        })
        .build()
      Promise.resolve().then(() => {
        const ul = this.draw.toHTMLElement().querySelector('ul')
        if (ul && ul instanceof HTMLElement) liItem.elementMountTo(ul)
      })
    }

    private splitLine(mountElement: AGElement): void {
      const divSplitLine = AGElement.builder('div', 'ag-draw')
        .style({
          width: '100%',
          height: '1px',
          background: '#999999',
          margin: '10px 0',
        })
        .build()
      divSplitLine.elementMountTo(mountElement, true)
    }
  }

  PanelImpl.getInstance(`ag-panel`).mount()
})()

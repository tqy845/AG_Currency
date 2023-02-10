(function () {
  "use strict";

  interface IRequest {
    request(url: string, params: object, ...args: any): Promise<IResponse<{}>>;
  }

  interface IResponse<T> {
    code: number;
    msg: string;
    data: T;
  }

  abstract class AMethods {
    protected abstract createGlobalErrorHandler(): void;

    protected abstract getElement(
      tagName: string,
      tagId?: string,
      tagClass?: string,
    ): HTMLElement;

    protected abstract setElementStyleOrText(
      element: HTMLElement,
      attributes: object,
      important: "important" | undefined,
    ): boolean;

    protected abstract getElementStyle(
      element: HTMLElement,
      ...attributes: Array<string>
    ): { [key: string]: string };

    protected abstract addToElement(
      element: HTMLElement,
      mountElement: HTMLElement,
      position: "top" | "bottom" | "insert",
      insertBefore?: HTMLElement,
      append?: boolean,
    ): boolean;

    protected abstract addToElements(
      mountElement: HTMLElement,
      position: "top" | "bottom" | "insert",
      insertBefore?: HTMLElement,
      append?: boolean,
      ...element: Array<HTMLElement>
    ): boolean;

    protected abstract mountElementToAG(
      element: HTMLElement,
      mountName: string,
    ): boolean;
  }

  abstract class AStorage extends AMethods {
    protected abstract setStorage(
      key: string,
      value: string | object,
      type: "local" | "session",
    ): void;

    protected abstract getStorage(
      key: string,
      type: "local" | "session",
      parse: true | false,
    ): string | object | null;

    protected abstract increaseStorage(
      key: string,
      type: "local" | "session",
    ): number;

    protected abstract removeStorage(
      key: string,
      type: "local" | "session",
    ): void;

    protected abstract clearStorage(): void;
  }

  abstract class AAg extends AStorage {}

  class Ag extends AAg implements IRequest {
    // 爱果方法
    protected createGlobalErrorHandler() {
      window.addEventListener("unhandledrejection", (event) => {
        console.log(event);
      });

      window.onerror = (message, source, lineno, colno, error) => {
        console.log(message, error);
      };
    }

    protected getElement(
      tagName: string,
      tagClass?: string,
      tagId?: string,
    ): HTMLElement {
      const tag = document.createElement(tagName);
      if (tagId) tag.setAttribute("id", tagId);
      if (tagClass) tag.setAttribute("class", tagClass);

      return tag;
    }

    protected setElementStyleOrText(
      element: HTMLElement,
      attributes: { [key: string]: string },
      important: "important" | undefined = undefined,
    ): boolean {
      const keys = Object.keys(attributes);
      if (!element || !keys.length) return false;
      const storage = ["textContent", "innerHTML", "innerText"];
      const selectorStorage = ["id", "class", "name", "agActive"];
      for (const key of keys) {
        if (storage.includes(key)) element.innerHTML = attributes[key];
        else if (selectorStorage.includes(key))
          element.setAttribute(key, attributes[key]);
        else if (Object.prototype.hasOwnProperty.call(element.style, key)) {
          element.style.setProperty(
            key.replace(/([A-Z])/g, "-$1").toLowerCase(),
            attributes[key],
            important,
          );
        }
      }
      return true;
    }

    protected getElementStyle(
      element: HTMLElement,
      ...attributes: Array<string>
    ): { [key: string]: string } {
      if (!element || !attributes.length) return {};
      const storage = ["textContent", "innerHTML", "innerText"];
      const resultAttributes: { [key: string]: string } = {};
      for (const key of attributes) {
        // @ts-expect-error
        if (storage.includes(key)) resultAttributes[key] = element[key];
        else if (Object.prototype.hasOwnProperty.call(element.style, key)) {
          resultAttributes[key] = window
            .getComputedStyle(element, null)
            .getPropertyValue(key);
        }
      }
      return resultAttributes;
    }

    protected addToElement(
      element: HTMLElement,
      mountElement: HTMLElement,
      position: "top" | "bottom" | "insert" = "top",
      insertBefore?: HTMLElement,
      append: boolean = false,
    ): boolean {
      if (!element || !mountElement) return false;
      if (!append)
        if (element.id) document.querySelector(`#${element.id}`)?.remove();
        else if (element.className) {
          const elem = document.querySelectorAll(`.${element.className}`);
          for (const item of elem) item.remove();
        } else if (mountElement.contains(element))
          mountElement.removeChild(element);

      switch (position) {
        case "top":
          mountElement.prepend(element);
          break;
        case "bottom":
          mountElement.append(element);
          break;
        case "insert":
          if (insertBefore) mountElement.insertBefore(element, insertBefore);
          else new Error("error:insertBefore cannot be empty...");
          break;
      }
      return true;
    }

    protected addToElements(
      mountElement: HTMLElement,
      position: "top" | "bottom" | "insert" = "top",
      insertBefore?: HTMLElement,
      append?: boolean,
      ...element: Array<HTMLElement>
    ): boolean {
      for (const item of element) {
        this.addToElement(item, mountElement, position, insertBefore, append);
      }
      return true;
    }

    protected mountElementToAG(
      element: HTMLElement,
      mountName: string,
    ): boolean {
      if (!element || !mountName) return false;
      const body: any = document.body;
      if (!body.AG) body.AG = {};
      body.AG[mountName] = element;
      return true;
    }

    // 爱果存储
    protected setStorage(
      key: string,
      value: number | string | object,
      type: "local" | "session" = "local",
    ): void {
      key = "AG_STORAGE_".concat(key.toUpperCase());
      if (value instanceof Object) value = JSON.stringify(value);
      type === "local"
        ? localStorage.setItem(key, String(value))
        : sessionStorage.setItem(key, String(value));
    }
    protected getStorage(
      key: string,
      type: "local" | "session" = "local",
      parse: boolean = false,
    ): string | object | null {
      key = "AG_STORAGE_".concat(key.toUpperCase());
      let result =
        type === "local"
          ? localStorage.getItem(key)
          : sessionStorage.getItem(key);
      return parse && result ? JSON.parse(result) : result;
    }
    protected increaseStorage(key: string, type: "local" | "session"): number {
      const ITEM = this.getStorage(key);
      const VALUE = Number(ITEM);
      if (isNaN(VALUE)) throw new Error("error:非数字不可自增");
      this.setStorage(key, VALUE + 1, type);
      return Number(this.getStorage(key));
    }
    protected removeStorage(key: string, type: "local" | "session"): void {
      key = "AG_STORAGE_".concat(key.toUpperCase());
      type === "local"
        ? localStorage.removeItem(key)
        : sessionStorage.removeItem(key);
    }
    protected clearStorage(): void {
      const handler = (instance: Storage) => {
        Object.keys(instance).forEach((item) => {
          if (item.startsWith("AG_STORAGE_")) {
            instance.removeItem(item);
          }
        });
      };
      handler(localStorage);
      handler(sessionStorage);
    }

    // 爱果接口
    request(url: string, params: object, ...args: any): Promise<IResponse<{}>> {
      throw new Error("Method not implemented.");
    }
  }

  abstract class AUser {
    protected abstract uid: string;
    protected abstract nick: string;
    protected abstract address: string;
    protected abstract password: string;
  }

  class User extends AUser {
    uid: string;
    nick: string;
    address: string;
    password: string;
    kami: string;

    constructor(params: any) {
      super();
      const init = {
        uid: "",
        nick: "未登录",
        address: "",
        password: "",
        kami: "0/0",
      };
      const { uid, nick, address, password, kami } = params || init;
      this.uid = uid || init.uid;
      this.nick = nick || init.nick;
      this.address = address || init.address;
      this.password = password || init.password;
      this.kami = kami || init.kami;
    }

    static isUser(params: object | null | string): boolean {
      if (!(params instanceof Object)) return false;
      const keys = Object.keys(params);
      if (
        keys.length != 4 ||
        !keys.includes("uid") ||
        !keys.includes("nick") ||
        !keys.includes("address") ||
        !keys.includes("password")
      )
        return false;
      return true;
    }

    static coverText(
      text: string | number,
      leftShow: number,
      rightShow: number,
    ) {
      const str = String(text);
      const result = `${str.substring(0, leftShow)}...${str.substring(
        str.length - rightShow,
        str.length,
      )}`;
      return result;
    }
  }

  abstract class APanel<T> extends Ag {
    protected element: T | undefined;
    protected abstract globalStyles: string;
    protected abstract mount(): void;
  }

  class PanelImpl extends APanel<HTMLElement> {
    protected globalStyles: string = "";
    private static instance: PanelImpl;
    private panel: HTMLElement;
    private user: User;
    private constructor(panelName: string) {
      super();

      // 初始化爱果全局异常监听事件
      this.createGlobalErrorHandler();

      // 初始化爱果全局样式
      const style = this.getElement("style");
      this.globalStyles += `
        li.ag-options[agactive="true"] { color:orange;  }
        li.ag-options:hover { color:orange; }
        li.ag-options { color:#999999; }
        `;
      this.setElementStyleOrText(style, {
        innerHTML: this.globalStyles,
      });
      this.addToElement(style, document.head, "bottom");

      // 初始化爱果用户信息
      this.user = new User(this.getStorage("user", "local", true));

      // 初始化爱果面板
      const panel = this.getElement("div", panelName);
      this.panel = panel;
      this.setElementStyleOrText(panel, {
        width: "25px",
        height: "450px",
        position: "fixed",
        zIndex: "9999",
        left: "0",
        top: "0",
        backgroundColor: "#121212",
        border: "1px solid #434343",
        transition: "width 0.5s ease",
        display: "flex",
        color: "#999999",
        borderRadius: "0 5px 5px 0",
      });
      let draw: HTMLElement;

      const columnLeft = this.getElement("div");
      this.setElementStyleOrText(columnLeft, {
        backgroundColor: "#292929",
        width: "150px",
        height: "100%",
        display: "none",
      });

      {
        const rowOne = this.getElement("div");
        this.setElementStyleOrText(rowOne, {
          height: "30px",
        });

        const rowTwo = this.getElement("div");
        this.setElementStyleOrText(rowTwo, {
          height: "100px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });

        const rowTowItem = this.getElement("span");
        console.log(this.user);

        this.setElementStyleOrText(rowTowItem, {
          textContent: this.user.nick,
          height: "80px",
          width: "80px",
          backgroundColor: "#121212",
          borderRadius: "100%",
          display: "block",
          lineHeight: "80px",
          textAlign: "center",
          overflowY: "hidden",
          fontSize: "20px",
          cursor: "default",
        });
        this.addToElement(rowTowItem, rowTwo);

        const rowThree = this.getElement("div");
        this.setElementStyleOrText(rowThree, {
          textContent: User.coverText(this.user.uid, 3, 3),
          height: "20px",
          lineHeight: "20px",
          color: "#bfbfbf",
          textAlign: "center",
          margin: "5px 0",
          fontSize: "18px",
          cursor: "default",
        });

        const rowFour = this.getElement("div");
        this.setElementStyleOrText(rowFour, {
          innerHTML: `卡密次数: ${this.user.kami} <span style='color:#2579cd;cursor:pointer'>说明</span>`,
          height: "20px",
          lineHeight: "20px",
          textAlign: "center",
          margin: "5px 0",
          fontSize: "13px",
          marginTop: "10px",
          cursor: "default",
        });

        this.addToElements(
          columnLeft,
          "bottom",
          undefined,
          false,
          rowOne,
          rowTwo,
          rowThree,
          rowFour,
        );

        const options: Array<{ label: string; event: Function }> = [
          {
            label: "前言",
            event: () => {
              console.log("前言 begin");
              const ulItem = this.getElement("ul", "ag-draw");
              this.setElementStyleOrText(ulItem, {
                paddingLeft: "20px",
                cursor: "default",
                overflowX: "hidden",
                margin: "0",
              });
              const messages = [
                {
                  textContent:
                    "本工具为个人制作，仅供交流学习使用，请不要用于商业传播，否则后果自负！使用本工具即代表您同意本条款。",
                  color: "",
                  backgroundColor: "",
                },
                {
                  textContent:
                    "工具的初衷是为了让使用者释放双手，解决方案并未包含入侵的攻击和技术，仅模拟人工打开相应的任务进行操作，对程序本身不会造成任何影响，如果对平台技术层面有影响请转告我们。",
                  color: "",
                  backgroundColor: "",
                },
                {
                  textContent:
                    "使用者在使用本软件前已经得知可能涉嫌《非法入侵计算机信息系统罪》，但滥用本软件造成的—切后果自行承担!",
                  color: "",
                  backgroundColor: "",
                },
                {
                  textContent:
                    "使用方法：点击【开始任务】即可自动完成电脑端每日任务（除【登录】任务），期间可以切到后台，但不要最小化，中断后可以点击【开始/继续任务】即可继续任务。",
                  color: "white",
                  backgroundColor: "orange",
                },
              ];
              for (const item of messages) {
                const liItem = this.getElement("li");
                const { textContent, color, backgroundColor } = item;
                this.setElementStyleOrText(liItem, {
                  textContent,
                  color,
                  backgroundColor,
                  margin: "5px 0",
                });
                this.addToElement(liItem, ulItem, "bottom");
              }
              this.addToElement(ulItem, draw, "bottom");
              console.log("前言 end");
            },
          },
          {
            label: "开始",
            event: () => {
              console.log("开始...");
              const ulItem = this.getElement("ul", "ag-draw");
              this.setElementStyleOrText(ulItem, {
                paddingLeft: "0",
                cursor: "default",
                overflowX: "hidden",
                color: "orange",
                margin: "0",
                marginBottom: "15px",
                height: "362px",
                width: "100%",
                backgroundColor: "#1e1e1e",
                borderRadius: "10px",
              });
              const buttonItem = this.getElement("button", "ag-draw");
              this.setElementStyleOrText(buttonItem, {
                textContent: "开始任务",
                backgroundColor: "#e22b2b00",
                color: "orange",
                border: "1px solid orange",
                borderRadius: "10px",
                height: "28px",
                fontSize: "14px",
                margin: "0 auto",
                padding: "0 70px",
                width: "auto",
                cursor: "pointer",
              });
              this.addToElement(ulItem, draw, "bottom");
              this.addToElement(buttonItem, draw, "bottom", undefined, true);
            },
          },
          {
            label: "配置",
            event: () => {},
          },
          {
            label: "捐助",
            event: () => {},
          },
        ];
        const menu = this.getElement("ul");
        this.setElementStyleOrText(menu, {
          listStyleType: "none",
          letterSpacing: "10px",
          paddingLeft: "0",
          textAlign: "center",
          marginTop: "20px",
        });
        this.addToElement(menu, columnLeft, "bottom");
        const agOptionsActive = this.getStorage("options_active");
        for (const item of options) {
          const li = this.getElement("li", `ag-options`);
          li.setAttribute("ag-title", item.label);
          this.setElementStyleOrText(li, {
            textContent: item.label,
            cursor: "pointer",
            height: "40px",
            lineHeight: "40px",
            fontSize: "16px",
          });
          li.onclick = () => {
            item.event();
            const ele = document.querySelector("[agActive=true]");
            if (ele && ele instanceof HTMLElement) {
              this.setElementStyleOrText(ele, {
                agActive: "false",
              });
            }
            this.setElementStyleOrText(li, {
              agActive: "true",
            });
            const agTitle = li.getAttribute("ag-title");
            if (agTitle) this.setStorage("options_active", agTitle);
            console.log(agTitle);
          };
          if (item.label == agOptionsActive) {
            setTimeout(() => li.click(), 0);
          }
          this.addToElement(li, menu, "bottom");
        }
      }

      const columnCenter = this.getElement("div");
      this.setElementStyleOrText(columnCenter, {
        width: "425px",
        height: "100%",
        display: "none",
      });

      {
        const rowOne = this.getElement("div");
        this.setElementStyleOrText(rowOne, {
          textContent: "爱果学习强国　v23.2.X",
          height: "30px",
          lineHeight: "30px",
          textAlign: "center",
        });

        const rowTwo = this.getElement("div");
        draw = rowTwo;
        this.setElementStyleOrText(rowTwo, {
          height: "420px",
          display: "flex",
          padding: "0 15px",
          flexDirection: "column",
        });

        this.addToElements(
          columnCenter,
          "bottom",
          undefined,
          false,
          rowOne,
          rowTwo,
        );
      }

      const columnRight = this.getElement("div");
      this.setElementStyleOrText(columnRight, {
        textContent: "展开控制台",
        backgroundColor: "#121212",
        width: "25px",
        height: "100%",
        display: "inline-flex",
        alignItems: "center",
        textAlign: "center",
        cursor: "pointer",
        position: "absolute",
        right: "0",
        top: "0",
        fontWeight: "bold",
        borderLeft: "1px solid #434343",
        borderRadius: "0 5px 5px 0",
      });
      columnRight.onclick = () => {
        const styles = this.getElementStyle(panel, "textContent");
        const status = styles["textContent"].includes("展开");
        let width = status ? "600px" : "25px";
        let textContent = status ? "收起控制台" : "展开控制台";
        let display = status ? "block" : "none";
        this.setElementStyleOrText(panel, {
          width,
        });
        setTimeout(
          () => {
            this.setElementStyleOrText(columnRight, {
              textContent,
            });
            this.setElementStyleOrText(columnLeft, {
              display,
            });
            this.setElementStyleOrText(columnCenter, {
              display,
            });
          },
          status ? 200 : 0,
        );
      };

      this.addToElements(
        panel,
        "bottom",
        undefined,
        false,
        columnLeft,
        columnCenter,
        columnRight,
      );
    }

    public static getInstance(panelName?: string) {
      console.log(`panel:实例化 begin`);
      if (panelName && !this.instance) this.instance = new PanelImpl(panelName);
      console.log(`panel:实例化 end`);
      return this.instance;
    }

    public mount(): void {
      console.log("panel:挂载 begin");
      const result: boolean =
        this.addToElement(this.panel, document.body, "top") &&
        this.mountElementToAG(this.panel, "panel");
      console.log(`panel:挂载${result ? "成功" : "失败"} end`);
    }
  }

  PanelImpl.getInstance(`ag-panel`).mount();
})();

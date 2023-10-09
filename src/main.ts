import { requestMessageCmd } from './utils/constant';

interface WindowEventHandlers { }

interface MessageEvent<T> {
  /** Returns the data of the message. */
  readonly data: T;
}

type MessageHandler = ((this: WindowEventHandlers, ev: MessageEvent<any>) => any) &
  ((this: Window, ev: MessageEvent<any>) => any);

export class MessageHelper {
  private static handleMessageMap: Map<string, MessageHandler> = new Map();
  public addListener(timeStamp: string, handler: MessageHandler) {
    MessageHelper.handleMessageMap.set(timeStamp, handler);
  }

  public removeListener(timeStamp: string) {
    MessageHelper.handleMessageMap.delete(timeStamp);
  }

  public static getHandler = (evt: MessageEvent<any>) => {
    const { timeStamp } = evt.data;
    const handler = MessageHelper.handleMessageMap.get(timeStamp);
    if (handler) {
      (handler as any)(evt);
    }
  };

  constructor() {
    window.addEventListener('message', MessageHelper.getHandler);
  }
}

export class Event {
  public emit: (message: string, body: any) => void = (message, body) => {
    const functionList = this.handleMap.get(message);
    if (functionList && functionList.length > 0) {
      functionList.map((callback) => callback(body));
    }
  };

  public on: (message: string, callback: (body?: any) => void) => void = (message, callback) => {
    const functionList = this.handleMap.get(message);
    if (functionList) {
      functionList.push(callback);
    } else {
      this.handleMap.set(message, [callback]);
    }
  };

  public clearAll: () => void = () => {
    this.handleMap.clear();
  };
  private handleMap: Map<string, ((body: any) => void)[]>;
  private active: boolean = false;
  private url: string = '';
  private body: any = {};
  private timeStamp: string = '';
  public setActive: (flag: boolean) => void = (flag) => {
    this.active = flag;
  };

  public getTimeStamp: () => string = () => {
    return this.timeStamp;
  };

  public write: (body: any) => void = (body) => {
    if (this.active && this.handleMap.size > 0) {
      window.parent.postMessage(
        {
          command: 'write',
          timeStamp: this.timeStamp,
          body
        },
        '*'
      );
    } else {
      throw new Error('The stream has been ended.');
    }
  };

  public end: () => void = () => {
    if (this.active) {
      window.parent.postMessage(
        {
          command: 'client-end',
          timeStamp: this.timeStamp
        },
        '*'
      );
      this.active = false;
    } else {
      throw new Error('The stream has been ended.');
    }
  };

  public start: () => void = () => {
    window.parent.postMessage(
      {
        command: 'stream-request',
        body: this.body,
        url: this.url,
        timeStamp: this.timeStamp
      },
      '*'
    );
    this.active = true;
  };

  constructor(url: string, body: any) {
    this.url = url;
    this.body = body;
    this.timeStamp = Date.now().toString(36) + url;
    this.handleMap = new Map();
  }
}

/**
 *
 * @param url The request url
 * @param body The request body
 * @returns The Promise used to get the response message or body
 */
export const request: (url: string, body: any) => Promise<{ response: any }> = (url, body) => {
  return new Promise((resolve, reject) => {
    const timeStamp = Date.now().toString(36);
    window.parent.postMessage(
      {
        command: 'request',
        body,
        url,
        timeStamp
      },
      '*'
    );

    const requestFunc = (evt: MessageEvent<any>) => {
      messageHandler.removeListener(timeStamp);
      if (Array.isArray(evt.data.response)) {
        resolve(evt.data);
      }
      if (evt.data.command === 'error') {
        reject(evt.data.err.message);
      } else if (evt.data.response.code === 1) {
        resolve(evt.data);
      } else {
        reject(evt.data.response.message);
      }
    };

    const messageHandler = new MessageHelper();

    messageHandler.addListener(timeStamp, requestFunc);
  });
};

/**
 *
 * @param url The request url
 * @param body The request body
 * @returns Event The Event object can be used as eventListener
 */
export const streamRequest: (url: string, body: any) => Event = (url, body) => {
  const event = new Event(url, body);

  const requestFunc = (evt: MessageEvent<any>) => {
    if (requestMessageCmd.includes(evt.data.command)) {
      // The request command has not been solved
      event.emit(
        'error',
        'The environment is not support the message forward! Please check if the web used in vscode webview.'
      );
    }
    const handleMap: { [key: string]: (evt: any) => void } = {
      error: (evt) => {
        event.emit('error', evt.data.err.message);
      },
      end: (evt) => {
        event.emit('end', evt.data);
        messageHandler.removeListener(event.getTimeStamp());
        // event.clearAll();
      },
      data: (evt) => {
        event.emit('data', evt.data.response);
      },
      status: (evt) => {
        event.emit('status', evt.data.response);
      },
      response: (evt) => {
        event.emit('response', evt.data.response);
      }
    };

    handleMap[evt.data.command](evt);
  };

  const messageHandler = new MessageHelper();

  messageHandler.addListener(event.getTimeStamp(), requestFunc);
  return event;
};

/**
 *
 * @param url The command url
 * @param body The command body
 * @returns Promise for any result
 */
export const command: (url: string, body?: any) => Promise<any> = (url, body = {}) => {
  return new Promise((resolve, reject) => {
    const timeStamp = Date.now().toString(36);
    window.parent.postMessage(
      {
        command: 'command',
        body,
        url,
        timeStamp
      },
      '*'
    );

    const requestFunc = (evt: MessageEvent<any>) => {
      if (evt.data.command === 'callback') {
        resolve(evt.data.response);
      } else {
        reject('Undefined Commands');
      }
      messageHandler.removeListener(timeStamp);
    };

    const messageHandler = new MessageHelper();

    messageHandler.addListener(timeStamp, requestFunc);
  });
};

export const startListen = (url: string, body: any) => {
  const event = new Event(url, body);

  window.parent.postMessage(
    {
      command: 'command',
      body,
      url,
      timeStamp: event.getTimeStamp()
    },
    '*'
  );

  const messageHandler = new MessageHelper();

  const requestFunc = (evt: MessageEvent<any>) => {
    if (evt.data.command === 'callback') {
      event.emit('response', evt.data.response);
    }
  };

  messageHandler.addListener(event.getTimeStamp(), requestFunc);

  return event;
};

export { default as ThingIOAPIAdapter } from './adapter';
export { default as initVscodeIframe } from './browser';

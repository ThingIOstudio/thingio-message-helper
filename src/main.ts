import { requestMessageCmd } from './utils/constant';

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
  private handleMap: Map<string, Function[]>;
  private active: boolean = false;

  public write: (body: any) => void = (body) => {
    if (this.active) {
      window.parent.postMessage(
        {
          command: 'write',
          body
        },
        '*'
      );
    } else {
      this.emit('error', 'The stream has been ended.');
    }
  };

  public end: () => void = () => {
    window.parent.postMessage(
      {
        command: 'client-end'
      },
      '*'
    );
    this.active = false;
  };

  constructor() {
    this.handleMap = new Map()
    this.active = true;
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
    window.parent.postMessage(
      {
        command: 'request',
        body,
        url
      },
      '*'
    );

    const requestFunc = (evt: MessageEvent<any>) => {
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

    window.onmessage = requestFunc;
  });
};

/**
 *
 * @param url The request url
 * @param body The request body
 * @returns Event The Event object can be used as eventListener
 */
export const streamRequest: (url: string, body: any) => Event = (url, body) => {
  window.parent.postMessage(
    {
      command: 'stream-request',
      body,
      url
    },
    '*'
  );

  const event = new Event();

  const requestFunc = (evt: MessageEvent<any>) => {
    if (requestMessageCmd.includes(evt.data.command)) {
      // The request command has not been solved
      event.emit('error', 'The environment is not support the message forward! Please check if the web used in vscode webview.');
    }
    const handleMap: { [key: string]: (evt: any) => void } = {
      error: (evt) => {
        event.emit('error', evt.data.err.message);
      },
      end: (evt) => {
        event.emit('end', evt.data);
        event.clearAll();
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

  window.onmessage = requestFunc;
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
    window.parent.postMessage(
      {
        command: 'command',
        body,
        url
      },
      '*'
    );

    const requestFunc = (evt: MessageEvent<any>) => {
      if (evt.data.command === 'callback') {
        resolve(evt.data.response);
      } else {
        reject('Undefined Commands');
      }
    };

    window.onmessage = requestFunc;
  });
};

export { default as ThingIOAPIAdapter } from './adapter';
export { default as initVscodeIframe } from './browser';

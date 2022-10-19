class Event {
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

  constructor() {
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
  const event = new Event();
  window.parent.postMessage(
    {
      command: 'stream-request',
      body,
      url
    },
    '*'
  );

  const requestFunc = (evt: MessageEvent<any>) => {
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
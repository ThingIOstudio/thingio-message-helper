/*
 *
 * Copyright 2015 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

export const setFirstLetterLowercase: (str: string) => string = (str) => {
  if (typeof str !== 'string') throw new Error('Wrong Type');
  if (str.length === 0) return str;
  return str[0].toLowerCase().concat(str.slice(1));
};

interface CustomEvent {
  on: (message: string, handler: (data?: any) => void) => void;
  write?: (data: any) => void;
  end?: () => void;
}

export default class ThingIOAPIAdapter {
  constructor(origin: string, protoPath: string, commandHandler: Map<string, Function>, grpc: any, protoLoader: any) {
    this.origin = origin;
    this.protoPath = protoPath;
    this.commandHandler = commandHandler;
    this.grpc = grpc;
    this.protoLoader = protoLoader;

    this.packageDefinition = this.protoLoader.loadSync(this.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
  }

  private origin: string = '';
  private protoPath: string = '';
  private commandHandler: Map<string, Function> = new Map();
  private packageDefinition: any;
  private grpc: any;
  private protoLoader: any;
  private streamEventMap: Map<string, CustomEvent> = new Map();

  public request(url: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (url.split('.').length !== 3) {
        reject(new Error("Please input the packagename, serviceName and funcName like this. ('package.service.func')"));
      }
      const [packageName, serviceName, funcName] = url.split('.');
      // .map((item, index) => (index === 1 ? item : setFirstLetterLowercase(item)));
      try {
        const thingioProto: any = this.grpc.loadPackageDefinition(this.packageDefinition)[packageName];
        const client = new thingioProto[serviceName](this.origin, this.grpc.credentials.createInsecure()) as {
          [key: string]: (
            param: any,
            handler: (err: null | Error, response: any) => void
          ) => { on: (event: string, handler: (data?: any) => void) => void };
        };
        const responseStreamArr: unknown[] = [];
        const call: { on: (event: string, handler: (data?: any) => void) => void } = client[funcName](
          body,
          function (err, response) {
            if (err) {
              reject(err);
            } else {
              resolve(response);
            }
          }
        );
        call.on('end', function () {
          resolve(responseStreamArr);
        });
        call.on('error', function (err) {
          reject(err);
        });
        call.on('status', function (status) {
          console.log(status);
        });
        call.on('data', function (data) {
          responseStreamArr.push(data);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  public streamRequest(url: string, body: any, timeStamp: string): CustomEvent | undefined {
    try {
      if (url.split('.').length !== 3) {
        throw new Error("Please input the packagename, serviceName and funcName like this. ('package.service.func')");
      }

      const [packageName, serviceName, funcName] = url
        .split('.')
        .map((item, index) => (index === 1 ? item : setFirstLetterLowercase(item)));

      try {
        const thingioProto: any = this.grpc.loadPackageDefinition(this.packageDefinition)[packageName];
        const client = new thingioProto[serviceName](this.origin, this.grpc.credentials.createInsecure()) as {
          [key: string]: (param: any) => {
            on: (event: string, handler: (data?: any) => void) => void;
            write?: (body: any) => void;
            end?: () => void;
          };
        };
        const call: CustomEvent = client[funcName](body);
        this.streamEventMap.set(timeStamp, call);
        return call;
      } catch (e) {
        throw e;
      }
    } catch (e) {
      console.log(e);
    }
  }

  public setWebviewMessageContainer(panel: any, subscriptions: { dispose(): any }[]): void {
    panel.webview.onDidReceiveMessage(
      async ({ command, url, body, timeStamp }) => {
        if (command === 'request') {
          try {
            const response = await this.request(url, body);
            panel.webview.postMessage({ command: 'response', response, timeStamp });
          } catch (err) {
            panel.webview.postMessage({
              command: 'error',
              err: { message: (err as any).message, stack: (err as any).stack },
              timeStamp
            });
          }
        } else if (command === 'stream-request') {
          try {
            const responseEvent = this.streamRequest(url, body, timeStamp);
            if (responseEvent) {
              responseEvent.on('end', function () {
                panel.webview.postMessage({ command: 'end', timeStamp });
              });
              responseEvent.on('error', function (err) {
                panel.webview.postMessage({
                  command: 'error',
                  err: { message: (err as any).message, stack: (err as any).stack },
                  timeStamp
                });
              });
              responseEvent.on('status', function (status) {
                panel.webview.postMessage({ command: 'status', response: status, timeStamp });
              });
              responseEvent.on('data', function (data) {
                panel.webview.postMessage({ command: 'data', response: data, timeStamp });
              });
            } else {
              throw new Error('The response is not a stream or request failed.');
            }
          } catch (err) {
            panel.webview.postMessage({
              command: 'error',
              err: { message: (err as any).message, stack: (err as any).stack },
              timeStamp
            });
          }
        } else if (command === 'write') {
          this.streamEventMap.get(timeStamp).write(body);
        } else if (command === 'client-end') {
          this.streamEventMap.get(timeStamp).end();
          this.streamEventMap.delete(timeStamp);
        } else if (command === 'command') {
          const handler = this.commandHandler.get(url);
          if (typeof handler === 'function') {
            handler(panel, timeStamp, url, body);
          }
        }
      },
      undefined,
      subscriptions
    );
  }
}

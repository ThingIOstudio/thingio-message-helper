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

import { WebviewPanel } from 'vscode';

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

export type Handler = (
  panel: WebviewPanel,
  timestamp: string,
  url: string,
  body: unknown
) => void;

interface PackageDefinition {
  [index: string]: unknown;
}

interface GrpcObject {
  [index: string]: unknown;
}

interface Grpc {
  credentials: any;
  /**
 * Load a gRPC package definition as a gRPC object hierarchy.
 * @param packageDef The package definition object.
 * @return The resulting gRPC object.
 */
  loadPackageDefinition(packageDefinition: PackageDefinition): GrpcObject;
}

interface Options {

  /**
   * Keeps field casing instead of converting to camel case
   */
  keepCase?: boolean;

  /**
   * Long conversion type.
   * Valid values are `String` and `Number` (the global types).
   * Defaults to copy the present value, which is a possibly unsafe number without and a {@link Long} with a long library.
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  longs?: Function;

  /**
   * Enum value conversion type.
   * Only valid value is `String` (the global type).
   * Defaults to copy the present value, which is the numeric id.
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  enums?: Function;

  /** Also sets default values on the resulting object */
  defaults?: boolean;

  /** Includes virtual oneof properties set to the present field's name, if any */
  oneofs?: boolean;
}

interface ProtoLoader {
  loadSync(filename: string | string[], options: Options): PackageDefinition;
}

export default class ThingIOAPIAdapter {
  constructor(private origin: string, private protoPath: string, private commandHandler: Map<string, Handler>, private grpc: Grpc, private protoLoader: ProtoLoader) {
    this.packageDefinition = this.protoLoader.loadSync(this.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
  }

  private packageDefinition: PackageDefinition;

  private streamEventMap: Map<string, { call: CustomEvent; title: string }> = new Map();

  public request(url: string, body: unknown): Promise<any> {
    return new Promise((resolve, reject) => {
      if (url.split('.').length !== 3) {
        reject(new Error('Please input the packagename, serviceName and funcName like this. (\'package.service.func\')'));
      }
      const [packageName, serviceName, funcName] = url.split('.');
      // .map((item, index) => (index === 1 ? item : setFirstLetterLowercase(item)));
      try {
        const thingioProto = this.grpc.loadPackageDefinition(this.packageDefinition)[packageName];
        const client = new thingioProto[serviceName](this.origin, this.grpc.credentials.createInsecure()) as {
          [key: string]: (
            param: any,
            handler: (err: null | Error, response: any) => void
          ) => { on: (event: string, handler: (data?: any) => void) => void };
        };
        const responseStreamArr: unknown[] = [];
        const call: { on: (event: string, handler: (data?: unknown) => void) => void } = client[funcName](
          body,
          function (err, response) {
            if (err) {
              reject(err);
            } else {
              resolve(response);
            }
          },
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

  public streamRequest(url: string, body: unknown, timeStamp: string, panel: WebviewPanel): CustomEvent | undefined {
    try {
      if (url.split('.').length !== 3) {
        throw new Error('Please input the packagename, serviceName and funcName like this. (\'package.service.func\')');
      }

      const [packageName, serviceName, funcName] = url
        .split('.')
        .map((item, index) => (index === 1 ? item : setFirstLetterLowercase(item)));

      const thingioProto = this.grpc.loadPackageDefinition(this.packageDefinition)[packageName];
      const client = new thingioProto[serviceName](this.origin, this.grpc.credentials.createInsecure()) as {
        [key: string]: (param: unknown) => {
          on: (event: string, handler: (data?: unknown) => void) => void;
          write?: (body: unknown) => void;
          end?: () => void;
        };
      };
      const call: CustomEvent = client[funcName](body);
      this.streamEventMap.set(timeStamp, { call, title: panel.title });
      return call;
    } catch (e) {
      console.log(e);
    }
  }

  public setWebviewMessageContainer(panel: WebviewPanel, subscriptions: { dispose(): any }[]): void {
    panel.onDidDispose(() => {
      for (const { title, call } of this.streamEventMap.values()) {
        if (title === panel.title) {
          call.end();
        }
      }
    });
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
            const responseEvent = this.streamRequest(url, body, timeStamp, panel);
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
          this.streamEventMap.get(timeStamp).call.write(body);
        } else if (command === 'client-end') {
          this.streamEventMap.get(timeStamp).call.end();
          this.streamEventMap.delete(timeStamp);
        } else if (command === 'command') {
          const handler = this.commandHandler.get(url);
          if (typeof handler === 'function') {
            handler(panel, timeStamp, url, body);
          }
        }
      },
      undefined,
      subscriptions,
    );
  }
}

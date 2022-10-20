# Thingio-message-helper

The message helper for thingio plugin and iframe web.

The usage is below:

## Attention

Put the code into the iframe html script first.

```javascript
const vscode = acquireVsCodeApi();
const messageFun = (e) => {
  const requestMessageCmd = ['request', 'stream-request', 'command'];
  const responseMessageCmd = ['response', 'callback', 'error', 'data', 'end', 'status'];
  if (requestMessageCmd.includes(e.data.command)) {
    vscode.postMessage(e.data);
  }

  if (responseMessageCmd.includes(e.data.command)) {
    document.getElementById('home').contentWindow.postMessage(e.data, '*');
  }
};
window.addEventListener('message', messageFun);
```

## vscode extension:
```typescript
import { ThingIOAPIAdapter } from 'thingio-message-helper';

/**
 * @params url
 * @desc The server url
 * @params protoPath
 * @desc The .proto file absolute path
 * @params webCommandHandler
 * @desc The Map for the vscode command handler from web
 * @params gRPC
 * @desc import * as grpc from '@grpc/grpc-js';
 * @params protoLoader
 * @desc import * as protoLoader from '@grpc/proto-loader';
 */
const adapter = new ThingIOAPIAdapter(url, protoPath, webCommandHandler, grpc, protoLoader);

adapter?.setWebviewMessageContainer(currentPanel, context.subscriptions);
```

## web iframe

```typescript
import { request, streamRequest, command } from 'thingio-message-helper';

const { response } = await request('package.service.func', requestParam);

const response = streamRequest('package.service.func', requestParam);

response.on('data', () => {
  // handler
});
response.on('error', () => {
  // handler
});
response.on('end', () => {
  // handler
});
response.on('status', () => {
  // handler
});

const res = await command('openFolder');
```
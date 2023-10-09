declare interface Window {
  acquireVsCodeApi: () => { postMessage: (message: unknown) => void };
}
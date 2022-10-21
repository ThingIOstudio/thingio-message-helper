import { requestMessageCmd, responseMessageCmd } from './utils/constant';
export default () => {
  const vscode = (window as any).acquireVsCodeApi();
  const messageFun = (e) => {
    if (requestMessageCmd.includes(e.data.command)) {
      vscode.postMessage(e.data);
    }

    if (responseMessageCmd.includes(e.data.command)) {
      (document.getElementById('home') as any).contentWindow.postMessage(e.data, '*');
    }
  };
  window.addEventListener('message', messageFun);
};

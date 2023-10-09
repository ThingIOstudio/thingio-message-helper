import { requestMessageCmd, responseMessageCmd } from './utils/constant';

export default () => {
  const vscode = window.acquireVsCodeApi();
  const messageFun = (e: { data: { command: string } }) => {
    if (requestMessageCmd.includes(e.data.command)) {
      vscode.postMessage(e.data);
    }

    if (responseMessageCmd.includes(e.data.command)) {
      (document.getElementById('home') as HTMLIFrameElement).contentWindow.postMessage(e.data, '*');
    }
  };
  window.addEventListener('message', messageFun);
};

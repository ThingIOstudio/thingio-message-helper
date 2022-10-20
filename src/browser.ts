export default () => {
  const vscode = (window as any).acquireVsCodeApi();
  const messageFun = (e) => {
    const requestMessageCmd = ['request', 'stream-request', 'command', 'write', 'client-end'];
    const responseMessageCmd = ['response', 'callback', 'error', 'data', 'end', 'status'];
    if (requestMessageCmd.includes(e.data.command)) {
      vscode.postMessage(e.data);
    }

    if (responseMessageCmd.includes(e.data.command)) {
      (document.getElementById('home') as any).contentWindow.postMessage(e.data, '*');
    }
  };
  window.addEventListener('message', messageFun);
};
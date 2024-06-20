// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('appBridge', {
    async send(api, args = {}) {
        try {
            const result = await ipcRenderer.invoke('desktop:api', { api, args });
            // eslint-disable-next-line no-console
            console.log(api, {
                args,
                result,
            });
            return result;
        }
        catch (error) {
            console.error('ERROR in api', { api, args, error });
            throw error;
        }
    },
    getPrivateApiHost() {
        return ipcRenderer.sendSync('getPrivateApiHost');
    },
});
// @ts-ignore
document.addEventListener('chromealive:event', (e) => {
    const message = e.detail;
    // eslint-disable-next-line no-console
    console.log(message.eventType, message.data);
});
const messagesById = new Map();
// @ts-ignore
document.addEventListener('chromealive:api', (e) => {
    const message = e.detail;
    messagesById.set(`${message.clientId}_${message.messageId}`, message);
});
// @ts-ignore
document.addEventListener('chromealive:api:response', (e) => {
    const message = e.detail;
    const key = `${message.clientId}_${message.responseId}`;
    const original = messagesById.get(key);
    messagesById.delete(key);
    // eslint-disable-next-line no-console
    console.log(original?.command, { args: original?.args?.[0], result: message.data });
});
//# sourceMappingURL=DesktopPagePreload.js.map
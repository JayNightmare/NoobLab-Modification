const { ipcRenderer, contextBridge } = require("electron");

const api = {
    switchView: (viewName) => {
        ipcRenderer.sendToHost("switch-view", viewName);
    },
    setCode: (code) => {
        ipcRenderer.sendToHost("set-code", code);
    },
    login: (username, password) => {
        ipcRenderer.send("login-attempt", { username, password });
    },
    getDashboardData: () => {
        return ipcRenderer.invoke("get-dashboard-data");
    },
    onLoginFailed: (callback) => {
        ipcRenderer.on("login-failed", (event, msg) => callback(msg));
    },
    log: (msg) => {
        ipcRenderer.sendToHost("console-log", msg);
    },
};

// Expose to the main world
try {
    if (contextBridge && contextBridge.exposeInMainWorld) {
        contextBridge.exposeInMainWorld("NoobLabDesktop", api);
    } else {
        window.NoobLabDesktop = api;
    }
} catch (error) {
    console.error("Failed to expose NoobLabDesktop API:", error);
    // Fallback for environments where contextBridge might fail or not be needed
    window.NoobLabDesktop = api;
}

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const waitOn = require("wait-on");
require("dotenv").config();
const mongoose = require("mongoose");

let mainWindow;
let javaProcess;

// --- Database Setup ---
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/nooblab_desktop";
console.log(
    "Connecting to MongoDB at:",
    MONGO_URI.replace(/:([^:@]+)@/, ":****@")
);

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
        seedDatabase();
    })
    .catch((err) => console.log("MongoDB Connection Error:", err));

const UserSchema = new mongoose.Schema({ username: String, password: String });
const User = mongoose.model("User", UserSchema);

async function seedDatabase() {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log("Seeding Users...");
            await User.create({ username: "student", password: "password" });
            await User.create({ username: "admin", password: "admin" });
            console.log("Users Seeded");
        }
    } catch (err) {
        console.error("Seeding Error:", err);
    }
}

// --- Java Server Setup ---
const JAR_PATH = path.join(__dirname, "target", "NoobLab.jar");
const WEBAPP_DIR = path.join(__dirname, "src", "main", "webapp");
const PORT = 8080;

function startJavaServer() {
    console.log("Starting Java Server...");
    javaProcess = spawn("java", [
        `-Dwebapp.dir=${WEBAPP_DIR}`,
        "-jar",
        JAR_PATH,
        PORT.toString(),
    ]);

    javaProcess.stdout.on("data", (data) => {
        console.log(`[Java]: ${data}`);
    });

    javaProcess.stderr.on("data", (data) => {
        console.error(`[Java Error]: ${data}`);
    });
}

// --- Auth IPC ---
ipcMain.on("login-attempt", async (event, { username, password }) => {
    console.log(`Login attempt for: ${username}`);
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            console.log("Login successful");
            // Redirect to Java WebApp with trusted_user param
            const targetUrl = `http://localhost:${PORT}/Login?trusted_user=${username}`;
            mainWindow.loadURL(targetUrl);
        } else {
            event.reply("login-failed", "Invalid credentials");
        }
    } catch (e) {
        console.error("Login Error:", e);
        event.reply("login-failed", "Server error");
    }
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, "webview-preload.js"),
        },
    });

    // Load the Electron-based Login Page first
    const loginPath = path.join(
        __dirname,
        "local-server",
        "public",
        "login.html"
    );
    mainWindow.loadFile(loginPath);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    // Inject CSS into every page load
    mainWindow.webContents.on("did-finish-load", () => {
        const fs = require("fs");
        const cssPath = path.join(
            __dirname,
            "src",
            "main",
            "webapp",
            "css",
            "modern.css"
        );
        fs.readFile(cssPath, "utf-8", (err, data) => {
            if (!err) {
                mainWindow.webContents.insertCSS(data);
                console.log("Injected modern.css");
            } else {
                console.error("Failed to load modern.css", err);
            }
        });
    });
}

app.on("ready", () => {
    startJavaServer();

    const javaUrl = `http://localhost:${PORT}/login.jsp`;
    waitOn({ resources: [javaUrl], timeout: 30000 })
        .then(() => {
            console.log("Java Server Ready");
            createWindow();
        })
        .catch((err) => console.error("Java Server failed to start", err));
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("will-quit", () => {
    if (javaProcess) {
        javaProcess.kill();
    }
});

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
require("dotenv").config(); // Load environment variables
const mongoose = require("mongoose");

let mainWindow;
let shellProcess;

// --- Database Setup ---
// Connect to MongoDB (assuming local instance for now, or use a cloud URI)
const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/nooblab_desktop";

console.log(
    "Connecting to MongoDB at:",
    MONGO_URI.replace(/:([^:@]+)@/, ":****@")
); // Log URI with masked password

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
        seedDatabase();
    })
    .catch((err) =>
        console.log(
            "MongoDB Connection Error (Expected if no DB running):",
            err
        )
    );

// Define a simple User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    password: String, // In production, hash this!
});
const User = mongoose.model("User", UserSchema);

const CourseSchema = new mongoose.Schema({
    id: String,
    title: String,
    description: String,
});
const Course = mongoose.model("Course", CourseSchema);

async function seedDatabase() {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log("Seeding Users...");
            await User.create({ username: "student", password: "password" });
            await User.create({ username: "admin", password: "admin" });
            console.log("Users Seeded");
        }

        const courseCount = await Course.countDocuments();
        if (courseCount === 0) {
            console.log("Seeding Courses...");
            await Course.create([
                {
                    id: "java101",
                    title: "Java Programming 101",
                    description:
                        "Introduction to Java, variables, loops, and objects.",
                },
                {
                    id: "python_basics",
                    title: "Python Basics",
                    description:
                        "Learn Python syntax and basic data structures.",
                },
                {
                    id: "web_dev",
                    title: "Web Development",
                    description: "HTML, CSS, and JavaScript fundamentals.",
                },
            ]);
            console.log("Courses Seeded");
        }
    } catch (err) {
        console.error("Seeding Error:", err);
    }
}
// ----------------------

// Terminal IPC
ipcMain.on("terminal-init", (event) => {
    const shell = process.platform === "win32" ? "powershell.exe" : "bash";
    shellProcess = spawn(shell, [], {
        cwd: process.cwd(),
        env: process.env,
    });

    shellProcess.stdout.on("data", (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("terminal-incoming", data.toString());
        }
    });

    shellProcess.stderr.on("data", (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("terminal-incoming", data.toString());
        }
    });

    shellProcess.on("exit", (code) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send(
                "terminal-incoming",
                `\r\nProcess exited with code ${code}\r\n`
            );
        }
    });
});

ipcMain.on("terminal-input", (event, data) => {
    if (shellProcess && !shellProcess.killed) {
        shellProcess.stdin.write(data);
    }
});

// --- Auth IPC ---
ipcMain.on("login-attempt", async (event, { username, password }) => {
    console.log(`Login attempt for: ${username}`);

    try {
        // Check the DB
        const user = await User.findOne({ username, password });

        if (user) {
            console.log("Login successful");
            // Navigate the webview to the dashboard
            if (mainWindow) {
                const dashboardPath = path.join(
                    __dirname,
                    "local-server",
                    "public",
                    "dashboard.html"
                );
                const dashboardUrl = `file://${dashboardPath}`;
                mainWindow.webContents.send("server-ready", dashboardUrl);
            }
        } else {
            console.log("Login failed");
            // Send failure message back (we can use event.reply if using ipcRenderer.send)
            event.reply("login-failed", "Invalid credentials");
        }
    } catch (e) {
        console.error("Login Error:", e);
        event.reply("login-failed", "Server error");
    }
});

ipcMain.handle("get-dashboard-data", async (event) => {
    try {
        const courses = await Course.find({});
        return { courses };
    } catch (e) {
        console.error("Fetch Error:", e);
        return { courses: [] };
    }
});
// ----------------

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true, // Enable <webview> tag
        },
    });

    const localIndex = path.join(__dirname, "index.html");
    mainWindow.loadFile(localIndex);

    // Point to our new local login page
    const loginPath = path.join(
        __dirname,
        "local-server",
        "public",
        "login.html"
    );
    const loginUrl = `file://${loginPath}`;

    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow.webContents.send("server-ready", loginUrl);
    });

    mainWindow.on("closed", function () {
        mainWindow = null;
    });
}

app.on("ready", () => {
    createWindow();
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", function () {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on("will-quit", () => {
    if (javaProcess) {
        console.log("Killing Java server...");
        javaProcess.kill();
    }
});

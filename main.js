const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const waitOn = require("wait-on");
require("dotenv").config();
const mongoose = require("mongoose");

let mainWindow;
let javaProcess;
let currentUser = null;

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

const UserSchema = new mongoose.Schema({
    id: String,
    username: String,
    password: String,
    medals: [
        {
            medalId: String,
            medalType: String,
            timestamp: { type: Date, default: Date.now },
        },
    ],
    createdAt: { type: Date, default: Date.now },
    lastLoggedIn: { type: Date, default: Date.now },
    cohort: { type: Number, default: 1 },
});
const User = mongoose.model("User", UserSchema);

const CourseSchema = new mongoose.Schema({
    id: String,
    title: String,
    description: String,
    cohort: { type: Number, default: 1 },
    exercises: [
        {
            exerciseId: String,
            title: String,
            description: String,
            file: String,
            originalFile: String,
            medal: { type: String, default: "Bronze" },
        },
    ],
});
const Course = mongoose.model("Course", CourseSchema);

ipcMain.on("get-user-data", async (event, { username }) => {
    try {
        const user = await User.findOne({ username }).lean();
        if (user) {
            // Ensure _id is a string or removed if not needed, though lean() usually helps.
            // JSON.parse(JSON.stringify(user)) is a safe bet for IPC.
            event.reply("user-data", {
                success: true,
                user: JSON.parse(JSON.stringify(user)),
            });
        } else {
            event.reply("user-data", {
                success: false,
                error: "User not found",
            });
        }
    } catch (e) {
        event.reply("user-data", { success: false, error: e.message });
    }
});

ipcMain.on("log", (event, message) => {
    console.log("[RENDERER LOG]:", message);
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

ipcMain.on("save-medal", async (event, { username, medalId, medalType }) => {
    const targetUser = username || currentUser;
    if (!targetUser) {
        event.reply("medal-saved", {
            success: false,
            error: "No user logged in",
        });
        return;
    }
    console.log(`Saving medal for ${targetUser}: ${medalType} - ${medalId}`);
    try {
        const user = await User.findOne({ username: targetUser });
        if (user) {
            const exists = user.medals.some((m) => m.medalId === medalId);
            if (!exists) {
                await User.updateOne(
                    { username: targetUser },
                    { $push: { medals: { medalId, medalType } } }
                );
                event.reply("medal-saved", { success: true, new: true });
            } else {
                console.log("Medal already exists");
                event.reply("medal-saved", { success: true, new: false });
            }
        } else {
            event.reply("medal-saved", {
                success: false,
                error: "User not found",
            });
        }
    } catch (e) {
        console.error("Error saving medal:", e);
        event.reply("medal-saved", { success: false, error: e.message });
    }
});

async function seedDatabase() {
    try {
        /* 
        TODO - Course Seeding
        - Check if courses has all the module courses in src/main/resources/modules.json
        - If a course is missing, add it to the database
        */
        const modulesPath = path.join(
            __dirname,
            "src",
            "main",
            "resources",
            "modules.json"
        );

        if (fs.existsSync(modulesPath)) {
            const modules = JSON.parse(fs.readFileSync(modulesPath, "utf-8"));
            for (const moduleData of modules) {
                const exists = await Course.findOne({ id: moduleData.id });
                if (!exists) {
                    console.log(`Seeding missing course: ${moduleData.title}`);
                    await Course.create(moduleData);
                }
            }
        } else {
            console.warn(`Modules file not found at ${modulesPath}`);
        }
        /* 
        TODO - User Seeding
        - Check to see if Admin exists in the database, if not, create one
        - Check to see if the 3 test users are in the database (first year, second year, and a third year)
        */
        const usersPath = path.join(
            __dirname,
            "src",
            "main",
            "resources",
            "users.json"
        );
        if (fs.existsSync(usersPath)) {
            const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
            for (const userData of users) {
                const exists = await User.findOne({ id: userData.id });
                if (!exists) {
                    console.log(`Seeding missing user: ${userData.username}`);
                    await User.create(userData);
                }
            }
        } else {
            console.warn(`Modules file not found at ${modulesPath}`);
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
        `-Dmongo.uri=${MONGO_URI}`,
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
            currentUser = username;
            // Redirect to Java WebApp with trusted_user param
            const targetUrl = `http://localhost:${PORT}/Login?trusted_user=${currentUser}`;
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

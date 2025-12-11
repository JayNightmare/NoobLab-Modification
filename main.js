const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const waitOn = require("wait-on");
const fs = require("fs");
const crypto = require("crypto");
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
            language: { type: String, default: "Java" },
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

// --- Admin IPC ---

ipcMain.on("admin-login-attempt", async (event, { username, password }) => {
    // Basic check for now, can be expanded
    if (username === "adminuser" && password === "adminpass") {
        const dashboardPath = path.join(
            __dirname,
            "local-server",
            "public",
            "admin-dashboard-refactored.html"
        );
        mainWindow.loadFile(dashboardPath);
    } else {
        event.reply("admin-login-failed", "Invalid Admin Credentials");
    }
});

ipcMain.handle("admin-get-users", async () => {
    try {
        return await User.find({}).sort({ username: 1 }).lean();
    } catch (e) {
        console.error(e);
        return [];
    }
});

ipcMain.handle(
    "admin-save-user",
    async (event, { username, password, cohort }) => {
        try {
            const updateData = { cohort: parseInt(cohort) };
            if (password) updateData.password = password;

            await User.updateOne(
                { username },
                { $set: updateData },
                { upsert: true }
            );
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
);

ipcMain.handle("admin-delete-user", async (event, { username }) => {
    try {
        await User.deleteOne({ username });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle("admin-get-modules", async () => {
    const modulesPath = path.join(
        __dirname,
        "src",
        "main",
        "resources",
        "modules.json"
    );
    if (fs.existsSync(modulesPath)) {
        return JSON.parse(fs.readFileSync(modulesPath, "utf-8"));
    }
    return [];
});

ipcMain.handle(
    "admin-get-exercise-details",
    async (event, { moduleId, exerciseId }) => {
        const modulesPath = path.join(
            __dirname,
            "src",
            "main",
            "resources",
            "modules.json"
        );
        const modules = JSON.parse(fs.readFileSync(modulesPath, "utf-8"));
        const module = modules.find((m) => m.id === moduleId);
        const exercise = module.exercises.find(
            (e) => e.exerciseId === exerciseId
        );

        if (!exercise) return { error: "Exercise not found" };

        // Read the HTML file to get the test code and intro
        // Files are stored in src/main/webapp/content/
        const htmlPath = path.join(
            __dirname,
            "src",
            "main",
            "webapp",
            "content",
            exercise.file
        );
        let testCode = "";
        let introHtml = "";

        if (fs.existsSync(htmlPath)) {
            const content = fs.readFileSync(htmlPath, "utf-8");

            // Pattern 1: <div class="code"> inside <div class="testCase">
            const match1 = content.match(
                /<div class="testCase"[\s\S]*?<div class="code">([\s\S]*?)<\/div>/
            );

            // Pattern 2: <div class="test"> inside <div class="testCode"> inside <div class="testCase">
            const match2 = content.match(
                /<div class="testCase"[\s\S]*?<div class="testCode">\s*<div class="test">([\s\S]*?)<\/div>\s*<\/div>/
            );

            if (match1 && match1[1]) {
                testCode = match1[1].trim();
            } else if (match2 && match2[1]) {
                testCode = match2[1].trim();
            }

            // Get Intro HTML (First Section)
            const sectionMatch = content.match(
                /<div class="section">([\s\S]*?)<\/div>/
            );
            if (sectionMatch && sectionMatch[1]) {
                introHtml = sectionMatch[1].trim();
            }
        }

        return {
            title: exercise.title,
            description: exercise.description,
            medal: exercise.medal,
            testCode: testCode,
            introHtml: introHtml,
            file: exercise.file,
        };
    }
);

ipcMain.handle(
    "admin-save-exercise",
    async (
        event,
        { moduleId, exerciseId, title, description, medal, testCode, introHtml }
    ) => {
        try {
            // 1. Update modules.json
            const modulesPath = path.join(
                __dirname,
                "src",
                "main",
                "resources",
                "modules.json"
            );
            const modules = JSON.parse(fs.readFileSync(modulesPath, "utf-8"));
            const module = modules.find((m) => m.id === moduleId);
            const exercise = module.exercises.find(
                (e) => e.exerciseId === exerciseId
            );

            if (!exercise)
                return { success: false, error: "Exercise not found" };

            exercise.title = title;
            exercise.description = description;
            exercise.medal = medal;

            fs.writeFileSync(modulesPath, JSON.stringify(modules, null, 4));

            // 2. Update HTML file
            const htmlPath = path.join(
                __dirname,
                "src",
                "main",
                "webapp",
                "content",
                exercise.file
            );
            if (fs.existsSync(htmlPath)) {
                let content = fs.readFileSync(htmlPath, "utf-8");

                // Update Medal in data-medal attribute
                const medalRegex = new RegExp(
                    `(<div class="testCase"[^>]*data-medal=")([^"]*)(")`
                );
                content = content.replace(medalRegex, (match, p1, p2, p3) => {
                    return `${p1}${medal}:${title}${p3}`;
                });

                // Update Test Code
                const pattern1Regex =
                    /(<div class="testCase"[\s\S]*?<div class="code">)([\s\S]*?)(<\/div>)/;
                const pattern2Regex =
                    /(<div class="testCase"[\s\S]*?<div class="testCode">\s*<div class="test">)([\s\S]*?)(<\/div>\s*<\/div>)/;

                if (pattern1Regex.test(content)) {
                    content = content.replace(
                        pattern1Regex,
                        `$1\n${testCode}\n$3`
                    );
                } else if (pattern2Regex.test(content)) {
                    content = content.replace(
                        pattern2Regex,
                        `$1\n${testCode}\n$3`
                    );
                }

                // Update Intro HTML (First Section)
                // We only replace the content INSIDE the first <div class="section">
                const sectionRegex =
                    /(<div class="section">)([\s\S]*?)(<\/div>)/;
                content = content.replace(sectionRegex, `$1\n${introHtml}\n$3`);

                fs.writeFileSync(htmlPath, content);
            }

            // 3. Sync to MongoDB (Course collection)
            await Course.updateOne(
                { id: moduleId, "exercises.exerciseId": exerciseId },
                {
                    $set: {
                        "exercises.$.title": title,
                        "exercises.$.medal": medal,
                    },
                }
            );

            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, error: e.message };
        }
    }
);

ipcMain.handle(
    "admin-add-exercise",
    async (event, { moduleId, title, medal }) => {
        try {
            const modulesPath = path.join(
                __dirname,
                "src",
                "main",
                "resources",
                "modules.json"
            );
            const modules = JSON.parse(fs.readFileSync(modulesPath, "utf-8"));
            const module = modules.find((m) => m.id === moduleId);

            if (!module) return { success: false, error: "Module not found" };

            const exerciseId = crypto.randomUUID();
            const fileName = `${exerciseId}.html`;

            // Create new exercise object
            const newExercise = {
                exerciseId: exerciseId,
                title: title,
                description: "New Exercise",
                file: fileName,
                originalFile: fileName,
                medal: medal,
            };

            module.exercises.push(newExercise);
            fs.writeFileSync(modulesPath, JSON.stringify(modules, null, 4));

            // Create HTML file from template
            const templatePath = path.join(
                __dirname,
                "src",
                "main",
                "webapp",
                "content",
                "template_exercise.html"
            );
            const newFilePath = path.join(
                __dirname,
                "src",
                "main",
                "webapp",
                "content",
                fileName
            );

            if (fs.existsSync(templatePath)) {
                let content = fs.readFileSync(templatePath, "utf-8");
                content = content.replace(
                    'data-id="unique_exercise_id"',
                    `data-id="${exerciseId}"`
                );
                content = content.replace(
                    'data-medal="Bronze"',
                    `data-medal="${medal}:${title}"`
                );
                content = content.replace(
                    "Exercise: Task Name",
                    `Exercise: ${title}`
                );
                fs.writeFileSync(newFilePath, content);
            } else {
                fs.writeFileSync(
                    newFilePath,
                    `<html><body><div class="section"><h2 class="title">${title}</h2></div><div class="testCase" data-id="${exerciseId}" data-medal="${medal}:${title}"><div class="code">return true;</div></div></body></html>`
                );
            }

            // Sync to MongoDB
            await Course.updateOne(
                { id: moduleId },
                { $push: { exercises: newExercise } }
            );

            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, error: e.message };
        }
    }
);

ipcMain.handle(
    "admin-delete-exercise",
    async (event, { moduleId, exerciseId }) => {
        try {
            const modulesPath = path.join(
                __dirname,
                "src",
                "main",
                "resources",
                "modules.json"
            );
            const modules = JSON.parse(fs.readFileSync(modulesPath, "utf-8"));
            const module = modules.find((m) => m.id === moduleId);

            if (!module) return { success: false, error: "Module not found" };

            const exerciseIndex = module.exercises.findIndex(
                (e) => e.exerciseId === exerciseId
            );
            if (exerciseIndex === -1)
                return { success: false, error: "Exercise not found" };

            const exercise = module.exercises[exerciseIndex];
            const filePath = path.join(
                __dirname,
                "src",
                "main",
                "webapp",
                "content",
                exercise.file
            );

            // Remove from JSON
            module.exercises.splice(exerciseIndex, 1);
            fs.writeFileSync(modulesPath, JSON.stringify(modules, null, 4));

            // Delete file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Sync to MongoDB
            await Course.updateOne(
                { id: moduleId },
                { $pull: { exercises: { exerciseId: exerciseId } } }
            );

            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, error: e.message };
        }
    }
);

ipcMain.on("admin-preview-test-user", (event) => {
    // Launch as test user
    currentUser = "testuser1"; // Default test user
    const targetUrl = `http://localhost:${PORT}/Login?trusted_user=${currentUser}`;
    mainWindow.loadURL(targetUrl);
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
    let loginPath;
    if (process.env.ALL_POWERFUL === "true") {
        console.log("ALL_POWERFUL mode enabled: Loading Admin Login");
        loginPath = path.join(
            __dirname,
            "local-server",
            "public",
            "admin-login.html"
        );
    } else {
        loginPath = path.join(
            __dirname,
            "local-server",
            "public",
            "login.html"
        );
    }
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

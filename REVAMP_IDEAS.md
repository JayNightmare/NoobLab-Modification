# NoobLab Revamp: Hybrid Electron Architecture

## 1. Selected Architecture: Hybrid (Electron + Bundled Java Server)

This approach involves wrapping the existing Java web application within an Electron shell. The Electron application will be responsible for managing a local Java server instance (e.g., embedded Jetty or Tomcat) which serves the application to the frontend.

### Why this approach?

- **Preserves Core Logic:** The complex compilation and execution logic in `JavaRunner.java`, `CPPRunner.java`, and `RunPython.java` remains untouched.
- **Faster Migration:** No need to rewrite the entire backend in Node.js immediately.
- **Offline Capability:** By bundling the JRE and the server, the application becomes a self-contained desktop app.

### High-Level Architecture

1. **Electron Main Process (Node.js)**:
   - On launch, spawns a child process to start the Java Server (Embedded Jetty/Tomcat).
   - Waits for the server to be ready (e.g., polling `localhost:8080`).
   - Creates a `BrowserWindow` that loads the local URL.
   - Manages the application lifecycle (quits Java server when app closes).

2. **Java Backend (Localhost)**:
   - Runs as a background process.
   - Handles all existing Servlet logic (Login, Code Execution, Stats).
   - Accesses the local file system for compilation tasks.

3. **Electron Renderer (Frontend)**:
   - Displays the web application.
   - Augmented with "Desktop" features (Terminal, File System access) via Electron Preload scripts.

## 2. "Browser + Terminal" Feature Set

The goal is to create a "Browser with a built-in Terminal".

### Integrated Terminal

- **Library:** `xterm.js` (Frontend) + `node-pty` (Electron Main Process).
- **Functionality:**
  - Provides a real system shell (PowerShell/Bash) docked within the application window.
  - Independent of the Java backend; allows students to run `git`, `javac`, or `python` commands directly if they wish.
  - **Integration:** Can be toggled via a hotkey (like VS Code's `Ctrl+``).

### Workspace Management

- **Split Panes:** Use a layout manager (like `golden-layout` or CSS Grid) to allow users to resize the Code Editor, Web Preview, and Terminal.
- **Local File System Access:**
  - Instead of "Uploading" files to the server, the Electron app can mount a local folder.
  - The Java backend can be configured to read/write to this specific local folder path passed as an argument during startup.

## 3. Migration Strategy

### Phase 1: The Wrapper (Proof of Concept)

1. **Embedded Server Conversion:**
   - Modify `pom.xml` to produce an executable JAR with embedded Jetty/Tomcat instead of a WAR.
   - Ensure `Main.java` can start the web context programmatically.

2. **Electron Boilerplate:**
   - Set up a basic Electron project.
   - Implement the child process spawning logic to run `java -jar nooblab.jar`.

3. **Bundling:**
   - Use `electron-builder`.
   - Bundle a JRE (Java 21) so the user doesn't need to install Java manually.

### Phase 2: Frontend Modernization

1. **JSP to API:**
   - Gradually refactor JSPs to return JSON instead of HTML.
   - Create a React/Vue layer in Electron that consumes these APIs.

2. **Editor Upgrade:**
   - Replace CodeMirror with **Monaco Editor** (VS Code's editor) for superior IntelliSense and performance.

### Phase 3: Deep Integration

1. **Native Menus:** Move navigation from the web page to the Electron application menu.
2. **Rich Presence:** Integration with Discord or OS notifications for "Build Complete" or "Tests Passed".

## 4. Technical Challenges & Solutions

| Challenge | Solution |
| :--- | :--- |
| **Port Conflicts** | Electron should dynamically find an open port and pass it to the Java server as an argument (e.g., `--server.port=12345`). |
| **Database/State** | Use an embedded database (H2 or SQLite) stored in the user's `AppData` folder instead of a server-side DB. |
| **Security** | Since it's a local app, `JavaRunner` security restrictions (sandboxing) can be relaxed, but we must ensure the app doesn't accidentally expose the server to the public network (bind to `127.0.0.1` only). |

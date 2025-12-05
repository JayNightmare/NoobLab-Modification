# Project Analysis: NoobLab-Modification

## Overview

NoobLab is a web-based educational platform designed to teach programming languages such as Java, C++, and Python. It provides an interactive environment where students can write, execute, and debug code directly in their browser. This repository appears to be a modification or fork of the original NoobLab project.

## Technology Stack

- **Backend:** Java (Servlet API 3.0), Maven
- **Frontend:** JSP, JavaScript, jQuery, CodeMirror (editor), Blockly (visual programming)
- **Build Tool:** Maven
- **Deployment:** WAR file (likely deployed to Apache Tomcat or Jetty)
- **Libraries:**
  - `javax.servlet:jstl`
  - `javax:javaee-web-api`
  - `commons-io`, `commons-lang`, `commons-fileupload`, `commons-exec`
  - `org.jsoup:jsoup` (HTML parsing)
  - `com.google.code.gson:gson` (JSON handling)
  - `joda-time` (Date/Time handling)
  - `rhino:js` (JavaScript engine)

## Directory Structure

- `src/main/java`: Java source code.
  - `uk.ac.kingston.nooblab`: Main package containing Servlets and utility classes.
  - `uk.ac.kingston.nooblab.c`: C++ specific logic.
  - `uk.ac.kingston.nooblab.java`: Java specific logic.
  - `uk.ac.kingston.nooblab.stats`: Statistics and logging.
- `src/main/webapp`: Web resources.
  - `WEB-INF/web.xml`: Deployment descriptor.
  - `*.jsp`: Java Server Pages for rendering views.
  - `js/`, `css/`: Frontend assets.
  - `blockly/`: Google Blockly integration files.
  - `codemirror/`: CodeMirror editor files.

## Key Components

### Backend (Java)

- **Main.java (`uk.ac.kingston.nooblab.Main`)**: The core servlet that likely handles the main application logic, session management, and page rendering.
- **Login.java (`uk.ac.kingston.nooblab.Login`)**: Handles user authentication.
- **JavaRunner.java (`uk.ac.kingston.nooblab.JavaRunner`)**: Responsible for compiling and executing Java code submitted by users.
- **CPPRunner.java (`uk.ac.kingston.nooblab.CPPRunner`)**: Handles C++ code execution.
- **RunPython.java (`uk.ac.kingston.nooblab.RunPython`)**: Handles Python code execution.
- **StatsService.java (`uk.ac.kingston.nooblab.stats.StatsService`)**: Manages data collection regarding student performance and activity.

### Frontend

- **CodeMirror**: Used for the in-browser code editor.
- **Blockly**: Provides a visual block-based programming interface.
- **JSP Pages**: Render the HTML content, likely injecting data from the backend servlets.

## Functionality

1. **User Authentication**: Supports standard login and potentially SSO (Single Sign-On) via referrer checks.
2. **Code Execution**:
   - **Java**: Compiles and runs Java code on the server.
   - **C++**: Compiles and runs C++ code (likely using `commons-exec` to call `g++` or similar).
   - **Python**: Executes Python scripts.
3. **Interactive Learning**:
   - "Embed" functionality suggests exercises can be embedded in other pages.
   - "Medal" system implies gamification or grading.
4. **Analytics**: Tracks user activity ("LogActivity", "LogEmotion") and code submissions.

## Build & Run

The project is built using Maven.

- **Build**: `mvn clean install` (produces a `.war` file).
- **Run**: Deploy the generated WAR file to a Servlet container like Tomcat.

## Notes for Development

- The project uses older Java EE standards (Servlet 3.0).
- `pom.xml` references `java.net2` repository which might be outdated/unreachable.
- Code execution on the server side (`JavaRunner`, `CPPRunner`) requires careful security auditing to prevent arbitrary code execution vulnerabilities.

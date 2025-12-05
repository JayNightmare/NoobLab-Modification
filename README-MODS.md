# NoobLab Modification - Modernization

## Changes Made

- **Removed Legacy Java Backend**: The embedded Tomcat server and Java dependencies have been removed from the startup process.
- **New Local Frontend**: Created `local-server/public` containing `login.html` and `dashboard.html` to replace the old JSP pages.
- **Electron Backend**: Updated `main.js` to serve local files and handle authentication via IPC.
- **Database**: Integrated `mongoose` for MongoDB support.

## Prerequisites

- **MongoDB**: You need to have MongoDB installed and running locally on port 27017.
  - Download: [MongoDB Community Server](https://www.mongodb.com/try/download/community)
  - If you don't have it, the app will still launch, but database features (saving users/data) will not work (Login is currently mocked to always succeed).

## How to Run

1. Ensure dependencies are installed:

   ```bash
   npm install
   ```

2. Start the application:

   ```bash
   npm start
   ```

## Default Login Credentials

The application will automatically seed the database with these users if it's empty:

- **Username**: `student`
- **Password**: `password`

- **Username**: `admin`
- **Password**: `admin`

## Next Steps

- Migrate data from the old system if needed.
- Expand `dashboard.html` to include real course data.

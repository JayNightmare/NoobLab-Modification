package uk.ac.kingston.nooblab.db;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

public class DatabaseManager {
    
    private static final String DB_DRIVER = "org.h2.Driver";
    private static final String DB_FOLDER = System.getProperty("user.home") + File.separator + ".nooblab";
    private static final String DB_CONNECTION = "jdbc:h2:" + DB_FOLDER + File.separator + "nooblab_db;AUTO_SERVER=TRUE";
    private static final String DB_USER = "sa";
    private static final String DB_PASSWORD = "";

    static {
        try {
            // Ensure the DB folder exists (prevents H2 path errors in packaged apps)
            new File(DB_FOLDER).mkdirs();

            Class<?> driverClass = Class.forName(DB_DRIVER);
            // Explicitly register driver to ensure it is available to DriverManager
            java.sql.Driver driver = (java.sql.Driver) driverClass.getDeclaredConstructor().newInstance();
            DriverManager.registerDriver(driver);
            
            initDatabase();
        } catch (Exception e) {
            Logger.getLogger(DatabaseManager.class.getName()).log(Level.SEVERE, "Database driver initialization failed", e);
        }
    }

    public static Connection getConnection() throws SQLException {
        try {
            return DriverManager.getConnection(DB_CONNECTION, DB_USER, DB_PASSWORD);
        } catch (SQLException e) {
            Logger.getLogger(DatabaseManager.class.getName()).log(Level.SEVERE, "Failed to connect to " + DB_CONNECTION, e);
            throw e;
        }
    }

    private static void initDatabase() {
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            
            // Users Table
            stmt.execute("CREATE TABLE IF NOT EXISTS users (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "username VARCHAR(255) UNIQUE NOT NULL, " +
                    "password VARCHAR(255), " +
                    "display_name VARCHAR(255), " +
                    "avatar_url VARCHAR(255), " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                    ")");

            // Modules Table
            stmt.execute("CREATE TABLE IF NOT EXISTS modules (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "title VARCHAR(255) NOT NULL, " +
                    "description TEXT" +
                    ")");
            
            // Add total_exercises column if it doesn't exist (Schema migration)
            try {
                stmt.execute("ALTER TABLE modules ADD COLUMN IF NOT EXISTS total_exercises INT DEFAULT 0");
            } catch (SQLException e) {
                // Fallback for older H2 versions or if column exists
                Logger.getLogger(DatabaseManager.class.getName()).log(Level.INFO, "Could not add total_exercises column (might already exist): " + e.getMessage());
            }

            // Exercises Table
            stmt.execute("CREATE TABLE IF NOT EXISTS exercises (" +
                    "id VARCHAR(100) PRIMARY KEY, " +
                    "module_id VARCHAR(50), " +
                    "title VARCHAR(255), " +
                    "content_path VARCHAR(255), " +
                    "FOREIGN KEY (module_id) REFERENCES modules(id)" +
                    ")");

            // Medals/Progress Table
            stmt.execute("CREATE TABLE IF NOT EXISTS user_progress (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "user_id INT, " +
                    "module_id VARCHAR(50), " +
                    "exercise_id VARCHAR(100), " +
                    "medal_type VARCHAR(20), " + // Bronze, Silver, Gold
                    "timestamp LONG, " +
                    "FOREIGN KEY (user_id) REFERENCES users(id)" +
                    ")");
            
            // Upsert modules and exercises on every startup so existing DBs get new content
            upsertModule(stmt, "prog1", "Programming 1 (Java)", "Introduction to Java Programming: Variables, Control Flow, and Loops", 4);
            upsertModule(stmt, "prog2", "Programming 2 (Python)", "Intermediate Programming with Python: Lists, Functions, and Logic", 3);

            // Prog 1
            upsertExercise(stmt, "ex1", "prog1", "1. Hello World", "content/intro_java.html");
            upsertExercise(stmt, "ex2", "prog1", "2. Variables & Types", "content/java_variables.html");
            upsertExercise(stmt, "ex3", "prog1", "3. If Statements", "content/java_if.html");
            upsertExercise(stmt, "ex4", "prog1", "4. Loops", "content/java_loops.html");

            // Prog 2
            upsertExercise(stmt, "ex5", "prog2", "1. Hello Python", "content/python_intro.html");
            upsertExercise(stmt, "ex6", "prog2", "2. Lists & Data", "content/python_lists.html");
            upsertExercise(stmt, "ex7", "prog2", "3. Functions", "content/python_functions.html");

        } catch (SQLException e) {
            Logger.getLogger(DatabaseManager.class.getName()).log(Level.SEVERE, "Database initialization failed", e);
        }
    }
    
    private static void upsertModule(Statement stmt, String id, String title, String description, int totalExercises) throws SQLException {
        String sql = "MERGE INTO modules (id, title, description, total_exercises) KEY(id) VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = stmt.getConnection().prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, title);
            ps.setString(3, description);
            ps.setInt(4, totalExercises);
            ps.executeUpdate();
        }
    }

    private static void upsertExercise(Statement stmt, String id, String moduleId, String title, String path) throws SQLException {
        String sql = "MERGE INTO exercises (id, module_id, title, content_path) KEY(id) VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = stmt.getConnection().prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, moduleId);
            ps.setString(3, title);
            ps.setString(4, path);
            ps.executeUpdate();
        }
    }
    
    // Helper to get or create user
    public static int getOrCreateUser(String username) throws SQLException {
        try (Connection conn = getConnection()) {
            PreparedStatement ps = conn.prepareStatement("SELECT id FROM users WHERE username = ?");
            ps.setString(1, username);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt("id");
            } else {
                PreparedStatement insert = conn.prepareStatement("INSERT INTO users (username, display_name) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS);
                insert.setString(1, username);
                insert.setString(2, username); // Default display name
                insert.executeUpdate();
                ResultSet generatedKeys = insert.getGeneratedKeys();
                if (generatedKeys.next()) {
                    return generatedKeys.getInt(1);
                }
            }
        }
        return -1;
    }

    public static List<Map<String, Object>> getModules() throws SQLException {
        List<Map<String, Object>> modules = new ArrayList<>();
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT * FROM modules");
            while (rs.next()) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", rs.getString("id"));
                m.put("title", rs.getString("title"));
                m.put("description", rs.getString("description"));
                m.put("total_exercises", rs.getInt("total_exercises"));
                modules.add(m);
            }
        }
        return modules;
    }

    public static Map<String, Object> getModule(String id) throws SQLException {
        try (Connection conn = getConnection()) {
            PreparedStatement ps = conn.prepareStatement("SELECT * FROM modules WHERE id = ?");
            ps.setString(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", rs.getString("id"));
                m.put("title", rs.getString("title"));
                m.put("description", rs.getString("description"));
                m.put("total_exercises", rs.getInt("total_exercises"));
                return m;
            }
        }
        return null;
    }

    public static List<Map<String, Object>> getExercises(String moduleId) throws SQLException {
        List<Map<String, Object>> exercises = new ArrayList<>();
        try (Connection conn = getConnection()) {
            PreparedStatement ps = conn.prepareStatement("SELECT * FROM exercises WHERE module_id = ?");
            ps.setString(1, moduleId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> e = new HashMap<>();
                e.put("id", rs.getString("id"));
                e.put("module_id", rs.getString("module_id"));
                e.put("title", rs.getString("title"));
                e.put("content_path", rs.getString("content_path"));
                exercises.add(e);
            }
        }
        return exercises;
    }

    public static int getExerciseCount(String moduleId) throws SQLException {
        try (Connection conn = getConnection()) {
            PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM exercises WHERE module_id = ?");
            ps.setString(1, moduleId);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        }
        return 0;
    }

    public static Map<String, String> getUserMedals(int userId) throws SQLException {
        Map<String, String> medals = new HashMap<>();
        try (Connection conn = getConnection()) {
            PreparedStatement ps = conn.prepareStatement("SELECT exercise_id, medal_type FROM user_progress WHERE user_id = ?");
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                medals.put(rs.getString("exercise_id"), rs.getString("medal_type"));
            }
        }
        return medals;
    }

    public static List<Map<String, Object>> getUserProgressList(int userId) throws SQLException {
        List<Map<String, Object>> progressList = new ArrayList<>();
        try (Connection conn = getConnection()) {
            PreparedStatement ps = conn.prepareStatement("SELECT module_id, exercise_id, medal_type FROM user_progress WHERE user_id = ?");
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> row = new HashMap<>();
                row.put("module_id", rs.getString("module_id"));
                row.put("exercise_id", rs.getString("exercise_id"));
                row.put("medal_type", rs.getString("medal_type"));
                progressList.add(row);
            }
        }
        return progressList;
    }

    public static void saveUserProgress(int userId, String moduleId, String exerciseId, String medalType) throws SQLException {
        try (Connection conn = getConnection()) {
            // Check if record exists
            PreparedStatement check = conn.prepareStatement("SELECT id FROM user_progress WHERE user_id = ? AND exercise_id = ?");
            check.setInt(1, userId);
            check.setString(2, exerciseId);
            ResultSet rs = check.executeQuery();
            
            if (rs.next()) {
                // Update existing
                PreparedStatement update = conn.prepareStatement("UPDATE user_progress SET medal_type = ?, timestamp = ? WHERE id = ?");
                update.setString(1, medalType);
                update.setLong(2, System.currentTimeMillis());
                update.setInt(3, rs.getInt("id"));
                update.executeUpdate();
            } else {
                // Insert new
                PreparedStatement insert = conn.prepareStatement("INSERT INTO user_progress (user_id, module_id, exercise_id, medal_type, timestamp) VALUES (?, ?, ?, ?, ?)");
                insert.setInt(1, userId);
                insert.setString(2, moduleId);
                insert.setString(3, exerciseId);
                insert.setString(4, medalType);
                insert.setLong(5, System.currentTimeMillis());
                insert.executeUpdate();
            }
        }
    }
}

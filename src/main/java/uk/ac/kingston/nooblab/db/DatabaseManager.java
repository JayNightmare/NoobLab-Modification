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
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.InputStreamReader;
import java.io.Reader;
import java.lang.reflect.Type;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.ReplaceOptions;
import org.bson.Document;

public class DatabaseManager {
    
    private static final String DB_DRIVER = "org.h2.Driver";
    private static final String DB_FOLDER = System.getProperty("user.home") + File.separator + ".nooblab";
    private static final String DB_CONNECTION = "jdbc:h2:" + DB_FOLDER + File.separator + "nooblab_db;AUTO_SERVER=TRUE";
    private static final String DB_USER = "sa";
    private static final String DB_PASSWORD = "";

    private static MongoClient mongoClient;
    private static MongoDatabase mongoDatabase;

    static {
        try {
            // Ensure the DB folder exists (prevents H2 path errors in packaged apps)
            new File(DB_FOLDER).mkdirs();

            Class<?> driverClass = Class.forName(DB_DRIVER);
            // Explicitly register driver to ensure it is available to DriverManager
            java.sql.Driver driver = (java.sql.Driver) driverClass.getDeclaredConstructor().newInstance();
            DriverManager.registerDriver(driver);
            
            initMongo();
            initDatabase();
        } catch (Exception e) {
            Logger.getLogger(DatabaseManager.class.getName()).log(Level.SEVERE, "Database driver initialization failed", e);
        }
    }

    private static void initMongo() {
        try {
            String mongoUri = System.getProperty("mongo.uri", "mongodb://localhost:27017");
            mongoClient = MongoClients.create(mongoUri);
            // Use "Noobs" as default or extract from URI if needed, but for now hardcode to match user intent
            mongoDatabase = mongoClient.getDatabase("Noobs");
            Logger.getLogger(DatabaseManager.class.getName()).log(Level.INFO, "Connected to MongoDB");
        } catch (Exception e) {
            Logger.getLogger(DatabaseManager.class.getName()).log(Level.SEVERE, "Failed to connect to MongoDB", e);
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
                    "cohort INT DEFAULT 1, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
                    ")");

            // Modules Table
            stmt.execute("CREATE TABLE IF NOT EXISTS modules (" +
                    "id VARCHAR(50) PRIMARY KEY, " +
                    "title VARCHAR(255) NOT NULL, " +
                    "description TEXT, " +
                    "cohort INT DEFAULT 1" +
                    ")");
            
            // Add total_exercises column if it doesn't exist (Schema migration)
            try {
                stmt.execute("ALTER TABLE modules ADD COLUMN IF NOT EXISTS total_exercises INT DEFAULT 0");
                stmt.execute("ALTER TABLE modules ADD COLUMN IF NOT EXISTS cohort INT DEFAULT 1");
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS cohort INT DEFAULT 1");
            } catch (SQLException e) {
                // Fallback for older H2 versions or if column exists
                Logger.getLogger(DatabaseManager.class.getName()).log(Level.INFO, "Could not add columns (might already exist): " + e.getMessage());
            }

            // Exercises Table
            stmt.execute("CREATE TABLE IF NOT EXISTS exercises (" +
                    "id VARCHAR(100) PRIMARY KEY, " +
                    "module_id VARCHAR(50), " +
                    "title VARCHAR(255), " +
                    "description TEXT, " +
                    "medal VARCHAR(20), " +
                    "content_path VARCHAR(255), " +
                    "FOREIGN KEY (module_id) REFERENCES modules(id)" +
                    ")");
            
            try {
                stmt.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT");
                stmt.execute("ALTER TABLE exercises ADD COLUMN IF NOT EXISTS medal VARCHAR(20)");
            } catch (SQLException e) {
                Logger.getLogger(DatabaseManager.class.getName()).log(Level.INFO, "Could not add columns to exercises (might already exist): " + e.getMessage());
            }

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
            
            // Load modules from JSON
            loadModulesFromJson(stmt);
            
            // Load users from JSON
            loadUsersFromJson(stmt);

        } catch (SQLException e) {
            Logger.getLogger(DatabaseManager.class.getName()).log(Level.SEVERE, "Database initialization failed", e);
        }
    }
    
    private static void loadUsersFromJson(Statement stmt) {
        java.io.InputStream is = DatabaseManager.class.getResourceAsStream("/users.json");
        if (is == null) return;
        
        try (Reader reader = new InputStreamReader(is)) {
            Gson gson = new Gson();
            Type listType = new TypeToken<List<Map<String, Object>>>(){}.getType();
            List<Map<String, Object>> users = gson.fromJson(reader, listType);
            
            for (Map<String, Object> user : users) {
                String username = (String) user.get("username");
                String password = (String) user.get("password");
                int cohort = ((Number) user.get("cohort")).intValue();
                
                upsertUser(stmt, username, password, cohort);
            }
        } catch (Exception e) {
            Logger.getLogger(DatabaseManager.class.getName()).log(Level.SEVERE, "Failed to load users from JSON", e);
        }
    }

    private static void upsertUser(Statement stmt, String username, String password, int cohort) throws SQLException {
        int userId = -1;
        try (PreparedStatement ps = stmt.getConnection().prepareStatement("SELECT id FROM users WHERE username = ?")) {
            ps.setString(1, username);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                userId = rs.getInt("id");
                try (PreparedStatement update = stmt.getConnection().prepareStatement("UPDATE users SET password = ?, cohort = ? WHERE id = ?")) {
                    update.setString(1, password);
                    update.setInt(2, cohort);
                    update.setInt(3, userId);
                    update.executeUpdate();
                }
            } else {
                try (PreparedStatement insert = stmt.getConnection().prepareStatement("INSERT INTO users (username, password, display_name, cohort) VALUES (?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS)) {
                    insert.setString(1, username);
                    insert.setString(2, password);
                    insert.setString(3, username);
                    insert.setInt(4, cohort);
                    insert.executeUpdate();
                    ResultSet generatedKeys = insert.getGeneratedKeys();
                    if (generatedKeys.next()) {
                        userId = generatedKeys.getInt(1);
                    }
                }
            }
        }

        if (mongoDatabase != null && userId != -1) {
            try {
                MongoCollection<Document> users = mongoDatabase.getCollection("users");
                Document doc = new Document("username", username)
                        .append("password", password)
                        .append("display_name", username)
                        .append("cohort", cohort)
                        .append("h2_id", userId);
                
                users.replaceOne(Filters.eq("username", username), doc, new ReplaceOptions().upsert(true));
            } catch (Exception e) {
                Logger.getLogger(DatabaseManager.class.getName()).log(Level.WARNING, "Failed to sync user to MongoDB", e);
            }
        }
    }
    
    private static void loadModulesFromJson(Statement stmt) {
        try (Reader reader = new InputStreamReader(DatabaseManager.class.getResourceAsStream("/modules.json"))) {
            Gson gson = new Gson();
            Type listType = new TypeToken<List<Map<String, Object>>>(){}.getType();
            List<Map<String, Object>> modules = gson.fromJson(reader, listType);
            
            for (Map<String, Object> module : modules) {
                String id = (String) module.get("id");
                String title = (String) module.get("title");
                String description = (String) module.get("description");
                int cohort = ((Number) module.get("cohort")).intValue();
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> exercises = (List<Map<String, Object>>) module.get("exercises");
                
                upsertModule(stmt, id, title, description, exercises.size(), cohort);
                
                for (Map<String, Object> exercise : exercises) {
                    String exTitle = (String) exercise.get("title");
                    String exDesc = (String) exercise.get("description");
                    String exMedal = (String) exercise.get("medal");
                    String file = (String) exercise.get("file");
                    String exId = (String) exercise.get("exerciseId");
                    
                    if (exId == null || exId.isEmpty()) {
                        exId = file.replace(".html", "");
                    }
                    
                    upsertExercise(stmt, exId, id, exTitle, exDesc, exMedal, "content/" + file);
                }
            }
        } catch (Exception e) {
            Logger.getLogger(DatabaseManager.class.getName()).log(Level.SEVERE, "Failed to load modules from JSON", e);
        }
    }

    private static void upsertModule(Statement stmt, String id, String title, String description, int totalExercises, int cohort) throws SQLException {
        String sql = "MERGE INTO modules (id, title, description, total_exercises, cohort) KEY(id) VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement ps = stmt.getConnection().prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, title);
            ps.setString(3, description);
            ps.setInt(4, totalExercises);
            ps.setInt(5, cohort);
            ps.executeUpdate();
        }
        
        if (mongoDatabase != null) {
            try {
                MongoCollection<Document> modules = mongoDatabase.getCollection("modules");
                Document doc = new Document("id", id)
                        .append("title", title)
                        .append("description", description)
                        .append("total_exercises", totalExercises)
                        .append("cohort", cohort);
                modules.replaceOne(Filters.eq("id", id), doc, new ReplaceOptions().upsert(true));
            } catch (Exception e) {
                Logger.getLogger(DatabaseManager.class.getName()).log(Level.WARNING, "Failed to sync module to MongoDB", e);
            }
        }
    }

    private static void upsertExercise(Statement stmt, String id, String moduleId, String title, String description, String medal, String path) throws SQLException {
        String sql = "MERGE INTO exercises (id, module_id, title, description, medal, content_path) KEY(id) VALUES (?, ?, ?, ?, ?, ?)";
        try (PreparedStatement ps = stmt.getConnection().prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, moduleId);
            ps.setString(3, title);
            ps.setString(4, description);
            ps.setString(5, medal);
            ps.setString(6, path);
            ps.executeUpdate();
        }
        
        if (mongoDatabase != null) {
            try {
                MongoCollection<Document> exercises = mongoDatabase.getCollection("exercises");
                Document doc = new Document("id", id)
                        .append("module_id", moduleId)
                        .append("title", title)
                        .append("description", description)
                        .append("medal", medal)
                        .append("content_path", path);
                exercises.replaceOne(Filters.eq("id", id), doc, new ReplaceOptions().upsert(true));
            } catch (Exception e) {
                Logger.getLogger(DatabaseManager.class.getName()).log(Level.WARNING, "Failed to sync exercise to MongoDB", e);
            }
        }
    }
    
    // Helper to get or create user
    public static int getOrCreateUser(String username) throws SQLException {
        int userId = -1;
        try (Connection conn = getConnection()) {
            PreparedStatement ps = conn.prepareStatement("SELECT id FROM users WHERE username = ?");
            ps.setString(1, username);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                userId = rs.getInt("id");
            } else {
                PreparedStatement insert = conn.prepareStatement("INSERT INTO users (username, display_name, cohort) VALUES (?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
                insert.setString(1, username);
                insert.setString(2, username); // Default display name
                insert.setInt(3, 1); // Default cohort 1
                insert.executeUpdate();
                ResultSet generatedKeys = insert.getGeneratedKeys();
                if (generatedKeys.next()) {
                    userId = generatedKeys.getInt(1);
                }
            }
        }
        
        if (mongoDatabase != null && userId != -1) {
            try {
                MongoCollection<Document> users = mongoDatabase.getCollection("users");
                Document doc = new Document("username", username)
                        .append("display_name", username)
                        .append("h2_id", userId);
                
                // Upsert user, but don't overwrite cohort if it exists
                users.updateOne(Filters.eq("username", username), 
                        new Document("$setOnInsert", doc.append("cohort", 1)), 
                        new com.mongodb.client.model.UpdateOptions().upsert(true));
                
                // Sync cohort from Mongo to H2
                Document mongoUser = users.find(Filters.eq("username", username)).first();
                if (mongoUser != null && mongoUser.containsKey("cohort")) {
                    int mongoCohort = mongoUser.getInteger("cohort");
                    try (Connection conn = getConnection()) {
                        PreparedStatement update = conn.prepareStatement("UPDATE users SET cohort = ? WHERE id = ?");
                        update.setInt(1, mongoCohort);
                        update.setInt(2, userId);
                        update.executeUpdate();
                    }
                }
            } catch (Exception e) {
                Logger.getLogger(DatabaseManager.class.getName()).log(Level.WARNING, "Failed to sync user to MongoDB", e);
            }
        }
        
        return userId;
    }

    public static int getUserCohort(int userId) throws SQLException {
        if (mongoDatabase != null) {
            try {
                String username = getUsername(userId);
                if (username != null) {
                    MongoCollection<Document> users = mongoDatabase.getCollection("users");
                    Document user = users.find(Filters.eq("username", username)).first();
                    if (user != null && user.containsKey("cohort")) {
                        return user.getInteger("cohort");
                    }
                }
            } catch (Exception e) {
                Logger.getLogger(DatabaseManager.class.getName()).log(Level.WARNING, "Failed to get cohort from MongoDB", e);
            }
        }

        try (Connection conn = getConnection()) {
            PreparedStatement ps = conn.prepareStatement("SELECT cohort FROM users WHERE id = ?");
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt("cohort");
            }
        }
        return 1; // Default to 1 if not found
    }
    
    private static String getUsername(int userId) throws SQLException {
        try (Connection conn = getConnection()) {
            PreparedStatement ps = conn.prepareStatement("SELECT username FROM users WHERE id = ?");
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getString("username");
            }
        }
        return null;
    }

    public static List<Map<String, Object>> getModules(int userId) throws SQLException {
        int userCohort = getUserCohort(userId);
        List<Map<String, Object>> modules = new ArrayList<>();
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            PreparedStatement ps = conn.prepareStatement("SELECT * FROM modules WHERE cohort = ?");
            ps.setInt(1, userCohort);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", rs.getString("id"));
                m.put("title", rs.getString("title"));
                m.put("description", rs.getString("description"));
                m.put("total_exercises", rs.getInt("total_exercises"));
                modules.add(m);
            }
        } catch (SQLException e) {
            e.printStackTrace();
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
        } catch (SQLException e) {
            e.printStackTrace();
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
        } catch (SQLException e) {
            e.printStackTrace();
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
        } catch (SQLException e) {
            e.printStackTrace();
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
        } catch (SQLException e) {
            e.printStackTrace();
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
        } catch (SQLException e) {
            e.printStackTrace();
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
        
        if (mongoDatabase != null) {
            try {
                String username = getUsername(userId);
                if (username != null) {
                    MongoCollection<Document> progress = mongoDatabase.getCollection("user_progress");
                    Document doc = new Document("username", username)
                            .append("module_id", moduleId)
                            .append("exercise_id", exerciseId)
                            .append("medal_type", medalType)
                            .append("timestamp", System.currentTimeMillis());
                    
                    progress.replaceOne(
                            Filters.and(Filters.eq("username", username), Filters.eq("exercise_id", exerciseId)), 
                            doc, 
                            new ReplaceOptions().upsert(true));
                }
            } catch (Exception e) {
                Logger.getLogger(DatabaseManager.class.getName()).log(Level.WARNING, "Failed to sync progress to MongoDB", e);
            }
        }
    }
}

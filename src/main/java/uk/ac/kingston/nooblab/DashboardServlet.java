package uk.ac.kingston.nooblab;

import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import uk.ac.kingston.nooblab.db.DatabaseManager;

@WebServlet(name = "DashboardServlet", urlPatterns = {"/DashboardServlet"})
public class DashboardServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        HttpSession session = request.getSession();
        String username = (String) session.getAttribute("username");
        
        if (username == null) {
            response.sendRedirect("login.jsp");
            return;
        }
        
        try {
            int userId = DatabaseManager.getOrCreateUser(username);
            List<Map<String, Object>> modules = DatabaseManager.getModules(userId);
            Map<String, String> userMedals = DatabaseManager.getUserMedals(userId);
            List<Map<String, Object>> progressList = DatabaseManager.getUserProgressList(userId);
            
                // Calculate progress for each module
            for (Map<String, Object> module : modules) {
                String modId = (String) module.get("id");
                long medalCount = progressList.stream()
                        .filter(p -> modId.equals(p.get("module_id")))
                        .count();
                
                // Get total exercises from table, fallback to column or default
                int totalExercises = DatabaseManager.getExerciseCount(modId);
                if (totalExercises == 0) {
                    totalExercises = (int) module.getOrDefault("total_exercises", 10);
                }
                if (totalExercises == 0) totalExercises = 10; // Final fallback

                int progress = (totalExercises > 0) ? (int) ((medalCount * 100) / totalExercises) : 0;
                if (progress > 100) progress = 100;
                
                module.put("progress", progress);
                module.put("medalCount", medalCount);
                module.put("medal", "None"); // Overall module medal?
            }            request.setAttribute("modules", modules);
            request.setAttribute("userMedals", userMedals);
            
        } catch (SQLException e) {
            e.printStackTrace();
            request.setAttribute("error", "Database error: " + e.getMessage());
        }
        
        request.getRequestDispatcher("/dashboard_modern.jsp").forward(request, response);
    }
}

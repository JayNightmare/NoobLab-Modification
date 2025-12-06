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

@WebServlet(name = "ModuleServlet", urlPatterns = {"/ModuleServlet"})
public class ModuleServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        HttpSession session = request.getSession();
        String username = (String) session.getAttribute("username");
        
        if (username == null) {
            response.sendRedirect("login.jsp");
            return;
        }
        
        String moduleId = request.getParameter("id");
        if (moduleId == null || moduleId.isEmpty()) {
            response.sendRedirect("DashboardServlet");
            return;
        }
        
        try {
            int userId = DatabaseManager.getOrCreateUser(username);
            
            // Get Module Info (We might need a getModule method or just filter from getModules)
            // For efficiency, let's add getModule(id) to DatabaseManager later, 
            // but for now we can just filter or assume we have the ID.
            // Actually, let's add getModule to DatabaseManager.
            Map<String, Object> module = DatabaseManager.getModule(moduleId);
            
            if (module == null) {
                response.sendRedirect("DashboardServlet");
                return;
            }
            
            List<Map<String, Object>> exercises = DatabaseManager.getExercises(moduleId);
            Map<String, String> userMedals = DatabaseManager.getUserMedals(userId);
            
            // Check which exercises are completed
            for (Map<String, Object> exercise : exercises) {
                String exId = (String) exercise.get("id");
                if (userMedals.containsKey(exId)) {
                    exercise.put("completed", true);
                    exercise.put("medal", userMedals.get(exId));
                } else {
                    exercise.put("completed", false);
                }
            }
            
            request.setAttribute("module", module);
            request.setAttribute("exercises", exercises);
            
        } catch (SQLException e) {
            e.printStackTrace();
            request.setAttribute("error", "Database error: " + e.getMessage());
        }
        
        request.getRequestDispatcher("/module.jsp").forward(request, response);
    }
}

package uk.ac.kingston.nooblab;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import javax.servlet.annotation.WebServlet;
import uk.ac.kingston.nooblab.db.DatabaseManager;

@WebServlet(name = "AccountServlet", urlPatterns = {"/AccountServlet"})
public class AccountServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        HttpSession session = request.getSession();
        String username = (String) session.getAttribute("username");
        
        if (username == null) {
            response.sendRedirect("login.jsp");
            return;
        }

        String action = request.getParameter("action");
        
        if ("updateProfile".equals(action)) {
            String displayName = request.getParameter("displayName");
            String newPassword = request.getParameter("password");
            
            try (Connection conn = DatabaseManager.getConnection()) {
                // Update Display Name
                if (displayName != null && !displayName.trim().isEmpty()) {
                    PreparedStatement ps = conn.prepareStatement("UPDATE users SET display_name = ? WHERE username = ?");
                    ps.setString(1, displayName);
                    ps.setString(2, username);
                    ps.executeUpdate();
                    session.setAttribute("displayName", displayName);
                }
                
                // Update Password (if provided)
                if (newPassword != null && !newPassword.trim().isEmpty()) {
                    PreparedStatement ps = conn.prepareStatement("UPDATE users SET password = ? WHERE username = ?");
                    ps.setString(1, newPassword); // In a real app, hash this!
                    ps.setString(2, username);
                    ps.executeUpdate();
                }
                
                request.setAttribute("message", "Profile updated successfully!");
                
            } catch (SQLException e) {
                e.printStackTrace();
                request.setAttribute("error", "Database error: " + e.getMessage());
            }
        }
        
        request.getRequestDispatcher("/account.jsp").forward(request, response);
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        HttpSession session = request.getSession();
        String username = (String) session.getAttribute("username");
        
        if (username == null) {
            response.sendRedirect("login.jsp");
            return;
        }
        
        // Load current details
        try (Connection conn = DatabaseManager.getConnection()) {
            int userId = DatabaseManager.getOrCreateUser(username);
            // Fetch display name if not in session
            // For now, we assume getOrCreateUser ensures the user exists
        } catch (SQLException e) {
            e.printStackTrace();
        }

        request.getRequestDispatcher("/account.jsp").forward(request, response);
    }
}

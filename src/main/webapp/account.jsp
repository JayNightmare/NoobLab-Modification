<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My Account - NoobLab</title>
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/modern.css">
    <style>
        .account-container {
            max-width: 600px;
            margin: 2rem auto;
            padding: 2rem;
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }
        .form-group input {
            width: 100%;
            padding: 0.8rem;
            border: 1px solid var(--border-color);
            background: var(--bg-primary);
            color: var(--text-primary);
            border-radius: 4px;
        }
        .btn {
            background: var(--accent-color);
            color: white;
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
        }
        .btn:hover {
            opacity: 0.9;
        }
        .message {
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
        }
        .success { background: rgba(40, 167, 69, 0.2); color: #28a745; }
        .error { background: rgba(220, 53, 69, 0.2); color: #dc3545; }
    </style>
</head>
<body>
    <div class="navbar">
        <div style="padding: 1rem; font-weight: bold; font-size: 1.2rem;">NoobLab <span style="color: var(--accent-color)">Modern</span></div>
        <div style="flex-grow: 1;"></div>
        <div style="padding: 1rem;">
            <a href="${pageContext.request.contextPath}/DashboardServlet">Dashboard</a>
            <a href="${pageContext.request.contextPath}/logout.jsp">Logout</a>
        </div>
    </div>

    <div class="account-container">
        <h1>Account Settings</h1>
        
        <c:if test="${not empty message}">
            <div class="message success">${message}</div>
        </c:if>
        <c:if test="${not empty error}">
            <div class="message error">${error}</div>
        </c:if>

        <form action="AccountServlet" method="post">
            <input type="hidden" name="action" value="updateProfile">
            
            <div class="form-group">
                <label>Username</label>
                <input type="text" value="${sessionScope.username}" disabled>
            </div>

            <div class="form-group">
                <label>Display Name</label>
                <input type="text" name="displayName" value="${sessionScope.displayName != null ? sessionScope.displayName : sessionScope.username}">
            </div>

            <div class="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input type="password" name="password">
            </div>

            <button type="submit" class="btn">Save Changes</button>
        </form>
    </div>
</body>
</html>

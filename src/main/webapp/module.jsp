<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Module Details - NoobLab</title>
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/modern.css">
    <style>
        .module-container {
            max-width: 1200px;
            padding: 2rem;
        }
        .medal-section {
            margin-bottom: 3rem;
        }
        .medal-header {
            display: flex;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid var(--border-color);
        }
        .medal-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #000;
        }
        .bronze-icon { background: #cd7f32; }
        .silver-icon { background: #c0c0c0; }
        .gold-icon { background: #ffd700; }
        
        .exercise-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
        }
        .exercise-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            padding: 1rem;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .exercise-card:hover {
            transform: translateY(-2px);
            border-color: var(--accent-color);
        }
        .exercise-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        .exercise-desc {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        .status-badge {
            display: inline-block;
            font-size: 0.75rem;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 0.5rem;
            background: var(--bg-tertiary);
        }
        .status-completed {
            background: rgba(40, 167, 69, 0.2);
            color: #28a745;
        }
    </style>
</head>
<body>
    <div class="navbar">
        <div style="padding: 1rem; font-weight: bold; font-size: 1.2rem;">NoobLab <span style="color: var(--accent-color)">Modern</span></div>
        <div style="flex-grow: 1;"></div>
        <div style="padding: 1rem;">
            <a href="${pageContext.request.contextPath}/DashboardServlet">Dashboard</a>
            <a href="${pageContext.request.contextPath}/account.jsp">Account</a>
            <a href="${pageContext.request.contextPath}/logout.jsp">Logout</a>
        </div>
    </div>

        <div class="module-container">
        <h1>${module.title}</h1>
        <p>${module.description}</p>
        
        <div class="medal-section">
            <div class="medal-header">
                <div class="medal-icon bronze-icon">B</div>
                <h3>Exercises</h3>
            </div>
            <div class="exercise-grid">
                <c:forEach items="${exercises}" var="ex">
                    <div class="exercise-card" onclick="window.location.href='${pageContext.request.contextPath}/mainpage.jsp?content=${ex.content_path}&id=${ex.id}'">
                        <h4>${ex.title}</h4>
                        <c:if test="${ex.completed}">
                            <span style="color: green; font-weight: bold;">Completed (${ex.medal})</span>
                        </c:if>
                        <c:if test="${not ex.completed}">
                            <span style="color: gray;">Not Started</span>
                        </c:if>
                    </div>
                </c:forEach>
            </div>
        </div>
    </div>
</body>
</html>

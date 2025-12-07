<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NoobLab Dashboard</title>
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/modern.css">
    <style>
        .dashboard-container {
            padding: 2rem;
            max-width: 1200px;
        }
        .section-title {
            font-size: 1.5rem;
            color: var(--accent-color);
            margin-bottom: 1rem;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 0.5rem;
        }
        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border-color: var(--accent-color);
        }
        .card h3 {
            margin-top: 0;
            color: var(--text-primary);
        }
        .card p {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        .medal-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-right: 8px;
        }
        .medal-gold { background-color: #ffd700; color: #000; }
        .medal-silver { background-color: #c0c0c0; color: #000; }
        .medal-bronze { background-color: #cd7f32; color: #000; }
        
        .progress-bar {
            height: 6px;
            background-color: var(--bg-tertiary);
            border-radius: 3px;
            margin-top: 1rem;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background-color: var(--accent-color);
        }
    </style>
</head>
<body>
    <div class="navbar">
        <div style="padding: 1rem; font-weight: bold; font-size: 1.2rem;">NoobLab <span style="color: var(--accent-color)">Modern</span></div>
        <div style="flex-grow: 1;"></div>
        <div style="padding: 1rem;">
            <a href="${pageContext.request.contextPath}/account.jsp">Account</a>
            <a href="${pageContext.request.contextPath}/logout.jsp">Logout</a>
        </div>
    </div>

    <div class="dashboard-container">
        <h1>Welcome back, ${sessionScope.user}</h1>
        
        <c:if test="${not empty error}">
            <div style="color: red; margin-bottom: 1rem;">${error}</div>
        </c:if>

        <!-- Modules Section -->
        <div class="section-title">My Modules</div>
        <div class="card-grid">
            <c:forEach items="${modules}" var="module">
                <div class="card" onclick="window.location.href='${pageContext.request.contextPath}/ModuleServlet?id=${module.id}'">
                    <h3>${module.title}</h3>
                    <p>${module.description}</p>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        ${module.medalCount} Medals Won
                    </p>
                    <!-- <div class="medal-badge medal-bronze">Bronze</div> -->
                    <div class="progress-bar"><div class="progress-fill" style="width: ${module.progress}%"></div></div>
                </div>
            </c:forEach>
            
            <!-- Fallback if no modules found (e.g. DB empty) -->
            <c:if test="${empty modules}">
                <div class="card" onclick="window.location.href='${pageContext.request.contextPath}/module.jsp?id=prog1'">
                    <h3>Programming 1 (Java)</h3>
                    <p>Introduction to Java Programming (Default)</p>
                    <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
                </div>
            </c:if>
        </div>
    </div>
</body>
</html>

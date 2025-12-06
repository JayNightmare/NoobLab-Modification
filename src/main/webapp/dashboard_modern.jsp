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
            <a href="${pageContext.request.contextPath}/logout.jsp">Logout</a>
        </div>
    </div>

    <div class="dashboard-container">
        <h1>Welcome back, ${sessionScope.user}</h1>
        
        <!-- Programming 1 Section -->
        <div class="section-title">Programming 1 (Java)</div>
        <div class="card-grid">
            <!-- Mock Data for now -->
            <div class="card" onclick="window.location.href='${pageContext.request.contextPath}/mainpage.jsp?module=prog1&level=easy'">
                <h3>Introduction to Java</h3>
                <p>Learn the basics of syntax and variables.</p>
                <div class="medal-badge medal-bronze">Bronze</div>
                <div class="progress-bar"><div class="progress-fill" style="width: 100%"></div></div>
            </div>
            <div class="card" onclick="window.location.href='${pageContext.request.contextPath}/mainpage.jsp?module=prog1&level=medium'">
                <h3>Control Flow</h3>
                <p>If statements, loops, and logic.</p>
                <div class="medal-badge medal-silver">Silver</div>
                <div class="progress-bar"><div class="progress-fill" style="width: 60%"></div></div>
            </div>
            <div class="card">
                <h3>Objects & Classes</h3>
                <p>Understanding OOP concepts.</p>
                <div class="medal-badge medal-gold">Gold</div>
                <div class="progress-bar"><div class="progress-fill" style="width: 30%"></div></div>
            </div>
        </div>

        <!-- Programming 2 Section -->
        <div class="section-title">Programming 2 (Advanced)</div>
        <div class="card-grid">
            <div class="card">
                <h3>Data Structures</h3>
                <p>Lists, Maps, and Sets.</p>
                <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
            </div>
            <div class="card">
                <h3>Algorithms</h3>
                <p>Sorting and searching.</p>
                <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
            </div>
        </div>
        
        <!-- Medal Difficulty Section -->
        <div class="section-title">Medal Challenges</div>
        <div class="card-grid">
            <div class="card">
                <h3>Bronze Challenges</h3>
                <p>Beginner friendly tasks.</p>
            </div>
            <div class="card">
                <h3>Silver Challenges</h3>
                <p>Intermediate problem solving.</p>
            </div>
            <div class="card">
                <h3>Gold Challenges</h3>
                <p>Advanced algorithmic puzzles.</p>
            </div>
        </div>
    </div>
</body>
</html>

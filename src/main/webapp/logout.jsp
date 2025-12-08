<%-- 
    Document   : login
    Created on : Jan 23, 2012, 9:34:08 AM
    Author     : paulneve
--%>

<%@page contentType="text/html" pageEncoding="MacRoman"%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
   "http://www.w3.org/TR/html4/loose.dtd">

<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=MacRoman">
        <title>JSP Page</title>
        <link rel="stylesheet" href="${pageContext.request.contextPath}/nooblab.css">
    </head>
    <body>
        <div id="content" style="width : 100%">
             <div class="loginBoxBigger">
                 <h3>You have been logged out of the learning environment.</h3>
            </div>
        </div>

        <!-- Script to redirect to login page after logout -->
        <script>
            setTimeout(function() {
                window.location.href = "${pageContext.request.contextPath}/login.jsp";
            }, 300); // Redirect after 0.3 seconds
        </script>
    </body>
</html>

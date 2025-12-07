<%@ page language="java" contentType="application/json; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="uk.ac.kingston.nooblab.*" %>
<%@ page import="com.google.gson.Gson" %>
<%@ page import="java.util.*" %>
<%
    // Simple API endpoint to get current user info
    String username = (String) session.getAttribute("username");
    Map<String, Object> result = new HashMap<>();
    
    if (username != null) {
        result.put("status", "ok");
        result.put("username", username);
        result.put("watermark", session.getAttribute("watermark"));
    } else {
        result.put("status", "error");
        result.put("message", "Not logged in");
    }
    
    out.print(new Gson().toJson(result));
%>
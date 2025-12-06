package uk.ac.kingston.nooblab;

import java.io.File;
import org.apache.catalina.WebResourceRoot;
import org.apache.catalina.core.StandardContext;
import org.apache.catalina.startup.Tomcat;
import org.apache.catalina.webresources.DirResourceSet;
import org.apache.catalina.webresources.StandardRoot;

public class AppServer {

    public static void main(String[] args) throws Exception {
        // Allow passing webapp dir as argument or system property
        String webappDirLocation = System.getProperty("webapp.dir", "src/main/webapp");
        
        // Allow passing port as argument
        String webPort = System.getenv("PORT");
        if (webPort == null || webPort.isEmpty()) {
            webPort = "8080";
            if (args.length > 0) {
                // Check if args[0] is a port number
                if (args[0].matches("\\d+")) {
                    webPort = args[0];
                }
            }
        }

        Tomcat tomcat = new Tomcat();
        tomcat.setPort(Integer.valueOf(webPort));
        tomcat.getConnector(); // Trigger creation of the default connector

        // Define a web application context.
        File webappDir = new File(webappDirLocation);
        System.out.println("Configuring app with basedir: " + webappDir.getAbsolutePath());
        
        // Set dev mode system property if not already set
        if (System.getProperty("nooblab.devmode") == null) {
            System.setProperty("nooblab.devmode", "true");
        }

        StandardContext ctx = (StandardContext) tomcat.addWebapp("/", webappDir.getAbsolutePath());
        
        // Declare an alternative location for your "WEB-INF/classes" dir
        // Servlet 3.0 annotation will work
        // Only add target/classes if we are in dev mode (i.e. if it exists)
        File additionWebInfClasses = new File("target/classes");
        if (additionWebInfClasses.exists()) {
            WebResourceRoot resources = new StandardRoot(ctx);
            resources.addPreResources(new DirResourceSet(resources, "/WEB-INF/classes",
                    additionWebInfClasses.getAbsolutePath(), "/"));
            ctx.setResources(resources);
        }

        tomcat.start();
        tomcat.getServer().await();
    }
}

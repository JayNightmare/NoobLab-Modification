package uk.ac.kingston.nooblab;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;

import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebFilter("/*")
public class TracingFilter implements Filter {

    private Tracer tracer;

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        OpenTelemetry openTelemetry = TracingConfig.getOpenTelemetry();
        if (openTelemetry != null) {
            this.tracer = openTelemetry.getTracer("uk.ac.kingston.nooblab.TracingFilter");
        }
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        if (tracer == null) {
            // Try to get it again if it wasn't ready at init
            OpenTelemetry openTelemetry = TracingConfig.getOpenTelemetry();
            if (openTelemetry != null) {
                this.tracer = openTelemetry.getTracer("uk.ac.kingston.nooblab.TracingFilter");
            }
        }

        if (tracer == null) {
            chain.doFilter(request, response);
            return;
        }

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        Span span = tracer.spanBuilder(httpRequest.getMethod() + " " + httpRequest.getRequestURI())
                .setSpanKind(SpanKind.SERVER)
                .startSpan();

        try (Scope scope = span.makeCurrent()) {
            chain.doFilter(request, response);
            span.setAttribute("http.status_code", httpResponse.getStatus());
        } catch (Throwable t) {
            span.recordException(t);
            throw t;
        } finally {
            span.end();
        }
    }

    @Override
    public void destroy() {
    }
}

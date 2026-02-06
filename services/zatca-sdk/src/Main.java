import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

public class Main {
    public static void main(String[] args) throws Exception {
        int port = 8080;
        String portEnv = System.getenv("PORT");
        if (portEnv != null && !portEnv.isEmpty()) {
            try { port = Integer.parseInt(portEnv); } catch (NumberFormatException ignored) {}
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/health", exchange -> {
            writeJson(exchange, 200, "{\"ok\":true}");
        });
        server.createContext("/validate", new ValidateHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("ZATCA SDK sidecar listening on :" + port);
    }

    static class ValidateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                writeJson(exchange, 405, "{\"ok\":false,\"errors\":[\"Method not allowed\"]}");
                return;
            }

            String body = readAll(exchange.getRequestBody());
            if (body == null || body.isEmpty()) {
                writeJson(exchange, 400, "{\"ok\":false,\"errors\":[\"Empty body\"]}");
                return;
            }

            String jarPath = System.getenv("ZATCA_JAR_PATH");
            String cmdTemplate = System.getenv("ZATCA_VALIDATE_CMD");

            if (jarPath == null || jarPath.isEmpty()) {
                writeJson(exchange, 500, "{\"ok\":false,\"errors\":[\"ZATCA_JAR_PATH is not set\"]}");
                return;
            }
            File jar = new File(jarPath);
            if (!jar.exists()) {
                writeJson(exchange, 500, "{\"ok\":false,\"errors\":[\"ZATCA JAR not found\"]}");
                return;
            }
            if (cmdTemplate == null || cmdTemplate.isEmpty()) {
                writeJson(exchange, 500, "{\"ok\":false,\"errors\":[\"ZATCA_VALIDATE_CMD is not set\"]}");
                return;
            }

            File tmp = File.createTempFile("zatca-", ".xml");
            Files.writeString(tmp.toPath(), body, StandardCharsets.UTF_8);

            String cmd = cmdTemplate.replace("{input}", tmp.getAbsolutePath());
            ProcessBuilder pb = new ProcessBuilder("/bin/sh", "-c", cmd);
            pb.redirectErrorStream(true);
            String output;
            int code;
            try {
                Process p = pb.start();
                output = readAll(p.getInputStream());
                code = p.waitFor();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                writeJson(exchange, 500, "{\"ok\":false,\"errors\":[\"Command interrupted\"]}");
                return;
            } finally {
                tmp.delete();
            }

            if (code == 0) {
                writeJson(exchange, 200, "{\"ok\":true}");
            } else {
                String safe = output == null ? "" : output.replace("\n", " ").replace("\r", " ");
                writeJson(exchange, 200, "{\"ok\":false,\"errors\":[\"SDK validation failed\",\"" + escapeJson(safe) + "\"]}");
            }
        }
    }

    static String readAll(InputStream in) throws IOException {
        if (in == null) return "";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int r;
        while ((r = in.read(buf)) != -1) {
            out.write(buf, 0, r);
        }
        return out.toString(StandardCharsets.UTF_8);
    }

    static void writeJson(HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    static String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 8080);
const root = path.resolve(process.env.STATIC_ROOT || path.join(__dirname, "..", "build"));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const safePath = path
    .normalize(decodeURIComponent(url.pathname))
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]/, "");

  const requestedPath = path.join(root, safePath || "index.html");

  serveFile(requestedPath, res, () => {
    serveFile(path.join(root, "index.html"), res);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Frontend listening on http://0.0.0.0:${port}`);
});

function serveFile(filePath, res, fallback) {
  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      if (fallback) {
        fallback();
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    };

    if (filePath.includes(`${path.sep}static${path.sep}`)) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    } else {
      headers["Cache-Control"] = "no-cache";
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

const http = require("node:http");
const { handleRequest } = require("./cloudsigma-broker");

const port = Number(process.env.PORT || 8787);

const server = http.createServer(async (req, res) => {
  try {
    const request = toWebRequest(req);
    const response = await handleRequest(request, process.env);
    await writeNodeResponse(res, response);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`broker error: ${detail}`);
  }
});

server.listen(port, () => {
  console.log(`OmniFabric CloudSigma broker listening on :${port}`);
});

function toWebRequest(req) {
  const host = req.headers.host || `127.0.0.1:${port}`;
  const proto = req.headers["x-forwarded-proto"] || "http";
  return new Request(`${proto}://${host}${req.url}`, {
    method: req.method,
    headers: toWebHeaders(req.headers),
  });
}

async function writeNodeResponse(res, response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

function toWebHeaders(nodeHeaders) {
  const headers = new Headers();
  Object.entries(nodeHeaders).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  });
  return headers;
}

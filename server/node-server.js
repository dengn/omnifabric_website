const http = require("node:http");
const { handleRequest } = require("./cloudsigma-broker");
const { loadEnvFiles } = require("./env-loader");

loadEnvFiles();
const port = Number(process.env.PORT || 8787);

const server = http.createServer(async (req, res) => {
  try {
    const request = toWebRequest(req);
    const response = await handleRequest(request, process.env);
    await writeNodeResponse(res, response);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`CloudSigma broker request failed: ${detail}`);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("broker error");
  }
});

server.listen(port, () => {
  console.log(`OmniFabric CloudSigma broker listening on :${port}`);
});

function toWebRequest(req) {
  const host = req.headers.host || `127.0.0.1:${port}`;
  const proto = forwardedProtoForHost(req.headers["x-forwarded-proto"], host);
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

function defaultProtoForHost(host) {
  const hostname = hostnameFromHostHeader(host);
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1") {
    return "http";
  }
  return "https";
}

function forwardedProtoForHost(value, host) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return defaultProtoForHost(host);
  }

  const proto = String(raw).split(",")[0].trim().toLowerCase();
  if (proto === "http" || proto === "https") {
    return proto;
  }
  return defaultProtoForHost(host);
}

function hostnameFromHostHeader(host) {
  const value = String(host).toLowerCase();
  if (value.startsWith("[")) {
    return value.slice(0, value.indexOf("]") + 1);
  }
  return value.split(":")[0];
}

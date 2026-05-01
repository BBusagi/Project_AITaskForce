const http = require("node:http");
const https = require("node:https");

function nativeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;
    const request = transport.request(
      target,
      {
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            text: async () => body,
            json: async () => JSON.parse(body || "{}"),
          });
        });
      }
    );

    request.on("error", reject);
    if (options.signal) {
      if (options.signal.aborted) {
        request.destroy(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
        return;
      }
      options.signal.addEventListener(
        "abort",
        () => request.destroy(Object.assign(new Error("The operation was aborted"), { name: "AbortError" })),
        { once: true }
      );
    }

    if (options.body) request.write(options.body);
    request.end();
  });
}

function request(url, options = {}) {
  if (typeof fetch === "function") {
    return fetch(url, options);
  }
  return nativeFetch(url, options);
}

module.exports = {
  request,
};

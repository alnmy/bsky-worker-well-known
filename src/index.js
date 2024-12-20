import { Bluesky } from "./bsky-api.js";
import { DNSHelper } from "./dns.js";
import { version } from "../package.json";
import { jsonResponse, log } from "./utils.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST",
      "Bluesky-Worker": version,
    });
    if (url.pathname === "/.well-known/atproto-did") {
      const identifiers = {};

      env.identifiers.split(";").forEach((pair) => {
        const [key, value] = pair.split("=");
        identifiers[key] = value;
      });
      if (identifiers[url.hostname]) {
        return new Response(identifiers[url.hostname], {
          status: 200,
          headers: responseHeaders,
        });
      }
      const identifier = await env.STORE.get(url.hostname);
      if (identifier === null)
        return new Response("Not Found", {
          status: 404,
          headers: responseHeaders,
        });
      return new Response(identifier, {
        status: 200,
        headers: responseHeaders,
      });
    } else if (url.pathname === "/register" && request.method === "POST") {
      try {
        const body = await request.text();
        const data = JSON.parse(body);

        const requiredFields = ["handle", "domain"];
        for (const field of requiredFields) {
          if (!data[field]) return jsonResponse({ error: `Missing ${field}` }, 400);
        }

        // Check if the handle is valid
        const bsky = new Bluesky(url.hostname, env.LOGIN);
        const did = await bsky.getDID(data.handle);
        if (!did[0]) return jsonResponse({ error: "Invalid handle" }, 400);

        // Check if the requested domain already has a Bluesky DID registered to it
        let status = await bsky.isHandleAvailable(data.domain);
        if (!status[0]) return jsonResponse({ error: status[1] }, 400); // Handle taken or invalid domain

        // Check if the requested domain has the same nameserver as the one which the worker is on
        // The reason that we check the nameservers are the same is to require that the domain is
        // owned by the same Cloudflare account and therefore it's most likely running the same worker
        const dns = new DNSHelper();
        if (!dns.haveSameNameserver(url.hostname, data.domain)) return await jsonResponse({ error: "Invalid domain" }, 400);
      } catch (error) {
        log({ isError: true, data: error });
        return jsonResponse({ error: "Invalid JSON" }, 400);
      }
    } else {
      return jsonResponse({ error: "Not Found" }, 404);
    }
  },
};

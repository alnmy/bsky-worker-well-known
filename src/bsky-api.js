import { DNSHelper } from "./dns.js";
import { version } from "../package.json";

export class Bluesky {
  constructor(hostname, accessJwt, refreshJwt) {
    this.publicEndpoint = "https://public.api.bsky.app";
    this.pdsEndpoint = "https://bsky.social";
    this.chatEndpoint = "https://api.bsky.chat";
    this.hostname = hostname;

    // Refresh the access token 
    fetch("https://bsky.social/xrpc/com.atproto.server.refreshSession", {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.refreshJwt}`
      }
    })
    .then(response => response.json())
    .then(data => {
      this.accessJwt = data.accessJwt;
      this.refreshJwt = data.refreshJwt;
    });
  }

  async getDID(handle) {
    // Get DID by DNS TXT record
    const dns = new DNSHelper();
    const txt = await dns.getDID(handle);
    if (txt) return [txt, false];

    // Get DID by HTTP GET
    let textUrl = `https://${handle}/.well-known/atproto-did`;
    try {
      let did;
      const textResponse = await fetch(textUrl);
      const isWorker = textResponse.headers.get("bluesky-worker") === version;
      if (textResponse.status === 200) did = await textResponse.text();
      return [did, isWorker];
    } catch (err) {
      // Cloudflare Workers throw an exception if DNS resolution fails
      // This happens for safety.bsky.app, which is a valid domain.
      return [null, false];
    }
  }

  async isHandleAvailable(handle) {
    // Attempt to get DID by handle
    // This potentially calls the same worker twice, so reading the KV twice is avoided by using DNS NS records
    // A better way would be to use the Cloudflare API to check whether the worker routes the domain
    const did = await this.getDID(handle);
    // Check whether domain is on same nameserver
    const dns = new DNSHelper();
    const sameNS = await dns.haveSameNameserver(this.hostname, handle);

    // did[0] is the did if returned
    // did[1] indicates whether the DID was returned by the worker
    if (sameNS && !did[0] && did[1]) return [true, "Handle available"];
    if (sameNS && did[0] && did[1]) return [false, "Handle taken"];
    if (!sameNS || !did[1]) return [false, "Invalid domain"];
  };

  async getMessagesFrom(did) {

  };
}

import { DNSHelper } from './dns.js';

export class Bluesky {
    constructor(hostname) {
        this.endpoint = "https://public.api.bsky.app";
        this.hostname = hostname;
    };

    async getDID(domain) {
        
        // Get DID by DNS TXT record
        const dns = new DNSHelper();
        const txt = await dns.getDID(domain);
        if (txt) return txt;

        // Get DID by HTTP GET
        let textUrl = `https://${domain}/.well-known/atproto-did`;
        try {
            const textResponse = await fetch(textUrl);
            if (textResponse.status === 200 ) {
                const did = await textResponse.text();
                return did;
            };
        }
        catch (err) {
            // Cloudflare Workers throw an exception if DNS resolution fails
            // This happens for safety.bsky.app, which is a valid domain.
            return null;
        };
        return null;
    };

    async isHandleAvailable(handle) {
        // Attempt to get DID by handle
        // This potentially calls the same worker twice, so reading the KV twice is avoided by using DNS NS records
        // A better way would be to use the Cloudflare API to check whether the worker routes the domain 
        const did = await this.getDID(handle);
        // Check whether domain is on same nameserver
        const dns = new DNSHelper();
        const sameNS = await dns.haveSameNameserver(this.hostname, handle);

        if (sameNS && !Boolean(did)) return [true, "Handle available"];
        if (!sameNS) return [false, "Invalid domain"];
        if (sameNS) return [false, "Handle taken"];
        if (!did) return [false, "Invalid handle"];
    };
}
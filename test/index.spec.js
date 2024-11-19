import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';
import { DNSHelper } from '../src/dns.js';
import { Bluesky } from '../src/bsky-api.js';

describe('Bluesky handle registration worker', () => {
    it('responds with 404 for other URLs', async () => {
        const request = new Request('http://example.com/');
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);
        expect(response.status).toBe(404);
    });

    it('responds with a DID for a user registered via the environment', async () => {
        const request = new Request('http://example.com/.well-known/atproto-did');
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('did:plc:jwj6kf4xowjc5taykzoadxll');
    });

    it('correctly grabs the DID from a user', async () => {
        const bsky = new Bluesky("example.com");
        expect(await bsky.getDID("safety.bsky.app")).toStrictEqual(["did:plc:eon2iu7v3x2ukgxkqaf7e5np", false]);
    });

    it('correctly asserts whether domains have the same nameserver', async () => {
        const dnsHelper = new DNSHelper();
        expect(await dnsHelper.haveSameNameserver("desu.cx", "matrix.desu.cx")).toBe(true);
        expect(await dnsHelper.haveSameNameserver("google.com", "cloudflare.com")).toBe(false);
    });

    it('correctly asserts whether a handle is available', async () => {
        const bsky = new Bluesky("desu.cx");
        expect(await bsky.isHandleAvailable("desu.cx")).toStrictEqual([false, 'Handle taken']);             // Has worker routing 
        expect(await bsky.isHandleAvailable("safety.bsky.app")).toStrictEqual([false, 'Invalid domain']);   // Not owned by us
        expect(await bsky.isHandleAvailable("noworker.desu.cx")).toStrictEqual([false, 'Invalid domain']);  // No worker routing
    });

    it('responds with a DID for a user registered normally', async () => {
        const request = new Request('http://real.example.com/.well-known/atproto-did');
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('did:plc:jwj6kf4xowjc5taykzoadxll');
    });
});

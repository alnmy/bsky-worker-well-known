import psl from "./psl.js";

export class DNSHelper {
  constructor() {
    this.dns = "https://cloudflare-dns.com/dns-query";
  }

  // Check if the handle has a TXT record with the DID
  // const did = await dnsHelper.getDID(data.domain);
  async getDID(domain) {
    const queryUrl = `${this.dns}?name=_atproto.${domain}&type=TXT`;
    const response = await fetch(queryUrl, {
      headers: { Accept: "application/dns-json" },
    });
    const dnsData = await response.json();
    let did;
    if (dnsData.Answer && dnsData.Answer.length > 0) {
      for (const answer of dnsData.Answer) {
        let txtRecord = answer.data.replace(/^"|"$/g, "");
        if (txtRecord.startsWith("did=did:plc:")) {
          did = txtRecord.split("=")[1];
          break;
        }
      }
    }
    return did;
  }

  // Check whether two domains have the same nameserver
  // const sameNS = await dnsHelper.haveSameNameserver(url.hostname, data.domain);
  async haveSameNameserver(domain1, domain2) {
    const nameservers = {};
    const promises = [domain1, domain2].map(async (domain) => {
      const queryUrl = `${this.dns}?name=${psl.parse(domain).domain}&type=NS`;
      const response = await fetch(queryUrl, {
        headers: { Accept: "application/dns-json" },
      });
      const dnsData = await response.json();
      nameservers[domain] = dnsData.Answer
        ? dnsData.Answer.map((answer) => answer.data)
        : [];
    });
    await Promise.all(promises);
    const ns1 = nameservers[domain1].sort();
    const ns2 = nameservers[domain2].sort();
    return ns1.some((ns) => ns2.includes(ns));
  }
}

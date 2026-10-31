// CI only. No outbound sockets; literal loopback lookup permits local listen.
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import { syncBuiltinESMExports } from 'node:module';

const deny = api => () => {
  if (process.env.KINOLUMA_CI_NETWORK_LOG) {
    fs.appendFileSync(process.env.KINOLUMA_CI_NETWORK_LOG, JSON.stringify({ api }) + '\n');
  }
  throw new Error(`CI_NETWORK_FORBIDDEN:${api}`);
};
globalThis.fetch = deny('fetch');
for (const [name, module] of [['http', http], ['https', https]]) {
  module.request = deny(`${name}.request`);
  module.get = deny(`${name}.get`);
}
net.Socket.prototype.connect = deny('net.connect');
tls.connect = deny('tls.connect');
for (const method of ['lookup', 'resolve', 'resolve4', 'resolve6']) {
  dns[method] = deny(`dns.${method}`);
  dns.promises[method] = deny(`dns.promises.${method}`);
}
const address = host => {
  if (!['127.0.0.1', '::1'].includes(host)) return deny('dns.lookup')();
  return { address: host, family: host === '::1' ? 6 : 4 };
};
dns.lookup = (host, options, callback) => {
  if (typeof options === 'function') { callback = options; options = {}; }
  const row = address(host);
  queueMicrotask(() => options?.all ? callback(null, [row]) : callback(null, row.address, row.family));
};
dns.promises.lookup = async (host, options) => options?.all ? [address(host)] : address(host);
syncBuiltinESMExports();

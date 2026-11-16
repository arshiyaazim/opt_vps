import https from 'node:https';
import http from 'node:http';
import {readFileSync} from 'node:fs';
const [,, keyPath, certPath, listenPort, targetPort] = process.argv;
const server = https.createServer({key: readFileSync(keyPath), cert: readFileSync(certPath)}, (req, res) => {
  const upstream = http.request({host: '127.0.0.1', port: Number(targetPort), path: req.url, method: req.method,
    headers: {...req.headers, host: `127.0.0.1:${targetPort}`}}, (up) => {
    res.writeHead(up.statusCode ?? 502, up.headers);
    up.pipe(res);
  });
  upstream.on('error', () => { res.writeHead(502); res.end('proxy error'); });
  req.pipe(upstream);
});
server.listen(Number(listenPort), '127.0.0.1', () => console.log('tls proxy ready'));

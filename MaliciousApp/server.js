const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const PUBLIC = path.join(__dirname, 'public');
const LOG = path.join(__dirname, 'logs', 'attempts.log');

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

function record(entry) {
  const line = JSON.stringify({ time: new Date().toISOString(), ...entry });
  fs.appendFile(LOG, line + '\n', () => { });
  console.log(line);
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { record({ event: 'submit', ...JSON.parse(body) }); } catch { }
      res.writeHead(204).end();
    });
    return;
  }

  const urlPath = req.url.split('?')[0];   // drops the query strings
  const file = path.join(PUBLIC, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();

  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end('not found');
    if (file.endsWith('index.html')) record({ event: 'view' });
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Portal running at http://127.0.0.1:${PORT}`);
  console.log(`Logging to ${LOG}`);
});

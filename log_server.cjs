const http = require('http');
http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    if (req.url === '/log') console.log('[LOG]', body);
    if (req.url === '/err') console.error('[ERR]', body);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end('ok');
  });
}).listen(9999, () => {
  console.log('Log server running on 9999');
});

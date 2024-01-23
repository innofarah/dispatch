const http = require('http');

export async function serve() {

    // binding the server to listen only on the localhost IP address (127.0.0.1). Ensuring that requests from other IP addresses are blocked at the network level.
    const hostname = '127.0.0.1';
    const port = 3000;

    const server = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello World');
    });

    server.listen(port, hostname, () => {
        console.log(`Server running at http://${hostname}:${port}/`);
    });
}
const http = require('http');
import { getResult } from './get.js';


export async function serve() {

    // binding the server to listen only on the localhost IP address (127.0.0.1). Ensuring that requests from other IP addresses are blocked at the network level.
    const hostname = '127.0.0.1';
    const port = 3000;

    const server = http.createServer(async (req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (req.method == "GET") { // this is GET in general, not just dispatch-get, so:
            // params:
                // "dispatch-command": "get" | ?
            // TODO proper error handling
            let url = new URL("http://" + hostname + ":" + port + req.url)
            let params = url.searchParams
            let dispatchCommand = params.get("dispatch-command")
            if (dispatchCommand == "get") {
                let cid = params.get("cid")
                let result = await getResult(cid)
                
                res.end(result)
            }
            else {
                res.end('Unknown dispatch command');
            }
        }
        else res.end('Unknown request method');
        
    });

    server.listen(port, hostname, () => {
        console.log(`Server running at http://${hostname}:${port}/`);
    });
}
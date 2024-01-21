// should run a local server that accepts requests only from localhost
// should specify the input format of requests
// should eventually decompose the publish etc .. functions 
// because direct text would be sent from browser
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

/*
/// THIS FILE, IN ITS CURRENT FORM, IS JUST FOR TESTING DURING DEVELOPMENT

import * as dispatch from "./dispatch.js"
//import * as environment from "./environment.js"


// assuming the input is a "text file" -> we need to parse it into json (don't assume it's json)
// the return from the dispatch function would be json, and here the "interface" will stringify it before returning it
const callADispatchFunction = (input) => {
    try {
        const json = JSON.parse(input)
        // [TODO] do some validation
        const fun = json["dispatch-function"]
        const args = json["function-args"]
        switch (fun) {
            // in each case, args would be of some expected format,
            // so, [TODO] some validation
            // let's for now just assume that for publish, args directly represents the "input-to-dispatch" json file
            case "publish":
                console.log("calling publish!")
                //return dispatch.publish(args) // must return some json that indicates ??
        }
    } catch (err) {
        return "error" // [TODO] do proper error handling
    }
}

// test calling publish
// now just put the input file as json right here

const exampleInput = {
    "dispatch-function": "publish",
    "function-args": {
        "format": "assertion",
        "agent": "localAgent",
        "claim": {
            "format": "annotated-production",
            "production": {
                "mode": "abella-testing-ipfs",
                "sequent": {
                    "conclusion": "plus_comm",
                    "dependencies": [
                        "damf:bafyreiefqjjv3wzuvjjvelufzwfrohckxdzv4two7a5wmcxl7rkvsrlzoq",
                        "plus_succ"
                    ]
                }
            },
            "annotation": [
                "part of the language - dispatch doesn't read it"
            ]
        },
        "formulas": {
            "plus_comm": {
                "language": "abella-language",
                "content": "forall M N K, nat K -> plus M N K -> plus N M K",
                "context": [
                    "plus"
                ]
            },
            "plus_succ": {
                "language": "abella-language",
                "content": "forall M N K, plus M N K -> plus M (s N) (s K)",
                "context": [
                    "plus"
                ]
            }
        },
        "contexts": {
            "plus": {
                "language": "abella-language",
                "content": [
                    "Kind nat      type",
                    "Type zero     nat",
                    "Type succ     nat -> nat",
                    "Define nat : nat -> prop by nat zero ; nat (succ N) := nat N",
                    "Define plus : nat -> nat -> nat -> prop by plus z N N ; plus (s M) N (s K) := plus M N K"
                ]
            }
        }
    }
}

callADispatchFunction(JSON.stringify(exampleInput))
*/
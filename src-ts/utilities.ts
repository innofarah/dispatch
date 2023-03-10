/*
 * Copyright (C) 2023  Inria
 *
 * Inria: Institut National de Recherche en Informatique et en Automatique
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * A copy of the license is provided in the file "LICENSE" distributed
 * with this file. You may also obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// in this file a lot should be added; for example, verifying that all things refered in the sequence are of the same language (check first if this is what we want?)
// for now only check that the the object has the correct attributes (without checking the types of their values)

import crypto from "crypto";
import fs from "fs";
import { execSync } from "child_process";
import util from "util";
import stream from "stream";
const fetch = require("node-fetch").default;
import { Web3Storage } from "web3.storage";
import { CarReader } from "@ipld/car";

import { configpath, keystorepath, allowlistpath } from "./initial-vals";

function isAnnotated(format: string,
                     testFn: (_: any) => boolean) : (_: any) => boolean {
    const annotatedFormat = "annotated-" + format;
    return (obj) => {
        return Object.keys(obj).length == 3
            && "format" in obj
            && obj["format"] == annotatedFormat
            && format in obj
            && testFn(obj[format]);
    };
}

export function isContext(obj: any) : boolean {
    return Object.keys(obj).length == 3
        && "format" in obj
        && obj["format"] == "context"
        && "language" in obj
        && "content" in obj;
}

export const isAnnotatedContext = isAnnotated("context", isContext);

export function isFormula(obj: any) : boolean {
    return Object.keys(obj).length == 4
        && "format" in obj
        && obj["format"] == "formula"
        && "language" in obj
        && "content" in obj
        && "context" in obj;
}

export const isAnnotatedFormula = isAnnotated("formula", isFormula);

export function isSequent(obj: any) : boolean {
    return Object.keys(obj).length == 3
        && "format" in obj
        && obj["format"] == "sequent"
        && "dependencies" in obj
        && "conclusion" in obj;
}

export const isAnnotatedSequent = isAnnotated("sequent", isSequent);

export function isTool(obj: any) : boolean {
    return Object.keys(obj).length == 2
        && "format" in obj
        && obj["format"] == "tool"
        && "content" in obj;
}

export function isLanguage(obj: any) : boolean {
    return Object.keys(obj).length == 2
        && "format" in obj
        && obj["format"] == "language"
        && "content" in obj;
}

export function isProduction(obj: any) : boolean {
    return Object.keys(obj).length == 3
        && "format" in obj
        && obj["format"] == "production"
        && "sequent" in obj
        && "mode" in obj;
}

export const isAnnotatedProduction = isAnnotated("production", isProduction);

export function isAssertion(obj: any) : boolean {
    return Object.keys(obj).length == 4
        && "format" in obj
        && obj["format"] == "assertion"
        && "agent" in obj
        && "claim" in obj
        && "signature" in obj;
}

export function isCollection(obj: any) : boolean {
    return Object.keys(obj).length == 3
        && "format" in obj
        && obj["format"] == "collection"
        && "name" in obj
        && "elements" in obj;
}

// the standard format types to publish and get
export function isOfSpecifiedTypes(obj: any) : boolean {
    return isContext(obj)
        || isFormula(obj)
        || isSequent(obj)
        || isProduction(obj)
        || isAssertion(obj)
        || isCollection(obj)
        || isAnnotatedContext(obj)
        || isAnnotatedFormula(obj)
        || isAnnotatedSequent(obj)
        || isAnnotatedProduction(obj);
}

// [TODO] rename to isValidSignature
export function verifySignature(assertion: any) : boolean {
    // [TODO] assert(isAssertion(assertion));
    let signature = assertion["signature"];
    let claimedPublicKey = assertion["agent"];
    // the data to verify : here it's the asset's cid in the object
    let dataToVerify = assertion["claim"]["/"];

    const verify = crypto.createVerify('SHA256');
    verify.write(dataToVerify);
    verify.end();
    return verify.verify(claimedPublicKey, signature, 'hex');
}

export function fingerPrint(agent: string) : string {
    let keystore = JSON.parse(fs.readFileSync(keystorepath).toString());
    let fingerPrint = keystore[agent];
    if (!fingerPrint) {
        fingerPrint = crypto.createHash('sha256').update(agent).digest('hex');
        keystore[agent] = fingerPrint;
        fs.writeFileSync(keystorepath, JSON.stringify(keystore));
    }
    return fingerPrint;
}

// [TODO] rename to isAllowed
export function inAllowList(agent: string) : boolean {
    let allowList = JSON.parse(fs.readFileSync(allowlistpath).toString());
    return allowList.includes(agent);
}

// --------------------------
// for retrieval from ipfs
// --------------------------

export async function ipfsGetObj(cid: string) : Promise<any> {
    // [TODO] async function shouldn't be calling Sync()
    let cmd = "ipfs dag get " + cid + " > " + cid + ".json";
    execSync(cmd, { encoding: 'utf-8' });
    let obj = JSON.parse(fs.readFileSync(cid + ".json").toString());
    fs.unlinkSync(cid + ".json");
    return obj;
}

// [TODO] unspaghettify
export async function ensureFullDAG(cid: string) : Promise<void> {
    try {
        //test if it exists locally / or tries to retrieve the missing links in case the ipfs daemon is activated
        let cmd = "ipfs dag export -p " + cid + " > tmpp.car"
        // for now : causes a problem if we use an address with slashes "/" since ipfs export doesn't support it currently
        console.log("ipfs daemon working on retrieving DAG .. Please be patient ..")
        execSync(cmd, { encoding: 'utf-8' }) // this fails if there are missing links from the local ipfs repo / or unsuccessful to retrieve in case the ipfs daemon is activated
        fs.unlink('tmpp.car', (err) => {
            if (err) throw err;
        });
    } catch (err) {
        console.log("There are missing links that were not found in the local ipfs cache OR the ipfs daemon (if activated) has not been able to find them, trying to retrieve them from the specified gateway ..")
        let config = JSON.parse(fs.readFileSync(configpath).toString())
        let gateway = config["my-gateway"];
        if (!gateway) {
            console.log("ERROR: gateway should be specified as trying to retreive data through it .. ")
            process.exit(1)
        }
        let url = gateway + "/api/v0/dag/export?arg=" + cid
        //let result = await axios.get(url)
        // problem here: we need to return the result as a stream to properly create the .car file from it -> axios not sufficient

        try {
            const streamPipeline = util.promisify(stream.pipeline);

            const response = await fetch(url);

            if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

            await streamPipeline(response.body, fs.createWriteStream('tmpp.car'));

            //fs.writeFileSync("tmpp.car", response.body)
            execSync("ipfs dag import tmpp.car", { encoding: 'utf-8' })
            fs.unlink('tmpp.car', (err) => {
                if (err) throw err;
            });
        } catch (err) {
            console.log(err)
            process.exit(1)
        }
    }
}

// --------------------------
// for adding to ipfs (+cloud)
// --------------------------

export async function ipfsAddObj(obj: any) {
    try {
        fs.writeFileSync("tmpJSON.json", JSON.stringify(obj))
        let addcmd = "ipfs dag put tmpJSON.json --pin"
        let output = execSync(addcmd, { encoding: 'utf-8' })

        fs.unlinkSync('tmpJSON.json')
        return output.substring(0, output.length - 1)
    } catch (error) {
        console.error("ERROR: adding object to ipfs failed");
        return ""
    }
}

// subject to change, check if adding as file is the correct (and better) thing to do for declarations content and formula string
/*export const ipfsAddFile = async (data: string) => {
    try {
        fs.writeFileSync("tmpFile.txt", data)
        let addcmd = "ipfs add tmpFile.txt --cid-version 1 --pin"
        let output = execSync(addcmd, { encoding: 'utf-8' })

        fs.unlinkSync('tmpFile.txt')
        //return output.substring(0, output.length - 1)
        return output.split(" ")[1] // not really best way to do it (must us nodjs ipfs api not cmd)
    } catch (error) {
        console.error("ERROR: adding object to ipfs failed");
        return ""
    }
}*/

export async function publishDagToCloud(cid: string) {
    let web3Token: string, web3Client: Web3Storage

    try {
        let config = JSON.parse(fs.readFileSync(configpath).toString())

        if (config["my-web3.storage-api-token"]
            && config["my-web3.storage-api-token"] != "**insert your token here**") {
            web3Token = config["my-web3.storage-api-token"]
            web3Client = new Web3Storage({ token: web3Token })
        }
        else {
            throw new Error("ERROR: setting a web3.storage token is required as the chosen mode for publishing is 'cloud' and not 'local'.")
        }
        let cmd = "ipfs dag export " + cid + " > tmpcar.car"
        execSync(cmd, { encoding: 'utf-8' })
        const inStream = fs.createReadStream('tmpcar.car')
        // read and parse the entire stream in one go, this will cache the contents of
        // the car in memory so is not suitable for large files.
        const reader = await CarReader.fromIterable(inStream)
        await web3Client.putCar(reader)
        console.log("DAG successfully published to web3.storage!")
        console.log("root cid: " + cid)
        fs.unlink('tmpcar.car', (err) => {
            if (err) throw err
        })

    } catch (err) {
        console.log(err)
    }
}

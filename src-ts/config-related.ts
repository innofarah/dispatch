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

import fs from 'node:fs/promises';
import crypt from 'crypto';

import iv from './initial-vals.js';
import { ipfsAddObj, ipfsCommit } from "./utilities.js"

export async function createAgent(profileName: string) {
    // now just using default parameters
    const { privateKey, publicKey } = crypt.generateKeyPairSync('ed25519', {
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    // create a profile and add it to the profiles file
    const fingerPrint = crypt.createHash('sha256').update(publicKey).digest('hex');

    const newProfile: agentProfile = {
        "name": profileName,
        "public-key": publicKey,
        "private-key": privateKey,
        "fingerprint": fingerPrint
    };
    await iv.agentProfiles.write(profileName, newProfile);
    console.log("Agent profile " + profileName + " created successfully!");
}

export async function createTool(toolProfileName: string,
                                 inputType: "file" | "cid" | "json",
                                 input: string) {
    let toolCid = undefined;
    if (inputType === "file") {
        // [HACK] assumes file is data, not text
        // could have { encoding: "utf-8" }
        const content = await fs.readFile(input);
        toolCid = await ipfsAddObj({
            "format": "tool",
            "content": content
        });
    }
    else if (inputType === "json") {
        const data = await fs.readFile(input, { encoding: "utf-8" });
        const content = JSON.parse(data);
        toolCid = await ipfsAddObj({
            "format": "tool",
            "content": content
        });
    }
    else if (inputType === "cid")
        toolCid = input; // assuming the cid refers to a "format" = "tool" object --> check later
    else
        throw new Error(`createTool: invalid inputType ${ inputType }`);

    const toolProfile = {
        "name": toolProfileName,
        "tool": toolCid
    }

    await ipfsCommit();
    await iv.toolProfiles.write(toolProfileName, toolProfile);
    console.log("Tool profile " + toolProfileName + " created successfully!")
}

// check that cid refers to "format"="language" type --> later
export async function createLanguage(languageName: string,
                                     inputType: "file" | "cid" | "json",
                                     input: string) {
    let languageCid = "";
    if (inputType === "file") {
        const content = await fs.readFile(input);
        languageCid = await ipfsAddObj({
            "format": "language",
            "content": content
        });
    }
    else if (inputType === "json") {
        const data = await fs.readFile(input, { encoding: "utf-8" });
        const content = JSON.parse(data)
        languageCid = await ipfsAddObj({
            "format": "language",
            "content": content
        });
    }
    else if (inputType === "cid")
        languageCid = input; // assuming the cid refers to a "format" = "language" object --> check later
    else
        throw new Error(`createLanguage: invalid inputType ${ inputType }`);

    const language = {
        "name": languageName,
        "language": languageCid
    };

    await ipfsCommit();
    await iv.languages.write(languageName, language);
    console.log("Language record " + languageName + " created successfully!");
}

/*export async function setweb3token(token: string) {
    await iv.config.write("my-web3.storage-api-token", token);
}*/

export async function setw3email(email: string) {
    await iv.config.write("my-w3-email", email);
}

export async function setw3space(space: string) {
    await iv.config.write("my-w3-space", space);
}

export async function setgateway(gateway: string) {
    await iv.config.write("my-gateway", gateway);
}

/*let trustagent = (agent: string) => {
    let allowlistFile = fs.readFileSync(allowlistpath)
    let allowList = JSON.parse(allowlistFile)
    allowList.push(agent)
    allowList = Array.from(new Set(allowList)) // agent listed only once
    try {
        fs.writeFileSync(allowlistpath, JSON.stringify(allowList))
    }
    catch (err) {
        console.log(err)
    }
}*/

export async function listconfig() {
    console.log("//", iv.config.fileName);
    console.log(await iv.config.readAll());
    console.log("//", iv.keyStore.fileName);
    console.log(await iv.keyStore.readAll());
    console.log("//", iv.agentProfiles.fileName);
    console.log(await iv.agentProfiles.readAll());
    console.log("//", iv.toolProfiles.fileName);
    console.log(await iv.toolProfiles.readAll());
    console.log("//", iv.languages.fileName);
    console.log(await iv.languages.readAll());
    console.log("//", iv.allowList.fileName);
    console.log(await iv.allowList.readAll());
}

// export default {
//     createAgent,
//     createTool, createLanguage,
//     setweb3token, setgateway,
//     listconfig,
// };

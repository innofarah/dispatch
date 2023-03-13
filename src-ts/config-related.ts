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

const fs = require('fs')
const crypt = require('crypto')

//const { configpath, confdirpath, keystorepath, agentprofilespath } = require('./initial-vals')
import initialVals = require("./initial-vals")
const { configpath, confdirpath, keystorepath, agentprofilespath, toolprofilespath, languagespath, allowlistpath } = initialVals

import utilities = require("./utilities")
const { ipfsAddObj, publishDagToCloud } = utilities

let setup = () => {
    // try to read ~/.config/dispatch/config.json --> create if doesn't exist
    if (!fs.existsSync(configpath)) {
        fs.mkdirSync(confdirpath, { recursive: true }) // it creates any directory in the specified path if it does not exist
        let configObj = {
            "my-gateway": "http://dweb.link",
            "my-web3.storage-api-token": "**insert your token here**",
        }
        fs.writeFileSync(configpath, JSON.stringify(configObj))
    }

    if (!fs.existsSync(keystorepath)) {
        fs.writeFileSync(keystorepath, JSON.stringify({}))
    }

    if (!fs.existsSync(agentprofilespath)) {
        fs.writeFileSync(agentprofilespath, JSON.stringify({}))
    }
    if (!fs.existsSync(toolprofilespath)) {
        fs.writeFileSync(toolprofilespath, JSON.stringify({}))
    }
    if (!fs.existsSync(languagespath)) {
        fs.writeFileSync(languagespath, JSON.stringify({}))
    }

    if (!fs.existsSync(allowlistpath)) {
        fs.writeFileSync(allowlistpath, JSON.stringify([]))
    }

}

let createAgent = (profileName: string) => { // now just using default parameters
    /* const {
        publicKey,
        privateKey
    } = crypto.generateKeyPairSync('rsa', {
        modulusLength : 4096,
        publicKeyEncoding: {
            type : 'spki',
            format : 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: 'top secret'
        }
    }) */

    const { privateKey, publicKey } = crypt.generateKeyPairSync('ec', {
        namedCurve: 'sect239k1',
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
    let fingerPrint = crypt.createHash('sha256').update(publicKey).digest('hex')

    let profiles = JSON.parse(fs.readFileSync(agentprofilespath))
    let newProfile: agentProfile = {
        "name": profileName,
        "public-key": publicKey,
        "private-key": privateKey,
        "fingerprint": fingerPrint
    }

    profiles[profileName] = newProfile

    try {
        fs.writeFileSync(agentprofilespath, JSON.stringify(profiles))
        console.log("Agent profile " + profileName + " created successfully!")
    }
    catch (err) {
        console.log(err)
    }
}

let createTool = async (toolProfileName: string, inputType: "file" | "cid" | "json", input: string) => {
    let toolCid = ""
    if (inputType == "file") {
        try {
            let data = fs.readFileSync(input, {encoding: 'utf-8'}) //assuming the data is text
            // but maybe it's not?
            //let data = fs.readFileSync(input)
            let contentCid = await ipfsAddObj(data)
            toolCid = await ipfsAddObj({
                "format": "tool",
                "content": { "/": contentCid }
            })
        }
        catch (err) {
            console.log(err)
            process.exit(process.exitCode)
        }
    }
    else if (inputType == "json") {
        try {
            let data = JSON.parse(fs.readFileSync(input)) //assuming the data is json
            // but maybe it's not?
            //let data = fs.readFileSync(input)
            let contentCid = await ipfsAddObj(data)
            toolCid = await ipfsAddObj({
                "format": "tool",
                "content": { "/": contentCid}
            })
        }
        catch (err) {
            console.log(err)
            process.exit(process.exitCode)
        }
    }
    else if (inputType == "cid") toolCid = input // assuming the cid refers to a "format" = "tool" object --> check later

    let toolProfile = {
        "name": toolProfileName,
        "tool": toolCid
    }

    let toolProfiles = JSON.parse(fs.readFileSync(toolprofilespath))
    toolProfiles[toolProfileName] = toolProfile

    try {
        fs.writeFileSync(toolprofilespath, JSON.stringify(toolProfiles))
        console.log("Tool profile " + toolProfileName + " created successfully!")

    }
    catch (err) {
        console.log(err)
    }
}

// check that cid refers to "format"="language" type --> later
let createLanguage = async (languageName: string, inputType: "file" | "cid" | "json", input: string) => {
    let languageCid = ""
    if (inputType == "file") {
        try {
            let data = fs.readFileSync(input, {encoding: 'utf-8'}) //assuming the data is text
            // but maybe it's not?
            //let data = fs.readFileSync(input)
            let contentCid = await ipfsAddObj(data)
            languageCid = await ipfsAddObj({
                "format": "language",
                "content": { "/": contentCid }
            })
        }
        catch (err) {
            console.log(err)
            process.exit(process.exitCode)
        }
    }
    else if (inputType == "json") {
        try {
            let data = JSON.parse(fs.readFileSync(input)) //assuming the data is json
            // but maybe it's not?
            //let data = fs.readFileSync(input)
            let contentCid = await ipfsAddObj(data)
            languageCid = await ipfsAddObj({
                "format": "language",
                "content": { "/": contentCid }
            })
        }
        catch (err) {
            console.log(err)
            process.exit(process.exitCode)
        }
    }
    else if (inputType == "cid") languageCid = input // assuming the cid refers to a "format" = "language" object --> check later

    let language = {
        "name": languageName,
        "language": languageCid
    }

    let languages = JSON.parse(fs.readFileSync(languagespath))
    languages[languageName] = language

    try {
        fs.writeFileSync(languagespath, JSON.stringify(languages))
        console.log("Language record " + languageName + " created successfully!")

    }
    catch (err) {
        console.log(err)
    }
}

let setweb3token = (token: string) => {
    let configFile = fs.readFileSync(configpath)
    let config = JSON.parse(configFile)
    config["my-web3.storage-api-token"] = token
    try {
        fs.writeFileSync(configpath, JSON.stringify(config))
    }
    catch (err) {
        console.log(err)
    }
}

let setgateway = (gateway: string) => {
    let configFile = fs.readFileSync(configpath)
    let config = JSON.parse(configFile)
    config["my-gateway"] = gateway
    try {
        fs.writeFileSync(configpath, JSON.stringify(config))
    }
    catch (err) {
        console.log(err)
    }
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

let listconfig = () => {
    let configFile = fs.readFileSync(configpath)
    let config = JSON.parse(configFile)
    console.log(config)
}

export = { setup, createAgent, createTool, createLanguage, setweb3token, setgateway, listconfig }

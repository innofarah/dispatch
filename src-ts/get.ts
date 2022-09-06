const fs = require('fs')
const { execSync } = require('child_process');
const crypto = require('crypto')
const util = require('util')
const stream = require('stream')
const fetch = require('node-fetch').default

import initialVals = require("./initial-vals")
const { configpath, profilespath, keystorepath } = initialVals


// cid refers to: formula, sequent, assertion, or sequence
let getCommand = async (cid: string, directoryPath: string) => {
    let result = {}
    await ensureFullDAG(cid)
    try {
        let mainObj = await ipfsGetObj(cid)
        if (mainObj != {}) {
            if (!isFormula(mainObj) && !isSequent(mainObj) && !isAssertion(mainObj) && !isSequence(mainObj))
                throw new Error("Retrieved object has unknown/invalid format.")

            let mainObjFormat = mainObj["format"]
            if (mainObjFormat == "assertion") {
                if (verifySignature(mainObj)) {
                    let asset = await ipfsGetObj(mainObj["asset"]["/"])
                    await processSequent(asset, result, mainObj["principal"])
                } else throw new Error("Assertion not verified.")
            }
            else if (mainObjFormat == "asset") {
                let assetType = mainObj["assetType"]
                switch (assetType) {
                    case 'formula':
                        await processFormula(mainObj)
                    case 'sequent':
                        await processSequent(mainObj, result, "")
                    case 'sequence':
                        await processSequence(mainObj, result)
                }
            }

        } else throw new Error("Retrieved object is empty.")

        if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true })
        fs.writeFileSync(directoryPath + "/" + cid + ".json", JSON.stringify(result))
        console.log("dag referred to by this cid is in the file named " + cid + ".json to be used by abella")

    } catch (err) {
        console.log(err)
    }
}

let processFormula = async (obj: {}) => {
    console.log("the given cid refers to the formula object:")
    console.log(obj)
    console.log("This format is NOT allowed/expected to be imported.")
}

let processSequent = async (obj: {}, result: {}, signer: string) => {
    let lemmas = obj["lemmas"]
    let conclusion = await ipfsGetObj(obj["conclusion"]["/"])
    let entry = {}
    let theoremName = conclusion["name"]
    if (result[theoremName]) {
        // test if different cidformula => error, exit
        // if same cidformula => entry = outputObj[theoremName]
        entry = result[theoremName]
        if (entry["cidFormula"] != obj["conclusion"]["/"]) {
            console.error("Different formula using same name --> not allowed");
            process.exit(0)
        }
    }
    else {
        entry["cidFormula"] = obj["conclusion"]["/"]
        entry["formula"] = conclusion["formula"]
        entry["sigmaFormula"] = conclusion["sigma"]
        entry["sequents"] = []
    }

    let sequent = {}
    sequent["lemmas"] = await unfoldLemmas(lemmas)
    if (signer != "") {

        let keystore = JSON.parse(fs.readFileSync(keystorepath))
        let fingerPrint
        if (keystore[signer]) {
            fingerPrint = keystore[signer]
        }
        else {
            fingerPrint = crypto.createHash('sha256').update(signer).digest('hex')
            keystore[signer] = fingerPrint
            fs.writeFileSync(keystorepath, JSON.stringify(keystore))
        }

        sequent["signer"] = fingerPrint
    }

    entry["sequents"].push(sequent)

    result[theoremName] = entry

    //console.log(outputObj)
    //console.log("sequents")
    //console.log(outputObj[theoremName]["sequents"])
}

let processSequence = async (obj: {}, result: {}) => {
    let sequentsLinks = obj["sequents"] // sequents or assertions
    for (let link of sequentsLinks) {
        let entry = await ipfsGetObj(link["/"])
        if (isAssertion(entry)) {
            let asset = await ipfsGetObj(entry["asset"]["/"])
            await processSequent(asset, result, entry["principal"])
        }
        else if (isSequent(entry)) {
            await processSequent(entry, result, "")
        }
    }
}


let unfoldLemmas = async (lemmas: []) => {
    // fix to add checks
    let lemmaFormulaObjects = []
    for (let lemma of lemmas) {
        let formulaObject = await ipfsGetObj(lemma["/"])
        lemmaFormulaObjects.push({ "name": formulaObject["name"], "formula": formulaObject["formula"], "sigma": formulaObject["sigma"] })
    }

    return lemmaFormulaObjects
}

let ipfsGetObj = async (cid: string) => {
    try {
        let cmd = "ipfs dag get " + cid + " > " + cid + ".json"
        execSync(cmd, { encoding: 'utf-8' })
        let obj = JSON.parse(fs.readFileSync(cid + ".json"))
        fs.unlinkSync(cid + ".json")
        return obj
    } catch (error) {
        console.error("getting object from ipfs failed");
        return {}
    }
}

let ensureFullDAG = async (cid) => {
    try {
        //test if it exists locally / or tries to retrieve the missing links in case the ipfs daemon is activated
        let cmd = "ipfs dag export " + cid + " > tmpp.car"
        // for now : causes a problem if we use an address with slashes "/" since ipfs export doesn't support it currently
        execSync(cmd, { encoding: 'utf-8' }) // this fails if there are missing links from the local ipfs repo / or unsuccessful to retrieve in case the ipfs daemon is activated
        fs.unlink('tmpp.car', (err) => {
            if (err) throw err;
        });
    } catch (err) {
        console.log("There are missing links that were not found in the local ipfs cache OR the ipfs daemon (if activated) has not been able to find them, trying to retrieve them from the specified gateway ..")
        let config = JSON.parse(fs.readFileSync(configpath))
        let gateway
        if (config["my-gateway"]) gateway = config["my-gateway"]
        else {
            console.log("gateway should be specified as trying to retreive data through it .. ")
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

let isAssertion = (obj: {}) => {
    if (Object.keys(obj).length == 4 && "format" in obj && obj["format"] == "assertion") {
        return ("principal" in obj && "asset" in obj && "signature" in obj)
    }
    return false
}

let isSequent = (obj: {}) => {
    if (Object.keys(obj).length == 4 && "format" in obj && obj["format"] == "asset") {
        return ("assetType" in obj && obj["assetType"] == "sequent" && "lemmas" in obj && "conclusion" in obj)
    }
    return false
}

let isSequence = (obj: {}) => {
    if (Object.keys(obj).length == 4 && "format" in obj && obj["format"] == "asset") {
        return ("assetType" in obj && obj["assetType"] == "sequence" && "name" in obj && "sequents" in obj)
    }
    return false
}

let isFormula = (obj: {}) => {
    if (Object.keys(obj).length == 5 && "format" in obj && obj["format"] == "asset") {
        return ("assetType" in obj && obj["assetType"] == "formula" && "name" in obj && "formula" in obj && "sigma" in obj)
    }
    return false
}

let verifySignature = (assertion: {}) => {
    let signature = assertion["signature"]
    let claimedPublicKey = assertion["principal"]
    // the data to verify : here it's the asset's cid in the object
    let dataToVerify = assertion["asset"]["/"]

    const verify = crypto.createVerify('SHA256')
    verify.write(dataToVerify)
    verify.end()
    let signatureVerified: boolean = verify.verify(claimedPublicKey, signature, 'hex')
    return signatureVerified
}

//getCommand("bafyreiafx4jrjy6yifdi4auqm5qywyujzhxnrx4ownp5jnjcebuan7tpu4")


export = { getCommand }
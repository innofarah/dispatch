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
        if (Object.keys(mainObj).length != 0) { // test if mainObj != {}
            if (!isFormula(mainObj) && !isSequent(mainObj) && !isAssertion(mainObj) && !isSequence(mainObj))
                throw new Error("ERROR: Retrieved object has unknown/invalid format.")

            let mainObjFormat = mainObj["format"]
            if (mainObjFormat == "assertion") {
                if (verifySignature(mainObj)) {
                    let sequent = await ipfsGetObj(mainObj["sequent"]["/"])
                    await processSequent(sequent, result, mainObj["agent"])
                } else throw new Error("ERROR: Assertion not verified.")
            }
            else if (mainObjFormat == "formula") await processFormula(mainObj)
            else if (mainObjFormat == "sequent") await processSequent(mainObj, result, "")
            else if (mainObjFormat == "sequence") await processSequence(mainObj, result)
        } else throw new Error("ERROR: Retrieved object is empty.")

        if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true })
        fs.writeFileSync(directoryPath + "/" + cid + ".json", JSON.stringify(result))
        console.log("Input to Prover Constructed: DAG referred to by this cid is in the file named " + cid + ".json")

    } catch (err) {
        console.log(err)
    }
}

let processFormula = async (obj: {}) => {
    console.log("The given cid refers to the formula object:")
    console.log(obj)
    console.log("This format is NOT allowed/expected to be imported -> NO FILE IS CONSTRUCTED")
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
            console.error("ERROR: Different formula using same name --> not allowed");
            process.exit(0)
        }
    }
    else {
        entry["cidFormula"] = obj["conclusion"]["/"]
        entry["formula"] = conclusion["formula"]
        entry["SigmaFormula"] = conclusion["Sigma"]
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
}

let processSequence = async (obj: {}, result: {}) => {
    let sequentsLinks = obj["sequents"] // sequents or assertions
    for (let link of sequentsLinks) {
        let entry = await ipfsGetObj(link["/"])
        if (isAssertion(entry)) {
            if (verifySignature(entry)) {
                let sequent = await ipfsGetObj(entry["sequent"]["/"])
                await processSequent(sequent, result, entry["agent"])
            }
            else {
                console.log("ERROR: Assertion not verified")
                process.exit(1)
            }
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
        lemmaFormulaObjects.push({"name": formulaObject["name"], "cidFormula": lemma["/"], "formula": formulaObject["formula"], "SigmaFormula": formulaObject["Sigma"] })
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
        console.error("ERROR: getting object from ipfs failed");
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

let isAssertion = (obj: {}) => {
    if (Object.keys(obj).length == 4 && "format" in obj && obj["format"] == "assertion") {
        return ("agent" in obj && "sequent" in obj && "signature" in obj)
    }
    return false
}

let isSequent = (obj: {}) => {
    if (Object.keys(obj).length == 3 && "format" in obj && obj["format"] == "sequent") {
        return ("lemmas" in obj && "conclusion" in obj)
    }
    return false
}

let isSequence = (obj: {}) => {
    if (Object.keys(obj).length == 3 && "format" in obj && obj["format"] == "sequence") {
        return ("name" in obj && "sequents" in obj)
    }
    return false
}

let isFormula = (obj: {}) => {
    if (Object.keys(obj).length == 4 && "format" in obj && obj["format"] == "formula") {
        return ("name" in obj && "formula" in obj && "Sigma" in obj)
    }
    return false
}

let verifySignature = (assertion: {}) => {
    let signature = assertion["signature"]
    let claimedPublicKey = assertion["agent"]
    // the data to verify : here it's the asset's cid in the object
    let dataToVerify = assertion["sequent"]["/"]

    const verify = crypto.createVerify('SHA256')
    verify.write(dataToVerify)
    verify.end()
    let signatureVerified: boolean = verify.verify(claimedPublicKey, signature, 'hex')
    return signatureVerified
}

export = { getCommand }
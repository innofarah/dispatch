const fs = require('fs')
const { execSync } = require('child_process');
const crypto = require('crypto')


// cid refers to: formula, sequent, assertion, or sequence
let getCommand = async (cid: string, directoryPath: string) => {
    let result = {}
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
        console.log("dag referred to by this cid is in the file named thecid.json to be used by abella")

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
    if (signer != "")
        sequent["signer"] = signer

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
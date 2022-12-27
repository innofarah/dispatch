const fs = require('fs')
const { execSync } = require('child_process');
const crypto = require('crypto')
const { Web3Storage } = require('web3.storage')
const { CarReader } = require('@ipld/car')

import initialVals = require("./initial-vals")
const { configpath, profilespath } = initialVals


let publishedFormulas: { [key: string]: string } = {}
let publishedSequents: string[] = []
let publishedAssertions: string[] = []
let publishedDeclarations: { [key: string]: string } = {}

let publishCommand = async (inputPath: string) => {
    try {
        let input = JSON.parse(fs.readFileSync(inputPath)) // json file expected

        // publish declarations first (because they need to be linked in formulas)
        // consider an entry in "declarations" (like "fib": ..) in the input file to have two possible values: either [string] or ["ipld:ciddeclarationobjcet"]
        // publish according to "format" in the given input file, first we consider the "sequence" format (where all is of one language)

        // considering the "format" attribute to be fixed (exists all the time) for all the possible input-formats (considering that input-formats might differ according to format of published objects)

        let format = input["format"]

        if (format == "sequence") {
            publishSequenceCommand(input)
        }
        else {
            console.error(new Error("unknown input format"))
        }

    } catch (error) {
        console.error(error)
    }
}

let publishSequenceCommand = async (input: {}) => { // expected input is a json having the input-format for "sequence"
    try {
        let givenSequenceName = input["input-for"]
        
        let language = input["language"]

        let profile = input["profile"]

        let sequents = input["sequents"]

        let namedFormulas = input["named-formulas"]

        let declarations = input["declarations"]

        // publishing declarations -> then named-formulas -> then sequents -> then assertions -> then sequence

        for (let decName of Object.keys(declarations)) {
            await publishDeclarations(language, decName, declarations[decName]["content"])
        }

        for (let name of Object.keys(namedFormulas)) {
            await publishFormula(language, name, namedFormulas[name]["content"], namedFormulas[name]["declarations"])
        }

        for (let sequent of sequents) {
            await publishSequent(sequent)
        }

        for (let sequentCid of publishedSequents) {

            await publishAssertion(sequentCid, profile)
        }

        let sequenceCid = await publishSequence(givenSequenceName, publishedAssertions) //for now publish sequence as composed of assertions signed by the same profile
        console.log("Input from Prover Published: The root cid of the published sequence of assertions by profile: " + profile + " is " + sequenceCid)

        // if cloud (global), publish the final sequence cid (dag) through the web3.storage api
        // should find first what is the "target" in the profile stored information (locally in the user's .config/.../profiles.json)

        try {
            let target = JSON.parse(fs.readFileSync(profilespath))[profile]["target"]
            if (target == "cloud") {
                publishDagToCloud(sequenceCid)
            }
        } catch(error) {
            console.error(error)
        }
    } catch (error) {
        console.error(error)
    }
}

let publishDeclarations = async (language: string, name: string, declarations: [string] | string) => {
    // consider an entry in "declarations" (like "fib": ..) in the input file to have two possible values: either [string] or "ipld:ciddeclarationobjcet"
    // use ipfsAddFile to add what's in content (if [string]), 
    // use ipfsAddObj to add the declarations end object

    if (typeof declarations == "string") {
        if (declarations.startsWith("ipld:")) {

            let cidObj = declarations.split(":")[1]
            publishedDeclarations[name] = cidObj

        }

        else { // error (wrong format unexpected)

        }
    }
    else if (declarations.length > 0 && typeof declarations[0] == "string") { // if type is [string] (fix this, now for testing)
        let cidContent = await ipfsAddObj(declarations)

        let declarationsObj: declarations = {
            "format": "declarations",
            "language": language,
            "content": { "/": cidContent }
        }

        let cidObj = await ipfsAddObj(declarationsObj)
        publishedDeclarations[name] = cidObj
    }

    else { // error unexpected format

    }
}

let publishFormula = async (language: string, formulaName: string, formula: string, declarations: string) => {
    let cidFormula = await ipfsAddObj(formula)

    let formulaObj: formula = {
        "format": "formula",
        "language": language,
        "content": { "/": cidFormula },
        "declarations": { "/": publishedDeclarations[declarations] }
    }

    let cid = await ipfsAddObj(formulaObj)

    let formulaNamed: namedFormula = {
        "format": "named-formula",
        "name": formulaName,
        "formula": { "/": cid }
    }

    let cidNamed = await ipfsAddObj(formulaNamed)
    publishedFormulas[formulaName] = cidNamed
}

let publishSequent = async (sequent: {}) => {

    let conclusion = sequent["conclusion"]
    let lemmas = sequent["lemmas"]

    let lemmasIpfs = []

    for (let lemma of lemmas) {
        if (lemma.startsWith("ipld:")) {
            // assuming the cids in "lemmas" should refer to a "formula" object
            //(if we remove the .thc generation and replace it with generation of the output format.json file produced by w3proof-dispatch get)

            let cidFormula = lemma.split(":")[1]
            // should we test that the cid refers to a formula object here? (check later where it's best to do the cid objects type checking?)
            lemmasIpfs.push({ "/": cidFormula })

            // allowed cids: sequent/assertion and sequence types
        }
        else {
            lemmasIpfs.push({ "/": publishedFormulas[lemma] })
        }
    }


    let seq = {
        "format": "sequent",
        "lemmas": lemmasIpfs,
        "conclusion": { "/": publishedFormulas[conclusion] }
    }

    let cid = await ipfsAddObj(seq)
    publishedSequents.push(cid)
}

let publishAssertion = async (sequentCid: string, profileName: string) => {
    try {
        let profiles = JSON.parse(fs.readFileSync(profilespath))
        if (profiles[profileName]) {
            let profile = profiles[profileName]

            const sign = crypto.createSign('SHA256')
            sign.write(sequentCid)
            sign.end()
            const signature = sign.sign(profile["private-key"], 'hex')

            let assertion: assertion = {
                "format": "assertion",
                "agent": profile["public-key"],
                "sequent": { "/": sequentCid },
                "signature": signature
            }

            let assertionCid = await ipfsAddObj(assertion)
            publishedAssertions.push(assertionCid)
        }
        else throw new Error("ERROR: given profile name does not exist")
    } catch (error) {
        console.error(error);
        process.exit(0)
    }
}

let publishSequence = async (sequenceName: string, assertionsCids: string[]) => {
    let assertionsLinks = []
    for (let cid of assertionsCids) {
        assertionsLinks.push({ "/": cid })
    }

    let sequence = {
        "format": "sequence", 
        "name": sequenceName,
        "assertions": assertionsLinks
    }

    let sequenceCid = await ipfsAddObj(sequence)
    return sequenceCid
}

let ipfsAddObj = async (obj: {}) => {
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
/*let ipfsAddFile = async (data: string) => {
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

let publishDagToCloud = async (cid: string) => {
    let web3Token, web3Client

    try {
        let config = JSON.parse(fs.readFileSync(configpath))

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
        const cid1 = await web3Client.putCar(reader)
        console.log("DAG successfully published to web3.storage!")
        console.log("root cid: " + cid)
        fs.unlink('tmpcar.car', (err) => {
            if (err) throw err
        })

    } catch (err) {
        console.log(err)
    }
}

export = { publishCommand }
const fs = require('fs')

import utilities = require("./utilities")
const { isDeclaration, isFormula, isNamedFormula, isSequent, isAssertion, isSequence, 
    verifySignature, fingerPrint, ipfsGetObj, ensureFullDAG } = utilities

// we need a general get <cid> command that works according to "format":
// declaration ->
// formula ->
// named-formula ->
// sequent ->
// assertion ->
// sequence -> similar to the way we has a standard format for "sequence" at publish, there will be a similar one at get
// etc...  
// dispatch will produce an output for all these object types, and a consumer (prover for ex) would decide what format it reads and how it should read it.

//let getCommand = async (cid: string, filepath) => {
let getCommand = async (cid: string, directoryPath) => {
    /*let outputPath  
    if (Object.values(filepath).length != 0) {
        outputPath =  Object.values(filepath)
    }
    else { // if no filepath argument(option) is given
        outputPath = cid + ".json" // the default value for the output file path
    }*/


// cid refers to: formula, sequent, assertion, or sequence // for now
let getCommand = async (cid: string, directoryPath: string) => {
    let result = {}
    await ensureFullDAG(cid)

    try {
        let mainObj = await ipfsGetObj(cid)
        if (Object.keys(mainObj).length != 0) { // test if mainObj != {}
            if (!isDeclaration(mainObj) && !isFormula(mainObj) && !isNamedFormula(mainObj) && !isSequent(mainObj) && !isAssertion(mainObj) && !isSequence(mainObj))
                throw new Error("ERROR: Retrieved object has unknown/invalid format.")

            let mainObjFormat = mainObj["format"]

            // for now we will implement only "sequence" get
            if (mainObjFormat == "declaration") {
                await getDeclaration(cid, mainObj, result)
            }
            else if (mainObjFormat == "named-formula") {
                await getNamedFormula(cid, mainObj, result)
            }
            else if (mainObjFormat == "formula") {
                await getFormula(cid, mainObj, result)
            }
            else if (mainObjFormat == "sequent") {
                await getSequent(cid, mainObj, result)
            }
            else if (mainObjFormat == "assertion") {
                await getAssertion(cid, mainObj, result)
            }
            else if (mainObjFormat == "sequence") {
                await getSequence(cid, mainObj, result)
            }

        } else throw new Error("ERROR: Retrieved object is empty.")

        if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true })
        fs.writeFileSync(directoryPath + "/" + cid + ".json", JSON.stringify(result))
        console.log("Input to Prover Constructed: DAG referred to by this cid is in the file named " + cid + ".json")

    } catch (err) {
        console.log(err)
    }

}

let processFormula = async (cid: string, result: {}, named: boolean) => {
    let mainObj = await ipfsGetObj(cid)
    let output = {}
    if (named) {
        output["name"] = mainObj["name"]
        output["cid-formula"] = mainObj["formula"]["/"]
        mainObj = await ipfsGetObj(mainObj["formula"]["/"])
    }

    output["language"] = mainObj["language"]
    output["content"] = await ipfsGetObj(mainObj["content"]["/"])
    output["declaration"] = mainObj["declaration"]["/"]

    let cidDeclaration = mainObj["declaration"]["/"]
    if (!result["declarations"][cidDeclaration]) {
        result["declarations"][cidDeclaration] = await processDeclaration(cidDeclaration, result)
    }
        
    return output
}

let processDeclaration = async (cid: string, result: {}) => {
    let declarationObj = await ipfsGetObj(cid)

    let declarationOutput = {}

    declarationOutput["language"] = declarationObj["language"]

    let content = await ipfsGetObj(declarationObj["content"]["/"])
    declarationOutput["content"] = content

    return declarationOutput
}

let processAssertion = async (assertion: {}, result: {}) => {
    let sequent = await ipfsGetObj(assertion["sequent"]["/"])
    let assertionOutput = {}

    assertionOutput["agent"] = fingerPrint(assertion["agent"])

    let conclusionCid = sequent["conclusion"]["/"]
    assertionOutput["conclusion"] = conclusionCid
    result["named-formulas"][conclusionCid] = await processFormula(conclusionCid, result, true)

    assertionOutput["lemmas"] = []
    for (let lemmaLink of sequent["lemmas"]) {
        let lemmaCid = lemmaLink["/"]
        assertionOutput["lemmas"].push(lemmaCid)
        result["named-formulas"][lemmaCid] = await processFormula(lemmaCid, result, true)
    }
    return assertionOutput
}

let processSequent = async (cid: string, result: {}) => {
    let sequent = await ipfsGetObj(cid)
    let sequentOutput = {}

    let conclusionCid = sequent["conclusion"]["/"]
    sequentOutput["conclusion"] = conclusionCid

    result["named-formulas"][conclusionCid] = await processFormula(conclusionCid, result, true)

    sequentOutput["lemmas"] = []
    for (let lemmaLink of sequent["lemmas"]) {
        let lemmaCid = lemmaLink["/"]
        sequentOutput["lemmas"].push(lemmaCid)
        result["named-formulas"][lemmaCid] = await processFormula(lemmaCid, result, true)
    }
    return sequentOutput
}

let getDeclaration = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "declaration"
    result["declarations"] = {}

    let declarationOutput = await processDeclaration(cidObj, result)

    result["declarations"][cidObj] = declarationOutput
}

let getFormula = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "formula"
    result["formula"] = {}
    result["declarations"] = {}

    let formulaOutput = await processFormula(cidObj, result, false)

    result["formula"] = formulaOutput
}

let getNamedFormula = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "named-formula"
    result["named-formula"] = {}
    result["declarations"] = {}

    let namedFormulaOutput = await processFormula(cidObj, result, true)

    result["named-formula"] = namedFormulaOutput
}

let getSequent = async (cidObj: string, obj: {}, result: {}) => { // similar to getAssertion
    result["output-for"] = cidObj
    result["format"] = "sequent"
    result["sequent"] = {} // notice putting "sequent" instead of "assertion" and "assertions"
    result["named-formulas"] = {} // same as assertion and assertions
    result["declarations"] = {}

    let sequentOutput = await processSequent(cidObj, result)

    result["sequent"] = sequentOutput
}

let getAssertion = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "assertion"
    // no result["language"] as not a "sequence" --> maybe remove this also from sequent? don't know
    // no result["name"] too as assertions/sequents has no given names

    result["assertion"] = {} // notice putting "assertion" and not "assertions"
    result["named-formulas"] = {} // possibly many formulas will be linked and thus many declarations too
    result["declarations"] = {}

    let assertion = await ipfsGetObj(cidObj)
    if (verifySignature(assertion)) { // should we verify the assertion type?

        let assertionOutput = await processAssertion(assertion, result)

        result["assertion"] = assertionOutput

    }
    else {
        console.log("ERROR: Assertion not verified")
        process.exit(1)
    }

}

let getSequence = async (cidObj: string, obj: {}, result: {}) => {

    result["output-for"] = cidObj
    result["format"] = "sequence"
    result["name"] = obj["name"]
    result["assertions"] = []
    result["named-formulas"] = {}
    result["declarations"] = {}

    let assertionsLinks = obj["assertions"] // a sequence is a collection of assertions
    for (let link of assertionsLinks) {
        let assertion = await ipfsGetObj(link["/"])
        if (verifySignature(assertion)) { // should we verify the assertion type?

            let assertionOutput = await processAssertion(assertion, result)

            result["assertions"].push(assertionOutput)

        }
        else {
            console.log("ERROR: Assertion not verified")
            process.exit(1)
        }
    }
}

export = { getCommand }
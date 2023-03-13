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

import utilities = require("./utilities")
const { isOfSpecifiedTypes, verifySignature, fingerPrint, ipfsGetObj, ensureFullDAG } = utilities

// we need a general get <cid> command that works according to "format":
// context ->
// formula ->
// sequent ->
// production ->
// assertion ->
// collection -> similar to the way we has a standard format for "collection" at publish, there will be a similar one at get
// etc...  
// dispatch will produce an output for all these object types, and a consumer (prover for ex) would decide what format it reads and how it should read it. (although the meanings of objects are fixed globally as specified)

//let getCommand = async (cid: string, filepath) => {
//let getCommand = async (cid: string, directoryPath) => {
/*let outputPath  
if (Object.values(filepath).length != 0) {
    outputPath =  Object.values(filepath)
}
else { // if no filepath argument(option) is given
    outputPath = cid + ".json" // the default value for the output file path
}*/


// cid refers to: context, formula, sequent, production, assertion, collection, etc. // for now
let getCommand = async (cid: string, directoryPath: string) => {
    let result = {}
    await ensureFullDAG(cid)

    try {
        let mainObj = await ipfsGetObj(cid)
        if (Object.keys(mainObj).length != 0) { // test if mainObj != {}
            if (!isOfSpecifiedTypes(mainObj))
                throw new Error("ERROR: Retrieved object has unknown/invalid format.")

            let mainObjFormat = mainObj["format"]

            if (mainObjFormat == "context") {
                await getContext(cid, mainObj, result)
            }
            else if (mainObjFormat == "annotated-context") {
                await getAnnotatedContext(cid, mainObj, result)
            }
            else if (mainObjFormat == "formula") {
                await getFormula(cid, mainObj, result)
            }
            else if (mainObjFormat == "annotated-formula") {
                await getAnnotatedFormula(cid, mainObj, result)
            }
            else if (mainObjFormat == "sequent") {
                await getSequent(cid, mainObj, result)
            }
            else if (mainObjFormat == "annotated-sequent") {
                await getAnnotatedSequent(cid, mainObj, result)
            }
            else if (mainObjFormat == "production") {
                await getProduction(cid, mainObj, result)
            }
            else if (mainObjFormat == "annotated-production") {
                await getAnnotatedProduction(cid, mainObj, result)
            }
            else if (mainObjFormat == "assertion") {
                await getAssertion(cid, mainObj, result)
            }
            else if (mainObjFormat == "collection") {
                await getCollection(cid, mainObj, result)
            }

        } else throw new Error("ERROR: Retrieved object is empty.")

        if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true })
        fs.writeFileSync(directoryPath + "/" + cid + ".json", JSON.stringify(result))
        console.log("Input to Prover Constructed: DAG referred to by this cid is in the file " + directoryPath + "/" + cid + ".json")

    } catch (err) {
        console.log(err)
    }

}

let processContext = async (obj: {}, result: {}) => {
    //let declarationObj = await ipfsGetObj(cid)
    let contextObj = obj
    let contextOutput = {}

    let languageCid = contextObj["language"]["/"]
    contextOutput["language"] = languageCid
    let language = await ipfsGetObj(languageCid)    // should check format "language"
    let langContent = await ipfsGetObj(language["content"]["/"])

    result["languages"][languageCid] = {}
    result["languages"][languageCid]["content"] = langContent

    let content = await ipfsGetObj(contextObj["content"]["/"])
    contextOutput["content"] = content


    return contextOutput
}

let processFormula = async (obj: {}, result: {}) => {
    //let mainObj = await ipfsGetObj(cid)
    let mainObj = obj
    let output = {}

    let languageCid = mainObj["language"]["/"]
    output["language"] = languageCid
    let language = await ipfsGetObj(languageCid)    // should check format "language"
    let langContent = await ipfsGetObj(language["content"]["/"])

    result["languages"][languageCid] = {}
    result["languages"][languageCid]["content"] = langContent

    output["content"] = await ipfsGetObj(mainObj["content"]["/"])

    output["context"] = []

    for (let contextLink of mainObj["context"]) {
        let cidContext = contextLink["/"]
        output["context"].push(cidContext)
        if (!result["contexts"][cidContext]) {
            let contextObj = await ipfsGetObj(cidContext)
            result["contexts"][cidContext] = await processContext(contextObj, result)
        }

    }

    return output
}

let processSequent = async (obj: {}, result: {}) => {
    //let sequent = await ipfsGetObj(cid)
    let sequent = obj
    let sequentOutput = {}

    let conclusionCid = sequent["conclusion"]["/"]
    sequentOutput["conclusion"] = conclusionCid

    let conclusionObj = await ipfsGetObj(conclusionCid)
    result["formulas"][conclusionCid] = await processFormula(conclusionObj, result)

    sequentOutput["dependencies"] = []
    for (let depLink of sequent["dependencies"]) {
        let depCid = depLink["/"]
        sequentOutput["dependencies"].push(depCid)
        if (!result["formulas"][depCid]) {
            let depObj = await ipfsGetObj(depCid)
            result["formulas"][depCid] = await processFormula(depObj, result)
        }
    }
    return sequentOutput
}

let processProduction = async (obj: {}, result: {}) => {
    //let production = await ipfsGetObj(cid)
    let production = obj
    let productionOutput = {}

    let sequentObj = await ipfsGetObj(production["sequent"]["/"])
    productionOutput["sequent"] = await processSequent(sequentObj, result)

    let mode = production["mode"]

    // addressing expected mode values
    //if (mode == null || mode == "axiom" || mode == "conjecture") {
    //    productionOutput["mode"] = mode
    //}
    // make it more general --> getting doesn't restrict mode values, it just outputs what exists?
    if (mode["/"]) { // ipldLink which should refer to a "tool" format object cid
        let toolCid = production["mode"]["/"]
        productionOutput["mode"] = toolCid
        let tool = await ipfsGetObj(toolCid)    // should check format "tool"
        let toolContent = await ipfsGetObj(tool["content"]["/"])
        result["tools"][toolCid] = {}
        result["tools"][toolCid]["content"] = toolContent
    }
    else { // case any
        productionOutput["mode"] = mode
    }

    return productionOutput
}

let processAssertion = async (assertion: {}, result: {}) => {
    let claim = await ipfsGetObj(assertion["claim"]["/"])
    let assertionOutput = {}

    assertionOutput["agent"] = fingerPrint(assertion["agent"])
    assertionOutput["claim"] = {}

    if (claim["format"] == "production") {
        assertionOutput["claim"]["format"] = "production"
        assertionOutput["claim"]["production"] = await processProduction(claim, result)
    }
    else if (claim["format"] == "annotated-production") {
        assertionOutput["claim"]["format"] = "annotated-production"
        let productionObj = await ipfsGetObj(claim["production"]["/"])
        assertionOutput["claim"]["production"] = await processProduction(productionObj, result)
        assertionOutput["claim"]["annotation"] = await ipfsGetObj(claim["annotation"]["/"])
        // later if we add more structure to annotation, we could change the usage of the generic ipfsGetObj
    }
    else {
        // if we want to add new claim type later
    }

    /*let conclusionCid = sequent["conclusion"]["/"]
    assertionOutput["conclusion"] = conclusionCid
    result["named-formulas"][conclusionCid] = await processFormula(conclusionCid, result)

    assertionOutput["lemmas"] = []
    for (let lemmaLink of sequent["lemmas"]) {
        let lemmaCid = lemmaLink["/"]
        assertionOutput["lemmas"].push(lemmaCid)
        result["named-formulas"][lemmaCid] = await processFormula(lemmaCid, result)
    }*/

    return assertionOutput
}

let processGeneric = async (element: {}, result: {}) => {
    if (element["format"] == "context")
        return await processContext(element, result)
    else if (element["format"] == "annotated-context") {
        let resElement = {}
        let contextObj = await ipfsGetObj(element["context"]["/"])
        resElement["context"] = await processContext(contextObj, result)
        resElement["annotation"] = await ipfsGetObj(element["annotation"]["/"])
        return resElement
    }
    else if (element["format"] == "formula")
        return await processFormula(element, result)
    else if (element["format"] == "annotated-formula") {
        let resElement = {}
        let formulaObj = await ipfsGetObj(element["formula"]["/"])
        resElement["formula"] = await processFormula(formulaObj, result)
        resElement["annotation"] = await ipfsGetObj(element["annotation"]["/"])
        return resElement
    }
    else if (element["format"] == "sequent")
        return await processSequent(element, result)
    else if (element["format"] == "annotated-sequent") {
        let resElement = {}
        let sequentObj = await ipfsGetObj(element["sequent"]["/"])
        resElement["sequent"] = await processSequent(sequentObj, result)
        resElement["annotation"] = await ipfsGetObj(element["annotation"]["/"])
        return resElement
    }
    else if (element["format"] == "production")
        return await processProduction(element, result)
    else if (element["format"] == "annotated-production") {
        let resElement = {}
        let productionObj = await ipfsGetObj(element["production"]["/"])
        resElement["production"] = await processProduction(productionObj, result)
        resElement["annotation"] = await ipfsGetObj(element["annotation"]["/"])
        return resElement
    }
    else if (element["format"] == "assertion") {
        return await processAssertion(element, result)
    }
    return null
}

let getContext = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "context"
    result["languages"] = {}

    result["context"] = await processContext(obj, result)
}

let getAnnotatedContext = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "annotated-context"
    result["annotated-context"] = {}
    result["languages"] = {}

    let contextObj = await ipfsGetObj(obj["context"]["/"])
    let contextOutput = await processContext(contextObj, result)
    result["annotated-context"]["context"] = contextOutput

    result["annotated-context"]["annotation"] = await ipfsGetObj(obj["annotation"]["/"])
}

let getFormula = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "formula"
    result["formula"] = {}
    result["contexts"] = {}
    result["languages"] = {}

    let formulaOutput = await processFormula(obj, result)

    result["formula"] = formulaOutput
}

let getAnnotatedFormula = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "annotated-formula"
    result["annotated-formula"] = {}
    result["contexts"] = {}
    result["languages"] = {}

    let formulaObj = await ipfsGetObj(obj["formula"]["/"])
    let formulaOutput = await processFormula(formulaObj, result)
    result["annotated-formula"]["formula"] = formulaOutput
    result["annotated-formula"]["annotation"] = await ipfsGetObj(obj["annotation"]["/"])
}

let getSequent = async (cidObj: string, obj: {}, result: {}) => { // similar to getAssertion
    result["output-for"] = cidObj
    result["format"] = "sequent"
    result["sequent"] = {} // notice putting "sequent" instead of "assertion" and "assertions"
    result["formulas"] = {} // same as assertion and assertions
    result["contexts"] = {}
    result["languages"] = {}

    let sequentOutput = await processSequent(obj, result)

    result["sequent"] = sequentOutput
}

let getAnnotatedSequent = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "annotated-sequent"
    result["annotated-sequent"] = {}
    result["formulas"] = {}
    result["contexts"] = {}
    result["languages"] = {}

    let sequentObj = await ipfsGetObj(obj["sequent"]["/"])
    let sequentOutput = await processSequent(sequentObj, result)
    result["annotated-sequent"]["sequent"] = sequentOutput
    result["annotated-sequent"]["annotation"] = await ipfsGetObj(obj["annotation"]["/"])
}

let getProduction = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "production"
    result["production"] = {}
    result["formulas"] = {}
    result["contexts"] = {}
    result["languages"] = {}
    result["tools"] = {}

    let productionOutput = await processProduction(obj, result)

    result["production"] = productionOutput
}

let getAnnotatedProduction = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "annotated-production"
    result["annotated-production"] = {}
    result["formulas"] = {}
    result["contexts"] = {}
    result["languages"] = {}
    result["tools"] = {}

    let productionObj = await ipfsGetObj(obj["production"]["/"])
    let productionOutput = await processProduction(productionObj, result)
    result["annotated-production"]["production"] = productionOutput
    result["annotated-production"]["annotation"] = await ipfsGetObj(obj["annotation"]["/"])
}

let getAssertion = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "assertion"

    result["assertion"] = {}
    result["formulas"] = {} // possibly many formulas will be linked and thus many contexts too
    result["contexts"] = {}
    result["languages"] = {}
    result["tools"] = {}

    //let assertion = await ipfsGetObj(cidObj)
    let assertion = obj
    if (verifySignature(assertion)) { // should we verify the assertion type?

        let assertionOutput = await processAssertion(assertion, result)

        result["assertion"] = assertionOutput

    }
    else {
        console.log("ERROR: Assertion signature not verified: invalid assertion")
        process.exit(1)
    }

}

let getCollection = async (cidObj: string, obj: {}, result: {}) => {
    result["output-for"] = cidObj
    result["format"] = "collection"
    result["name"] = obj["name"]
    result["elements"] = []
    result["formulas"] = {}
    result["contexts"] = {}
    result["languages"] = {}
    result["tools"] = {}

    let elementsLinks = obj["elements"]
    for (let link of elementsLinks) {
        let element = await ipfsGetObj(link["/"])
        let resElement = {}
        resElement["format"] = element["format"]
        resElement["element"] = await processGeneric(element, result)

        result["elements"].push(resElement)
    }
}

export = { getCommand }

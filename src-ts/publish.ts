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
const { execSync } = require('child_process');
const crypto = require('crypto')

import initialVals = require("./initial-vals")
const { configpath, toolprofilespath, languagespath, agentprofilespath } = initialVals

import utilities = require("./utilities")
const { ipfsAddObj, publishDagToCloud } = utilities

//let publishedNamedFormulas: { [key: string]: string } = {}
//let publishedFormulas: string[] = []
//let publishedSequents: string[] = []
//let publishedAssertions: string[] = []
//let publishedDeclarations: { [key: string]: string } = {}

let publishCommand = async (inputPath: string, target: target) => {
    try {
        let input = JSON.parse(fs.readFileSync(inputPath)) // json file expected

        // publish contexts first (because they need to be linked in formulas)
        // consider an entry in "contexts" (like "fib": ..) in the input file to have two possible values: either [string] or ["damf:cidcontextobjcet"]
        // publish according to "format" in the given input file, first we consider the "sequence" format 

        // considering the "format" attribute to be fixed (exists all the time) for all the possible input-formats (considering that input-formats might differ according to format of published objects)
        let format = input["format"]
        let cid = ""
        // maybe do some checking here of the given file structure if correct? 

        if (format == "context") {
            // only one declaration object exists in this case
            //let name = Object.keys(input["declarations"])[0]
            let contextObj = input["context"]
            cid = await publishContext(contextObj)
            console.log("published context object of cid: " + cid)
        }
        else if (format == "annotated-context") {
            let annotatedContextObj = input["annotated-context"]
            cid = await publishAnnotatedContext(annotatedContextObj)
            console.log("published annotated context object of cid: " + cid)
        }
        else if (format == "formula") {
            let formulaObj = input["formula"]
            cid = await publishFormula(formulaObj, input)
            console.log("published formula object of cid: " + cid)
        }
        else if (format == "annotated-formula") {
            let annotatedFormulaObj = input["annotated-formula"]
            cid = await publishAnnotatedFormula(annotatedFormulaObj, input)
            console.log("published annotated formula object of cid: " + cid)
        }
        else if (format == "sequent") {
            let sequentObj = input["sequent"]
            cid = await publishSequent(sequentObj, input)
            console.log("published sequent object of cid: " + cid)
        }
        else if (format == "annotated-sequent") {
            let annotatedSequentObj = input["annotated-sequent"]
            cid = await publishAnnotatedSequent(annotatedSequentObj, input)
            console.log("published annotated sequent object of cid: " + cid)
        }
        else if (format == "production") {
            let productionObj = input["production"]
            cid = await publishProduction(productionObj, input)
            console.log("published production object of cid: " + cid)
        }
        else if (format == "annotated-production") {
            let annotatedProductionObj = input["annotated-production"]
            cid = await publishAnnotatedProduction(annotatedProductionObj, input)
            console.log("published annotated production object of cid: " + cid)
        }
        else if (format == "assertion") {
            let assertionObj = input["assertion"]
            cid = await publishAssertion(assertionObj, input)
            console.log("published assertion object of cid: " + cid)
        }
        else if (format == "collection") { // collection of links to global objects
            let name = input["name"]
            let elements = input["elements"]
            cid = await publishCollection(name, elements, input)
            console.log("published collection object of cid: " + cid)
        }
        else {
            console.error(new Error("unknown input format"))
        }

        // if "target" is cloud (global), publish the final sequence cid (dag) through the web3.storage api
        if (cid != "" && target == "cloud") {
            await publishDagToCloud(cid)
        }

    } catch (error) {
        console.error(error)
    }
}

// !!!!!!!!!!!! should add more safety checks - do later (for all the publishing functions)
let publishContext = async (contextObj: {}) => {
    // consider an entry in "declaration" (like "fib": ..) in the input file to have two possible values: either [string] or "damf:ciddeclarationobject"
    // use ipfsAddObj to add the declarations end object

    let language = contextObj["language"]
    let content = contextObj["content"]

    let cidLanguage = "", cidContent = "", cidContext = ""

    if (typeof language == "string" && language.startsWith("damf:"))
        cidLanguage = language.split(":")[1]
    else {
        try {
            let languages = JSON.parse(fs.readFileSync(languagespath))
            if (languages[language]) { // assuming the cids in languages are of "format"="language" --> check later
                cidLanguage = languages[language]["language"]
            }
            else throw new Error("ERROR: given language record name does not exist")
        } catch (error) {
            console.error(error);
            process.exit(1)
        }
    }

    if (typeof content == "string" && content.startsWith("damf:"))
        cidContent = content.split(":")[1]
    else cidContent = await ipfsAddObj(content)

    let contextGlobal: context = {
        "format": "context",
        "language": { "/": cidLanguage },
        "content": { "/": cidContent }
    }

    let cidObj = await ipfsAddObj(contextGlobal)
    //publishedDeclarations[name] = cidObj
    cidContext = cidObj

    return cidContext
}

// change into annotated  -> what is annotations"?
let publishAnnotatedContext = async (annotatedContextObj: {}) => {
    let context = annotatedContextObj["context"]
    let annotation = annotatedContextObj["annotation"]

    let cidContext = "", cidAnnotation = ""

    if (typeof context == "string" && context.startsWith("damf:"))
        cidContext = context.split(":")[1]
    else {
        cidContext = await publishContext(context)
    }

    if (typeof annotation == "string" && annotation.startsWith("damf:"))
        cidAnnotation = annotation.split(":")[1]
    else {
        cidAnnotation = await ipfsAddObj(annotation)
    }


    let annotatedContextGlobal: annotatedContext = {
        "format": "annotated-context",
        "context": { "/": cidContext },
        "annotation": { "/": cidAnnotation }
    }

    let cid = await ipfsAddObj(annotatedContextGlobal)

    //publishedNamedFormulas[name] = cid

    return cid
}

let publishFormula = async (formulaObj: {}, input: {}) => {
    let language = formulaObj["language"]
    let content = formulaObj["content"]
    let cidLanguage = "", cidContent = ""

    if (typeof language == "string" && language.startsWith("damf:"))
        cidLanguage = language.split(":")[1]
    else {
        try {
            let languages = JSON.parse(fs.readFileSync(languagespath))
            if (languages[language]) { // assuming the cids in languages are of "format"="language" --> check later
                cidLanguage = languages[language]["language"]
            }
            else throw new Error("ERROR: given language record name does not exist")
        } catch (error) {
            console.error(error);
            process.exit(1)
        }
    }

    if (typeof content == "string" && content.startsWith("damf:"))
        cidContent = content.split(":")[1]
    else cidContent = await ipfsAddObj(content)

    let contextNames = formulaObj["context"]
    let contextLinks = [] as ipldLink[]

    for (let contextName of contextNames) {
        let contextCid = ""
        if (contextName.startsWith("damf:"))
            contextCid = contextName.split(":")[1]
        else contextCid = await publishContext(input["contexts"][contextName])
        contextLinks.push({ "/": contextCid })
    }


    let formulaGlobal: formula = {
        "format": "formula",
        "language": { "/": cidLanguage },
        "content": { "/": cidContent },
        "context": contextLinks
    }

    let cid = await ipfsAddObj(formulaGlobal)

    //publishedFormulas.push(cid)

    return cid

}

// change into annotated -> ...
let publishAnnotatedFormula = async (annotatedFormulaObj: {}, input: {}) => {
    let formula = annotatedFormulaObj["formula"]
    let annotation = annotatedFormulaObj["annotation"]

    let cidFormula = "", cidAnnotation = ""

    if (typeof formula == "string" && formula.startsWith("damf:"))
        cidFormula = formula.split(":")[1]
    else {
        cidFormula = await publishFormula(formula, input)
    }

    if (typeof annotation == "string" && annotation.startsWith("damf:"))
        cidAnnotation = annotation.split(":")[1]
    else {
        cidAnnotation = await ipfsAddObj(annotation)
    }


    let annotatedFormulaGlobal: annotatedFormula = {
        "format": "annotated-formula",
        "formula": { "/": cidFormula },
        "annotation": { "/": cidAnnotation }
    }

    let cid = await ipfsAddObj(annotatedFormulaGlobal)

    //publishedNamedFormulas[name] = cid

    return cid
}

let publishSequent = async (sequentObj: {}, input: {}) => {
    let conclusionName = sequentObj["conclusion"]
    let cidConclusion = ""

    if (conclusionName.startsWith("damf:"))
        cidConclusion = conclusionName.split(":")[1]
    else {
        let conclusionObj = input["formulas"][conclusionName]
        /*let conclusionGlobal = {
            "language": conclusionObj["language"],
            "content": conclusionObj["content"],
            "declarations": conclusionObj["declarations"]
        }*/

        cidConclusion = await publishFormula(conclusionObj, input)
    }

    let dependenciesNames = sequentObj["dependencies"]
    let dependenciesIpfs = [] as ipldLink[]
    for (let dependency of dependenciesNames) {
        let ciddependency = ""
        if (dependency.startsWith("damf:")) {
            // assuming the cids in "lemmas" should refer to a "formula" object
            //(if we remove the .thc generation and replace it with generation of the output format.json file produced by dispatch get)
            ciddependency = dependency.split(":")[1]
            // should we test that the cid refers to a formula object here? (check later where it's best to do the cid objects type checking?)
        }
        else {
            let dependencyObj = input["formulas"][dependency]
            /*let dependencyGlobal = {
                "language": dependencyObj["language"],
                "content": dependencyObj["content"],
                "declaration": dependencyObj["declaration"]
            }*/
            ciddependency = await publishFormula(dependencyObj, input)
        }
        dependenciesIpfs.push({ "/": ciddependency })
    }


    let sequentGlobal = {
        "format": "sequent",
        "dependencies": dependenciesIpfs,
        "conclusion": { "/": cidConclusion }
    }

    let cid = await ipfsAddObj(sequentGlobal)
    //publishedSequents.push(cid)

    return cid

}

let publishAnnotatedSequent = async (annotatedSequentObj: {}, input: {}) => {
    let sequent = annotatedSequentObj["sequent"]
    let annotation = annotatedSequentObj["annotation"]

    let cidSequent = "", cidAnnotation = ""

    if (typeof sequent == "string" && sequent.startsWith("damf:"))
        cidSequent = sequent.split(":")[1]
    else {
        cidSequent = await publishSequent(sequent, input)
    }

    if (typeof annotation == "string" && annotation.startsWith("damf:"))
        cidAnnotation = annotation.split(":")[1]
    else {
        cidAnnotation = await ipfsAddObj(annotation)
    }


    let annotatedSequentGlobal: annotatedSequent = {
        "format": "annotated-sequent",
        "sequent": { "/": cidSequent },
        "annotation": { "/": cidAnnotation }
    }

    let cid = await ipfsAddObj(annotatedSequentGlobal)

    //publishedNamedFormulas[name] = cid

    return cid
}

let publishProduction = async (productionObj: {}, input: {}) => {
    let mode = productionObj["mode"]
    let sequent = productionObj["sequent"]
    let modeValue: toolLink | null | "axiom" | "conjecture" // the currently expected mode values
    let cidTool = "", cidSequent = ""

    // add spec and checks later that sequent is "damf:.." or {..}
    if (typeof sequent == "string" && sequent.startsWith("damf:"))
        cidSequent = sequent.split(":")[1]
    else cidSequent = await publishSequent(sequent, input)

    // these are just the CURRENTLY known production modes to dispatch
    // but later, maybe this would be extended : the important point is 
    //that tools that publish and get global objects have some expected modes,
    //according to some specification (maybe standard maybe more)
    // OR maybe make it more general? --> dispatch doesn't check restricted mode values?
    if (mode == null || mode == "axiom" || mode == "conjecture") {
            modeValue = mode
    }

    // other than the expected modes keywords, the current specification of a production,
    // and what dispatch expects is a "tool" format cid (either directly put in the input 
    //as damf:cid or through a profile name which is specific to dispatch 
    //(but the end result is the same, which is the cid of the tool format object))
    else if (typeof mode == "string" && mode.startsWith("damf:")) {
        cidTool = mode.split(":")[1]
        modeValue = { "/": cidTool }
    }
    else {
        try {
            let toolProfiles = JSON.parse(fs.readFileSync(toolprofilespath))
            if (toolProfiles[mode]) { // assuming the cids in toolProfiles are of "format"="tool" --> check later
                cidTool = toolProfiles[mode]["tool"]
                modeValue = { "/": cidTool }
            }
            else throw new Error("ERROR: given toolProfile name does not exist")
        } catch (error) {
            console.error(error);
            process.exit(1)
        }
    }

    let productionGlobal: production = {
        "format": "production",
        "sequent": { "/": cidSequent },
        "mode": modeValue
    }

    let cidProduction = await ipfsAddObj(productionGlobal)

    return cidProduction
}

let publishAnnotatedProduction = async (annotatedProductionObj: {}, input: {}) => {
    let production = annotatedProductionObj["production"]
    let annotation = annotatedProductionObj["annotation"]

    let cidProduction = "", cidAnnotation = ""

    if (typeof production == "string" && production.startsWith("damf:"))
        cidProduction = production.split(":")[1]
    else {
        cidProduction = await publishProduction(production, input)
    }

    if (typeof annotation == "string" && annotation.startsWith("damf:"))
        cidAnnotation = annotation.split(":")[1]
    else {
        cidAnnotation = await ipfsAddObj(annotation)
    }


    let annotatedProductionGlobal: annotatedProduction = {
        "format": "annotated-production",
        "production": { "/": cidProduction },
        "annotation": { "/": cidAnnotation }
    }

    let cid = await ipfsAddObj(annotatedProductionGlobal)

    //publishedNamedFormulas[name] = cid

    return cid
}

// refer to either production or annotatedproduction. how
let publishAssertion = async (assertionObj: {}, input: {}) => {
    let agentProfileName = assertionObj["agent"]
    let claim = assertionObj["claim"]
    let cidClaim = ""

    if (typeof claim == "string" && claim.startsWith("damf:"))
        cidClaim = claim.split(":")[1]
    else {
        // should do additional checking
        if (claim["format"] == "production") {
            cidClaim = await publishProduction(claim["production"], input)
        }
        else if (claim["format"] == "annotated-production") {
            let production = claim["production"]
            let annotation = claim["annotation"]

            let annotatedProductionObj = {
                "production": production,
                "annotation": annotation
            }
            cidClaim = await publishAnnotatedProduction(annotatedProductionObj, input)
        }
    }

    try {
        let agentProfiles = JSON.parse(fs.readFileSync(agentprofilespath))
        if (agentProfiles[agentProfileName]) {
            let agentProfile = agentProfiles[agentProfileName]

            const sign = crypto.createSign('SHA256')
            sign.write(cidClaim)
            sign.end()
            const signature = sign.sign(agentProfile["private-key"], 'hex')

            let assertionGlobal: assertion = {
                "format": "assertion",
                "agent": agentProfile["public-key"],
                "claim": { "/": cidClaim },
                "signature": signature
            }

            let cidAssertion = await ipfsAddObj(assertionGlobal)
            //publishedAssertions.push(cidAssertion)

            return cidAssertion
        }
        else throw new Error("ERROR: given profile name does not exist")
    } catch (error) {
        console.error(error);
        process.exit(1)
    }
}

// also needs more checking
let publishGeneric = async (element: {}, input: {}) => {
    let cid = ""
    let actualElement = element["element"]
    if (element["format"] == "context")
        cid = await publishContext(actualElement)
    else if (element["format"] == "annotated-context")
        cid = await publishAnnotatedContext(actualElement)
    else if (element["format"] == "formula")
        cid = await publishFormula(actualElement, input)
    else if (element["format"] == "annotated-formula")
        cid = await publishAnnotatedFormula(actualElement, input)
    else if (element["format"] == "sequent")
        cid = await publishSequent(actualElement, input)
    else if (element["format"] == "annotated-sequent")
        cid = await publishAnnotatedSequent(actualElement, input)
    else if (element["format"] == "production")
        cid = await publishProduction(actualElement, input)
    else if (element["format"] == "annotated-production")
        cid = await publishAnnotatedProduction(actualElement, input)
    else if (element["format"] == "assertion")
        cid = await publishAssertion(actualElement, input)
    return cid
}

let publishCollection = async (name: string, elements: [], input: {}) => {
    let elementsLinks = []
    for (let element of elements) {
        let cidElement = await publishGeneric(element, input)
        elementsLinks.push({ "/": cidElement })
    }

    let collectionGlobal = {
        "format": "collection",
        "name": name,
        "elements": elementsLinks
    }

    let cidCollection = await ipfsAddObj(collectionGlobal)

    return cidCollection
}

export = { publishCommand }

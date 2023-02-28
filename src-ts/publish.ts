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

        // publish declarations first (because they need to be linked in formulas)
        // consider an entry in "declarations" (like "fib": ..) in the input file to have two possible values: either [string] or ["ipld:ciddeclarationobjcet"]
        // publish according to "format" in the given input file, first we consider the "sequence" format 

        // considering the "format" attribute to be fixed (exists all the time) for all the possible input-formats (considering that input-formats might differ according to format of published objects)
        let format = input["format"]
        let cid = ""
        // maybe do some checking here of the given file structure if correct? 

        if (format == "declaration") {
            // only one declaration object exists in this case
            //let name = Object.keys(input["declarations"])[0]
            let declarationObj = input["declaration"]
            cid = await publishDeclaration(declarationObj)
            console.log("published declaration object of cid: " + cid)
        }
        else if (format == "annotated-declaration") {
            let annotatedDeclarationObj = input["annotated-declaration"]
            cid = await publishAnnotatedDeclaration(annotatedDeclarationObj)
            console.log("published annotated declaration object of cid: " + cid)
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
let publishDeclaration = async (declarationObj: {}) => {
    // consider an entry in "declaration" (like "fib": ..) in the input file to have two possible values: either [string] or "ipld:ciddeclarationobject"
    // use ipfsAddObj to add the declarations end object

    let language = declarationObj["language"]
    let content = declarationObj["content"]

    let cidLanguage = "", cidContent = "", cidDeclaration = ""

    if (typeof language == "string" && language.startsWith("ipld:"))
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
            process.exit(0)
        }
    }

    if (typeof content == "string" && content.startsWith("ipld:"))
        cidContent = content.split(":")[1]
    else cidContent = await ipfsAddObj(content)

    let declarationGlobal: declaration = {
        "format": "declaration",
        "language": { "/": cidLanguage },
        "content": { "/": cidContent }
    }

    let cidObj = await ipfsAddObj(declarationGlobal)
    //publishedDeclarations[name] = cidObj
    cidDeclaration = cidObj

    return cidDeclaration
}

// change into annotated  -> what is annotations"?
let publishAnnotatedDeclaration = async (annotatedDeclarationObj: {}) => {
    let declaration = annotatedDeclarationObj["declaration"]
    let annotation = annotatedDeclarationObj["annotation"]

    let cidDeclaration = "", cidAnnotation = ""

    if (typeof declaration == "string" && declaration.startsWith("ipld:"))
        cidDeclaration = declaration.split(":")[1]
    else {
        cidDeclaration = await publishDeclaration(declaration)
    }

    if (typeof annotation == "string" && annotation.startsWith("ipld:"))
        cidAnnotation = annotation.split(":")[1]
    else {
        cidAnnotation = await ipfsAddObj(annotation)
    }


    let annotatedDeclarationGlobal: annotatedDeclaration = {
        "format": "annotated-declaration",
        "declaration": { "/": cidDeclaration },
        "annotation": { "/": cidAnnotation }
    }

    let cid = await ipfsAddObj(annotatedDeclarationGlobal)

    //publishedNamedFormulas[name] = cid

    return cid
}

let publishFormula = async (formulaObj: {}, input: {}) => {
    let language = formulaObj["language"]
    let content = formulaObj["content"]
    let cidLanguage = "", cidContent = ""

    if (typeof language == "string" && language.startsWith("ipld:"))
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
            process.exit(0)
        }
    }

    if (typeof content == "string" && content.startsWith("ipld:"))
        cidContent = content.split(":")[1]
    else cidContent = await ipfsAddObj(content)

    let declarationNames = formulaObj["declarations"]
    let declarationLinks = [] as ipldLink[]

    for (let declarationName of declarationNames) {
        let declarationCid = ""
        if (declarationName.startsWith("ipld:"))
            declarationCid = declarationName.split(":")[1]
        else declarationCid = await publishDeclaration(input["declarations"][declarationName])
        declarationLinks.push({ "/": declarationCid })
    }


    let formulaGlobal: formula = {
        "format": "formula",
        "language": { "/": cidLanguage },
        "content": { "/": cidContent },
        "declarations": declarationLinks
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

    if (typeof formula == "string" && formula.startsWith("ipld:"))
        cidFormula = formula.split(":")[1]
    else {
        cidFormula = await publishFormula(formula, input)
    }

    if (typeof annotation == "string" && annotation.startsWith("ipld:"))
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

    if (conclusionName.startsWith("ipld:"))
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
        if (dependency.startsWith("ipld:")) {
            // assuming the cids in "lemmas" should refer to a "formula" object
            //(if we remove the .thc generation and replace it with generation of the output format.json file produced by w3proof-dispatch get)
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

    if (typeof sequent == "string" && sequent.startsWith("ipld:"))
        cidSequent = sequent.split(":")[1]
    else {
        cidSequent = await publishSequent(sequent, input)
    }

    if (typeof annotation == "string" && annotation.startsWith("ipld:"))
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
    let tool = productionObj["tool"]
    let sequent = productionObj["sequent"]
    let cidTool = "", cidSequent = ""

    // add spec and checks later that sequent is "ipld:.." or {..}
    if (typeof sequent == "string" && sequent.startsWith("ipld:"))
        cidSequent = sequent.split(":")[1]
    else {
        cidSequent = await publishSequent(sequent, input)
    }

    if (typeof tool == "string" && tool.startsWith("ipld:"))
        cidTool = tool.split(":")[1]
    else {
        try {
            let toolProfiles = JSON.parse(fs.readFileSync(toolprofilespath))
            if (toolProfiles[tool]) { // assuming the cids in toolProfiles are of "format"="tool" --> check later
                cidTool = toolProfiles[tool]["tool"]
            }
            else throw new Error("ERROR: given toolProfile name does not exist")
        } catch (error) {
            console.error(error);
            process.exit(0)
        }
    }

    let productionGlobal: production = {
        "format": "production",
        "sequent": { "/": cidSequent },
        "tool": { "/": cidTool }
    }

    let cidProduction = await ipfsAddObj(productionGlobal)

    return cidProduction
}

let publishAnnotatedProduction = async (annotatedProductionObj: {}, input: {}) => {
    let production = annotatedProductionObj["production"]
    let annotation = annotatedProductionObj["annotation"]

    let cidProduction = "", cidAnnotation = ""

    if (typeof production == "string" && production.startsWith("ipld:"))
        cidProduction = production.split(":")[1]
    else {
        cidProduction = await publishProduction(production, input)
    }

    if (typeof annotation == "string" && annotation.startsWith("ipld:"))
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
    let statement = assertionObj["statement"]
    let cidStatement = ""

    if (typeof statement == "string" && statement.startsWith("ipld:"))
        cidStatement = statement.split(":")[1]
    else {
        // should do additional checking
        if (statement["format"] == "production") {
            cidStatement = await publishProduction(statement["production"], input)
        }
        else if (statement["format"] == "annotated-production") {
            let production = statement["production"]
            let annotation = statement["annotation"]

            let annotatedProductionObj = {
                "production": production,
                "annotation": annotation
            }
            cidStatement = await publishAnnotatedProduction(annotatedProductionObj, input)
        }
    }

    try {
        let agentProfiles = JSON.parse(fs.readFileSync(agentprofilespath))
        if (agentProfiles[agentProfileName]) {
            let agentProfile = agentProfiles[agentProfileName]

            const sign = crypto.createSign('SHA256')
            sign.write(cidStatement)
            sign.end()
            const signature = sign.sign(agentProfile["private-key"], 'hex')

            let assertionGlobal: assertion = {
                "format": "assertion",
                "agent": agentProfile["public-key"],
                "statement": { "/": cidStatement },
                "signature": signature
            }

            let cidAssertion = await ipfsAddObj(assertionGlobal)
            //publishedAssertions.push(cidAssertion)

            return cidAssertion
        }
        else throw new Error("ERROR: given profile name does not exist")
    } catch (error) {
        console.error(error);
        process.exit(0)
    }
}

// also needs more checking
let publishGeneric = async (element: {}, input: {}) => {
    let cid = ""
    let actualElement = element["element"]
    if (element["format"] == "declaration")
        cid = await publishDeclaration(actualElement)
    else if (element["format"] == "annotated-declaration")
        cid = await publishAnnotatedDeclaration(actualElement)
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
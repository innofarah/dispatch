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

import fs from "node:fs/promises";
import { damfResolve, ipfsAddObj, ipfsCommit,
         publishDAGToCloud } from "./utilities.js";
import { validateInput } from "./validate_input.js";
import { publishFormula, getLanguageCid, publishGeneric } from "./publish.js";
// later move getLanguageCid to 'utilities'?


// for now, consider input to be local, later treat cids of corresponding types
// [TODO] consider multiple argument parameters (files, cids)
export async function apply (abstractionFile: string, argumentFile: string, target: target) {
    let abstraction = await fs.readFile(abstractionFile, { encoding: "utf-8" });
    abstraction = JSON.parse(abstraction);
    // add input-validation later (abstraction, etc....)
    let argument = await fs.readFile(argumentFile, { encoding: "utf-8" });
    argument = JSON.parse(argument);
    // add input-validation later

    // later we would want to compare cids (when we have cid input to apply); but for now assuming the key for language locally means the same cid then keep it like this for now

    let args = []
    args.push(argument) // for now, testing only one param/arg, but change later [TODO]

    let params = abstraction["parameters"]

    // error if args don't correspond to all params in count
    if (params.length != args.length) {
        console.error("Non-matching params/args count!")
    }

    for (let i = 0; i < params.length; i++) {
        if (abstraction["formula"]["language"] != args[i]["language"] ||
            params[i]["fingerprint"] != args[i]["fingerprint"]) {
            console.error("Non-matching language or fingerprint for param/arg " + i)
        }
    }

    // once dispatch-apply sees "abstraction" as format, it publishes 2 assertions:
    // the formula |- abstraction but by mode:abella/agent:indicatedininput,
    // and after applying: abstraction, args |- inst-formula by mode:dispatch-or-damf-apply/agent: ?
    // (so this input format is different from the initial "assertion" input-to-dispatch; it seems like this now, because the difference with assertion format input is that the mode is responsible to specify everything; deps conclusion etc.. dispatch has nothing to do with it; but with dispatch-apply it's different?)

    // abstraction object construction
    //console.log("reached here@@")
    // [TODO] later, consider this "formula" to possibly be already a damf:cid
    const cidFormula = await publishFormula(abstraction["formula"], abstraction)
    const cidAbstractedFormula = await publishFormula(abstraction["abstracted-formula"], abstraction)
    
    const abstractionGlobal = {
        "format": "abstraction",
        "formula": { "/": cidAbstractedFormula },
        "parameters": abstraction["parameters"] // we might want to make this into a separate cid, but keep it this way for now.
    }
    const cidAbstraction = await ipfsAddObj(abstractionGlobal) // later, we should consider this as possible direct input [TODO], same for argscids constructed below

    // formula |- abstraction assertion construction:
    let inputToPublish = {
        "format": "assertion",
        "agent": abstraction["agent"],
        "claim": {
            "format": "annotated-production",
            "production": {
                "mode": abstraction["mode"],
                "sequent": {
                    "conclusion": "damf:" + cidAbstraction,
                    "dependencies": [ "damf:" + cidFormula ]
                }
            },
            "annotation": abstraction["annotation"]
        }
    }

    let cidAbsAssertion = await publishGeneric(inputToPublish, inputToPublish)

    
    // !!! What to do about Type tech ... in the dep of this assertion;? does it matter if it stays in the context normally in both dep and conc? (because dispatch is not aware initially how to remove it?) --> for now, let's keep it, and we think later whether we want to remove it from the conclusion somehow.. (because it doesn't matter,in principle, if it stays in the context of the instantiated-formula, because presumably this token is no longer used in the instantiatedformula because we replaced it with cidArgs (for all the args.))
    // !!!! again!, what to do about Type tech ....? because it was replaced by argCID, which maybe we don't want because also Define refl_t would be replaced by argCID


    // arguments construction [TODO] consider direct cids as input
    const cidLanguage = await getLanguageCid(abstraction["formula"]["language"]) // get it once, considering all args to be of same language (which is the language of abstraction's formula), otherwise, there would have been an error in the initial tests.

    let argsCids = []
    for (let i = 0; i < args.length; i++) {
        argsCids.push(await ipfsAddObj({
            "format": "argument",
            "language": { "/": cidLanguage },
            "identifier": args[i]["identifier"],
            "fingerprint": args[i]["fingerprint"],
            "context": { "/": await ipfsAddObj({ // for now, we consider one "context" in argument
                "format": "context",
                "language": { "/": cidLanguage },
                "content": args[i]["context"]
            }) }
        }))
    }

    // application; instantiated-formula construction
    // once of the important assumptions: each paramId is a unique token in the abstraction's formula

    abstraction = await fs.readFile(abstractionFile, { encoding: "utf-8" });
    abstraction = JSON.parse(abstraction);
    //console.log(abstraction)

    // initialization (values to work on; replace; add..)
    let instantiatedFormula = {
        "format": "formula",
        "language": abstraction["abstracted-formula"]["language"], // publishFormula would getLanguageCid
        "content": abstraction["abstracted-formula"]["content"],
        "context": abstraction["abstracted-formula"]["context"],
        "contexts": abstraction["contexts"]
    }

    for (let i = 0; i < abstraction["parameters"].length; i++){
        // replace the formula content for each parameter
        let tmpMatch = " " + abstraction["parameters"][i]["identifier"] + " "
        instantiatedFormula["content"] = instantiatedFormula["content"].replaceAll(tmpMatch, " " + argsCids[i] + " ")
        //replaceAll(tmpMatch, " " + args[i]["identifier"] + " ")

        // also replace the formula's context (which is array of contexts as defined initially) for each parameter
        for (let j = 0; j < instantiatedFormula["context"].length; j++) {
            // considering the inner structure of a "context" invisible to (not understandable by) dispatch; we consider dispatch-apply to deal with the whole thing as one string and replace
            let stringified = JSON.stringify(instantiatedFormula["contexts"][instantiatedFormula["context"][j]]["content"])
            //console.log(stringified)
            instantiatedFormula["contexts"][instantiatedFormula["context"][j]]["content"] = JSON.parse(stringified.replaceAll(tmpMatch, " " + argsCids[i] + " "))
        }
    }

    for (let i = 0; i < args.length; i++) {
        let tmpMatch = " " + args[i]["identifier"] + " "
        // now, just assuming that the argument has only one "context" obj
        let replacedContext = JSON.stringify(argument["context"]).replaceAll(tmpMatch, " " + argsCids[i] + " ")
        replacedContext = JSON.parse(replacedContext)
        instantiatedFormula["context"].push(argsCids[i])
        instantiatedFormula["contexts"][argsCids[i]] = {
            "language": args[i]["language"],
            "content": replacedContext
        }
    }

    const cidInstantiatedFormula = await publishFormula(instantiatedFormula, instantiatedFormula)
    
    // final assertion construction: abstraction, arg1, arg2, ... |- instantiated-formula

    let dependencies = ["damf:" + cidAbstraction]
    for (let i = 0; i < argsCids.length; i++) {
        dependencies.push("damf:" + argsCids[i])
    }
    console.log(dependencies)
    inputToPublish = {
        "format": "assertion",
        "agent": abstraction["agent"],
        "claim": {
            "format": "annotated-production",
            "production": {
                "mode": "damf-dispatch-apply",
                "sequent": {
                    "conclusion": "damf:" + cidInstantiatedFormula,
                    "dependencies": dependencies
                }
            },
            "annotation": abstraction["annotation"]
        }
    }

    let cidFinalAssertion = await publishGeneric(inputToPublish, inputToPublish)

    await ipfsCommit()

    console.log("dispatch-apply has published 2 assertions:")
    console.log("formula |- abstraction of cid: " + cidAbsAssertion)
    console.log("abstraction, arg1, arg2, .. |- formula of cid: " + cidFinalAssertion)
    
    //console.log(instantiatedFormula["content"])
    //console.log(instantiatedFormula["contexts"])

    // in the end, pass inputToPublish to publicGeneric to publish the assertion as above also
}
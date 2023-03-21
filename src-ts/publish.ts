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
import crypto from "crypto";

import iv from "./initial-vals.js";
import { damfResolve, ipfsAddObj, publishDAGToCloud } from "./utilities.js";

let readLanguages = {};
let readTools = {};
let readAgents = {};

export async function publishCommand(inputPath: string, target: target) {
    const data = await fs.readFile(inputPath, { encoding: "utf-8" });
    const input = JSON.parse(data);

    // considering the "format" attribute to be fixed (exists all the time) for
    // all the possible input-formats (considering that input-formats might
    // differ according to format of published objects)
    const format = input["format"];

    // [TODO] check here if input-format is valid
    const cid =
        (format !== "collection" ? null :
            await publishCollection(input, input)) ??
        await publishGeneric(input, input);
    if (!cid)
        throw new Error(`publishCommand(): failed to publish ${ format } object`);
    if (target === "cloud")
        await publishDAGToCloud(cid);

    console.log(`Published DAMF ${ format } object to ${ target } with cid: ${ cid }`);
}

type Pub = (obj: any, input: any) => Promise<string>;

function publishAnnotated(format: string, publish: Pub): Pub {
    return async (obj: any, input: any) => {
        const cidContent =
            await damfResolve(obj[format]) ??
            await publish(obj[format], input);
        const annotation = obj["annotation"];
        const global = {
            "format": "annotated-" + format,
            "annotation": annotation
        };
        global[format] = { "/": cidContent };
        return await ipfsAddObj(global);
    };
}

async function getLanguageCid(language: string) {
    const cid: string =
        await damfResolve(language) ??
        readLanguages[language] ??
        (await iv.languages.read(language))["language"];
    readLanguages[language] = cid;
    return cid;
}

// [TODO] should add more safety checks (for all the publishing functions)

async function publishContext(formulaObj: any) {
    const cidLanguage = await getLanguageCid(formulaObj["language"]);
    const content = formulaObj["content"];

    const contextGlobal: context = {
        "format": "context",
        "language": { "/": cidLanguage },
        "content": content,
    };

    return await ipfsAddObj(contextGlobal);
}

const publishAnnotatedContext = publishAnnotated("context", publishContext);

function getContextCid(ctx: any) {
    if (typeof ctx === "object" && "damf" in ctx)
        return ctx["damf"];
    return null;
}

const publishFormula: Pub = async (formulaObj, input) => {
    const cidLanguage = await getLanguageCid(formulaObj["language"]);
    const content = await formulaObj["content"];

    const contextLinks = [] as ipldLink[];
    for (const context of formulaObj["context"]) {
        const cidContext: string =
            getContextCid(input["contexts"][context]) ??
            await damfResolve(context) ??
            await publishContext(input["contexts"][context]);
        input["contexts"][context] = { "damf": cidContext };
        contextLinks.push({ "/": cidContext });
    }

    const formulaGlobal: formula = {
        "format": "formula",
        "language": { "/": cidLanguage },
        "content": content,
        "context": contextLinks
    };

    return await ipfsAddObj(formulaGlobal);
}

const publishAnnotatedFormula = publishAnnotated("formula", publishFormula);

const publishSequent: Pub = async (sequentObj, input) => {
    const conclusionName = sequentObj["conclusion"];

    const cidConclusion =
        await damfResolve(conclusionName) ??
        await publishFormula(input["formulas"][conclusionName], input);

    const dependenciesIpfs = [] as ipldLink[];
    for (const dependency of sequentObj["dependencies"]) {
        const cidDependency =
            await damfResolve(dependency) ??
            await publishFormula(input["formulas"][dependency], input);
        dependenciesIpfs.push({ "/": cidDependency })
    }

    const sequentGlobal = {
        "format": "sequent",
        "dependencies": dependenciesIpfs,
        "conclusion": { "/": cidConclusion }
    };

    return await ipfsAddObj(sequentGlobal);
}

const publishAnnotatedSequent = publishAnnotated("sequent", publishSequent);

const publishProduction: Pub = async (productionObj, input) => {
    const sequentObj = productionObj["sequent"];
    const cidSequent =
        await damfResolve(sequentObj) ??
        await publishSequent(sequentObj, input);

    const mode = productionObj["mode"];
    // these are just the CURRENTLY known production modes to dispatch
    // but later, maybe this would be extended : the important point is
    //that tools that publish and get global objects have some expected modes,
    //according to some specification (maybe standard maybe more)
    // OR maybe make it more general? --> dispatch doesn't check restricted mode values?
    const modeValue: toolLink | null | "axiom" | "conjecture" =
        (mode == null || mode == "axiom" || mode == "conjecture") ? mode :
        await (async () => {
            const cid =
                readTools[mode] ??
                await damfResolve(mode) ??
                (await iv.toolProfiles.read(mode))["tool"];
            readTools[mode] = cid;
            return { "/": cid };
        })();

    const productionGlobal: production = {
        "format": "production",
        "sequent": { "/": cidSequent },
        "mode": modeValue
    };

    return await ipfsAddObj(productionGlobal);
}

const publishAnnotatedProduction = publishAnnotated("production", publishProduction);

const publishAssertion: Pub = async (assertionObj, input) => {
    const claim = assertionObj["claim"];
    if (!claim)
        throw new Error(`publishAssertion(): claim not found`);
    const cidClaim =
        await damfResolve(claim) ??
        // refer to either production or annotatedproduction.
        (claim["format"] !== "production" ? null :
            await publishProduction(claim, input)) ??
        (claim["format"] !== "annotated-production" ? null :
            await publishAnnotatedProduction(claim, input));
    if (!cidClaim)
        throw new Error(`publishAssertion(): invalid format ${ claim["format"] }`);

    const agentProfileName = assertionObj["agent"]
    const agentProfile =
        readAgents[agentProfileName] ??
        await iv.agentProfiles.read(agentProfileName);

    const priKey = crypto.createPrivateKey(agentProfile["private-key"]);
    const signature = crypto.sign(null, Buffer.from(cidClaim), priKey).toString("hex");

    const assertionGlobal: assertion = {
        "format": "assertion",
        "agent": agentProfile["public-key"],
        "claim": { "/": cidClaim },
        "signature": signature
    };

    return await ipfsAddObj(assertionGlobal);
}

// also needs more checking
const publishGeneric: Pub = async (element, input) => {
    const format = element["format"];
    const actualElement = element["element"];
    const cid =
        (format !== "context" ? null :
            await publishContext(actualElement)) ??
        (format !== "annotated-context" ? null :
            await publishAnnotatedContext(actualElement, input)) ??
        (format !== "formula" ? null :
            await publishFormula(actualElement, input)) ??
        (format !== "annotated-formula" ? null :
            await publishAnnotatedFormula(actualElement, input)) ??
        (format !== "sequent" ? null :
            await publishSequent(actualElement, input)) ??
        (format !== "annotated-sequent" ? null :
            await publishAnnotatedSequent(actualElement, input)) ??
        (format !== "production" ? null :
            await publishProduction(actualElement, input)) ??
        (format !== "annotated-production" ? null :
            await publishAnnotatedProduction(actualElement, input)) ??
        (format !== "assertion" ? null :
            await publishAssertion(actualElement, input));
    if (!cid)
        throw new Error(`publishGeneric(): failed to publish ${ format } object`);
    return cid
}

const publishCollection: Pub = async (obj, input) => {
    const name = obj["name"];

    const elemLinks = [];
    for (const elemObj of obj["elements"]) {
        const cid = await publishGeneric(elemObj, input);
        elemLinks.push({ "/": cid });
    }

    const collectionGlobal = {
        "format": "collection",
        "name": name,
        "elements": elemLinks
    };

    return await ipfsAddObj(collectionGlobal);
}

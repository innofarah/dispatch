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

import { isValidCid } from "./utilities.js";

let verbosity: number = 0;
export function setVerbosity(v: number) { verbosity = v; }

export class VError extends Error { }

// function debug(path: string, what: string) {
//     console.error(`DEBUG: validate${ what }("${ path }")`);
// }

function diagnose(obj: any, path: string,
                  msg?: string | (() => string)) {
    let msgReal = "Validation failed";
    if (verbosity > 0) {
        msgReal = typeof msg === "string" ? msg : msg();
        console.error(`DAMF validation error: ${ msgReal }`);
        if (verbosity > 1 && path !== "")
            console.error(`  path: ${ path }`);
        if (verbosity > 2)
            console.error(`  object: ${ JSON.stringify(obj, null, 2) }`);
    }
    throw new VError(msgReal);
}

function validatingGet(obj: any, path: string, key: string,
                       expectedType?: string) {
    if (!(key in obj))
        diagnose(obj, path, `lacks a(n) "${ key }" key`);
    const thing = obj[key];
    if (expectedType && typeof thing !== expectedType)
        diagnose(thing, `${ path }.${ key }`, `not a ${ expectedType }`);
    return thing;
}

// function validateIpldLink(obj: any, path: string) {
//     const linkTarget: string = validatingGet(obj, path, "/");
//     if (typeof linkTarget !== "string")
//         diagnose(obj, `${ path }./`, "not a CID");
// }

function validateLanguage(obj: any, path: string) {
    // const language =
    validatingGet(obj, path, "language", "object");
    // validateIpldLink(language, path + ".language");
}

function validateTool(obj: any, path: string) {
    // const tool =
    validatingGet(obj, path, "tool", "object");
    // validateIpldLink(tool, path + ".tool");
}

function validateDamfLink(obj: any, path: string) {
    if (typeof obj !== "string")
        diagnose(obj, path, "not a DAMF link");
    if (obj.startsWith("damf:") && !isValidCid(obj.slice(5)))
        diagnose(obj, path, "invalid CID in DAMF link");
}

type Locals = {
    contexts: any,
    formulas: any,
};

function validateContext(obj: any, path: string) {
    if (obj["done"]) return;
    // debug(path, "Context");
    const language = validatingGet(obj, path, "language");
    validateDamfLink(language, path + ".language");
    const content: any[] = validatingGet(obj, path, "content");
    if (!(content instanceof Array))
        diagnose(obj, path, "not an array");
    content.forEach((elem, i) => {
        if (typeof elem !== "string")
            diagnose(content, `${ path }.content.${ i }`,
                     "not a string");
    });
    obj["done"] = true;
}

function validateFormula(obj: any, path: string, locals: Locals) {
    if (obj["done"]) return;
    // debug(path, "Formula");
    const language = validatingGet(obj, path, "language");
    validateDamfLink(language, path + ".language");
    validatingGet(obj, path, "content", "string");
    // [TODO] validate content in some way?
    const context: string[] = validatingGet(obj, path, "context");
    if (!(context instanceof Array))
        diagnose(context, path + ".context", "not an array");
    context.forEach((elem, i) => {
        if (typeof elem !== "string")
            diagnose(elem, `${ path }.context.${ i }`, "not a string");
        if (elem.startsWith("damf:")) {
            // [TODO] validate referenced DAMF object
        } else {
            if (!(elem in locals.contexts))
                diagnose(elem, `${ path }.context.${ i }`, "unknown local context");
            const localCx = locals.contexts[elem];
            validateContext(localCx, `${ path }.contexts.${ elem }`);
        }
    });
    obj["done"] = true;
}

function validateSequent(obj: any, path: string, locals: Locals) {
    // debug(path, "Sequent");
    const conclusion: string = validatingGet(obj, path, "conclusion", "string");
    if (conclusion.startsWith("damf:")) {
        // [TODO] validate referenced DAMF object
    } else {
        const localF = locals.formulas[conclusion];
        if (!localF)
            diagnose(conclusion, `${ path }.conclusion`, "unknown local formula");
        validateFormula(localF, `${ path }.formulas.${ conclusion }`, locals);
    }
    const dependencies: string[] = validatingGet(obj, path, "dependencies");
    if (!(dependencies instanceof Array))
        diagnose(dependencies, `${ path }.dependencies`, "not an array");
    dependencies.forEach((dep, i) => {
        if (typeof dep !== "string")
            diagnose(dep, `${ path }.dependencies.${ i }`, "not a string");
        if (dep.startsWith("damf:")) {
            // [TODO] validate referenced DAMF object
        } else {
            const localF = locals.formulas[dep];
            if (!localF)
                diagnose(dep, `${ path }.dependencies.${ i }`, "unknown local formula");
            validateFormula(localF, `${ path }.formulas.${ dep }`, locals);
        }
    });
}

function validateProduction(obj: any, path: string, locals: Locals) {
    // debug(path, "Production");
    const mode = validatingGet(obj, path, "mode");
    if (mode === null) { /* do nothing */ }
    else if (typeof mode === "string") {
        switch (mode) {
            case "axiom":
            case "conjecture":
                // all ok
                break;
            default:
                if (!mode.startsWith("damf:")) {
                    // [TODO] check if this is a valid tool name
                }
        }
    } else
        diagnose(mode, `${ path }.mode`, "not null or a string");
    if (!("sequent" in obj))
        diagnose(obj, path, 'lacks a "sequent" key');
    const sequent = validatingGet(obj, path, "sequent");
    validateSequent(sequent, `${ path }.sequent`, locals);
}

function validateAnnotated(innerFormat: string,
                           validateInner: (obj: any, path: string, locals: Locals) => void) {
    return (obj: any, path: string, locals: Locals) => {
        // debug(path, "Annotated" + innerFormat.slice(0, 1).toUpperCase() + innerFormat.slice(1));
        const innerObj = validatingGet(obj, path, innerFormat);
        validateInner(innerObj, `${ path }.${ innerFormat }`, locals);
    };
}

const validateAnnotatedProduction = validateAnnotated("production", validateProduction);

function validateAssertion(obj: any, path: string, locals: Locals) {
    // debug(path, "Assertion");
    validatingGet(obj, path, "agent", "string");
    // validatingGet(obj, path, "signature", "string"); // not in input objects
    const claim: any = validatingGet(obj, path, "claim");
    const claimPath = `${ path }.claim`;
    if (typeof claim !== "object")
        diagnose(claim, claimPath, "not an object");
    const claimFormat: string = validatingGet(claim, claimPath, "format", "string");
    if (claimFormat === "production")
        validateProduction(claim, claimPath, locals);
    else if (claimFormat === "annotated-production")
        validateAnnotatedProduction(claim, claimPath, locals);
    else diagnose(claim, claimPath, `unknown format: ${ claimFormat }`);
}

const validators = {
    language: validateLanguage,
    tool: validateTool,
    context: validateContext,
    "annotated-context": validateAnnotated("context", validateContext),
    formula: validateFormula,
    "annotated-formula": validateAnnotated("formula", validateFormula),
    sequent: validateSequent,
    "annotated-sequent": validateAnnotated("sequent", validateSequent),
    production: validateProduction,
    "annotated-production": validateAnnotatedProduction,
    assertion: validateAssertion,
};

function validateCollection(obj: any, path: string, locals: Locals) {
    // debug(path, "Collection");
    // [TODO] check if all collections have a "name" key
    validatingGet(obj, path, "name", "string");
    const elements: any[] = validatingGet(obj, path, "elements");
    if (!(elements instanceof Array))
        diagnose(elements, `${ path }.elements`, "not an array");
    elements.forEach((elem, i) => {
        const elemPath = `${ path }.elements.${ i }`;
        if (typeof elem !== "object")
            diagnose(elem, elemPath, "not an object");
        const elemFormat: string = validatingGet(elem, elemPath, "format", "string");
        if (!(elemFormat in validators))
            diagnose(elem, elemPath, `unknown format: ${ elemFormat }`);
        const elemObj: any = validatingGet(elem, elemPath, "element", "object");
        validators[elemFormat](elemObj, `${ elemPath }.element`, locals);
    });
}

validators["collection"] = validateCollection;

export function validateInput(obj: any, verbosity?: number) {
    if (verbosity) setVerbosity(verbosity);
    const path = "";
    if (typeof obj !== "object")
        diagnose(obj, path, "not an object");
    const format: string = validatingGet(obj, path, "format", "string");
    if (!(format in validators))
        diagnose(obj, path, `unknown format: ${ format }`);
    const locals: Locals = {
        formulas: {...(obj["formulas"] ?? {})},
        contexts: {...(obj["contexts"] ?? {})},
    };
    validators[format](obj, path, locals);
}

export default { setVerbosity, VError, validateInput };

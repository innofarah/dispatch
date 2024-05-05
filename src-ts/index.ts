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

import { program } from 'commander';
import { publishCommand } from './publish.js';
import { createAgent, createTool, createLanguage, setw3email, setw3space, setgateway, listconfig } from './config-related.js';
import { getCommand } from './get.js';
//import { trustwhoCommand } from './trusting';
//import { whatISay, doISay } from './trusting-old';
import { lookup } from './lookup.js';
import { publishDAGToCloud } from './utilities.js';

program
    .command('create-agent')
    .description('generate an agent profile with a PPK pair.\n')
    .argument('<agent-profile-name>', 'name for the agent profile.\n')
    .action(createAgent);
program
    .command('create-tool')
    .description('add a new tool profile from a new or existing ("tool" format cid) tool description.\n')
    .argument('<tool-profile-name>', 'name for the tool profile.\n')
    .argument('<input-type>', 'type for your input: takes "file" for a text input, "json" or "cid".\n')
    .argument('<input>', 'the input for the created tool profile. A filepath or cid.\n')
    .action(createTool);
program
    .command('create-language')
    .description('add a new language profile from a new or existing ("language" format cid) language description.\n')
    .argument('<language-profile-name>', 'name for the language profule.\n')
    .argument('<input-type>', 'type for your input: takes "file" for a text input, "json" or "cid".\n')
    .argument('<input>', 'the input for the created language record. A filepath or cid.\n')
    .action(createLanguage);
/*program
    .command('set-web3token')
    .description('set your web3.storage api token.\n')
    .argument('<token>', 'to use for publishing through the web3.storage api.\n'
    + 'you can create one at web3.storage website.\n')
    .action(setweb3token);*/
program
    .command('set-w3-email')
    .description('set your web3.storage account login email.\n')
    .argument('<email>', 'to use to access your web3.storage account and upload data.\n')
    .action(setw3email)
program
    .command('set-w3-space')
    .description('set your web3.storage space key.\n')
    .argument('<key>', 'the key for the desired console.web3.storage space for uploading data.\n')
    .action(setw3space)
program
    .command('set-gateway')
    .description('set your gateway.\n')
    .argument('<gateway>', 'preferred default ipfs gateway.\n'
    + 'the default is set to "https://dweb.link".\n')
    .action(setgateway);
/* program
    .command('trust-agent')
    .description('add an agent to your allow list.\n')
    .argument('<agent>', 'public key of the agent (fingerprint)\n')
    .action(trustagent); */
program
    .command('list-config')
    .description('list config params.\n')
    .action(listconfig);
program
    .command('publish')
    .description('publish one of the standard format inputs for dispatch.\n')
    .argument('<input-path>', 'path for the input file\n')
    .argument('<target>', '"local" to pin only on local ipfs node, "cloud to pin on web3.storage" (web3token should be specified in this case)')
    .action(publishCommand);
program
    .command('get')
    .description('construct standard format output-from-dispatch/input-to-prover(consumer) file.\n')
    .argument('<CID>', 'ipfs content identifier for the structure to get.\n')
    .argument('<directory-path>', 'directory-path to output the result in, starting from directory of execution.\n')
    .action(getCommand);
/* program
    .command('trustwho')
    .description('list agents to trust per assertion, and axioms')
    .argument('<input>', 'path of file containing a list of CIDs; expected formats: assertion, sequent, sequence')
    //.option('--per-assertion | --per-sequent | --per-agent' ) --deep --shallow
    .action(trustwhoCommand);
*/
/* program
    .command('whatisay')
    .description('filter given list of cids based on your allow list')
    .argument('<input>', 'path of file containing a list of CIDs; expected formats: assertion, sequent, sequence')
    .action(whatISay);
program
    .command('doisay')
    .description('check if a theorem is provable based on your allow list and a given list of cids')
    .argument('<thmCID', 'the cid of the target theorem (formula format or named formula? check)')
    .argument('<input>', 'path of file containing a list of CIDs; expected formats: assertion, sequent, sequence')
    .action(doISay); */
program
    .command('lookup')
    .description('construct trust results for a given formula starting from a list of assertions.\n')
    .argument('<formula-CID>', 'the target formula cid.\n')
    .argument('<input>', 'path of the searchable file - containing a list of assertion cids: ["cid1", "cid2", ..].\n')
    .argument('<directory-path>', 'directory-path to output the result in, starting from directory of execution.\n')
    .action(lookup);
program
    .command('publish-to-cloud')
    .description('publish dag to cloud starting from a given cid.\n')
    .argument('<CID>', 'the root dag cid.\n')
    .action(publishDAGToCloud);
/*
program
    .command('get')
    .description('construct standard format .json file according to retrieved object type.\n')
    .argument('<CID>', 'ipfs content identifier for the structure to get.\n')
    .option('-fp, --filepath <string>', 'path of file to write the constructed output in. Example: output/myfile.json.\n            default value is CID.json in the current directory.')
    .action(getCommand);
*/

try {
    program.parse();
} catch (error) {
    console.error(`ERROR: ${ error }`);
    process.exit(1);
}

#! /usr/bin/env node

const { program } = require('commander')

const { publishCommand } = require('./publish.js')
const { setup, keygen, setweb3token, setgateway, trustagent, listconfig } = require('./config-related.js')
const { getCommand } = require('./get.js')
//const { trustwhoCommand } = require('./trusting.js')
//const { whatISay, doISay } = require('./trusting-old.js')
const { lookup } = require('./lookup.js')

setup()

program
    .command('keygen')
    .description('generate a PPK pair.\n')
    .argument('<profile-name>', 'name for the key pair.\n')
    .action(keygen)
program
    .command('set-web3token')
    .description('set your web3.storage api token.\n')
    .argument('<token>', 'to use for publishing through the web3.storage api.\n' 
    + 'you can create one at web3.storage website.\n')
    .action(setweb3token)
program
    .command('set-gateway')
    .description('set your gateway.\n')
    .argument('<gateway>', 'preferred default ipfs gateway.\n'
    + 'the default is set to "https://dweb.link".\n')
    .action(setgateway)
program
    .command('trust-agent')
    .description('add an agent to your allow list.\n')
    .argument('<agent>', 'public key of the agent (fingerprint)\n')
    .action(trustagent)
program
    .command('list-config')
    .description('list config params.\n')
    .action(listconfig)
program
    .command('publish')
    .description('publish one of the standard format inputs for dispatch. For example, a "sequence" signed by a profile.\n')
    .argument('<input-path>', 'path for the input file\n')
    .argument('<target>', '"local" to pin only on local ipfs node, "cloud to pin on web3.storage" (web3token should be specified in this case)')
    .action(publishCommand)
program
    .command('get')
    .description('construct standard format input-to-prover file.\n')
    .argument('<CID>', 'ipfs content identifier for the structure to get.\n')
    .argument('<directory-path>', 'container directory starting from directory of execution.\n')
    .action(getCommand)
/*program
    .command('trustwho')
    .description('list agents to trust per assertion, and axioms')
    .argument('<input>', 'path of file containing a list of CIDs; expected formats: assertion, sequent, sequence')
    //.option('--per-assertion | --per-sequent | --per-agent' ) --deep --shallow
    .action(trustwhoCommand)
*/
/*program
    .command('whatisay')
    .description('filter given list of cids based on your allow list')
    .argument('<input>', 'path of file containing a list of CIDs; expected formats: assertion, sequent, sequence')
    .action(whatISay)
program
    .command('doisay')
    .description('check if a theorem is provable based on your allow list and a given list of cids')
    .argument('<thmCID', 'the cid of the target theorem (formula format or named formula? check)')
    .argument('<input>', 'path of file containing a list of CIDs; expected formats: assertion, sequent, sequence')
    .action(doISay)*/
program
    .command('lookup')
    .description('....')
    .argument('<thmCID>', '....')
    .argument("<input>", '....')
    .action(lookup)

/*
program
    .command('get')
    .description('construct standard format .json file according to retrieved object type.\n')
    .argument('<CID>', 'ipfs content identifier for the structure to get.\n')
    .option('-fp, --filepath <string>', 'path of file to write the constructed output in. Example: output/myfile.json.\n            default value is CID.json in the current directory.')
    .action(getCommand)
*/    

program.parse()

export = {}
#! /usr/bin/env node

const { program } = require('commander')

const { publishCommand } = require('./publish.js')
const { setup, keygen, setweb3token, setgateway, listconfig } = require('./config-related.js')
const { getCommand } = require('./get.js')

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
    .command('list-config')
    .description('list config params.\n')
    .action(listconfig)
program
    .command('publish')
    .description('publish standard format sequents file as a collection of signed sequents by a profile.\n')
    .argument('<file-name>', 'name of the file without the .json extension.\n')
    .argument('<profile-name>', 'name of the profile used for signing each sequent.\n')
    .argument('<directory-path>', 'path of directory containing the file starting from directory of execution.\n')
    .argument('<target>', 'takes values: "local"->pin locally or "cloud"->pin through web3.storage.\n')
    .action(publishCommand)
program
    .command('get')
    .description('construct standard format input-to-prover file.\n')
    .argument('<CID>', 'ipfs content identifier for the structure to get.\n')
    .argument('<directory-path', 'container directory starting from directory of execution.\n')
    .action(getCommand)

program.parse()

export = {}
#! /usr/bin/env node

const { program } = require('commander')

const { publishCommand } = require('./publish.js')
const { setup, keygen, setweb3token, setgateway, listconfig } = require('./config-related.js')
const { getCommand } = require('./get.js')

setup()

program
    .command('keygen <profileName>')
    .description('generate a PPK pair.')
    .action(keygen)
program
    .command('set-web3token <token>')
    .description('set your web3.storage api token.')
    .action(setweb3token)

program
    .command('set-gateway <gateway>')
    .description('set your gateway.\n')
    .action(setgateway)

program
    .command('list-config')
    .description('list config params.')
    .action(listconfig)

program
    .command('publish-signed <fileName> <profileName> <directoryPath> <target>')
    .description('publish-sign standard format sequents file.')
    .action(publishCommand)


program
    .command('get <CID> <directoryPath>')
    .description('construct standard format output-to-prover file.')
    .action(getCommand)


program.parse()

export = {}
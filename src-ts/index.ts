#! /usr/bin/env node

const { program } = require('commander')

const { publishCommand } = require('./publish.js')
const { setup, keygen, setweb3token, setgateway, listconfig } = require('./config-related.js')
const { getCommand } = require('./get.js')

setup()

program
    .command('keygen <profileName>')
    .description('generate a public-private key pair with a profile name to be used when publishing. These will be added to your profiles config file. BE CAREFUL ABOUT KEEPING YOUR PRIVATE KEYS PRIVATE !')
    .action(keygen)
program
    .command('set-web3token <token>')
    .description('set your own web3.storage api token to be able to publish through web3.storage api')
    .action(setweb3token)

program
    .command('set-gateway <gateway>')
    .description('set the gateway through which files are retreived. The default is set to http://dweb.link')
    .action(setgateway)

program
    .command('list-config')
    .description('list the configuration parameters - ex: gateway, web3.storage api token')
    .action(listconfig)

program
    .command('publish-signed <fileName> <profileName> <directoryPath> <target>')
    .description('publish the standard format .json file generated from abella (or other) theorem files with signature by the specified profile, and you can specify <target> as either "local" or "cloud" for publishing through web3.storage service. <directoryPath> takes the path of the directory containing the file starting from the directory of execution, ex "a/b/c.')
    .action(publishCommand)


program
    .command('get <CID> <directoryPath>')
    .description('constructs the standard format file to be consumed by abella (or other) with the name theGivenCID.json (in case the given cid refers to a sequent, assertion, or sequence object type). <directoryPath> takes the path of the directory to construct the resulting file in (starting from the directory of execution).')
    .action(getCommand)


program.parse()

export = {}
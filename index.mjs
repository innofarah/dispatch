#! /usr/bin/env node

// w3proof-starter
// w3proof-dispatch 

// five commands :
// w3proof-dispatch publish filename type directory local/web3storage --> if not local, the token should be set

// w3proof-dispatch set-web3token the user's token

// w3proof-dispatch set-gateway the preferred gateway

// w3proof-dispatch list-config 

// w3proof-dispatch get ipfspath directory local/gateway -- let the user choose if he wants to retreive the file through the specified gateway or through his ipfs node daemon
const { exec } = require('pkg')
const { program } require('commander')

const { main } require('./publish.mjs')
const { setweb3token } require('./publish.mjs')
const { setgateway } require('./publish.mjs')
const { listconfig } require('./publish.mjs')
const { mainget } require('./get.mjs')

program
    .command('publish <mainAssetName> <mainAssetType> <directoryPath> <target>')
    .description('publish a file object with all dependencies to ipfs. <mainAssetName> takes the name of the file without its extension. <mainAssetType> takes either `script` or `specification`. <directoryPath> takes the path of the directory containing the file starting from the directory of execution .<target> takes either `local` to store the constructed objects only locally, or `web3storage` to publish through the web3.storage api')
    .action(main)

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
    .command('get <ipfsPath> <directory> <ipfsStation>')
    .description('get the dag object referred to by the specified path, and construct the files referred to in this dag. ipfsStation could be either `local` referring to the local ipfs daemon which should be running in this case, or `gateway` which retreives the files through a remote gateway.')
    .action(mainget)

program.parse()

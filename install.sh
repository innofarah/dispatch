#!/bin/sh

# to install the latest stable node version through nvm, first install nvm:
sudo apt-get curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
source ~/.bashrc
# install node latest stable version:
nvm install --lts
# install ipfs (according to the ipfs website instructionS):
wget https://dist.ipfs.io/go-ipfs/v0.11.0/go-ipfs_v0.11.0_linux-amd64.tar.gz
tar -xvzf go-ipfs_v0.11.0_linux-amd64.tar.gz
cd go-ipfs
sudo bash install.sh
ipfs init
# to install w3proof-dispatch
sudo apt install npm
cd ..
npm install -g

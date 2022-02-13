#!/bin/sh

if [ $EUID != 0 ]; then
    sudo "$0" "$@"
    exit $?
fi


# to install the latest stable node version through nvm, first install nvm:
apt-get install curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
source ~/.bashrc
source ~/.nvm/nvm.sh
# install node latest stable version:
nvm install --lts
nvm use stable
# install ipfs (according to the ipfs website instructionS):
cd ..
apt-get install wget
wget https://dist.ipfs.io/go-ipfs/v0.11.0/go-ipfs_v0.11.0_linux-amd64.tar.gz
tar -xvzf go-ipfs_v0.11.0_linux-amd64.tar.gz
cd go-ipfs
bash install.sh
ipfs init
# to install w3proof-dispatch
#apt install npm
#cleaning
npm uninstall w3proof-dispatch -g
nvm use system
npm uninstall -g a_module
nvm use stable
source ~/.bashrc
source ~/.nvm/nvm.sh
## installing 
cd ..
cd w3proof-dispatch
npm i -g
npm ci

echo "
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------
**Installed successfully -- restart or open a new terminal to see changes - or execute 'source ~/.bashrc'**
**type 'w3proof-dispatch' to see the list of possible commands'**
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------------------------"

#!/bin/sh

if [ $EUID != 0 ]; then
    sudo "$0" "$@"
    exit $?
fi


# to install the latest stable node version through nvm, first install nvm:
sudo apt-get install curl
sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
source ~/.bashrc
source ~/.nvm/nvm.sh
# install node latest stable version:
sudo nvm install --lts
sudo nvm use stable
# install ipfs (according to the ipfs website instructionS):
cd ..
sudo apt-get install wget
sudo wget https://dist.ipfs.io/go-ipfs/v0.11.0/go-ipfs_v0.11.0_linux-amd64.tar.gz
sudo tar -xvzf go-ipfs_v0.11.0_linux-amd64.tar.gz
cd go-ipfs
sudo bash install.sh
ipfs init
# to install w3proof-dispatch
sudo apt install npm
#cleaning
sudo npm uninstall w3proof-dispatch -g
sudo nvm use system
sudo npm uninstall -g a_module
sudo nvm use stable
source ~/.bashrc
source ~/.nvm/nvm.sh
## installing 
cd ..
cd w3proof-dispatch
sudo npm i -g
sudo npm ci

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

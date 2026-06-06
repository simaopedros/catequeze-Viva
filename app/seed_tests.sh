#!/bin/bash
export NVM_DIR="/home/simaopedros/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
cd /home/simaopedros/catequese-viva/app
export DATABASE_URL="postgresql://postgresWaspDevUser:postgresWaspDevPass@localhost:5432/OpenSaaS-0a720521f5"
node seed_test_data.js

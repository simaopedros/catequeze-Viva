#!/bin/bash
export NVM_DIR="/home/simaopedros/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
cd /home/simaopedros/catequese-viva/app
export NODE_ENV=development
npx vitest run

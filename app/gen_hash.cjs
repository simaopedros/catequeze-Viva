const argon2 = require('@node-rs/argon2');
argon2.hash('Teste@123456').then(h => console.log(h));

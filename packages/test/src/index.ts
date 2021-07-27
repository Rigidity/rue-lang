import { Lexer, printError, LexerError, ParserError, Parser } from 'ruelang';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

let errors = 0;
let successes = 0;

const timestamp = Date.now();

for (let file of fs.readdirSync('./valid')) {
    file = path.resolve('./valid', file);
    const text = fs.readFileSync(file, 'utf8');
    const tokens = new Lexer(text).tokens();
    if (tokens instanceof LexerError) {
        printError(tokens, file, text);
        errors++;
        continue;
    }
    const ast = new Parser(tokens, text).ast();
    if (ast instanceof ParserError) {
        printError(ast, file, text);
        errors++;
        continue;
    }
    successes++;
}

const time = Date.now() - timestamp;

console.log(
    chalk.yellowBright(
        `Passed ${successes} tests and failed ${errors} tests in ${time}ms.`
    )
);

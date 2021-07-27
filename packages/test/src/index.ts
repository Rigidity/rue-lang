import {
    Lexer,
    printError,
    LexerError,
    ParserError,
    stringify,
    Parser,
} from 'ruelang';
import path from 'path';
import fs from 'fs';

for (let file of fs.readdirSync('./valid')) {
    file = path.resolve('./valid', file);
    const text = fs.readFileSync(file, 'utf8');
    const tokens = new Lexer(text).tokens();
    if (tokens instanceof LexerError) {
        printError(tokens, file, text);
        continue;
    }
    const ast = new Parser(tokens, text).ast();
    if (ast instanceof ParserError) {
        printError(ast, file, text);
        continue;
    }
    console.log(stringify(ast));
}

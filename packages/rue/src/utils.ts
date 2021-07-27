import { Token, TokenType } from './token';
import { Tree, TreeType } from './tree';
import chalk from 'chalk';
import path from 'path';
import util from 'util';

export interface Position {
    line: number;
    column: number;
    index: number;
}

export class LexerError extends Error {
    constructor(
        message: string,
        public content: string | null,
        public start: number,
        public stop: number
    ) {
        super(message);
        this.name = 'LexerError';
    }
}

export class ParserError extends Error {
    constructor(
        message: string,
        public content: string | null,
        public start: number,
        public stop: number
    ) {
        super(message);
        this.name = 'ParserError';
    }
}

export function toPosition(index: number, text: string): Position {
    let line = 1;
    let column = 1;
    for (let i = 0; i < index; i++) {
        if (text[i] === '\r') continue;
        if (text[i] === '\n') {
            line++;
            column = 1;
        } else {
            column++;
        }
    }
    return { line, column, index };
}

export function printError(
    error: LexerError | ParserError,
    file: string,
    source: string
) {
    const start = toPosition(error.start, source);
    const stop = toPosition(error.stop, source);
    let line = source
        .replace(/\r\n/g, '\n')
        .split('\n')
        [start.line - 1].replace(/\t/g, ' ');
    let indent = start.column - 1;
    const size = Math.max(stop.index - start.index, 1);
    if (indent > Math.max(30, size)) {
        const amount = indent - Math.max(30, size) + size;
        indent -= amount;
        line = line.slice(amount);
    }
    if (line.length > process.stdout.columns) {
        line = line.slice(0, process.stdout.columns);
    }
    const message = chalk.yellowBright(
        `${error instanceof LexerError ? 'Lexer' : 'Parser'}Error: ${
            error.message
        }${
            error.content !== null ? ` ${util.inspect(error.content)}` : ''
        } at ${start.line}:${start.column}`
    );
    console.error(
        [
            chalk.greenBright(`${path.resolve('./valid', file)}:${start.line}`),
            chalk.cyanBright(line),
            ' '.repeat(indent) + chalk.redBright('^'.repeat(size)),
            ' '.repeat(Math.max(indent - message.length / 2, 0)) +
                chalk.yellowBright(message),
        ].join('\n')
    );
}

export function stringify(
    ast: Tree | Token | (Tree | Token)[],
    depth: number = 0
): string {
    if (Array.isArray(ast))
        return ast
            .map((item: Tree | Token) => stringify(item, depth))
            .join('\n');
    else if ('items' in ast)
        return ast.items.length === 1
            ? stringify(ast.items[0], depth)
            : `${'   '.repeat(depth)}${chalk.greenBright(
                  TreeType[ast.type]
              )} ${chalk.cyanBright(`(${ast.start}-${ast.stop})`)}${
                  ast.items.length > 0 ? '\n' : ''
              }${stringify(ast.items, depth + 1)}`;
    else
        return `${'   '.repeat(depth)}${chalk.greenBright(
            TokenType[ast.type]
        )} ${chalk.cyanBright(
            `(${ast.start}-${ast.stop})`
        )}: ${chalk.yellowBright(ast.text.replace(/\r?\n/g, ' '))}`;
}

export function mutate<T>(original: T[], content: T[]): void {
    original.length = 0;
    for (const item of content) original.push(item);
}

import { Token, TokenType } from './token';
import { Tree, TreeType } from './tree';
import chalk from 'chalk';

export interface Position {
	line: number;
	column: number;
	index: number;
}

export class RueError extends Error {
	constructor(message: string, public start: Position, public stop: Position) {
		super(message);
		this.name = 'RueError';
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

export interface ErrorInfo<T extends string | Token> {
	message: string | ErrorMessageProvider<T>;
}

export type ErrorMessageProvider<T extends string | Token> = (token: T) => string;

export function stringify(ast: Tree | Token | (Tree | Token)[], depth: number = 0): string {
	if (Array.isArray(ast)) return ast.map((item: Tree | Token) => stringify(item, depth)).join('\n');
	else if ('items' in ast) return ast.items.length === 1 ? stringify(ast.items[0], depth) : `${'   '.repeat(depth)}${chalk.greenBright(TreeType[ast.type])} ${chalk.cyanBright(`(${ast.start}-${ast.stop})`)}${ast.items.length > 0 ? '\n' : ''}${stringify(ast.items, depth + 1)}`;
	else return `${'   '.repeat(depth)}${chalk.greenBright(TokenType[ast.type])} ${chalk.cyanBright(`(${ast.start}-${ast.stop})`)}: ${chalk.yellowBright(ast.text.replace(/\r?\n/g, ' '))}`;
}
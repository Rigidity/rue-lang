import { lex, parse, RueError, stringify } from 'ruelang';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

for (const file of fs.readdirSync('./valid')) {
	const text = fs.readFileSync(`./valid/${file}`, 'utf8');
	try {
		const tokens = lex(text);
		const ast = parse(tokens, text);
		console.log(stringify(ast));
	} catch (error) {
		if (!(error instanceof RueError)) throw error;
		let line = text.replace(/\r\n/g, '\n').split('\n')[error.start.line - 1].replace(/\t/g, ' ');
		let indent = error.start.column - 1;
		const size = Math.max(error.stop.index - error.start.index, 1);
		if (indent > Math.max(30, size)) {
			const amount = indent - Math.max(30, size) + size;
			indent -= amount;
			line = line.slice(amount);
		}
		if (line.length > process.stdout.columns) {
			line = line.slice(0, process.stdout.columns);
		}
		const message = chalk.yellowBright(`Error: ${error.message} at ${error.start.line}:${error.start.column}`);
		console.error([
			chalk.greenBright(`${path.resolve('./valid', file)}:${error.start.line}`),
			chalk.cyanBright(line),
			' '.repeat(indent) + chalk.redBright('^'.repeat(size)),
			' '.repeat(Math.max(indent - message.length / 2, 0)) + chalk.yellowBright(message)
		].join('\n'));
	}
}
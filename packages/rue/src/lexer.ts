import { Token, TokenType } from './token';
import { ErrorInfo, RueError, toPosition } from './utils';
import util from 'util';

export function lex(source: string): Token[] {

	const tokens: Token[] = [];
	let text = source;
	let previous: string;

	function textIndex(text: string): number {
		return source.length - text.length;
	}

	function makeToken(token: Omit<Omit<Token, 'start'>, 'stop'>) {
		tokens.push({ ...token, start: textIndex(previous), stop: textIndex(text) });
	}

	function makeError(info: ErrorInfo<string>) {
		const index = textIndex(text);
		const start = toPosition(index, source);
		const stop = toPosition(index + 1, source);
		throw new RueError(typeof info.message === 'string' ? info.message : info.message(source[source.length - text.length]), start, stop);
	}

	const operators: [string, TokenType][] = [
		['==', TokenType.EqualOperator],
		['!=', TokenType.NotEqualOperator],
		['+=', TokenType.PlusAssignOperator],
		['-=', TokenType.MinusAssignOperator],
		['*=', TokenType.TimesAssignOperator],
		['/=', TokenType.DivideAssignOperator],
		['%=', TokenType.ModuloAssignOperator],
		['&=', TokenType.AndAssignOperator],
		['|=', TokenType.OrAssignOperator],
		['^=', TokenType.XorAssignOperator],
		['?=', TokenType.CoalesceAssignOperator],
		['<<=', TokenType.LeftShiftAssignOperator],
		['>>>=', TokenType.UnsignedRightShiftAssignOperator],
		['>>=', TokenType.RightShiftAssignOperator],
		['=>', TokenType.ArrowOperator],
		['=', TokenType.AssignOperator],
		['+', TokenType.PlusOperator],
		['-', TokenType.MinusOperator],
		['*', TokenType.TimesOperator],
		['/', TokenType.DivideOperator],
		['%', TokenType.ModuloOperator],
		['~', TokenType.NotOperator],
		['?:', TokenType.CoalesceOperator],
		['&', TokenType.AndOperator],
		['|', TokenType.OrOperator],
		['^', TokenType.XorOperator],
		['<<', TokenType.LeftShiftOperator],
		['>>>', TokenType.UnsignedRightShiftOperator],
		['>>', TokenType.RightShiftOperator],
		['<=', TokenType.LessThanEqualOperator],
		['>=', TokenType.GreaterThanEqualOperator],
		['<', TokenType.LessThanOperator],
		['>', TokenType.GreaterThanOperator],
		['?.', TokenType.OptionalAccessOperator],
		['?', TokenType.OptionalOperator],
		['...', TokenType.InclusiveRangeOperator],
		['..', TokenType.ExclusiveRangeOperator],
		['.', TokenType.AccessOperator],
		['(', TokenType.OpenParenthesis],
		[')', TokenType.CloseParenthesis],
		['[', TokenType.OpenBracket],
		[']', TokenType.CloseBracket],
		['{', TokenType.OpenBrace],
		['}', TokenType.CloseBrace],
		[';', TokenType.SemicolonPunctuator],
		[':', TokenType.ColonPunctuator],
		[',', TokenType.CommaPunctuator],
		['_', TokenType.UnderscorePunctuator]
	];

	while (text.length > 0) {

		previous = text;

		let match;
		if ((match = text.match(/^[\r\n\f\v\t ]/)) !== null) {
			text = text.slice(match[0].length);
		} else if ((match = text.match(/^\/\/.*/)) !== null) {
			text = text.slice(match[0].length);
		} else if ((match = text.match(/^\/\*[^]*?\*\//)) !== null) {
			text = text.slice(match[0].length);
		} else if ((match = text.match(/^[a-zA-Z](?:_?[a-zA-Z0-9]+)*/)) !== null) {
			let type;
			switch (match[0]) {
				case 'and':
					type = TokenType.AndKeyword;
					break;
				case 'or':
					type = TokenType.OrKeyword;
					break;
				case 'not':
					type = TokenType.NotKeyword;
					break;
				case 'for':
					type = TokenType.ForKeyword;
					break;
				case 'while':
					type = TokenType.WhileKeyword;
					break;
				case 'continue':
					type = TokenType.ContinueKeyword;
					break;
				case 'break':
					type = TokenType.BreakKeyword;
					break;
				case 'return':
					type = TokenType.ReturnKeyword;
					break;
				case 'macro':
					type = TokenType.MacroKeyword;
					break;
				case 'public':
					type = TokenType.PublicKeyword;
					break;
				case 'private':
					type = TokenType.PrivateKeyword;
					break;
				case 'protected':
					type = TokenType.ProtectedKeyword;
					break;
				case 'do':
					type = TokenType.DoKeyword;
					break;
				case 'is':
					type = TokenType.IsKeyword;
					break;
				case 'as':
					type = TokenType.AsKeyword;
					break;
				case 'if':
					type = TokenType.IfKeyword;
					break;
				case 'else':
					type = TokenType.ElseKeyword;
					break;
				case 'try':
					type = TokenType.TryKeyword;
					break;
				case 'catch':
					type = TokenType.CatchKeyword;
					break;
				case 'throw':
					type = TokenType.ThrowKeyword;
					break;
				case 'def':
					type = TokenType.DefKeyword;
					break;
				case 'val':
					type = TokenType.ValKeyword;
					break;
				case 'var':
					type = TokenType.VarKeyword;
					break;
				case 'in':
					type = TokenType.InKeyword;
					break;
				case 'match':
					type = TokenType.MatchKeyword;
					break;
				case 'from':
					type = TokenType.FromKeyword;
					break;
				case 'import':
					type = TokenType.ImportKeyword;
					break;
				case 'export':
					type = TokenType.ExportKeyword;
					break;
				case 'type':
					type = TokenType.TypeKeyword;
					break;
				case 'enum':
					type = TokenType.EnumKeyword;
					break;
				case 'struct':
					type = TokenType.StructKeyword;
					break;
				case 'class':
					type = TokenType.ClassKeyword;
					break;
				case 'void':
					type = TokenType.VoidType;
					break;
				case 'int':
				case 'i8':
				case 'i16':
				case 'i32':
				case 'i64':
					type = TokenType.IntegerType;
					break;
				case 'uint':
				case 'u8':
				case 'u16':
				case 'u32':
				case 'u64':
					type = TokenType.UnsignedIntegerType;
					break;
				case 'float':
				case 'f32':
				case 'f64':
					type = TokenType.FloatType;
					break;
				case 'bool':
					type = TokenType.BooleanType;
					break;
				case 'string':
					type = TokenType.StringType;
					break;
				case 'true':
				case 'false':
					type = TokenType.BoolLiteral;
					break;
				case 'super':
					type = TokenType.SuperKeyword;
					break;
				case 'this':
					type = TokenType.ThisKeyword;
					break;
				case 'null':
					type = TokenType.NullKeyword;
					break;
				default:
					type = TokenType.Identifier;
					break;
			}
			text = text.slice(match[0].length);
			makeToken({
				type,
				text: match[0]
			});
		} else if ((match = text.match(/^0[xX][0-9a-fA-F]+/)) !== null) {
			text = text.slice(match[0].length);
			makeToken({
				type: TokenType.HexadecimalLiteral,
				text: match[0]
			});
		} else if ((match = text.match(/^0[oO][0-7]+/)) !== null) {
			text = text.slice(match[0].length);
			makeToken({
				type: TokenType.OctalLiteral,
				text: match[0]
			});
		} else if ((match = text.match(/^0[bB][0-1]+/)) !== null) {
			text = text.slice(match[0].length);
			makeToken({
				type: TokenType.BinaryLiteral,
				text: match[0]
			});
		} else if ((match = text.match(/^[0-9]+\.[0-9]+(?:[eE][+\-]?[0-9]+)?/)) !== null) {
			text = text.slice(match[0].length);
			makeToken({
				type: TokenType.FloatLiteral,
				text: match[0]
			});
		} else if ((match = text.match(/^[0-9]+(?:[eE][+\-]?[0-9]+)?/)) !== null) {
			text = text.slice(match[0].length);
			makeToken({
				type: TokenType.IntLiteral,
				text: match[0]
			});
		} else if (/^['"]/.test(text[0])) {
			let string = text[0];
			text = text.slice(1);
			let closed = false;
			while (text.length > 0) {
				const char = text[0];
				text = text.slice(1);
				if (char === '\\') {
					const escape = text[0];
					if (escape === undefined) makeError({ message: 'Unexpected end of escape' });
					text = text.slice(1);
					if (escape === 'n') string += '\n';
					else if (escape === 'r') string += '\r';
					else if (escape === 'n') string += '\n';
					else if (escape === 'f') string += '\f';
					else if (escape === 'v') string += '\v';
					else if (escape === 't') string += '\t';
					else if (escape === 'b') string += '\b';
					else if (escape === '0') string += '\0';
					else if (escape === 'x') {
						const hex = text.slice(0, 2);
						if (!/^[0-9A-F]{2}$/.test(hex)) makeError({ message: 'Invalid or lowercase hexadecimal escape sequence' });
						text = text.slice(2);
						const number = parseInt(hex, 16);
						string += String.fromCharCode(number);
					} else if (escape === 'u') {
						const next = text[0];
						if (next === '{') {
							text = text.slice(1);
							let hex = '';
							for (let i = 0; i < text.length; i++) {
								hex += text[i];
								if (text[i] === '}') break;
							}
							if (!hex.endsWith('}')) makeError({ message: 'Invalid or lowercase unicode escape sequence' });
							hex = hex.slice(0, -1);
							const number = parseInt(hex, 16);
							if (number > 0x10FFFF) makeError({ message: 'Out of range unicode escape sequence' });
							string += String.fromCharCode(number);
							text = text.slice(hex.length + 1);
						} else {
							const hex = text.slice(0, 4);
							if (!/^[0-9A-F]{4}$/.test(hex)) makeError({ message: 'Invalid or lowercase unicode escape sequence' });
							text = text.slice(4);
							const number = parseInt(hex, 16);
							string += String.fromCharCode(number);
						}
					}
					else string += escape;
				} else {
					string += char;
					if (char === string[0]) {
						closed = true;
						break;
					}
				}
			}
			if (!closed) makeError({ message: 'Unexpected end of string literal' });
			makeToken({
				type: TokenType.StringLiteral,
				text: string.slice(1, -1)
			});
		} else if ((match = operators.find(item => text.startsWith(item[0]))) !== undefined) {
			makeToken({
				type: match[1],
				text: match[0]
			});
			text = text.slice(match[0].length);
		} else makeError({ message: (char: string) => `Unexpected character ${util.inspect(char)}` });
	}

	return tokens;

}
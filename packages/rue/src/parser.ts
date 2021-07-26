import { Token, TokenType } from './token';
import { Tree, TreeType } from './tree';
import { ErrorInfo, RueError, toPosition } from './utils';
import util from 'util';

export function parse(source: Token[], text: string): Tree {

	const stack: Token[][] = [source.slice()];
	let error: RueError | null = null;

	const result = parseBody();
	if (stack[0].length > 0) popError({
		message: (token: Token) => `Unexpected token ${util.inspect(token.text)}`
	}, false);

	if (!result || stack[0].length) throw error;
	return result;

	function mutate<T>(original: T[], content: T[]): void {
		original.length = 0;
		for (const item of content) original.push(item);
	}

	function push(): Token[] {
		const result = stack[stack.length - 1].slice();
		stack.push(result);
		return result;
	}

	function pop(success: boolean = true): undefined {
		const tokens = stack.pop();
		if (!tokens) throw new Error('There are no stack frames to pop.');
		if (success) mutate(stack[stack.length - 1], tokens);
		return;
	}

	function tokenStart(tokens: Token[]): number {
		return tokens.length > 0 ?
			tokens[0].start :
			source.length > 0 ?
				source[source.length - 1].start :
				0;
	}

	function tokenStop(tokens: Token[]): number {
		return tokens.length > 0 ?
			tokens[0].stop :
			source.length > 0 ?
				source[source.length - 1].stop :
				0;
	}

	function makeError(info: ErrorInfo<Token>): undefined {
		const tokens = current();
		const start = toPosition(tokenStart(tokens), text);
		const stop = toPosition(tokenStop(tokens), text);
		if (error === null || start.index >= error.start.index) {
			error = new RueError(typeof info.message === 'string' ?
				info.message :
				info.message(source[source.length - tokens.length]), start, stop);
		}
		return;
	}

	function popError(info: ErrorInfo<Token>, exit: boolean = true): undefined {
		makeError(info);
		if (exit) pop(false);
		return;
	}

	function current(): Token[] {
		return stack[stack.length - 1];
	}

	function parent(): Token[] {
		return stack[stack.length - 2];
	}

	function nextOf(type: TokenType): Token | undefined {
		const tokens = current();
		if (!tokens.length || tokens[0].type !== type) return;
		return tokens.shift();
	}

	function makeTree(tree: Omit<Omit<Tree, 'start'>, 'stop'>): Tree {
		const start = tokenStart(parent());
		const stop = tokenStart(current());
		return { ...tree, start, stop };
	}

	function popTree(tree: Omit<Omit<Tree, 'start'>, 'stop'>): Tree {
		const result = makeTree(tree);
		pop();
		return result;
	}

	function parseBody(): Tree | undefined {
		push();
		const result = [];
		while (true) {
			const statement = parseStatement();
			if (!statement) break;
			result.push(statement);
		}
		return popTree({ type: TreeType.Body, items: result });
	}

	function parseStatement(): Tree | undefined {
		push();
		const result = [];
		const statement = parseLabeledStatement() ??
			parseFieldStatement() ??
			parseExpressionStatement() ??
			parseDefStatement() ??
			parseIfStatement() ??
			parseWhileStatement() ??
			parseMatchStatement() ??
			parseDoStatement() ??
			parseForStatement() ??
			parseReturnStatement() ??
			parseContinueStatement() ??
			parseBreakStatement() ??
			parseBlockStatement() ??
			parseEmptyStatement();
		if (!statement) return popError({ message: 'Expected statement' });
		result.push(statement);
		return popTree({ type: TreeType.Statement, items: result });
	}

	function parseLabeledStatement(): Tree | undefined {
		push();
		const result = [];
		const identifier = nextOf(TokenType.Identifier);
		if (!identifier) return popError({ message: 'Expected labeled statement' });
		result.push(identifier);
		if (!nextOf(TokenType.ColonPunctuator)) return popError({ message: 'Expected ":" after label' });
		const statement = parseStatement();
		if (!statement) return popError({ message: 'Expected statement' });
		result.push(statement);
		return popTree({ type: TreeType.LabeledStatement, items: result });
	}

	function parseBlockStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.OpenBrace)) return popError({ message: 'Expected block statement' });
		while (true) {
			const statement = parseStatement();
			if (!statement) break;
			result.push(statement);
		}
		if (!nextOf(TokenType.CloseBrace)) return popError({ message: 'Unterminated block statement' });
		return popTree({ type: TreeType.BlockStatement, items: result });
	}

	function parseIfStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.IfKeyword)) return popError({ message: 'Expected if statement' });
		if (!nextOf(TokenType.OpenParenthesis)) return popError({ message: 'Expected if condition' });
		const condition = parseExpressionSequence();
		if (!condition) return popError({ message: 'Expected expression sequence' });
		result.push(condition);
		if (!nextOf(TokenType.CloseParenthesis)) return popError({ message: 'Unterminated if condition' });
		const statement = parseStatement();
		if (!statement) return popError({ message: 'Expected statement' });
		result.push(statement);
		if (nextOf(TokenType.ElseKeyword)) {
			const statement = parseStatement();
			if (!statement) return popError({ message: 'Expected statement' });
			result.push(statement);
		}
		return popTree({ type: TreeType.IfStatement, items: result });
	}

	function parseWhileStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.WhileKeyword)) return popError({ message: 'Expected while statement' });
		if (!nextOf(TokenType.OpenParenthesis)) return popError({ message: 'Expected while condition' });
		const condition = parseExpressionSequence();
		if (!condition) return popError({ message: 'Expected expression sequence' });
		result.push(condition);
		if (!nextOf(TokenType.CloseParenthesis)) return popError({ message: 'Unterminated while condition' });
		const statement = parseStatement();
		if (!statement) return popError({ message: 'Expected statement' });
		result.push(statement);
		return popTree({ type: TreeType.WhileStatement, items: result });
	}

	function parseMatchStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.MatchKeyword)) return popError({ message: 'Expected match statement' });
		if (!nextOf(TokenType.OpenParenthesis)) return popError({ message: 'Expected match value' });
		const value = parseExpressionSequence();
		if (!value) return popError({ message: 'Expected expression sequence' });
		result.push(value);
		if (!nextOf(TokenType.CloseParenthesis)) return popError({ message: 'Unterminated match value' });
		if (!nextOf(TokenType.OpenBrace)) return popError({ message: 'Expected match body' });
		let match = false;
		while (true) {
			const option = parseMatchOption();
			if (!option) break;
			match = false;
			result.push(option);
		}
		const fallback = parseBody();
		if (fallback) result.push(fallback);
		else if (!match) return popError({ message: 'Expected match options or fallback' });
		if (!nextOf(TokenType.CloseBrace)) return popError({ message: 'Unterminated match body' });
		return popTree({ type: TreeType.MatchStatement, items: result });
	}

	function parseMatchOption(): Tree | undefined {
		push();
		const result = [];
		const expression = parseAssignmentExpression();
		if (!expression) return popError({ message: 'Expected match option' });
		result.push(expression);
		if (!nextOf(TokenType.ArrowOperator)) return popError({ message: 'Expected "=>"' });
		const body = parseStatement();
		if (!body) return popError({ message: 'Expected match option body' });
		result.push(body);
		return popTree({ type: TreeType.MatchOption, items: result });
	}

	function parseDefStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.DefKeyword)) return popError({ message: 'Expected def statement' });
		const identifier = nextOf(TokenType.Identifier);
		if (!identifier) return popError({ message: 'Expected identifier' });
		result.push(identifier);
		const parameters = parseParameters();
		if (!parameters) return popError({ message: 'Expected parameters' });
		result.push(parameters);
		if (nextOf(TokenType.ColonPunctuator)) {
			const type = parseUnaryType();
			if (!type) return popError({ message: 'Expected type' });
			result.push(type);
		}
		const statement = parseBlockStatement() ?? parseEmptyStatement();
		if (!statement) return popError({ message: 'Expected def body' });
		result.push(statement);
		return popTree({ type: TreeType.DefStatement, items: result });
	}

	function parseParameters(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.OpenParenthesis)) return popError({ message: 'Expected parameters' });
		while (true) {
			if (result.length && !nextOf(TokenType.CommaPunctuator)) break;
			const parameter = parseParameter();
			if (!parameter) {
				if (!result.length) break;
				return popError({ message: 'Expected parameter' });
			}
			result.push(parameter);
		}
		if (!nextOf(TokenType.CloseParenthesis)) return popError({ message: 'Unterminated parameters' });
		return popTree({ type: TreeType.Parameters, items: result });
	}

	function parseParameter(): Tree | undefined {
		push();
		const result = [];
		const item = nextOf(TokenType.Identifier) ?? nextOf(TokenType.InclusiveRangeOperator);
		if (!item) return popError({ message: 'Expected parameter' });
		result.push(item);
		if (item.type === TokenType.Identifier) {
			if (!nextOf(TokenType.ColonPunctuator)) return popError({ message: 'Expected ":" after parameter name' });
			const type = parseUnaryType();
			if (!type) return popError({ message: 'Expected type' });
			result.push(type);
		}
		return popTree({ type: TreeType.Parameter, items: result });
	}

	function parseDoStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.DoKeyword)) return popError({ message: 'Expected do statement' });
		const statement = parseStatement();
		if (!statement) return popError({ message: 'Expected statement' });
		result.push(statement);
		if (!nextOf(TokenType.WhileKeyword)) return popError({ message: 'Expected while clause' });
		if (!nextOf(TokenType.OpenParenthesis)) return popError({ message: 'Expected do condition' });
		const condition = parseExpressionSequence();
		if (!condition) return popError({ message: 'Expected expression sequence' });
		result.push(condition);
		if (!nextOf(TokenType.CloseParenthesis)) return popError({ message: 'Unterminated while condition' });
		return popTree({ type: TreeType.DoStatement, items: result });
	}

	function parseForStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.ForKeyword)) return popError({ message: 'Expected for statement' });
		if (!nextOf(TokenType.OpenParenthesis)) return popError({ message: 'Expected for iterator' });
		const identifier = nextOf(TokenType.Identifier);
		if (!identifier) return popError({ message: 'Expected identifier' });
		result.push(identifier);
		if (!nextOf(TokenType.InKeyword)) return popError({ message: 'Expected in clause' });
		const expression = parseAssignmentExpression();
		if (!expression) return popError({ message: 'Expected iterator expression' });
		result.push(expression);
		if (!nextOf(TokenType.CloseParenthesis)) return popError({ message: 'Unterminated for iterator' });
		const statement = parseStatement();
		if (!statement) return popError({ message: 'Expected statement' });
		result.push(statement);
		return popTree({ type: TreeType.ForStatement, items: result });
	}

	function parseReturnStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.ReturnKeyword)) return popError({ message: 'Expected return statement' });
		const value = parseExpressionSequence();
		if (value) result.push(value);
		if (!nextOf(TokenType.SemicolonPunctuator)) return popError({ message: 'Expected semicolon' });
		return popTree({ type: TreeType.ReturnStatement, items: result });
	}

	function parseContinueStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.ContinueKeyword)) return popError({ message: 'Expected continue statement' });
		const identifier = nextOf(TokenType.Identifier);
		if (identifier) result.push(identifier);
		if (!nextOf(TokenType.SemicolonPunctuator)) return popError({ message: 'Expected semicolon' });
		return popTree({ type: TreeType.ContinueStatement, items: result });
	}

	function parseBreakStatement(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.BreakKeyword)) return popError({ message: 'Expected break statement' });
		const identifier = nextOf(TokenType.Identifier);
		if (identifier) result.push(identifier);
		if (!nextOf(TokenType.SemicolonPunctuator)) return popError({ message: 'Expected semicolon' });
		return popTree({ type: TreeType.BreakStatement, items: result });
	}

	function parseEmptyStatement(): Tree | undefined {
		push();
		if (!nextOf(TokenType.SemicolonPunctuator)) return popError({ message: 'Expected semicolon' });
		return popTree({ type: TreeType.EmptyStatement, items: [] });
	}

	function parseExpressionStatement(): Tree | undefined {
		push();
		const result = [];
		const expressions = parseExpressionSequence();
		if (!expressions) return popError({ message: 'Expected expression sequence' });
		result.push(expressions);
		if (!nextOf(TokenType.SemicolonPunctuator)) return popError({ message: 'Expected semicolon' });
		return popTree({ type: TreeType.ExpressionStatement, items: result });
	}

	function parseFieldStatement(): Tree | undefined {
		push();
		const result = [];
		const keyword = nextOf(TokenType.ValKeyword) ?? nextOf(TokenType.VarKeyword);
		if (!keyword) return popError({ message: 'Expected field statement' });
		result.push(keyword);
		const identifier = nextOf(TokenType.Identifier);
		if (!identifier) return popError({ message: 'Expected field name ' });
		result.push(identifier);
		if (nextOf(TokenType.ColonPunctuator)) {
			const type = parseUnionType();
			if (!type) return popError({ message: 'Expected field type' });
			result.push(type);
		}
		if (nextOf(TokenType.AssignOperator)) {
			const expression = parseAssignmentExpression();
			if (!expression) return popError({ message: 'Expected expression' });
			result.push(expression);
		}
		if (!nextOf(TokenType.SemicolonPunctuator)) return popError({ message: 'Expected semicolon' });
		return popTree({ type: TreeType.FieldStatement, items: result });
	}

	function parseUnionType(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseIntersectionType();
		if (!lhs) return popError({ message: 'Expected union type' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.OrOperator)) {
				pop(false);
				break;
			}
			const rhs = parseIntersectionType();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.UnionType, items: result });
	}

	function parseIntersectionType(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseUnaryType();
		if (!lhs) return popError({ message: 'Expected intersection type' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.AndOperator)) {
				pop(false);
				break;
			}
			const rhs = parseUnaryType();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.IntersectionType, items: result });
	}

	function parseUnaryType(): Tree | undefined {
		push();
		const result = [];
		const base = nextOf(TokenType.Identifier) ??
			nextOf(TokenType.IntegerType) ??
			nextOf(TokenType.UnsignedIntegerType) ??
			nextOf(TokenType.FloatType) ??
			nextOf(TokenType.BooleanType) ??
			nextOf(TokenType.StringType);
		if (!base) return popError({ message: 'Expected type or identifier' });
		result.push(base);
		while (true) {
			const match = parseGenericType() ?? parseArrayType();
			if (match) {
				result.push(match);
				continue;
			}
			const operator = nextOf(TokenType.TimesOperator) ?? nextOf(TokenType.OptionalOperator);
			if (!operator) break;
			result.push(operator);
		}
		return popTree({ type: TreeType.UnaryType, items: result });
	}

	function parseArrayType(): Tree | undefined {
		push();
		if (!nextOf(TokenType.OpenBracket)) return popError({ message: 'Expected array type modifier' });
		if (!nextOf(TokenType.CloseBracket)) return popError({ message: 'Unterminated array type modifier' });
		return popTree({ type: TreeType.ArrayType, items: [] });
	}

	function parseGenericType(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.LessThanOperator)) return popError({ message: 'Expected generic type arguments' });
		const lhs = parseUnionType();
		if (!lhs) return popError({ message: 'Expected generic type argument' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.CommaPunctuator)) {
				pop(false);
				break;
			}
			const rhs = parseUnionType();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		if (!nextOf(TokenType.GreaterThanOperator)) return popError({ message: 'Unterminated generic type arguments' });
		return popTree({ type: TreeType.GenericType, items: result });
	}

	function parseExpressionSequence(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseAssignmentExpression();
		if (!lhs) return popError({ message: 'Expected expression sequence' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.CommaPunctuator)) {
				pop(false);
				break;
			}
			const rhs = parseAssignmentExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.ExpressionSequence, items: result });
	}

	function parseAssignmentExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseTernaryExpression();
		if (!lhs) return popError({ message: 'Expected assignment expression' });
		result.push(lhs);
		push();
		const operator = nextOf(TokenType.PlusAssignOperator) ??
			nextOf(TokenType.MinusAssignOperator) ??
			nextOf(TokenType.TimesAssignOperator) ??
			nextOf(TokenType.DivideAssignOperator) ??
			nextOf(TokenType.ModuloAssignOperator) ??
			nextOf(TokenType.AndAssignOperator) ??
			nextOf(TokenType.OrAssignOperator) ??
			nextOf(TokenType.XorAssignOperator) ??
			nextOf(TokenType.CoalesceAssignOperator) ??
			nextOf(TokenType.LeftShiftAssignOperator) ??
			nextOf(TokenType.RightShiftAssignOperator) ??
			nextOf(TokenType.UnsignedRightShiftAssignOperator) ??
			nextOf(TokenType.AssignOperator);
		if (operator) {
			const rhs = parseTernaryExpression();
			if (rhs) {
				result.push(operator, rhs);
				pop();
			} else {
				pop(false);
			}
		} else {
			pop(false);
		}
		return popTree({ type: TreeType.AssignmentExpression, items: result });
	}

	function parseTernaryExpression(): Tree | undefined {
		push();
		const result = [];
		const condition = parseCoalesceExpression();
		if (!condition) return popError({ message: 'Expected ternary expression' });
		result.push(condition);
		push();
		ternary: if (nextOf(TokenType.OptionalOperator)) {
			const lhs = parseAssignmentExpression();
			if (!lhs) {
				pop(false);
				break ternary;
			}
			if (!nextOf(TokenType.ColonPunctuator)) {
				pop(false);
				break ternary;
			}
			const rhs = parseAssignmentExpression();
			if (!rhs) {
				pop(false);
				break ternary;
			}
			result.push(lhs, rhs);
			pop();
		} else {
			pop(false);
		}
		return popTree({ type: TreeType.TernaryExpression, items: result });
	}

	function parseCoalesceExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseLogicalOrExpression();
		if (!lhs) return popError({ message: 'Expected coalesce expression' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.CoalesceOperator)) {
				pop(false);
				break;
			}
			const rhs = parseLogicalOrExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.CoalesceExpression, items: result });
	}

	function parseLogicalOrExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseLogicalAndExpression();
		if (!lhs) return popError({ message: 'Expected logical or expression' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.OrKeyword)) {
				pop(false);
				break;
			}
			const rhs = parseLogicalAndExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.LogicalOrExpression, items: result });
	}

	function parseLogicalAndExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseBitwiseOrExpression();
		if (!lhs) return popError({ message: 'Expected logical and expression' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.AndKeyword)) {
				pop(false);
				break;
			}
			const rhs = parseBitwiseOrExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.LogicalAndExpression, items: result });
	}

	function parseBitwiseOrExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseBitwiseXorExpression();
		if (!lhs) return popError({ message: 'Expected bitwise or expression' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.OrOperator)) {
				pop(false);
				break;
			}
			const rhs = parseBitwiseXorExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.BitwiseOrExpression, items: result });
	}

	function parseBitwiseXorExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseBitwiseAndExpression();
		if (!lhs) return popError({ message: 'Expected bitwise xor expression' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.XorOperator)) {
				pop(false);
				break;
			}
			const rhs = parseBitwiseAndExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.BitwiseXorExpression, items: result });
	}

	function parseBitwiseAndExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseEqualityExpression();
		if (!lhs) return popError({ message: 'Expected bitwise and expression' });
		result.push(lhs);
		while (true) {
			push();
			if (!nextOf(TokenType.AndOperator)) {
				pop(false);
				break;
			}
			const rhs = parseEqualityExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.BitwiseAndExpression, items: result });
	}

	function parseEqualityExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseComparisonExpression();
		if (!lhs) return popError({ message: 'Expected equality expression' });
		result.push(lhs);
		while (true) {
			push();
			const operator = nextOf(TokenType.EqualOperator) ?? nextOf(TokenType.NotEqualOperator);
			if (!operator) {
				pop(false);
				break;
			}
			const rhs = parseComparisonExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(operator, rhs);
			pop();
		}
		return popTree({ type: TreeType.EqualityExpression, items: result });
	}

	function parseComparisonExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseShiftExpression();
		if (!lhs) return popError({ message: 'Expected comparison expression' });
		result.push(lhs);
		while (true) {
			push();
			const operator = nextOf(TokenType.LessThanEqualOperator) ??
				nextOf(TokenType.GreaterThanEqualOperator) ??
				nextOf(TokenType.LessThanOperator) ??
				nextOf(TokenType.GreaterThanOperator) ??
				nextOf(TokenType.AsKeyword) ??
				nextOf(TokenType.IsKeyword) ??
				nextOf(TokenType.InKeyword);
			if (!operator) {
				pop(false);
				break;
			}
			const rhs = operator.type === TokenType.AsKeyword || operator.type === TokenType.IsKeyword ?
				parseUnaryType() :
				parseShiftExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(operator, rhs);
			pop();
		}
		return popTree({ type: TreeType.ComparisonExpression, items: result });
	}

	function parseShiftExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseTermExpression();
		if (!lhs) return popError({ message: 'Expected shift expression' });
		result.push(lhs);
		while (true) {
			push();
			const operator = nextOf(TokenType.LeftShiftOperator) ??
				nextOf(TokenType.RightShiftOperator) ??
				nextOf(TokenType.UnsignedRightShiftOperator)
			if (!operator) {
				pop(false);
				break;
			}
			const rhs = parseTermExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(operator, rhs);
			pop();
		}
		return popTree({ type: TreeType.ShiftExpression, items: result });
	}

	function parseTermExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseFactorExpression();
		if (!lhs) return popError({ message: 'Expected term expression' });
		result.push(lhs);
		while (true) {
			push();
			const operator = nextOf(TokenType.PlusOperator) ?? nextOf(TokenType.MinusOperator);
			if (!operator) {
				pop(false);
				break;
			}
			result.push(operator);
			const rhs = parseFactorExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(rhs);
			pop();
		}
		return popTree({ type: TreeType.TermExpression, items: result });
	}

	function parseFactorExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseRangeExpression();
		if (!lhs) return popError({ message: 'Expected factor expression' });
		result.push(lhs);
		while (true) {
			push();
			const operator = nextOf(TokenType.TimesOperator) ??
				nextOf(TokenType.DivideOperator) ??
				nextOf(TokenType.ModuloOperator);
			if (!operator) {
				pop(false);
				break;
			}
			const rhs = parseRangeExpression();
			if (!rhs) {
				pop(false);
				break;
			}
			result.push(operator, rhs);
			pop();
		}
		return popTree({ type: TreeType.FactorExpression, items: result });
	}

	function parseRangeExpression(): Tree | undefined {
		push();
		const result = [];
		let lhs = parseUnaryExpression();
		const operator = nextOf(TokenType.InclusiveRangeOperator) ??
			nextOf(TokenType.ExclusiveRangeOperator);
		let rhs = operator ? parseUnaryExpression() : undefined;
		if (!lhs && !rhs) return popError({ message: 'Expected range expression' });
		if (lhs) result.push(lhs);
		if (operator) result.push(operator);
		if (rhs) result.push(rhs);
		return popTree({ type: TreeType.RangeExpression, items: result });
	}

	function parseUnaryExpression(): Tree | undefined {
		push();
		const result = [];
		let operator;
		while (operator =
			nextOf(TokenType.NotKeyword) ??
			nextOf(TokenType.NotOperator) ??
			nextOf(TokenType.PlusOperator) ??
			nextOf(TokenType.MinusOperator) ??
			nextOf(TokenType.TimesOperator) ??
			nextOf(TokenType.AndOperator)
		) result.push(operator);
		const operand = parseReferenceExpression();
		if (!operand) return popError({ message: 'Expected expression' });
		result.push(operand);
		return popTree({ type: TreeType.UnaryExpression, items: result });
	}

	function parseReferenceExpression(): Tree | undefined {
		push();
		const result = [];
		const lhs = parseValue();
		if (!lhs) return popError({ message: 'Expected value' });
		result.push(lhs);
		let match;
		while (match =
			parsePropertyAccess() ??
			parseOptionalPropertyAccess() ??
			parseArrayIndex() ??
			parseCall()
		) result.push(match);
		return popTree({ type: TreeType.ReferenceExpression, items: result });
	}

	function parseValue(): Tree | undefined {
		push();
		const result = [];
		let value = parseArrayInitializer() ??
			nextOf(TokenType.Identifier) ??
			nextOf(TokenType.StringLiteral) ??
			nextOf(TokenType.IntLiteral) ??
			nextOf(TokenType.FloatLiteral) ??
			nextOf(TokenType.BinaryLiteral) ??
			nextOf(TokenType.OctalLiteral) ??
			nextOf(TokenType.HexadecimalLiteral) ??
			nextOf(TokenType.BoolLiteral) ??
			nextOf(TokenType.NullKeyword) ??
			nextOf(TokenType.ThisKeyword) ??
			nextOf(TokenType.SuperKeyword);
		if (!value) value = parseCast();
		if (!value) {
			if (!nextOf(TokenType.OpenParenthesis)) return popError({ message: 'Expected value' });
			value = parseExpressionSequence();
			if (!value) return popError({ message: 'Expected expression sequence' });
			if (!nextOf(TokenType.CloseParenthesis)) return popError({ message: 'Unterminated expression sequence' });
		}
		result.push(value);
		return popTree({ type: TreeType.Value, items: result });
	}

	function parseCast(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.OpenParenthesis)) return popError({ message: 'Expected cast' });
		const type = parseUnaryType();
		if (!type) return popError({ message: 'Expected cast type' });
		if (!nextOf(TokenType.CloseParenthesis)) return popError({ message: 'Unterminated cast' });
		result.push(type);
		const value = parseValue();
		if (!value) return popError({ message: 'Expected cast value' });
		result.push(value);
		return popTree({ type: TreeType.Cast, items: result });
	}

	function parsePropertyAccess(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.AccessOperator)) return popError({ message: 'Expected member access' });
		const identifier = nextOf(TokenType.Identifier);
		if (!identifier) return popError({ message: 'Expected identifier' });
		result.push(identifier);
		return popTree({ type: TreeType.PropertyAccess, items: result });
	}

	function parseOptionalPropertyAccess(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.OptionalAccessOperator)) return popError({ message: 'Expected optional reference' });
		let match = nextOf(TokenType.Identifier) ??
			parseArrayIndex() ??
			parseCall();
		if (!match) return popError({ message: 'Expected reference' });
		result.push(match);
		return popTree({ type: TreeType.OptionalPropertyAccess, items: result });
	}

	function parseArrayIndex(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.OpenBracket)) return popError({ message: 'Expected array index' });
		const index = parseExpressionSequence();
		if (!index) return popError({ message: 'Expected expression sequence' });
		result.push(index);
		if (!nextOf(TokenType.CloseBracket)) return popError({ message: 'Unterminated array index' });
		return popTree({ type: TreeType.ArrayIndex, items: result });
	}

	function parseCall(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.OpenParenthesis)) return popError({ message: 'Expected function call' });
		while (true) {
			if (result.length && !nextOf(TokenType.CommaPunctuator)) break;
			const argument = parseCallArgument();
			if (!argument) {
				if (!result.length) break;
				return popError({ message: 'Expected function call argument' });
			}
			result.push(argument);
		}
		if (!nextOf(TokenType.CloseParenthesis)) return popError({ message: 'Unterminated function call' });
		return popTree({ type: TreeType.Call, items: result });
	}

	function parseArrayInitializer(): Tree | undefined {
		push();
		const result = [];
		if (!nextOf(TokenType.OpenBracket)) return popError({ message: 'Expected array initializer' });
		while (true) {
			if (result.length && !nextOf(TokenType.CommaPunctuator)) break;
			const value = parseArrayValue();
			if (!value) {
				if (!result.length) break;
				return popError({ message: 'Expected array value' });
			}
			result.push(value);
		}
		if (!nextOf(TokenType.CloseBracket)) return popError({ message: 'Unterminated array initializer' });
		return popTree({ type: TreeType.ArrayInitializer, items: result });
	}

	function parseArrayValue(): Tree | undefined {
		push();
		const result = [];
		const argument = parseAssignmentExpression();
		if (!argument) return popError({ message: 'Expected expression' });
		result.push(argument);
		return popTree({ type: TreeType.ArrayValue, items: result });
	}

	function parseCallArgument(): Tree | undefined {
		push();
		const result = [];
		const argument = parseAssignmentExpression();
		if (!argument) return popError({ message: 'Expected expression' });
		result.push(argument);
		return popTree({ type: TreeType.CallArgument, items: result });
	}

}
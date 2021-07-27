import { Token, TokenType } from './token';
import { Tree, TreeType } from './tree';
import { mutate, ParserError } from './utils';

export class Parser {
    readonly tokens: Token[];
    private stack: Token[][];
    private error: ParserError | null;

    constructor(tokens: Token[], source: string) {
        this.tokens = tokens.slice();
        this.stack = [this.tokens];
        this.error = null;
    }

    private current(): Token[] {
        return this.stack[this.stack.length - 1];
    }

    private parent(): Token[] {
        return this.stack[this.stack.length - 2];
    }

    private push() {
        this.stack.push(this.current().slice());
    }

    private pop(update: boolean = true) {
        const tokens = this.stack.pop();
        if (update) mutate(this.current(), tokens!);
    }

    private throw(error: ParserError, pop: boolean = true) {
        if (!this.error || error.start >= this.error.start) this.error = error;
        if (pop) this.pop(false);
        return undefined;
    }

    private tree(
        tree: Omit<Omit<Tree, 'start'>, 'stop'>,
        pop: boolean = true
    ): Tree {
        const start = this.start(this.parent());
        const stop = this.start(this.current());
        if (pop) this.pop();
        return { ...tree, start, stop };
    }

    private start(tokens: Token[] = this.current()): number {
        return tokens.length > 0
            ? tokens[0].start
            : this.tokens.length > 0
            ? this.tokens[this.tokens.length - 1].start
            : 0;
    }

    private stop(tokens: Token[] = this.current()): number {
        return tokens.length > 0
            ? tokens[0].stop
            : this.tokens.length > 0
            ? this.tokens[this.tokens.length - 1].stop
            : 0;
    }

    private consume(type: TokenType) {
        const tokens = this.current();
        if (tokens.length && tokens[0].type === type) return tokens.shift();
    }

    public ast(): Tree | ParserError {
        const result = this.parseBody();
        if (this.stack[0].length) {
            const token = this.stack[0][0];
            this.throw(
                new ParserError(
                    'Unexpected token',
                    token.text,
                    token.start,
                    token.stop
                ),
                false
            );
        }
        return !result || this.stack[0].length ? this.error! : result;
    }

    public parseBody(): Tree | undefined {
        this.push();
        const result = [];
        while (true) {
            const statement = this.parseStatement();
            if (!statement) break;
            result.push(statement);
        }
        return this.tree({ type: TreeType.Body, items: result });
    }

    public parseStatement(): Tree | undefined {
        this.push();
        const result = [];
        const statement =
            this.parseLabeledStatement() ??
            this.parseFieldStatement() ??
            this.parseExpressionStatement() ??
            this.parseDefStatement() ??
            this.parseIfStatement() ??
            this.parseWhileStatement() ??
            this.parseMatchStatement() ??
            this.parseDoStatement() ??
            this.parseForStatement() ??
            this.parseReturnStatement() ??
            this.parseContinueStatement() ??
            this.parseBreakStatement() ??
            this.parseBlockStatement() ??
            this.parseEmptyStatement();
        if (!statement)
            return this.throw(
                new ParserError(
                    'Expected statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(statement);
        return this.tree({ type: TreeType.Statement, items: result });
    }

    public parseLabeledStatement(): Tree | undefined {
        this.push();
        const result = [];
        const identifier = this.consume(TokenType.Identifier);
        if (!identifier)
            return this.throw(
                new ParserError(
                    'Expected labeled statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(identifier);
        if (!this.consume(TokenType.ColonPunctuator))
            return this.throw(
                new ParserError(
                    'Expected ":" after label',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const statement = this.parseStatement();
        if (!statement)
            return this.throw(
                new ParserError(
                    'Expected statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(statement);
        return this.tree({ type: TreeType.LabeledStatement, items: result });
    }

    public parseBlockStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.OpenBrace))
            return this.throw(
                new ParserError(
                    'Expected block statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        while (true) {
            const statement = this.parseStatement();
            if (!statement) break;
            result.push(statement);
        }
        if (!this.consume(TokenType.CloseBrace))
            return this.throw(
                new ParserError(
                    'Unterminated block statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.BlockStatement, items: result });
    }

    public parseIfStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.IfKeyword))
            return this.throw(
                new ParserError(
                    'Expected if statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (!this.consume(TokenType.OpenParenthesis))
            return this.throw(
                new ParserError(
                    'Expected if condition',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const condition = this.parseExpressionSequence();
        if (!condition)
            return this.throw(
                new ParserError(
                    'Expected expression sequence',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(condition);
        if (!this.consume(TokenType.CloseParenthesis))
            return this.throw(
                new ParserError(
                    'Unterminated if condition',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const statement = this.parseStatement();
        if (!statement)
            return this.throw(
                new ParserError(
                    'Expected statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(statement);
        if (this.consume(TokenType.ElseKeyword)) {
            const statement = this.parseStatement();
            if (!statement)
                return this.throw(
                    new ParserError(
                        'Expected statement',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            result.push(statement);
        }
        return this.tree({ type: TreeType.IfStatement, items: result });
    }

    public parseWhileStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.WhileKeyword))
            return this.throw(
                new ParserError(
                    'Expected while statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (!this.consume(TokenType.OpenParenthesis))
            return this.throw(
                new ParserError(
                    'Expected while condition',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const condition = this.parseExpressionSequence();
        if (!condition)
            return this.throw(
                new ParserError(
                    'Expected expression sequence',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(condition);
        if (!this.consume(TokenType.CloseParenthesis))
            return this.throw(
                new ParserError(
                    'Unterminated while condition',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const statement = this.parseStatement();
        if (!statement)
            return this.throw(
                new ParserError(
                    'Expected statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(statement);
        return this.tree({ type: TreeType.WhileStatement, items: result });
    }

    public parseMatchStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.MatchKeyword))
            return this.throw(
                new ParserError(
                    'Expected match statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (!this.consume(TokenType.OpenParenthesis))
            return this.throw(
                new ParserError(
                    'Expected match value',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const value = this.parseExpressionSequence();
        if (!value)
            return this.throw(
                new ParserError(
                    'Expected expression sequence',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(value);
        if (!this.consume(TokenType.CloseParenthesis))
            return this.throw(
                new ParserError(
                    'Unterminated match value',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (!this.consume(TokenType.OpenBrace))
            return this.throw(
                new ParserError(
                    'Expected match body',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        let match = false;
        while (true) {
            const option = this.parseMatchOption();
            if (!option) break;
            match = false;
            result.push(option);
        }
        const fallback = this.parseBody();
        if (fallback) result.push(fallback);
        else if (!match)
            return this.throw(
                new ParserError(
                    'Expected match options or fallback',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (!this.consume(TokenType.CloseBrace))
            return this.throw(
                new ParserError(
                    'Unterminated match body',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.MatchStatement, items: result });
    }

    public parseMatchOption(): Tree | undefined {
        this.push();
        const result = [];
        const expression = this.parseAssignmentExpression();
        if (!expression)
            return this.throw(
                new ParserError(
                    'Expected match option',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(expression);
        if (!this.consume(TokenType.ArrowOperator))
            return this.throw(
                new ParserError(
                    'Expected "=>"',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const body = this.parseStatement();
        if (!body)
            return this.throw(
                new ParserError(
                    'Expected match option body',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(body);
        return this.tree({ type: TreeType.MatchOption, items: result });
    }

    public parseDefStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.DefKeyword))
            return this.throw(
                new ParserError(
                    'Expected def statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const identifier = this.consume(TokenType.Identifier);
        if (!identifier)
            return this.throw(
                new ParserError(
                    'Expected identifier',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(identifier);
        const parameters = this.parseParameters();
        if (!parameters)
            return this.throw(
                new ParserError(
                    'Expected parameters',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(parameters);
        if (this.consume(TokenType.ColonPunctuator)) {
            const type = this.parseUnaryType();
            if (!type)
                return this.throw(
                    new ParserError(
                        'Expected type',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            result.push(type);
        }
        const statement =
            this.parseBlockStatement() ?? this.parseEmptyStatement();
        if (!statement)
            return this.throw(
                new ParserError(
                    'Expected def body',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(statement);
        return this.tree({ type: TreeType.DefStatement, items: result });
    }

    public parseParameters(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.OpenParenthesis))
            return this.throw(
                new ParserError(
                    'Expected parameters',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        while (true) {
            if (result.length && !this.consume(TokenType.CommaPunctuator))
                break;
            const parameter = this.parseParameter();
            if (!parameter) {
                if (!result.length) break;
                return this.throw(
                    new ParserError(
                        'Expected parameter',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            }
            result.push(parameter);
        }
        if (!this.consume(TokenType.CloseParenthesis))
            return this.throw(
                new ParserError(
                    'Unterminated parameters',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.Parameters, items: result });
    }

    public parseParameter(): Tree | undefined {
        this.push();
        const result = [];
        const item =
            this.consume(TokenType.Identifier) ??
            this.consume(TokenType.InclusiveRangeOperator);
        if (!item)
            return this.throw(
                new ParserError(
                    'Expected parameter',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(item);
        if (item.type === TokenType.Identifier) {
            if (!this.consume(TokenType.ColonPunctuator))
                return this.throw(
                    new ParserError(
                        'Expected ":" after parameter name',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            const type = this.parseUnaryType();
            if (!type)
                return this.throw(
                    new ParserError(
                        'Expected type',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            result.push(type);
        }
        return this.tree({ type: TreeType.Parameter, items: result });
    }

    public parseDoStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.DoKeyword))
            return this.throw(
                new ParserError(
                    'Expected do statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const statement = this.parseStatement();
        if (!statement)
            return this.throw(
                new ParserError(
                    'Expected statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(statement);
        if (!this.consume(TokenType.WhileKeyword))
            return this.throw(
                new ParserError(
                    'Expected while clause',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (!this.consume(TokenType.OpenParenthesis))
            return this.throw(
                new ParserError(
                    'Expected do condition',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const condition = this.parseExpressionSequence();
        if (!condition)
            return this.throw(
                new ParserError(
                    'Expected expression sequence',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(condition);
        if (!this.consume(TokenType.CloseParenthesis))
            return this.throw(
                new ParserError(
                    'Unterminated while condition',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.DoStatement, items: result });
    }

    public parseForStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.ForKeyword))
            return this.throw(
                new ParserError(
                    'Expected for statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (!this.consume(TokenType.OpenParenthesis))
            return this.throw(
                new ParserError(
                    'Expected for iterator',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const identifier = this.consume(TokenType.Identifier);
        if (!identifier)
            return this.throw(
                new ParserError(
                    'Expected identifier',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(identifier);
        if (!this.consume(TokenType.InKeyword))
            return this.throw(
                new ParserError(
                    'Expected in clause',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const expression = this.parseAssignmentExpression();
        if (!expression)
            return this.throw(
                new ParserError(
                    'Expected iterator expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(expression);
        if (!this.consume(TokenType.CloseParenthesis))
            return this.throw(
                new ParserError(
                    'Unterminated for iterator',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const statement = this.parseStatement();
        if (!statement)
            return this.throw(
                new ParserError(
                    'Expected statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(statement);
        return this.tree({ type: TreeType.ForStatement, items: result });
    }

    public parseReturnStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.ReturnKeyword))
            return this.throw(
                new ParserError(
                    'Expected return statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const value = this.parseExpressionSequence();
        if (value) result.push(value);
        if (!this.consume(TokenType.SemicolonPunctuator))
            return this.throw(
                new ParserError(
                    'Expected semicolon',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.ReturnStatement, items: result });
    }

    public parseContinueStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.ContinueKeyword))
            return this.throw(
                new ParserError(
                    'Expected continue statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const identifier = this.consume(TokenType.Identifier);
        if (identifier) result.push(identifier);
        if (!this.consume(TokenType.SemicolonPunctuator))
            return this.throw(
                new ParserError(
                    'Expected semicolon',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.ContinueStatement, items: result });
    }

    public parseBreakStatement(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.BreakKeyword))
            return this.throw(
                new ParserError(
                    'Expected break statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const identifier = this.consume(TokenType.Identifier);
        if (identifier) result.push(identifier);
        if (!this.consume(TokenType.SemicolonPunctuator))
            return this.throw(
                new ParserError(
                    'Expected semicolon',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.BreakStatement, items: result });
    }

    public parseEmptyStatement(): Tree | undefined {
        this.push();
        if (!this.consume(TokenType.SemicolonPunctuator))
            return this.throw(
                new ParserError(
                    'Expected semicolon',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.EmptyStatement, items: [] });
    }

    public parseExpressionStatement(): Tree | undefined {
        this.push();
        const result = [];
        const expressions = this.parseExpressionSequence();
        if (!expressions)
            return this.throw(
                new ParserError(
                    'Expected expression sequence',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(expressions);
        if (!this.consume(TokenType.SemicolonPunctuator))
            return this.throw(
                new ParserError(
                    'Expected semicolon',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.ExpressionStatement, items: result });
    }

    public parseFieldStatement(): Tree | undefined {
        this.push();
        const result = [];
        const keyword =
            this.consume(TokenType.ValKeyword) ??
            this.consume(TokenType.VarKeyword);
        if (!keyword)
            return this.throw(
                new ParserError(
                    'Expected field statement',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(keyword);
        const identifier = this.consume(TokenType.Identifier);
        if (!identifier)
            return this.throw(
                new ParserError(
                    'Expected field name ',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(identifier);
        if (this.consume(TokenType.ColonPunctuator)) {
            const type = this.parseUnionType();
            if (!type)
                return this.throw(
                    new ParserError(
                        'Expected field type',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            result.push(type);
        }
        if (this.consume(TokenType.AssignOperator)) {
            const expression = this.parseAssignmentExpression();
            if (!expression)
                return this.throw(
                    new ParserError(
                        'Expected expression',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            result.push(expression);
        }
        if (!this.consume(TokenType.SemicolonPunctuator))
            return this.throw(
                new ParserError(
                    'Expected semicolon',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.FieldStatement, items: result });
    }

    public parseUnionType(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseIntersectionType();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected union type',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.OrOperator)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseIntersectionType();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.UnionType, items: result });
    }

    public parseIntersectionType(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseUnaryType();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected intersection type',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.AndOperator)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseUnaryType();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.IntersectionType, items: result });
    }

    public parseUnaryType(): Tree | undefined {
        this.push();
        const result = [];
        const base =
            this.consume(TokenType.Identifier) ??
            this.consume(TokenType.IntegerType) ??
            this.consume(TokenType.UnsignedIntegerType) ??
            this.consume(TokenType.FloatType) ??
            this.consume(TokenType.BooleanType) ??
            this.consume(TokenType.StringType) ??
            this.consume(TokenType.VoidType);
        if (!base)
            return this.throw(
                new ParserError(
                    'Expected type or identifier',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(base);
        while (true) {
            const match = this.parseGenericType() ?? this.parseArrayType();
            if (match) {
                result.push(match);
                continue;
            }
            const operator =
                this.consume(TokenType.TimesOperator) ??
                this.consume(TokenType.OptionalOperator);
            if (!operator) break;
            result.push(operator);
        }
        return this.tree({ type: TreeType.UnaryType, items: result });
    }

    public parseArrayType(): Tree | undefined {
        this.push();
        if (!this.consume(TokenType.OpenBracket))
            return this.throw(
                new ParserError(
                    'Expected array type modifier',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (!this.consume(TokenType.CloseBracket))
            return this.throw(
                new ParserError(
                    'Unterminated array type modifier',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.ArrayType, items: [] });
    }

    public parseGenericType(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.LessThanOperator))
            return this.throw(
                new ParserError(
                    'Expected generic type arguments',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const lhs = this.parseUnionType();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected generic type argument',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.CommaPunctuator)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseUnionType();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        if (!this.consume(TokenType.GreaterThanOperator))
            return this.throw(
                new ParserError(
                    'Unterminated generic type arguments',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.GenericType, items: result });
    }

    public parseExpressionSequence(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseAssignmentExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected expression sequence',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.CommaPunctuator)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseAssignmentExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.ExpressionSequence, items: result });
    }

    public parseAssignmentExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseTernaryExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected assignment expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        this.push();
        const operator =
            this.consume(TokenType.PlusAssignOperator) ??
            this.consume(TokenType.MinusAssignOperator) ??
            this.consume(TokenType.TimesAssignOperator) ??
            this.consume(TokenType.DivideAssignOperator) ??
            this.consume(TokenType.ModuloAssignOperator) ??
            this.consume(TokenType.AndAssignOperator) ??
            this.consume(TokenType.OrAssignOperator) ??
            this.consume(TokenType.XorAssignOperator) ??
            this.consume(TokenType.CoalesceAssignOperator) ??
            this.consume(TokenType.LeftShiftAssignOperator) ??
            this.consume(TokenType.RightShiftAssignOperator) ??
            this.consume(TokenType.UnsignedRightShiftAssignOperator) ??
            this.consume(TokenType.AssignOperator);
        if (operator) {
            const rhs = this.parseTernaryExpression();
            if (rhs) {
                result.push(operator, rhs);
                this.pop();
            } else {
                this.pop(false);
            }
        } else {
            this.pop(false);
        }
        return this.tree({
            type: TreeType.AssignmentExpression,
            items: result,
        });
    }

    public parseTernaryExpression(): Tree | undefined {
        this.push();
        const result = [];
        const condition = this.parseCoalesceExpression();
        if (!condition)
            return this.throw(
                new ParserError(
                    'Expected ternary expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(condition);
        this.push();
        ternary: if (this.consume(TokenType.OptionalOperator)) {
            const lhs = this.parseAssignmentExpression();
            if (!lhs) {
                this.pop(false);
                break ternary;
            }
            if (!this.consume(TokenType.ColonPunctuator)) {
                this.pop(false);
                break ternary;
            }
            const rhs = this.parseAssignmentExpression();
            if (!rhs) {
                this.pop(false);
                break ternary;
            }
            result.push(lhs, rhs);
            this.pop();
        } else {
            this.pop(false);
        }
        return this.tree({ type: TreeType.TernaryExpression, items: result });
    }

    public parseCoalesceExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseLogicalOrExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected coalesce expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.CoalesceOperator)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseLogicalOrExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.CoalesceExpression, items: result });
    }

    public parseLogicalOrExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseLogicalAndExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected logical or expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.OrKeyword)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseLogicalAndExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.LogicalOrExpression, items: result });
    }

    public parseLogicalAndExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseBitwiseOrExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected logical and expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.AndKeyword)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseBitwiseOrExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({
            type: TreeType.LogicalAndExpression,
            items: result,
        });
    }

    public parseBitwiseOrExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseBitwiseXorExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected bitwise or expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.OrOperator)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseBitwiseXorExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.BitwiseOrExpression, items: result });
    }

    public parseBitwiseXorExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseBitwiseAndExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected bitwise xor expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.XorOperator)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseBitwiseAndExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({
            type: TreeType.BitwiseXorExpression,
            items: result,
        });
    }

    public parseBitwiseAndExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseEqualityExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected bitwise and expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            if (!this.consume(TokenType.AndOperator)) {
                this.pop(false);
                break;
            }
            const rhs = this.parseEqualityExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({
            type: TreeType.BitwiseAndExpression,
            items: result,
        });
    }

    public parseEqualityExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseComparisonExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected equality expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            const operator =
                this.consume(TokenType.EqualOperator) ??
                this.consume(TokenType.NotEqualOperator);
            if (!operator) {
                this.pop(false);
                break;
            }
            const rhs = this.parseComparisonExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(operator, rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.EqualityExpression, items: result });
    }

    public parseComparisonExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseShiftExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected comparison expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            const operator =
                this.consume(TokenType.LessThanEqualOperator) ??
                this.consume(TokenType.GreaterThanEqualOperator) ??
                this.consume(TokenType.LessThanOperator) ??
                this.consume(TokenType.GreaterThanOperator) ??
                this.consume(TokenType.AsKeyword) ??
                this.consume(TokenType.IsKeyword) ??
                this.consume(TokenType.InKeyword);
            if (!operator) {
                this.pop(false);
                break;
            }
            const rhs =
                operator.type === TokenType.AsKeyword ||
                operator.type === TokenType.IsKeyword
                    ? this.parseUnaryType()
                    : this.parseShiftExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(operator, rhs);
            this.pop();
        }
        return this.tree({
            type: TreeType.ComparisonExpression,
            items: result,
        });
    }

    public parseShiftExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseTermExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected shift expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            const operator =
                this.consume(TokenType.LeftShiftOperator) ??
                this.consume(TokenType.RightShiftOperator) ??
                this.consume(TokenType.UnsignedRightShiftOperator);
            if (!operator) {
                this.pop(false);
                break;
            }
            const rhs = this.parseTermExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(operator, rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.ShiftExpression, items: result });
    }

    public parseTermExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseFactorExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected term expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            const operator =
                this.consume(TokenType.PlusOperator) ??
                this.consume(TokenType.MinusOperator);
            if (!operator) {
                this.pop(false);
                break;
            }
            result.push(operator);
            const rhs = this.parseFactorExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.TermExpression, items: result });
    }

    public parseFactorExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseRangeExpression();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected factor expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        while (true) {
            this.push();
            const operator =
                this.consume(TokenType.TimesOperator) ??
                this.consume(TokenType.DivideOperator) ??
                this.consume(TokenType.ModuloOperator);
            if (!operator) {
                this.pop(false);
                break;
            }
            const rhs = this.parseRangeExpression();
            if (!rhs) {
                this.pop(false);
                break;
            }
            result.push(operator, rhs);
            this.pop();
        }
        return this.tree({ type: TreeType.FactorExpression, items: result });
    }

    public parseRangeExpression(): Tree | undefined {
        this.push();
        const result = [];
        let lhs = this.parseUnaryExpression();
        const operator =
            this.consume(TokenType.InclusiveRangeOperator) ??
            this.consume(TokenType.ExclusiveRangeOperator);
        let rhs = operator ? this.parseUnaryExpression() : undefined;
        if (!lhs && !rhs)
            return this.throw(
                new ParserError(
                    'Expected range expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (lhs) result.push(lhs);
        if (operator) result.push(operator);
        if (rhs) result.push(rhs);
        return this.tree({ type: TreeType.RangeExpression, items: result });
    }

    public parseUnaryExpression(): Tree | undefined {
        this.push();
        const result = [];
        let operator;
        while (
            (operator =
                this.consume(TokenType.NotKeyword) ??
                this.consume(TokenType.NotOperator) ??
                this.consume(TokenType.PlusOperator) ??
                this.consume(TokenType.MinusOperator) ??
                this.consume(TokenType.TimesOperator) ??
                this.consume(TokenType.AndOperator))
        )
            result.push(operator);
        const operand = this.parseReferenceExpression();
        if (!operand)
            return this.throw(
                new ParserError(
                    'Expected expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(operand);
        return this.tree({ type: TreeType.UnaryExpression, items: result });
    }

    public parseReferenceExpression(): Tree | undefined {
        this.push();
        const result = [];
        const lhs = this.parseValue();
        if (!lhs)
            return this.throw(
                new ParserError(
                    'Expected value',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(lhs);
        let match;
        while (
            (match =
                this.parsePropertyAccess() ??
                this.parseOptionalPropertyAccess() ??
                this.parseArrayIndex() ??
                this.parseCall())
        )
            result.push(match);
        return this.tree({ type: TreeType.ReferenceExpression, items: result });
    }

    public parseValue(): Tree | undefined {
        this.push();
        const result = [];
        let value =
            this.parseArrayInitializer() ??
            this.consume(TokenType.Identifier) ??
            this.consume(TokenType.StringLiteral) ??
            this.consume(TokenType.IntLiteral) ??
            this.consume(TokenType.FloatLiteral) ??
            this.consume(TokenType.BinaryLiteral) ??
            this.consume(TokenType.OctalLiteral) ??
            this.consume(TokenType.HexadecimalLiteral) ??
            this.consume(TokenType.BoolLiteral) ??
            this.consume(TokenType.NullKeyword) ??
            this.consume(TokenType.ThisKeyword) ??
            this.consume(TokenType.SuperKeyword);
        if (!value) value = this.parseCast();
        if (!value) {
            if (!this.consume(TokenType.OpenParenthesis))
                return this.throw(
                    new ParserError(
                        'Expected value',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            value = this.parseExpressionSequence();
            if (!value)
                return this.throw(
                    new ParserError(
                        'Expected expression sequence',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            if (!this.consume(TokenType.CloseParenthesis))
                return this.throw(
                    new ParserError(
                        'Unterminated expression sequence',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
        }
        result.push(value);
        return this.tree({ type: TreeType.Value, items: result });
    }

    public parseCast(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.OpenParenthesis))
            return this.throw(
                new ParserError(
                    'Expected cast',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const type = this.parseUnaryType();
        if (!type)
            return this.throw(
                new ParserError(
                    'Expected cast type',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        if (!this.consume(TokenType.CloseParenthesis))
            return this.throw(
                new ParserError(
                    'Unterminated cast',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(type);
        const value = this.parseValue();
        if (!value)
            return this.throw(
                new ParserError(
                    'Expected cast value',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(value);
        return this.tree({ type: TreeType.Cast, items: result });
    }

    public parsePropertyAccess(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.AccessOperator))
            return this.throw(
                new ParserError(
                    'Expected member access',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const identifier = this.consume(TokenType.Identifier);
        if (!identifier)
            return this.throw(
                new ParserError(
                    'Expected identifier',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(identifier);
        return this.tree({ type: TreeType.PropertyAccess, items: result });
    }

    public parseOptionalPropertyAccess(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.OptionalAccessOperator))
            return this.throw(
                new ParserError(
                    'Expected optional reference',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        let match =
            this.consume(TokenType.Identifier) ??
            this.parseArrayIndex() ??
            this.parseCall();
        if (!match)
            return this.throw(
                new ParserError(
                    'Expected reference',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(match);
        return this.tree({
            type: TreeType.OptionalPropertyAccess,
            items: result,
        });
    }

    public parseArrayIndex(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.OpenBracket))
            return this.throw(
                new ParserError(
                    'Expected array index',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        const index = this.parseExpressionSequence();
        if (!index)
            return this.throw(
                new ParserError(
                    'Expected expression sequence',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(index);
        if (!this.consume(TokenType.CloseBracket))
            return this.throw(
                new ParserError(
                    'Unterminated array index',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.ArrayIndex, items: result });
    }

    public parseCall(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.OpenParenthesis))
            return this.throw(
                new ParserError(
                    'Expected call',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        while (true) {
            if (result.length && !this.consume(TokenType.CommaPunctuator))
                break;
            const argument = this.parseCallArgument();
            if (!argument) {
                if (!result.length) break;
                return this.throw(
                    new ParserError(
                        'Expected call argument',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            }
            result.push(argument);
        }
        if (!this.consume(TokenType.CloseParenthesis))
            return this.throw(
                new ParserError(
                    'Unterminated call',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.Call, items: result });
    }

    public parseArrayInitializer(): Tree | undefined {
        this.push();
        const result = [];
        if (!this.consume(TokenType.OpenBracket))
            return this.throw(
                new ParserError(
                    'Expected array initializer',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        while (true) {
            if (result.length && !this.consume(TokenType.CommaPunctuator))
                break;
            const value = this.parseArrayValue();
            if (!value) {
                if (!result.length) break;
                return this.throw(
                    new ParserError(
                        'Expected array value',
                        null,
                        this.start(),
                        this.stop()
                    )
                );
            }
            result.push(value);
        }
        if (!this.consume(TokenType.CloseBracket))
            return this.throw(
                new ParserError(
                    'Unterminated array initializer',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        return this.tree({ type: TreeType.ArrayInitializer, items: result });
    }

    public parseArrayValue(): Tree | undefined {
        this.push();
        const result = [];
        const argument = this.parseAssignmentExpression();
        if (!argument)
            return this.throw(
                new ParserError(
                    'Expected expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(argument);
        return this.tree({ type: TreeType.ArrayValue, items: result });
    }

    public parseCallArgument(): Tree | undefined {
        this.push();
        const result = [];
        const argument = this.parseAssignmentExpression();
        if (!argument)
            return this.throw(
                new ParserError(
                    'Expected expression',
                    null,
                    this.start(),
                    this.stop()
                )
            );
        result.push(argument);
        return this.tree({ type: TreeType.CallArgument, items: result });
    }
}

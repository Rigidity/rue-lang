import { Token, TokenType } from './token';
import { LexerError } from './utils';

export const keywords: Record<string, TokenType> = {
    and: TokenType.AndKeyword,
    or: TokenType.OrKeyword,
    not: TokenType.NotKeyword,
    for: TokenType.ForKeyword,
    while: TokenType.WhileKeyword,
    continue: TokenType.ContinueKeyword,
    break: TokenType.BreakKeyword,
    return: TokenType.ReturnKeyword,
    macro: TokenType.MacroKeyword,
    public: TokenType.PublicKeyword,
    private: TokenType.PrivateKeyword,
    protected: TokenType.ProtectedKeyword,
    do: TokenType.DoKeyword,
    is: TokenType.IsKeyword,
    as: TokenType.AsKeyword,
    if: TokenType.IfKeyword,
    else: TokenType.ElseKeyword,
    try: TokenType.TryKeyword,
    catch: TokenType.CatchKeyword,
    throw: TokenType.ThrowKeyword,
    def: TokenType.DefKeyword,
    val: TokenType.ValKeyword,
    var: TokenType.VarKeyword,
    in: TokenType.InKeyword,
    match: TokenType.MatchKeyword,
    from: TokenType.FromKeyword,
    import: TokenType.ImportKeyword,
    export: TokenType.ExportKeyword,
    extern: TokenType.ExternKeyword,
    type: TokenType.TypeKeyword,
    enum: TokenType.EnumKeyword,
    struct: TokenType.StructKeyword,
    class: TokenType.ClassKeyword,
    void: TokenType.VoidType,
    int: TokenType.IntegerType,
    i8: TokenType.IntegerType,
    i16: TokenType.IntegerType,
    i32: TokenType.IntegerType,
    i64: TokenType.IntegerType,
    uint: TokenType.UnsignedIntegerType,
    u8: TokenType.UnsignedIntegerType,
    u16: TokenType.UnsignedIntegerType,
    u32: TokenType.UnsignedIntegerType,
    u64: TokenType.UnsignedIntegerType,
    float: TokenType.FloatType,
    f32: TokenType.FloatType,
    f64: TokenType.FloatType,
    bool: TokenType.BooleanType,
    string: TokenType.StringType,
    true: TokenType.BoolLiteral,
    false: TokenType.BoolLiteral,
    super: TokenType.SuperKeyword,
    this: TokenType.ThisKeyword,
    null: TokenType.NullKeyword,
};

export const operators: Record<string, TokenType> = {
    '==': TokenType.EqualOperator,
    '!=': TokenType.NotEqualOperator,
    '+=': TokenType.PlusAssignOperator,
    '-=': TokenType.MinusAssignOperator,
    '*=': TokenType.TimesAssignOperator,
    '/=': TokenType.DivideAssignOperator,
    '%=': TokenType.ModuloAssignOperator,
    '&=': TokenType.AndAssignOperator,
    '|=': TokenType.OrAssignOperator,
    '^=': TokenType.XorAssignOperator,
    '?=': TokenType.CoalesceAssignOperator,
    '<<=': TokenType.LeftShiftAssignOperator,
    '>>>=': TokenType.UnsignedRightShiftAssignOperator,
    '>>=': TokenType.RightShiftAssignOperator,
    '=>': TokenType.ArrowOperator,
    '=': TokenType.AssignOperator,
    '+': TokenType.PlusOperator,
    '-': TokenType.MinusOperator,
    '*': TokenType.TimesOperator,
    '/': TokenType.DivideOperator,
    '%': TokenType.ModuloOperator,
    '~': TokenType.NotOperator,
    '?:': TokenType.CoalesceOperator,
    '&': TokenType.AndOperator,
    '|': TokenType.OrOperator,
    '^': TokenType.XorOperator,
    '<<': TokenType.LeftShiftOperator,
    '>>>': TokenType.UnsignedRightShiftOperator,
    '>>': TokenType.RightShiftOperator,
    '<=': TokenType.LessThanEqualOperator,
    '>=': TokenType.GreaterThanEqualOperator,
    '<': TokenType.LessThanOperator,
    '>': TokenType.GreaterThanOperator,
    '?.': TokenType.OptionalAccessOperator,
    '?': TokenType.OptionalOperator,
    '...': TokenType.InclusiveRangeOperator,
    '..': TokenType.ExclusiveRangeOperator,
    '.': TokenType.AccessOperator,
    '(': TokenType.OpenParenthesis,
    ')': TokenType.CloseParenthesis,
    '[': TokenType.OpenBracket,
    ']': TokenType.CloseBracket,
    '{': TokenType.OpenBrace,
    '}': TokenType.CloseBrace,
    ';': TokenType.SemicolonPunctuator,
    ':': TokenType.ColonPunctuator,
    ',': TokenType.CommaPunctuator,
    _: TokenType.UnderscorePunctuator,
};

const operatorEntries = Object.entries(operators);

export class Lexer {
    readonly source: string;
    private text: string;

    constructor(source: string) {
        this.source = source;
        this.text = source;
    }

    public index() {
        return this.source.length - this.text.length;
    }

    public tokens(): Token[] | LexerError {
        const tokens = [];
        while (this.index() < this.source.length) {
            const token = this.consume();
            if (token instanceof LexerError) return token;
            if (token) tokens.push(token);
        }
        return tokens;
    }

    public consume(): Token | LexerError | undefined {
        const start = this.index();
        if (this.index() >= this.source.length)
            return new LexerError('Unexpected end of file', '', start, start);
        let match;
        if (
            (match =
                this.text.match(/^[\r\n\f\v\t ]/) ??
                this.text.match(/^\/\/.*/) ??
                this.text.match(/^\/\*[^]*?\*\//))
        ) {
            this.eat(match[0].length);
            return undefined;
        }
        if ((match = this.text.match(/^[a-zA-Z](?:_?[a-zA-Z0-9]+)*/))) {
            this.eat(match[0].length);
            if (match[0] in keywords) {
                return {
                    type: keywords[match[0]],
                    text: match[0],
                    start: start,
                    stop: this.index(),
                };
            } else {
                return {
                    type: TokenType.Identifier,
                    text: match[0],
                    start: start,
                    stop: this.index(),
                };
            }
        }
        if ((match = this.text.match(/^0[xX][0-9a-fA-F]+/)) !== null) {
            this.eat(match[0].length);
            return {
                type: TokenType.HexadecimalLiteral,
                text: match[0],
                start: start,
                stop: this.index(),
            };
        } else if ((match = this.text.match(/^0[oO][0-7]+/)) !== null) {
            this.eat(match[0].length);
            return {
                type: TokenType.OctalLiteral,
                text: match[0],
                start: start,
                stop: this.index(),
            };
        } else if ((match = this.text.match(/^0[bB][0-1]+/)) !== null) {
            this.eat(match[0].length);
            return {
                type: TokenType.BinaryLiteral,
                text: match[0],
                start: start,
                stop: this.index(),
            };
        } else if (
            (match = this.text.match(
                /^[0-9]+\.[0-9]+(?:[eE][+\-]?[0-9]+)?/
            )) !== null
        ) {
            this.eat(match[0].length);
            return {
                type: TokenType.FloatLiteral,
                text: match[0],
                start: start,
                stop: this.index(),
            };
        } else if (
            (match = this.text.match(/^[0-9]+(?:[eE][+\-]?[0-9]+)?/)) !== null
        ) {
            this.eat(match[0].length);
            return {
                type: TokenType.IntLiteral,
                text: match[0],
                start: start,
                stop: this.index(),
            };
        } else if (/^['"]/.test(this.text[0])) {
            let string = this.text[0];
            this.eat(1);
            let closed = false;
            while (this.text.length > 0) {
                const char = this.text[0];
                this.eat(1);
                if (char === '\\') {
                    const escape = this.text[0];
                    if (!escape) {
                        return new LexerError(
                            'Unexpected end of escape',
                            null,
                            start,
                            this.index()
                        );
                    }
                    this.eat(1);
                    if (escape === 'n') string += '\n';
                    else if (escape === 'r') string += '\r';
                    else if (escape === 'n') string += '\n';
                    else if (escape === 'f') string += '\f';
                    else if (escape === 'v') string += '\v';
                    else if (escape === 't') string += '\t';
                    else if (escape === 'b') string += '\b';
                    else if (escape === '0') string += '\0';
                    else if (escape === 'x') {
                        const hex = this.text.slice(0, 2);
                        if (!/^[0-9A-F]{2}$/.test(hex)) {
                            return new LexerError(
                                'Invalid or lowercase hexadecimal escape sequence',
                                null,
                                start,
                                this.index()
                            );
                        }
                        this.eat(2);
                        const number = parseInt(hex, 16);
                        string += String.fromCharCode(number);
                    } else if (escape === 'u') {
                        const next = this.text[0];
                        if (next === '{') {
                            this.eat(1);
                            let hex = '';
                            for (let i = 0; i < this.text.length; i++) {
                                hex += this.text[i];
                                if (this.text[i] === '}') break;
                            }
                            if (!hex.endsWith('}')) {
                                return new LexerError(
                                    'Invalid or lowercase unicode escape sequence',
                                    null,
                                    start,
                                    this.index()
                                );
                            }
                            hex = hex.slice(0, -1);
                            const number = parseInt(hex, 16);
                            if (number > 0x10ffff) {
                                return new LexerError(
                                    'Out of range unicode escape sequence',
                                    null,
                                    start,
                                    this.index()
                                );
                            }
                            string += String.fromCharCode(number);
                            this.eat(hex.length + 1);
                        } else {
                            const hex = this.text.slice(0, 4);
                            if (!/^[0-9A-F]{4}$/.test(hex)) {
                                return new LexerError(
                                    'Invalid or lowercase unicode escape sequence',
                                    null,
                                    start,
                                    this.index()
                                );
                            }
                            this.eat(4);
                            const number = parseInt(hex, 16);
                            string += String.fromCharCode(number);
                        }
                    } else string += escape;
                } else {
                    string += char;
                    if (char === string[0]) {
                        closed = true;
                        break;
                    }
                }
            }
            if (!closed) {
                return new LexerError(
                    'Unterminated string literal',
                    null,
                    start,
                    this.index()
                );
            }
            return {
                type: TokenType.StringLiteral,
                text: string.slice(1, -1),
                start: start,
                stop: this.index(),
            };
        } else if (
            (match =
                operatorEntries.find((entry) =>
                    this.text.startsWith(entry[0])
                ) ?? null)
        ) {
            this.eat(match[0].length);
            return {
                type: match[1],
                text: match[0],
                start: start,
                stop: this.index(),
            };
        }
        return new LexerError(
            `Unexpected character`,
            this.text[0],
            start,
            this.index() + 1
        );
    }

    private eat(chars: number) {
        this.text = this.text.slice(chars);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TokenKind {
    Unknown,
    Whitespace,
    BlockComment { is_terminated: bool },
    LineComment,

    String { is_terminated: bool },
    Ident,

    Fn,

    OpenParen,
    CloseParen,
    OpenBrace,
    CloseBrace,

    GreaterThan,
    Minus,
}

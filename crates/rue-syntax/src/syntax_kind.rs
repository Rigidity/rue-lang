use num_derive::{FromPrimitive, ToPrimitive};

#[derive(
    Debug, Default, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, ToPrimitive, FromPrimitive,
)]
pub enum SyntaxKind {
    #[default]
    Eof,
    Error,

    Whitespace,
    BlockComment,
    LineComment,

    String,
    Ident,

    Fn,

    OpenParen,
    CloseParen,
    OpenBrace,
    CloseBrace,

    GreaterThan,
    Minus,

    Program,
}

impl SyntaxKind {
    pub fn is_trivia(self) -> bool {
        matches!(
            self,
            SyntaxKind::Whitespace | SyntaxKind::BlockComment | SyntaxKind::LineComment
        )
    }
}

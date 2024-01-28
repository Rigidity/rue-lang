use rowan::{GreenNodeBuilder, Language};
use rue_lexer::{Token, TokenKind};
use rue_syntax::{RueLang, SyntaxKind, SyntaxNode};

pub struct Parser<'a> {
    tokens: Vec<(SyntaxKind, &'a str)>,
    pos: usize,
    builder: GreenNodeBuilder<'static>,
    errors: Vec<String>,
}

impl<'a> Parser<'a> {
    pub fn new(tokens: &[Token<'a>]) -> Self {
        Self {
            tokens: tokens.iter().map(convert_token).collect(),
            pos: 0,
            builder: GreenNodeBuilder::new(),
            errors: Vec::new(),
        }
    }

    pub fn build(self) -> SyntaxNode {
        SyntaxNode::new_root(self.builder.finish())
    }

    pub fn start(&mut self, kind: SyntaxKind) {
        self.builder.start_node(RueLang::kind_to_raw(kind));
    }

    pub fn finish(&mut self) {
        self.eat_trivia();
        self.builder.finish_node();
    }

    pub fn at(&mut self, kind: SyntaxKind) -> bool {
        // TODO: Composite checks
        self.peek() == kind
    }

    pub fn expect(&mut self, kind: SyntaxKind) -> bool {
        if self.eat(kind) {
            true
        } else {
            self.error(format!("expected {kind:?}"));
            false
        }
    }

    pub fn eat(&mut self, kind: SyntaxKind) -> bool {
        // TODO: Composite checks
        if self.peek() == kind {
            self.bump();
            true
        } else {
            false
        }
    }

    fn error(&mut self, message: String) {
        self.errors.push(message);
        self.start(SyntaxKind::Error);
        self.bump();
        self.finish();
    }

    fn peek(&mut self) -> SyntaxKind {
        self.eat_trivia();
        self.peek_raw()
    }

    fn bump(&mut self) -> SyntaxKind {
        self.eat_trivia();
        self.consume_token()
    }

    fn nth_raw(&self, index: usize) -> SyntaxKind {
        self.tokens
            .get(self.pos + index)
            .map(|token| token.0)
            .unwrap_or_default()
    }

    fn peek_raw(&self) -> SyntaxKind {
        self.nth_raw(0)
    }

    fn eat_trivia(&mut self) {
        while self.peek_raw().is_trivia() {
            self.consume_token();
        }
    }

    fn consume_token(&mut self) -> SyntaxKind {
        let Some(token) = self.tokens.get(self.pos) else {
            return SyntaxKind::Eof;
        };
        self.builder.token(RueLang::kind_to_raw(token.0), token.1);
        self.pos += 1;
        token.0
    }
}

fn convert_token<'a>(token: &Token<'a>) -> (SyntaxKind, &'a str) {
    let kind = match token.kind() {
        TokenKind::Unknown => SyntaxKind::Error,
        TokenKind::Whitespace => SyntaxKind::Whitespace,
        TokenKind::BlockComment { is_terminated: _ } => SyntaxKind::BlockComment,
        TokenKind::LineComment => SyntaxKind::LineComment,

        TokenKind::String { is_terminated: _ } => SyntaxKind::String,
        TokenKind::Ident => SyntaxKind::Ident,

        TokenKind::Fn => SyntaxKind::Fn,

        TokenKind::OpenParen => SyntaxKind::OpenParen,
        TokenKind::CloseParen => SyntaxKind::CloseParen,
        TokenKind::OpenBrace => SyntaxKind::OpenBrace,
        TokenKind::CloseBrace => SyntaxKind::CloseBrace,

        TokenKind::GreaterThan => SyntaxKind::GreaterThan,
        TokenKind::Minus => SyntaxKind::Minus,
    };
    (kind, token.text())
}

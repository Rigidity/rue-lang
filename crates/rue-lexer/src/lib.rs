use std::str::Chars;

mod token;
mod token_kind;

pub use token::*;
pub use token_kind::*;

pub struct Lexer<'a> {
    source: &'a str,
    chars: Chars<'a>,
    pos: usize,
}

impl<'a> Lexer<'a> {
    pub fn new(source: &'a str) -> Self {
        let chars = source.chars();
        Self {
            source,
            chars,
            pos: 0,
        }
    }

    fn next_token(&mut self) -> Token<'a> {
        let start = self.pos;

        let kind = match self.bump() {
            '(' => TokenKind::OpenParen,
            ')' => TokenKind::CloseParen,
            '{' => TokenKind::OpenBrace,
            '}' => TokenKind::CloseBrace,

            '-' => TokenKind::Minus,
            '>' => TokenKind::GreaterThan,

            '/' => match self.peek() {
                '/' => self.line_comment(),
                '*' => self.block_comment(),
                _ => TokenKind::Unknown,
            },

            c @ ('\'' | '"') => self.string(c),
            c if c.is_whitespace() => self.whitespace(),
            c if is_id_start(c) => self.ident(c),
            _ => TokenKind::Unknown,
        };

        Token::new(kind, &self.source[start..self.pos])
    }

    fn line_comment(&mut self) -> TokenKind {
        self.bump();
        while !matches!(self.peek(), '\0' | '\n') {
            self.bump();
        }
        TokenKind::LineComment
    }

    fn block_comment(&mut self) -> TokenKind {
        self.bump();
        loop {
            match self.bump() {
                '\0' => {
                    return TokenKind::BlockComment {
                        is_terminated: false,
                    }
                }
                '*' if self.peek() == '/' => {
                    self.bump();
                    return TokenKind::BlockComment {
                        is_terminated: true,
                    };
                }
                _ => {}
            }
        }
    }

    fn string(&mut self, quote: char) -> TokenKind {
        loop {
            match self.bump() {
                '\0' => {
                    return TokenKind::String {
                        is_terminated: false,
                    }
                }
                c if c == quote => {
                    return TokenKind::String {
                        is_terminated: true,
                    }
                }
                _ => {}
            }
        }
    }

    fn whitespace(&mut self) -> TokenKind {
        while self.peek().is_whitespace() {
            self.bump();
        }
        TokenKind::Whitespace
    }

    fn ident(&mut self, c: char) -> TokenKind {
        let mut ident = String::from(c);

        while is_id_continue(self.peek()) {
            ident.push(self.bump());
        }

        match ident.as_str() {
            "fn" => TokenKind::Fn,
            _ => TokenKind::Ident,
        }
    }

    fn peek(&self) -> char {
        self.chars.clone().next().unwrap_or('\0')
    }

    fn bump(&mut self) -> char {
        match self.chars.next() {
            Some(c) => {
                self.pos += c.len_utf8();
                c
            }
            None => '\0',
        }
    }
}

fn is_id_start(c: char) -> bool {
    matches!(c, 'a'..='z' | 'A'..='Z' | '_')
}

fn is_id_continue(c: char) -> bool {
    is_id_start(c) || c.is_ascii_digit()
}

impl<'a> Iterator for Lexer<'a> {
    type Item = Token<'a>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.pos < self.source.len() {
            Some(self.next_token())
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn check(source: &str, expected: &[TokenKind]) {
        let actual: Vec<TokenKind> = Lexer::new(source).map(Token::kind).collect();
        assert_eq!(actual, expected);
    }

    #[test]
    fn test_whitespace() {
        check("    ", &[TokenKind::Whitespace]);
        check("\n\t", &[TokenKind::Whitespace]);
        check("\r\n", &[TokenKind::Whitespace]);
        check(" ", &[TokenKind::Whitespace]);
    }

    #[test]
    fn test_ident() {
        check("hello", &[TokenKind::Ident]);
        check(
            "Hi There",
            &[TokenKind::Ident, TokenKind::Whitespace, TokenKind::Ident],
        );
        check("with_underscore_and_numb3r", &[TokenKind::Ident]);
    }

    #[test]
    fn test_unknown() {
        check("\\", &[TokenKind::Unknown]);
        check(
            "    \\\t",
            &[
                TokenKind::Whitespace,
                TokenKind::Unknown,
                TokenKind::Whitespace,
            ],
        );
    }
}

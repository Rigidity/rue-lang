use parser::Parser;
use program::parse_program;
use rue_lexer::{Lexer, Token};
use rue_syntax::SyntaxNode;

mod parser;
mod program;

pub fn parse_text(source: &str) -> SyntaxNode {
    let tokens: Vec<Token> = Lexer::new(source).collect();
    let mut parser = Parser::new(&tokens);
    parse_program(&mut parser);
    parser.build()
}

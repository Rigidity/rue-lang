use rue_syntax::SyntaxKind;

use crate::parser::Parser;

pub fn parse_program(p: &mut Parser) {
    p.start(SyntaxKind::Program);
    p.finish();
}

#[cfg(test)]
mod tests {
    use super::*;

    use expect_test::{expect, Expect};
    use rue_lexer::{Lexer, Token};

    #[macro_export]
    macro_rules! check {
        ($name:ident, $parser:ident) => {
            pub fn $name(input: &str, expected_tree: Expect) {
                let tokens: Vec<Token> = Lexer::new(input).collect();
                let mut parser = Parser::new(&tokens);

                $parser(&mut parser);

                let node = parser.build();
                let raw_tree = format!("{:#?}", node);
                expected_tree.assert_eq(&raw_tree[0..(raw_tree.len() - 1)]);
            }
        };
    }

    check!(check_program, parse_program);

    #[test]
    fn parse_nothing() {
        check_program("", expect![[r#"Program@0..0"#]]);
    }

    #[test]
    fn parse_trivia() {
        check_program(
            "// Line comment\n/* Block comment */\n",
            expect![[r#"
                Program@0..36
                  LineComment@0..15 "// Line comment"
                  Whitespace@15..16 "\n"
                  BlockComment@16..35 "/* Block comment */"
                  Whitespace@35..36 "\n""#]],
        );
    }
}

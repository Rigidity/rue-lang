use leptos::*;
use rue_lexer::{Lexer, Token, TokenKind};

struct StyledToken {
    text: String,
    class: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Class {
    Comment,
    String,
    Variable,
    Type,
    Keyword,
    Pair,
    Invalid,
    Other,
}

impl ToString for Class {
    fn to_string(&self) -> String {
        match self {
            Self::Comment => "t-comment".into(),
            Self::String => "t-string".into(),
            Self::Variable => "t-variable".into(),
            Self::Type => "t-type".into(),
            Self::Keyword => "t-keyword".into(),
            Self::Pair => "t-pair".into(),
            Self::Invalid => "t-invalid".into(),
            Self::Other => "t-other".into(),
        }
    }
}

fn class_for_token(token: Token) -> Class {
    use TokenKind::*;

    match token.kind() {
        LineComment | BlockComment { .. } => Class::Comment,
        String { .. } => Class::String,
        Ident => {
            if token.text().chars().next().is_some_and(char::is_uppercase) {
                Class::Type
            } else {
                Class::Variable
            }
        }
        Fn => Class::Keyword,
        OpenParen | CloseParen | OpenBrace | CloseBrace => Class::Pair,
        Whitespace | GreaterThan | Minus => Class::Other,
        Unknown => Class::Invalid,
    }
}

#[component]
pub fn Highlight(source: String) -> impl IntoView {
    let tokens: Vec<StyledToken> = Lexer::new(&source)
        .map(|token| StyledToken {
            text: token.text().to_string(),
            class: class_for_token(token).to_string(),
        })
        .collect();

    view! {
        {tokens
            .into_iter()
            .map(|token| view! { <span class=token.class>{token.text}</span> })
            .collect::<Vec<_>>()}
    }
}

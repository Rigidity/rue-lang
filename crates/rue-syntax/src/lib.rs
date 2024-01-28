use num_traits::{FromPrimitive, ToPrimitive};

mod syntax_kind;

pub use syntax_kind::*;

pub type SyntaxNode = rowan::SyntaxNode<RueLang>;
pub type SyntaxToken = rowan::SyntaxToken<RueLang>;
pub type SyntaxElement = rowan::SyntaxElement<RueLang>;

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq, PartialOrd, Ord)]
pub enum RueLang {}

impl rowan::Language for RueLang {
    type Kind = SyntaxKind;

    fn kind_from_raw(raw: rowan::SyntaxKind) -> Self::Kind {
        SyntaxKind::from_u16(raw.0).unwrap()
    }

    fn kind_to_raw(kind: Self::Kind) -> rowan::SyntaxKind {
        rowan::SyntaxKind(kind.to_u16().unwrap())
    }
}

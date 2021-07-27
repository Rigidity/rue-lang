import { Token } from './token';

export interface Tree {
    type: TreeType;
    start: number;
    stop: number;
    items: (Token | Tree)[];
}

export enum TreeType {
    // Scopes
    Body,

    // Statements
    Statement,
    TypeStatement,
    LabeledStatement,
    FieldStatement,
    BlockStatement,
    IfStatement,
    MatchStatement,
    DefStatement,
    WhileStatement,
    DoStatement,
    ForStatement,
    ReturnStatement,
    ContinueStatement,
    BreakStatement,
    MethodStatement,
    EnumStatement,
    ExpressionStatement,
    EmptyStatement,

    // Expressions
    ExpressionSequence,
    Expression,
    AssignmentExpression,
    TernaryExpression,
    CoalesceExpression,
    LogicalOrExpression,
    LogicalAndExpression,
    BitwiseOrExpression,
    BitwiseXorExpression,
    BitwiseAndExpression,
    EqualityExpression,
    ComparisonExpression,
    ShiftExpression,
    TermExpression,
    FactorExpression,
    RangeExpression,
    UnaryExpression,
    ReferenceExpression,

    // Types
    UnionType,
    IntersectionType,
    ArrayType,
    GenericType,
    UnaryType,

    // Components
    OptionalPropertyAccess,
    PropertyAccess,
    MatchOption,
    ArrayIndex,
    Parameters,
    Parameter,
    ArrayInitializer,
    ArrayValue,
    TypeCast,
    MethodCall,
    MethodCallArgument,
    LiteralValue,
}

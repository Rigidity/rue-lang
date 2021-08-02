# Rue Language

Rue is a modern programming language with clean, concise syntax. It has support for many useful constructs and features that make writing practical code much simpler, yet still strict so you get useful compiler errors.

Please note that this is not an indication of the current state of the language. It is in active development, and constantly evolving, but it is by no means functional as of this time.

# Getting Started

This is a high level overview of the language and how to use it, useful as a primer to learn it when coming from other languages.

## Comment Style

Comments are pretty standard, as there is no reason to change them.

```
/*
 * This is a block comment.
 */

// This is a line comment.
```

## Variable Declaration

It is encouraged to use `val` whenever possible, and only use `var` when the variable is reused.

```
// Variables can be modified later.
var x = 5;
x = 7; // Valid

// Values can only be assigned to once.
val y = 5;
y = 7; // Error
```

# Documentation

This is a walkthrough of the language syntax and structure. It is not a complete specification, but is as good as there is going to be for a while.

## Literal Values

These values can be used in expressions and assigned to variables of their corresponding type.

### Integer Literals

-   Integer `41`
-   Binary `0b010`
-   Octal `0o257`
-   Hexadecimal `0xFCF`

### Contextual Values

-   `this` The current object that is being operated on.
-   `super` The supertype of the current object.

### Other Literals

-   Boolean `true` or `false`
-   Float `0.412`
-   Character `'a'`
-   String `"Hello"`
-   Null `null`

## Builtin Types

These types are a part of the language and are always available. Although they are primitive, you can still inherit from them like other types.

### Variable Size

-   `int` Word size integer.
-   `uint` Unsigned word size integer..

### Fixed Size

-   `float` Alias to `f32` for readability and consistency.
-   `f32` 32 bit single precision floating point number. Ranges from `-3.40282347e+38` to `3.40282347e+38`.
-   `f64` 64 bit double precision floating point number. Ranges from `-1.7976931348623157E+308` to `1.7976931348623157E+308`.
-   `u8` 8 bit unsigned integer. Ranges from `0` to `255`.
-   `u16` 16 bit unsigned integer. Ranges from `0` to `65535`.
-   `u32` 32 bit unsigned integer. Ranges from `0` to `4294967295`.
-   `u64` 64 bit unsigned integer. Ranges from `0` to `18446744073709551616`.
-   `i8` 8 bit integer. Ranges from `-128` to `127`.
-   `i16` 16 bit integer. Ranges from `-32768` to `32767`.
-   `i32` 32 bit integer. Ranges from `-2147483648` to `2147483647`.
-   `i64` 64 bit integer. Ranges from `-9223372036854775808` to `9223372036854775807`.

### Other Types

-   `bool` Either `true` or `false`.
-   `string` Represents an immutable list of characters.
-   `void` Represents the lack of a type or value.

## Reserved Words

These are identifiers of which things cannot be named, since they are used for various language features.

### Control Keywords

-   `if`
-   `else`
-   `do`
-   `while`
-   `for`
-   `match`
-   `continue`
-   `break`
-   `return`
-   `try`
-   `catch`
-   `finally`
-   `throw`
-   `defer`

### Data Keywords

-   `def`
-   `type`
-   `enum`
-   `struct`
-   `class`
-   `macro`

### Modifier Keywords

-   `public`
-   `private`
-   `protected`
-   `import`
-   `export`
-   `extern`
-   `from`

### Operator Keywords

-   `and`
-   `not`
-   `or`
-   `in`
-   `is`
-   `as`

### Type Keywords

-   `void`
-   `int`
-   `float`
-   `string`
-   `uint`
-   `bool`
-   `u8`
-   `u16`
-   `u32`
-   `u64`
-   `i8`
-   `i16`
-   `i32`
-   `i64`
-   `f32`
-   `f64`

### Value Keywords

-   `null`
-   `super`
-   `this`
-   `true`
-   `false`

## Statement Structure

This is a list of the various statements you can use. Many of them depend on the context, so a statement may be syntactically valid but not semantically valid.

### Control Flow

-   `for (variable in iterator) { ... }` For loop.
-   `while (condition) { ... }` While loop.
-   `do { ... } while (condition)` Do while loop.
-   `if (condition) { ... } else { ... }` If.
-   `match (value) { ... }` Match.
-   `continue label` Continue.
-   `break label` Break.
-   `return value` Return.
-   `try { ... } catch(...) { ... } finally { ... }` Try catch finally.
-   `throw value` Throw.
-   `defer { ... }` Defer.

### Data Structures

-   `def name(...) { ... }` Method.
-   `type alias = Type` Type alias.
-   `enum Type { ... }` Enum.
-   `struct Type { ... }` Struct.
-   `class Type { ... }` Class.
-   `macro MACRO { ... }` Macro.

### Modifier Statements

-   `public { ... }` Public.
-   `private { ... }` Private.
-   `protected { ... }` Protected.
-   `extern { ... }` Extern.
-   `import { ... } from "path"` Import.
-   `export { ... }` Export.

## Operator Precedence

The higher on this list, the more deep the precedence level is. The first item would be parsed first, and so on.

### Expression Grouping

-   `(...)` Groups an expression sequence.

### Member Access

-   `method(...)` Method call.
-   `array[index]` Array index.
-   `object?.prop` Optional member access.
-   `object.prop` Member access.

### Suffix Modifiers

-   `not value` Logical not.
-   `~value` Binary not.
-   `*value` Pointer dereference.
-   `&value` Reference.
-   `+value` Positive.
-   `-value` Negative.

### Numeric Ranges

-   `start..stop` Exclusive range.
-   `start...stop` Inclusive range.

### Expression Factors

-   `value * value` Multiplication.
-   `value / value` Division.
-   `value % value` Modulo.

### Expression Terms

-   `value + value` Addition.
-   `value - value` Subtraction.

### Bitwise Shifting

-   `value << value` Left shift.
-   `value >> value` Right shift.
-   `value >>> value` Unsigned right shift.

### Value Comparison

-   `value <= value` Less than or equal.
-   `value >= value` Greater than or equal.
-   `value < value` Less than.
-   `value > value` Greater than.
-   `value in value` Entry check.
-   `value is Type` Type check.
-   `value as Type` Type conversion.

### Equality Check

-   `value == value` Equal.
-   `value != value` Inequal.

### Bitwise And

-   `value & value` Bitwise and.

### Bitwise Xor

-   `value ^ value` Bitwise xor.

### Bitwise Or

-   `value | value` Bitwise or.

### Logical And

-   `value and value` Logical and.

### Logical Or

-   `value or value` Logical or.

### Null Coalesce

-   `value ?: value` Null coalesce.

### Ternary Conditional

-   `condition ? value : value` Ternary conditional.

### Assignment Expression

-   `variable = value` Assignment.
-   `variable += value` Addition assignment.
-   `variable -= value` Subtraction assignment.
-   `variable *= value` Multiplication assignment.
-   `variable /= value` Division assignment.
-   `variable %= value` Modulo assignment.
-   `variable &= value` Bitwise and assignment.
-   `variable |= value` Bitwise or assignment.
-   `variable ^= value` Bitwise xor assignment.
-   `variable ?= value` Null coalesce assignment.
-   `variable <<= value` Left shift assignment.
-   `variable >>= value` Right shift assignment.
-   `variable >>>= value` Unsigned right shift assignment.

### Expression Sequence

-   `first, second` Expression sequence.

## Type Precedence

The higher on this list, the more deep the precedence level is. The first item would be parsed first, and so on.

### Modifier Type

-   `Type<Type>` Generic type.
-   `Type[size]` Array type.
-   `Type*` Pointer type.
-   `Type?` Optional type.

### Intersection Type

-   `Type & Type` Intersection type.

### Union Type

-   `Type | Type` Union type.

# Language Grammar

As the language is still in development, there is no formal lexer and parser grammar. The documentation above can be used to get a general idea of the syntax, but it is subject to change.

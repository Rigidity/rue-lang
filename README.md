# Rue Specification
Rue is a modern programming language with clean, concise syntax. It has support for many useful constructs and features that make writing practical code much simpler, yet still strict so you get useful compiler errors.

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

## Literal Values
These values can be used in expressions and assigned to variables of their corresponding type.

### Integer Literals
* Integer `41`
* Binary `0b010`
* Octal `0o257`
* Hexadecimal `0xFCF`

### Contextual Values
* `this` The current object that is being operated on.
* `super` The supertype of the current object.
* `_` Represents the current value being operated on.

### Other Literals
* Boolean `true` or `false`
* Float `0.412`
* Character `'a'`
* String `"Hello"`
* Null `null`

## Builtin Types
These types are a part of the language and are always available. Although they are primitive, you can still inherit from them like other types.

### Variable Size
* `int` Word size integer.
* `uint` Unsigned word size integer..

### Fixed Size
* `float` Alias to `f32` for readability and consistency.
* `f32` 32 bit single precision floating point number. Ranges from `-3.40282347e+38` to `3.40282347e+38`.
* `f64` 64 bit double precision floating point number. Ranges from `-1.7976931348623157E+308` to `1.7976931348623157E+308`.
* `u8` 8 bit unsigned integer. Ranges from `0` to `255`.
* `u16` 16 bit unsigned integer. Ranges from `0` to `65535`.
* `u32` 32 bit unsigned integer. Ranges from `0` to `4294967295`.
* `u64` 64 bit unsigned integer. Ranges from `0` to `18446744073709551616`.
* `i8` 8 bit integer. Ranges from `-128` to `127`.
* `i16` 16 bit integer. Ranges from `-32768` to `32767`.
* `i32` 32 bit integer. Ranges from `-2147483648` to `2147483647`.
* `i64` 64 bit integer. Ranges from `9223372036854775808` to `9223372036854775807`.

### Other Types
* `bool` Either `true` or `false`.
* `string` Represents an immutable list of characters.

## Reserved Words
These are identifiers of which things cannot be named, since they are used for various language features.

### Control Keywords
* `if`
* `else`
* `while`
* `for`
* `match`
* `continue`
* `break`
* `return`
* `try`
* `catch`
* `throw`

### Data Keywords
* `type`
* `enum`
* `struct`
* `class`
* `macro`

### Modifier Keywords
* `public`
* `private`
* `protected`
* `import`
* `export`
* `extern`
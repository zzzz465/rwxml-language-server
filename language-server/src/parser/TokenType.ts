export enum TokenType {
  StartCommentTag,
  Comment,
  EndCommentTag,
  StartTagOpen,
  StartTagClose,
  StartTagSelfClose,
  StartTag,
  EndTagOpen,
  EndTagClose,
  EndTag,
  DelimiterAssign, //
  AttributeName, //
  AttributeValue, //
  StartXMLDeclarationTag, //
  XMLDeclaration, //
  EndXMLDeclarationTag, //
  Content, //
  Whitespace, //
  Unknown, //
  Script, //
  Styles, //
  EOS, //
}

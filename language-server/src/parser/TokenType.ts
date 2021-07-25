export enum TokenType {
  StartCommentTag, // 0
  Comment, // 1
  EndCommentTag, // 2
  StartTagOpen, // 3
  StartTagClose, // 4
  StartTagSelfClose, // 5
  StartTag, // 6
  EndTagOpen, // 7
  EndTagClose, // 8
  EndTag, // 9
  DelimiterAssign, // 10
  AttributeName, // 11
  AttributeValue, // 12
  StartXMLDeclarationTag, // 13
  XMLDeclaration, // 14
  EndXMLDeclarationTag, // 15
  Content, // 16
  Whitespace, // 17
  Unknown, // 18
  Script, // 19
  Styles, // 20
  EOS, // 21
}

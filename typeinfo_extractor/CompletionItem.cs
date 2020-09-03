using System;
using System.Collections.Generic;
using System.Text;

namespace typeinfo_extractor
{
    public enum CompletionItemKind
    {
        Text = 1,
        Field = 5,
        Variable = 6,
        Class = 7,
        Property = 10,
        Value = 12,
        Enum = 13,
        Keyword = 14,
        Reference = 18,
        EnumMember = 20,
        Constant = 21
    }
    public class CompletionItem
    {
        public string label { get; set; }
        public CompletionItemKind kind { get; set; }
    }

    public class defNodeInfo : CompletionItem
    {
        public defNodeInfo[] children { get; set; }
        public CompletionItem[] attributeSuggestions { get; set; }
        public CompletionItem[] valueSuggestions { get; set; }
    }

    public class defInfo : defNodeInfo
    {
        public bool isAbstract { get; set; }
        public string defIdentifier { get; set; }
        // public defNodeInfo[] children { get; set; }
    }
    /*
    public struct TypeIdentifier
    {
        public string namespaceName { get; set; }
        public string className { get; set; }
        public override string ToString()
        {
            return $"{namespaceName}.{className}";
        }
    }
    */

    public class TypeInfo
    {
        public static TypeInfo Create(Type type)
        {
            var name = type.Name;
            return new TypeInfo() { typeIdentifier = $"{type.Namespace}.{type.Name}" };
        }
        protected TypeInfo() { }
        public Boolean isLeafNode { get; set; } = false;
        public Boolean isDefNode { get; set; } = false;
        public CompletionItem[] leafNodeCompletions { get; set; }
        public string typeIdentifier;
        public Dictionary<string, string> childNodes { get; set; } = new Dictionary<string, string>();
        // public Dictionary<string, CompletionItem[]> leafNodes { get; set; } = new Dictionary<string, CompletionItem[]>();
        // public Dictionary<string, TypeInfo> tempNodes { get; set; } = new Dictionary<string, TypeInfo>();
    }

    public class GenericTypeInfo : TypeInfo
    {
        public TypeInfo genericType { get; set; } // TODO - recursive 지원하기
    }
}

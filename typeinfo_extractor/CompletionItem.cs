using System;
using System.Collections.Generic;
using System.Text;

namespace Program
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

    public class Util {
        public static string GetTypeIdentifier(Type T)
        {
            return $"{T.Namespace}.{T.Name}";
        }
        public static string GetListTypeIdentifier(Type type)
        {
            var T = type.GetGenericArguments()[0];
            var name = $"{T.Namespace}.{T.Name}";
            return $"System.Collections.Generic.List<{name}>";
        }
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
            return new TypeInfo() { typeIdentifier = Util.GetTypeIdentifier(type) };
        }
        public static TypeInfo Create(string id)
        {
            return new TypeInfo() { typeIdentifier = id };
        }
        protected TypeInfo() { }
        public Boolean isLeafNode { get; set; } = false;
        public Boolean isDefNode { get; set; } = false;
        public CompletionItem[] leafNodeCompletions { get; set; }
        public string typeIdentifier;
        public specialType specialTypes;
        public Dictionary<string, string> childNodes { get; set; } = new Dictionary<string, string>();
        // public Dictionary<string, CompletionItem[]> leafNodes { get; set; } = new Dictionary<string, CompletionItem[]>();
        // public Dictionary<string, TypeInfo> tempNodes { get; set; } = new Dictionary<string, TypeInfo>();
    }

    public class GenericTypeInfo : TypeInfo
    {
        public TypeInfo genericType { get; set; } // TODO - recursive 지원하기
    }

    public struct specialType
    {
        public bool texPath;
        public def defType;
        public Enumerable enumerable;
        public bool isSpecial;

        public struct def
        {
            public string defType;
        }
        
        public struct Enumerable
        {
            public string genericType, enumerableType;
            public bool isSpecial;
        }
    }
}

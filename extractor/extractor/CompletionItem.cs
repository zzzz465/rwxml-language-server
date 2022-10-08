using Newtonsoft.Json;
using System;
using System.Collections.Generic;

namespace extractor
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

    public class TypeInfo
    {
        public static TypeInfo Create(Type T)
        {
            string typeId = NameUtility.GetTypeIdentifier(T);
            return new TypeInfo() { typeIdentifier = typeId };
        }

        public static TypeInfo Create(string id)
        {
            return new TypeInfo() { typeIdentifier = id };
        }
        protected TypeInfo() { }
        public bool isLeafNode { get; set; }
        public bool isDefNode { get; set; }
        public CompletionItem[] leafNodeCompletions { get; set; }
        public string typeIdentifier;
        public SpecialType specialType;

        // marker
        [JsonIgnore]
        public bool childCollected;
        [JsonIgnore]
        public bool populated;

        public Dictionary<string, string> childNodes { get; set; } = new Dictionary<string, string>();
        public bool ShouldSerializechildNodes()
        {
            return childNodes.Count > 0;
        }
    }

    public class GenericTypeInfo : TypeInfo
    {
        public TypeInfo genericType { get; set; } // TODO - recursive 지원하기
    }

    public struct SpecialType
    {
        public bool texPath;
        public def defType;
        public Enumerable enumerable;
        public CompClass compClass;

        public bool integer, color, intVec3, intRange, floatRange;
        [JsonProperty("enum")]
        public bool @enum;
        [JsonProperty("float")]
        public bool @float;
        [JsonProperty("string")]
        public bool @string;
        [JsonProperty("bool")]
        public bool @bool;

        public struct def
        {
            public string name;
        }

        public struct Enumerable
        {
            public string genericType, enumerableType;
            public bool isSpecial;
        }

        public struct CompClass
        {
            public bool isComp;
            public string baseClass;
        }
    }
}

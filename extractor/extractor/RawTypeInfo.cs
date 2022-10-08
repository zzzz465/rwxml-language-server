using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace extractor
{
    // should match with typescript RawFieldInfo interface
    public class RawTypeInfo
    {
        public struct RawTypeInfoMetadata
        {
            public struct FieldCompClass
            {
                public string baseClass;
            }
            public struct FieldDefType
            {
                public string name;
            }
            public struct FieldGeneric
            {
                public string[] args;
            }

            public string texPath;
            public FieldCompClass compClass;
            public FieldDefType defType;
            public FieldGeneric generic;
            public bool mustTranslate;
        }

        public RawTypeInfoMetadata metadata;
        public string fullName;
        public string className;
        public string namespaceName;
        public Dictionary<string, string> attributes = new Dictionary<string, string>();
        public Dictionary<string, string> interfaces = new Dictionary<string, string>();
        public Dictionary<string, RawFieldInfo> fields = new Dictionary<string, RawFieldInfo>();
        public List<string> genericArguments = new List<string>();
        public List<string> methods = new List<string>();
        public string baseClass;
        public bool isGeneric, isArray, isEnum, isInterface;
        public List<string> enums = new List<string>();

        // helper fields
        [JsonIgnore]
        public bool childCollected = false;
        [JsonIgnore]
        public bool populated = false;

        public RawTypeInfo(Type T)
        {
            this.fullName = NameUtility.GetTypeIdentifier(T);
            this.namespaceName = NameUtility.GetTypeNamespaceName(T);
            this.className = NameUtility.GetTypeClassName(T);
            this.isGeneric = T.IsGenericType;
            this.isArray = T.IsArray;
            this.isInterface = T.IsInterface;

            if (this.isGeneric)
            {
                this.genericArguments.AddRange(T.GenericTypeArguments.Select(t => NameUtility.GetTypeIdentifier(t)));
            }

            if (T.BaseType != null)
            {
                this.baseClass = NameUtility.GetTypeIdentifier(T.BaseType);
            }

            // fields
            foreach (var field in T.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance))
            {
                var fieldName = field.Name;
                if (!TypeFilter.IsBannedField(field))
                {
                    var rawFieldInfo = new RawFieldInfo(field);

                    // base field is overrided by new keyword with same name.
                    // https://docs.microsoft.com/ko-kr/dotnet/csharp/language-reference/keywords/new-modifier
                    if (fields.ContainsKey(rawFieldInfo.name))
                    {
                        fields.Remove(rawFieldInfo.name);
                    }

                    fields.Add(rawFieldInfo.name, rawFieldInfo);
                }
            }

            // attributes
            foreach (var attrib in T.CustomAttributes)
            {
                var type = attrib.AttributeType;
                if (!TypeFilter.IsBannedType(type))
                {
                    var typeId = NameUtility.GetTypeIdentifier(type);
                    // value will be linked to the typeInfo object in analzyer module.
                    this.interfaces[typeId] = typeId;
                }
            }

            // useful methods
            var methods = T.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
            foreach (var method in methods)
            {
                switch (method.Name)
                {
                    case "LoadDataFromXmlCustom":
                        this.methods.Add(method.Name);
                        break;
                }
            }

            // enums
            if (T.IsEnum)
            {
                this.isEnum = true;
                this.enums.AddRange(T.GetEnumNames());
            }

            // interface
            foreach (var type in T.GetInterfaces())
            {
                if (!TypeFilter.IsBannedType(type))
                {
                    var typeId = NameUtility.GetTypeIdentifier(type);
                    // value will be linked to the typeInfo object in analzyer module.
                    this.interfaces[typeId] = typeId;
                }
            }
        }

        // json properties
        public bool ShouldSerializegenericArguments()
        {
            return this.genericArguments.Count > 0;
        }

        public bool ShouldSerializeattributes()
        {
            return this.attributes.Count > 0;
        }

        public bool ShouldSerializefields()
        {
            return this.fields.Count > 0;
        }

        public bool ShouldSerializemethods()
        {
            return this.methods.Count > 0;
        }
    }
}

using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
        public Dictionary<string, string> attributes = new Dictionary<string, string>();
        public Dictionary<string, RawFieldInfo> fields = new Dictionary<string, RawFieldInfo>();
        public List<string> genericArguments = new List<string>();
        public string baseClass;
        public bool isGeneric, isArray;

        // helper fields
        [JsonIgnore]
        public bool childCollected = false;
        [JsonIgnore]
        public bool populated = false;

        public RawTypeInfo(Type T)
        {
            this.fullName = NameUtility.GetTypeIdentifier(T);
            this.isGeneric = T.IsGenericType;
            this.isArray = T.IsArray;

            if (this.isGeneric)
            {
                this.genericArguments.AddRange(T.GenericTypeArguments.Select(t => NameUtility.GetTypeIdentifier(t)));
            }

            if (T.BaseType != null)
            {
                this.baseClass = NameUtility.GetTypeIdentifier(T.BaseType);
            }

            // fields
            foreach (var field in T.GetFields())
            {
                var rawFieldInfo = new RawFieldInfo(field);
                fields.Add(rawFieldInfo.Name, rawFieldInfo);
            }

            // attributes
            foreach (var attrib in T.CustomAttributes)
            {
                var type = attrib.AttributeType;
                if (!this.attributes.ContainsKey(type.Name))
                {
                    this.attributes.Add(type.Name, NameUtility.GetTypeIdentifier(type));
                }
            }
        }
    }
}

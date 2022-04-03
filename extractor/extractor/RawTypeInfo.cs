using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Reflection;
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
        public string className;
        public string namespaceName;
        public Dictionary<string, string> attributes = new Dictionary<string, string>();
        public Dictionary<string, string> interfaces = new Dictionary<string, string>();
        public Dictionary<string, RawFieldInfo> fields = new Dictionary<string, RawFieldInfo>();
        public List<string> genericArguments = new List<string>();
        public List<string> methods = new List<string>();
        public string baseClass;
        public bool isGeneric, isArray, isEnum;
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
                    fields.Add(rawFieldInfo.name, rawFieldInfo);
                }
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
            if (T.IsInterface)
            {
                foreach (var type in T.GetInterfaces())
                {
                    this.interfaces.Add(type.Name, NameUtility.GetTypeIdentifier(type));
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

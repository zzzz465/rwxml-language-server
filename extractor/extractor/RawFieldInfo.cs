using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace extractor
{
    public class RawFieldInfo
    {
        public struct RawFieldMetadata
        {

        }

        public struct RawAttribute
        {
            public struct CtorArg
            {
                public string type, value;

                public CtorArg(CustomAttributeTypedArgument arg)
                {
                    this.type = NameUtility.GetTypeIdentifier(arg.ArgumentType);
                    this.value = arg.Value?.ToString() ?? string.Empty;
                }
            }

            public string attributeType;
            public List<CtorArg> ctorArgs;

            public RawAttribute(CustomAttributeData data)
            {
                this.attributeType = NameUtility.GetTypeIdentifier(data.AttributeType);
                this.ctorArgs = data.ConstructorArguments.Select(a => new CtorArg(a)).ToList();
            }
        }

        public RawFieldMetadata fieldMetadata;
        public string name;
        public string declaringType;
        public string fieldType;
        public Dictionary<string, RawAttribute> attributes = new Dictionary<string, RawAttribute>();
        public bool isPublic, isPrivate;

        public RawFieldInfo(FieldInfo fieldInfo)
        {
            this.name = fieldInfo.Name;
            this.declaringType = NameUtility.GetTypeIdentifier(fieldInfo.DeclaringType);
            this.fieldType = NameUtility.GetTypeIdentifier(fieldInfo.FieldType);
            this.isPublic = fieldInfo.IsPublic;
            this.isPrivate = fieldInfo.IsPrivate;

            foreach (var attrib in fieldInfo.CustomAttributes)
            {
                if (!attrib.AttributeType.IsSpecialName)
                {
                    attributes[attrib.AttributeType.Name] = new RawAttribute(attrib);
                }
            }
        }

        public bool ShouldSerializeattributes()
        {
            return this.attributes.Count > 0;
        }
    }
}

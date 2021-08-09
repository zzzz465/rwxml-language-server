using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace extractor
{
    public class RawFieldInfo
    {
        public struct RawFieldMetadata
        {

        }

        public RawFieldMetadata fieldMetadata;
        public string Name;
        public string declaringType;
        public string fieldType;
        public Dictionary<string, string> attributes = new Dictionary<string, string>();
        public bool isPublic, isPrivate;

        public RawFieldInfo(FieldInfo fieldInfo)
        {
            this.Name = fieldInfo.Name;
            this.declaringType = NameUtility.GetTypeIdentifier(fieldInfo.DeclaringType);
            this.fieldType = NameUtility.GetTypeIdentifier(fieldInfo.FieldType);
            this.isPublic = fieldInfo.IsPublic;
            this.isPrivate = fieldInfo.IsPrivate;

            foreach (var attrib in fieldInfo.CustomAttributes)
            {
                if (!attrib.AttributeType.IsSpecialName)
                {
                    var attribType = attrib.AttributeType;
                    attributes.Add(attribType.Name, NameUtility.GetTypeIdentifier(attribType));
                }
            }
        }

        public bool ShouldSerializeattributes()
        {
            return this.attributes.Count > 0;
        }
    }
}

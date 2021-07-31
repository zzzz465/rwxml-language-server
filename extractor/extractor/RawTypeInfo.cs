using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace extractor
{
    public class RawTypeInfo
    {
        public string fullName = "";
        public Metadata metadata;
        public Dictionary<string, string> childNodes = new Dictionary<string, string>(); // Record<FieldName, TypeIdentifier>

        // helper fields
        [JsonIgnore]
        public bool childCollected = false;
        [JsonIgnore]
        public bool populated = false;

        public RawTypeInfo(String fullName)
        {
            this.fullName = fullName;
        }

        public RawTypeInfo(Type type)
        {
            this.fullName = GetFullName(type);
        }

        private static string GetFullName(Type type)
        {
            string typeId = "";
            if (type.IsGenericType)
            {
                if (type.GetGenericTypeDefinition() == typeof(List<>))
                {
                    typeId = Util.GetListTypeIdentifier(type);
                }
                else
                {
                    typeId = Util.GetGenericTypeIdentifier(type);
                }
            }
            else if (type.IsArray)
            {
                typeId = Util.GetArrayTypeIdentifier(type);
            }
            else
            {
                typeId = Util.GetTypeIdentifier(type);
            }

            return typeId;
        }
    }
}

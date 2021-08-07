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
        public string fullName = "";
        public Metadata metadata;
        public Dictionary<string, RawFieldInfo> fields = new Dictionary<string, RawFieldInfo>(); // Record<FieldName, TypeIdentifier>

        // helper fields
        [JsonIgnore]
        public bool childCollected = false;
        [JsonIgnore]
        public bool populated = false;

        public RawTypeInfo(Type T)
        {
            this.fullName = NameUtility.GetTypeIdentifier(T);
        }
    }
}

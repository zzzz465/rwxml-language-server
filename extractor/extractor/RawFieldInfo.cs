using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace extractor
{
    public class RawFieldInfo
    {
        public struct RawFieldMetadata
        {
            public bool mustTranslate;
        }

        public RawFieldMetadata fieldMetadata;
        public string fullName;
        public string accessModifier = "private";
    }
}

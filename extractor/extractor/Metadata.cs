using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace extractor
{
    public struct Metadata
    {
        public struct FieldEnumerable
        {
            public string genericType;
        }
        public struct FieldCompClass
        {
            public string baseClass;
        }
        public struct FieldDefType
        {
            public string name;
        }

        public string texPath;
        public FieldEnumerable enumerable;
        public FieldCompClass compClass;
        public FieldDefType defType;
        public bool mustTranslate;
    }
}

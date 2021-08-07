using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace extractor
{
    public struct Metadata
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
}

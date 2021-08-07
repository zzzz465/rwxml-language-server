using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace extractor
{
    public static class NameUtility
    {
        public static readonly Type genericType = typeof(List<>).GetGenericTypeDefinition();

        public static string GetTypeIdentifier(Type T)
        {
            return $"{T.Namespace}.${T.Name}";
        }
    }
}

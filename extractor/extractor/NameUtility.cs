using System;
using System.Collections.Generic;
using System.Linq;

namespace extractor
{
    public static class NameUtility
    {
        public static readonly Type genericType = typeof(List<>).GetGenericTypeDefinition();

        public static string GetTypeIdentifier(Type T, bool checkGenericType = true)
        {
            return T.FullName;
        }

        public static string GetTypeClassName(Type T)
        {
            return T.FullName.Replace(GetTypeNamespaceName(T) + ".", "");
        }

        public static string GetTypeNamespaceName(Type T)
        {
            return T.Namespace;
        }
    }
}

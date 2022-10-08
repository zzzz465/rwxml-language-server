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
            if (T.IsGenericType && checkGenericType)
            {
                var genericName = GetTypeIdentifier(T, false);
                var arguments = from genArg in T.GetGenericArguments()
                                select GetTypeIdentifier(genArg);

                return $"{genericName}<{String.Join(", ", arguments)}>";
            }

            if (String.IsNullOrEmpty(T.Namespace))
            {
                return T.Name;
            }
            else
            {
                return String.Join(".", T.Namespace, T.Name);
            }
        }

        public static string GetTypeClassName(Type T)
        {
            return T.Name;
        }

        public static string GetTypeNamespaceName(Type T)
        {
            return T.Namespace;
        }
    }
}

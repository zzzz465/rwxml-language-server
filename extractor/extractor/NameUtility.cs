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
    }
}

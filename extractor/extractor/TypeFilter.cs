using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;

namespace extractor
{
    public static class TypeFilter
    {
        static HashSet<Type> bannedTypes = new HashSet<Type>();
        static List<string> bannedNamespacesRegex = new List<string>();

        static TypeFilter()
        {
            // initialize bannedTypes

            // initialize bannedNamespaces
            bannedNamespacesRegex.AddRange(new string[]
            {
                "System\\.Collections\\.ObjectModel.*",
                "System\\.Collections\\.Specialized",
                "System\\.ComponentModel.*",
                "UnityStandardAssets\\..*",
                "System\\.Configuration.*",
                "System\\.Diagnostics.*",
                "System\\.Deployment.*",
                "System\\.Reflection.*",
                "System\\.Threading.*",
                "System\\.Security.*",
                "Newtonsoft\\.Json.*",
                "System\\.Dynamic.*",
                "System\\.Runtime.*",
                "System\\.CodeDom.*",
                "ICSharpCode\\..*",
                "UnityEngine\\..*",
                "System\\.Media.*",
                "System\\.Text.*",
                "System\\.Linq.*",
                "System\\.Xml.*",
                "System\\.Net.*",
                "System\\.IO.*",
                ".*Internal.*",
                "Microsoft.*",
                "Unity\\..*",
                "Ionic\\..*",
                "Windows.*",
                "log4net.*",
                "NAudio.*",
                "Mono.*",
                "CommandLine",
                "Steamworks",
                "NVorbis",
                "TMPro",
            });
        }

        public static bool IsBannedType(Type T)
        {
            try
            {
                return IsBannedType0(T);
            }
            catch (Exception)
            {
                return true;
            }
        }


        private static bool IsBannedType0(Type T)
        {
            if (T.IsGenericTypeDefinition)
            {
                return true;
            }

            if (Attribute.IsDefined(T, typeof(CompilerGeneratedAttribute)))
            {
                return true;
            }

            var name = T.Name;
            var namespaceName = T.Namespace;

            if (name.StartsWith("__"))
            {
                return true;
            }

            var exists = bannedNamespacesRegex.Any(ns => namespaceName != null && Regex.IsMatch(namespaceName, ns));

            if (exists)
            {
                return true;
            }

            if (bannedTypes.Contains(T))
            {
                return true;
            }


            return false;
        }
        public static bool IsBannedField(FieldInfo T)
        {
            try
            {
                return IsBannedField0(T);
            }
            catch (Exception)
            {
                return true;
            }
        }

        private static bool IsBannedField0(FieldInfo T)
        {
            var name = T.DeclaringType.Name;
            var namespaceName = T.DeclaringType.Namespace;

            var exists = bannedNamespacesRegex.Any(ns => namespaceName != null && Regex.IsMatch(namespaceName, ns));

            if (exists)
            {
                return true;
            }

            if (Attribute.IsDefined(T, typeof(CompilerGeneratedAttribute)))
            {
                return true;
            }

            if (T.DeclaringType.IsGenericTypeDefinition)
            {
                return true;
            }

            if (T.Name.Contains("__"))
            {
                return true;
            }

            return false;
        }
    }
}

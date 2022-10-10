using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace extractor
{
    public static class Extractor
    {
        static Dictionary<Type, RawTypeInfo> typeDict = new Dictionary<Type, RawTypeInfo>();
        static Type listType = typeof(List<>).GetGenericTypeDefinition();

        static class RWTypes
        {
            public static Assembly assembly;
            public static Type Def;
            public static Type UnsavedAttribute;
            public static Type IntRange, FloatRange, IntVec3;
            public static Type MustTranslateAttribute;
        }

        static class UnityEngineTypes
        {
            public static Type Color;
        }

        public static Dictionary<Type, RawTypeInfo> parse(IEnumerable<Assembly> assemblies)
        {
            var RWAssem = assemblies.FirstOrDefault(assembly => assembly.GetName().Name == "Assembly-CSharp");
            var UnityAssem = assemblies.FirstOrDefault(assembly => assembly.GetName().Name == "UnityEngine");
            if (RWAssem != null && UnityAssem != null)
            {
                RWTypes.assembly = RWAssem;
                RWTypes.Def = RWAssem.GetType("Verse.Def");
                RWTypes.UnsavedAttribute = RWAssem.GetType("Verse.UnsavedAttribute");
                RWTypes.IntRange = RWAssem.GetType("Verse.IntRange");
                RWTypes.FloatRange = RWAssem.GetType("Verse.FloatRange");
                RWTypes.IntVec3 = RWAssem.GetType("Verse.IntVec3");
                RWTypes.MustTranslateAttribute = RWAssem.GetType("Verse.MustTranslateAttribute");
                UnityEngineTypes.Color = UnityAssem.GetType("UnityEngine.Color");

                foreach (var assembly in assemblies)
                {
                    Log.Info($"Extracting data from {assembly.GetName().FullName}");

                    // collect Def or CompProperties (naming convention)
                    var types = from type in TypeUtility.GetTypes(assembly)
                                where type != null && (type.IsSubclassOf(RWTypes.Def) || type.Name.Contains("CompProperties"))
                                select type;
                    var name = assembly.GetName().Name;
                    CollectData_BFS(types);
                }
                var relatedTypes = SearchDerivedClasses(assemblies);
                CollectData_BFS(relatedTypes);
                PopulateData();

                return typeDict;
            }
            else
            {
                throw new Exception("Rimworld dll was not providen.");
            }
        }

        static void CollectData_BFS(IEnumerable<Type> _types)
        {
            Queue<Type> types = new Queue<Type>(_types);
            while (types.Count > 0)
            {
                var type = types.Dequeue();
                var typeName = type.FullName;

                if (TypeFilter.IsBannedType(type))
                {
                    continue;
                }

                RawTypeInfo typeInfo;
                if (!typeDict.TryGetValue(type, out typeInfo))
                {
                    Exception ex = null;
                    if (TryNewRawTypeInfo(type, out typeInfo, out ex))
                    {
                        typeDict.Add(type, typeInfo);
                    }
                    else
                    {
                        Log.Warn($"failed to add type: {ex}");
                    }
                }

                if (typeInfo == null)
                {
                    continue;
                }

                if (typeInfo.childCollected)
                {
                    continue;
                }

                if (type.IsPrimitive || type == typeof(String))
                {
                    continue;
                }

                var fields = type.GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic);
                foreach (var fieldInfo in fields)
                {
                    var fieldType = fieldInfo.FieldType;
                    var fieldName = fieldInfo.Name;

                    if (typeDict.ContainsKey(fieldType))
                    {
                        continue;
                    }

                    Exception ex = null;
                    if (TryNewRawTypeInfo(fieldType, out RawTypeInfo value, out ex))
                    {
                        typeDict.Add(fieldType, value);
                        types.Enqueue(fieldType);
                    }
                    else
                    {
                        Log.Warn(ex.ToString());
                    }
                }

                // generic type
                if (type.IsGenericType)
                {
                    foreach (var T in type.GenericTypeArguments)
                    {
                        if (!typeDict.ContainsKey(T) && !T.IsGenericParameter)
                        {
                            Exception ex = null;
                            if (TryNewRawTypeInfo(T, out RawTypeInfo value, out ex))
                            {
                                typeDict.Add(T, new RawTypeInfo(T));
                                types.Enqueue(T);
                            }
                            else
                            {
                                Log.Warn(ex.ToString());
                            }
                        }
                    }
                }

                // only get interface 1-depth.
                // MEMO: to make analyzer's data linking between typeInfos work. this must be enabled.
                // if (!type.IsInterface)
                var interfaces = type.GetInterfaces();
                foreach (var iface in interfaces)
                {
                    var ifaceTypeName = iface.FullName;
                    if (TypeFilter.IsBannedType(iface) || typeDict.ContainsKey(iface))
                    {
                        continue;
                    }

                    Exception ex = null;
                    if (TryNewRawTypeInfo(iface, out RawTypeInfo value, out ex))
                    {
                        typeDict.Add(iface, value);
                        types.Enqueue(iface);
                    }
                }

                typeInfo.childCollected = true;
            }
        }

        static IEnumerable<Type> SearchDerivedClasses(IEnumerable<Assembly> assemblies)
        {
            var objType = typeof(object);
            Func<Type, bool> isRelated = (type) => // upstream to find base class in typeDict, if exists it is related.
            {
                var baseType = type;
                while (baseType != null && baseType != objType)
                {
                    baseType = baseType.BaseType;
                    if (baseType != null && typeDict.ContainsKey(baseType))
                    {
                        return true;
                    }
                }
                return false;
            };

            var relatedTypes = from assem in AppDomain.CurrentDomain.GetAssemblies()
                               let types = TypeUtility.GetTypes(assem)
                               from type in types
                               where type != null && isRelated(type)
                               select type;

            return relatedTypes;
        }

        static void PopulateData()
        {
            foreach (var pair in typeDict)
            {
                var type = pair.Key;
                var rawTypeInfo = pair.Value;

                if (type.Name.Contains("CompProperties"))
                {
                    var baseType = type;
                    var objType = typeof(object);
                    while (baseType != null && baseType.BaseType != objType && baseType.Name.Contains("CompProperties"))
                    { // possible bug - baseType was not registered in static typeDict, maybe
                      // also if CompProperties have interface, then it will throw the error cuz baseType is null
                      // I'm just adding baseType != null to avoid critical issues, fix this later
                        baseType = baseType.BaseType;
                    }

                    rawTypeInfo.metadata.compClass.baseClass = NameUtility.GetTypeIdentifier(baseType);
                }

                rawTypeInfo.populated = true;
            }
        }

        static bool TryNewRawTypeInfo(Type T, out RawTypeInfo value, out Exception ex)
        {
            try
            {
                value = new RawTypeInfo(T);
                ex = null;
                return true;
            }
            catch (Exception e)
            {
                value = null;
                ex = e;
                return false;
            }
        }
    }
}

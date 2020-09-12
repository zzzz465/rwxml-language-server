using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Security;
using System.Text;
using System.Threading.Tasks;

namespace extractor
{
    public static class Extractor
    {
        static Dictionary<Type, TypeInfo> typeDict = new Dictionary<Type, TypeInfo>();

        static class RWTypes
        {
            public static Assembly assembly;
            public static Type Def;
            public static Type UnsavedAttribute;
            public static Type IntRange, FloatRange, IntVec3;
        }

        static class UnityEngineTypes
        {
            public static Type Color;
        }

        public static Dictionary<Type, TypeInfo> parse(IEnumerable<Assembly> assemblies)
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
                UnityEngineTypes.Color = UnityAssem.GetType("UnityEngine.Color");

                foreach (var assembly in assemblies)
                {
                    /*
                    IEnumerable<Type> unfiltered;
                    try
                    {
                        unfiltered = assembly.GetTypes();
                    }
                    catch (ReflectionTypeLoadException ex)
                    {
                        unfiltered = ex.Types;
                    }*/
                    Log.Info($"Extracting data from {assembly.GetName().FullName}");

                    // collect Def or CompProperties (naming convention)
                    var types = from type in assembly.GetTypes()
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
            var listType = typeof(List<>).GetGenericTypeDefinition();
            Queue<Type> types = new Queue<Type>(_types);
            while (types.Count > 0)
            {
                var type = types.Dequeue();
                var typeName = type.Name;

                TypeInfo typeInfo;
                if (!typeDict.TryGetValue(type, out typeInfo))
                {
                    typeInfo = TypeInfo.Create(type);
                    typeDict.Add(type, typeInfo);
                }

                if (typeInfo.childCollected)
                    continue; // already collected

                if (type.IsPrimitive || type == typeof(String))
                    continue;

                var name = type.Name;

                var fields = type.GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic);
                foreach (var field in fields)
                {
                    var fieldType = field.FieldType;
                    var fieldName = field.Name;

                    var unsavedAttr = field.CustomAttributes.FirstOrDefault(attr => attr.AttributeType == RWTypes.UnsavedAttribute);
                    if (unsavedAttr != null)
                    {
                        var allowLoading = (bool)unsavedAttr.ConstructorArguments[0].Value;
                        if (allowLoading == false)
                            continue;
                    }

                    /*
                    if (field.TryGetAttribute<UnsavedAttribute>(out var unsavedAttr))
                        if (!unsavedAttr.allowLoading)
                            continue;
                    */

                    if (!typeDict.ContainsKey(fieldType)) // if it is not registered
                    {
                        if (fieldType.IsGenericType)
                        {
                            if(fieldType.GetGenericTypeDefinition() == listType)
                            {
                                var id = Util.GetListTypeIdentifier(fieldType); // don't need to fill child nodes.
                                typeDict.Add(fieldType, TypeInfo.Create(id));
                            }
                            else
                            {
                                types.Enqueue(fieldType); // need to fill child nodes
                                var genericTArgs = fieldType.GetGenericArguments();
                                foreach(var T in genericTArgs)
                                {
                                    if (T.IsGenericParameter) // example) K of List<K>, we don't need that
                                        continue;

                                    if (!typeDict.ContainsKey(T))
                                        types.Enqueue(T);
                                        // typeDict.Add(T, TypeInfo.Create(T));
                                }
                            }
                        }
                        else
                        {
                            typeDict.Add(fieldType, TypeInfo.Create(fieldType));
                            types.Enqueue(fieldType);
                        }
                    }
                    // set child type's typeId
                    if (fieldType.IsGenericType)
                    {
                        var identifier = string.Empty;
                        if (fieldType.GetGenericTypeDefinition() == listType)
                        {
                            identifier = Util.GetListTypeIdentifier(fieldType);
                        }
                        else
                        {
                            identifier = Util.GetGenericTypeIdentifier(fieldType);
                        }
                        typeInfo.childNodes[fieldName] = identifier;
                    }
                    else
                    {
                        // typeInfo.childNodes[fieldName] = $"{fieldType.Namespace}.{fieldType.Name}";
                        typeInfo.childNodes[fieldName] = Util.GetTypeIdentifier(fieldType);
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
                    if (typeDict.ContainsKey(baseType))
                        return true;
                    baseType = baseType.BaseType;
                }
                return false;
            };

            var relatedTypes = from assem in AppDomain.CurrentDomain.GetAssemblies()
                           let types = assem.GetTypes()
                           from type in types
                           where type != null && isRelated(type)
                           select type;

            return relatedTypes;
        }

        static void PopulateData()
        {
            var integers = new HashSet<Type>(new Type[] {
                        typeof(byte), typeof(sbyte), typeof(Int16), typeof(UInt16), typeof(Int32), typeof(UInt32),
                        typeof(Int64), typeof(UInt64)
                    });

            var floats = new HashSet<Type>(new Type[]
            {
                        typeof(Single), typeof(double)
            });
            var stringType = typeof(string);

            var targets = typeDict;

            var def = RWTypes.Def;
            foreach (var pair in targets)
            {
                var type = pair.Key;
                var typeInfo = pair.Value;
                typeInfo.isLeafNode = true;
                if (type.IsEnum)
                {
                    var values = type.GetEnumValues().Cast<Object>().Select(obj => obj.ToString())
                        .Select(name => new CompletionItem() { label = name, kind = CompletionItemKind.Enum })
                        .ToArray();
                    typeInfo.leafNodeCompletions = values;
                    typeInfo.specialType.@enum = true;
                }
                if (type.IsGenericType)
                {
                    if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(List<>).GetGenericTypeDefinition())
                    {
                        var T = type.GetGenericArguments()[0];
                        ref var enumerable = ref typeInfo.specialType.enumerable;
                        enumerable.genericType = Util.GetTypeIdentifier(T);
                        enumerable.enumerableType = "list";
                    }
                }
                else if (type.IsArray)
                {
                    var T = type.GetElementType();
                    ref var enumerable = ref typeInfo.specialType.enumerable;
                    enumerable.genericType = Util.GetTypeIdentifier(T);
                    enumerable.enumerableType = "array";
                }
                if (type == stringType)
                {
                    typeInfo.specialType.@string = true;
                }
                if (type.IsPrimitive)
                {
                    if (integers.Contains(type))
                    {
                        typeInfo.specialType.integer = true;
                    }
                    else if (floats.Contains(type))
                    {
                        typeInfo.specialType.@float = true;
                    }
                }
                if (type == typeof(bool))
                {
                    typeInfo.specialType.@bool = true;
                }
                if (type.IsSubclassOf(UnityEngineTypes.Color))
                {
                    typeInfo.specialType.color = true;
                }
                if (type == RWTypes.IntRange)
                {
                    typeInfo.specialType.intRange = true;
                }
                if (type == RWTypes.FloatRange)
                {
                    typeInfo.specialType.floatRange = true;
                }
                if (type == RWTypes.IntVec3)
                {
                    typeInfo.specialType.intVec3 = true;
                }
                if (type.IsSubclassOf(def))
                {
                    ref var defType = ref typeInfo.specialType.defType;
                    if (type.IsArray)
                    {
                        if(type.Assembly == RWTypes.assembly)
                            defType.name = type.GetElementType().Name;
                        else
                            defType.name = Util.GetArrayTypeIdentifier(type);
                    }
                    else
                    {
                        if(type.Assembly == RWTypes.assembly)
                            defType.name = type.Name;
                        else
                            defType.name = Util.GetTypeIdentifier(type);

                    }
                }
                if (type.Name.Contains("CompProperties"))
                {
                    typeInfo.specialType.compClass.isComp = true;
                    var baseType = type;
                    var objType = typeof(object);
                    while (baseType != null && baseType.BaseType != objType && baseType.Name.Contains("CompProperties"))
                    { // possible bug - baseType was not registered in static typeDict, maybe
                        // also if CompProperties have interface, then it will throw the error cuz baseType is null
                        // I'm just adding baseType != null to avoid critical issues, fix this later
                        baseType = baseType.BaseType;
                    }
                    typeInfo.specialType.compClass.baseClass = Util.GetTypeIdentifier(baseType);
                }

                typeInfo.populated = true;
            }
        }
    }
}

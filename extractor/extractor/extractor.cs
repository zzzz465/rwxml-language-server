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

                    var types = from type in assembly.GetTypes()
                                where type != null && type.IsSubclassOf(RWTypes.Def)
                                select type;

                    CollectData_BFS(types);
                }

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

                TypeInfo typeInfo;
                if (!typeDict.TryGetValue(type, out typeInfo))
                {
                    typeInfo = TypeInfo.Create(type);
                    typeDict.Add(type, typeInfo);
                }

                if (type.IsPrimitive || type == typeof(String))
                    continue;

                var name = type.Name;

                var fields = type.GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic);
                foreach (var field in fields)
                {
                    var fieldType = field.FieldType;
                    var fieldName = field.Name;

                    var unsavedAttr = fieldType.CustomAttributes.FirstOrDefault(attr => attr.AttributeType == RWTypes.UnsavedAttribute);
                    if (unsavedAttr != null)
                    {
                        Console.WriteLine("asdf");
                    }

                    /*
                    if (field.TryGetAttribute<UnsavedAttribute>(out var unsavedAttr))
                        if (!unsavedAttr.allowLoading)
                            continue;
                    */

                    if (!typeDict.ContainsKey(fieldType))
                    {
                        if (fieldType.IsGenericType && fieldType.GetGenericTypeDefinition() == listType)
                        {
                            var id = Util.GetListTypeIdentifier(fieldType);
                            typeDict.Add(fieldType, TypeInfo.Create(id));
                        }
                        else
                        {
                            typeDict.Add(fieldType, TypeInfo.Create(fieldType));
                            types.Enqueue(fieldType);
                        }
                    }
                    if (fieldType.IsGenericType)
                    {
                        var identifier = string.Empty;
                        if (fieldType.GetGenericTypeDefinition() == typeof(List<>))
                        {
                            identifier = Util.GetListTypeIdentifier(fieldType);
                        }
                        typeInfo.childNodes[fieldName] = identifier;
                    }
                    else
                    {
                        typeInfo.childNodes[fieldName] = $"{fieldType.Namespace}.{fieldType.Name}";
                    }
                }
            }
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
                        .Select(name => new CompletionItem() { label = name, kind = CompletionItemKind.EnumMember })
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
                        defType.name = type.GetElementType().Name;
                    else
                        defType.name = type.Name;
                }
                if (type.GetField("compClass") != null)
                {
                    typeInfo.specialType.compClass.isComp = true;
                    var baseType = type;
                    var objType = typeof(object);
                    while (baseType.BaseType != objType && baseType.GetField("compClass") != null)
                    { // possible bug - baseType was not registered in static typeDict, maybe?
                        baseType = baseType.BaseType;
                    }
                    typeInfo.specialType.compClass.baseClass = Util.GetTypeIdentifier(baseType);
                }
            }
        }
    }
}

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
        static Dictionary<Type, RawTypeInfo> typeDict = new Dictionary<Type, RawTypeInfo>();

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

                    try
                    {
                        // collect Def or CompProperties (naming convention)
                        var types = from type in assembly.GetTypes()
                                    where type != null && (type.IsSubclassOf(RWTypes.Def) || type.Name.Contains("CompProperties"))
                                    select type;
                        var name = assembly.GetName().Name;
                        CollectData_BFS(types);
                    }
                    catch (Exception ex)
                    {
                        Log.Error($"Error was thrown while extracting data from {assembly.GetName().FullName}");
                        Log.Error(ex.Message);
                    }
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

                RawTypeInfo typeInfo;
                if (!typeDict.TryGetValue(type, out typeInfo))
                {
                    typeInfo = new RawTypeInfo(type);
                    typeDict.Add(type, typeInfo);
                }

                if (typeInfo.childCollected)
                {
                    continue;
                }

                if (type.IsPrimitive || type == typeof(String))
                {
                    continue;
                }

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

                    if (!typeDict.ContainsKey(fieldType)) // if it is not registered
                    {
                        if (fieldType.IsGenericType)
                        {
                            if (fieldType.GetGenericTypeDefinition() == listType)
                            {
                                var fullName = Util.GetListTypeIdentifier(fieldType); // don't need to fill child nodes.
                                typeDict.Add(fieldType, new RawTypeInfo(fullName));
                            }
                            else
                            {
                                types.Enqueue(fieldType); // need to fill child nodes
                                var genericTArgs = fieldType.GetGenericArguments();
                                foreach (var T in genericTArgs)
                                {
                                    if (T.IsGenericParameter)
                                    { // example) K of List<K>, we don't need that
                                        continue;
                                    }

                                    if (!typeDict.ContainsKey(T))
                                    {
                                        types.Enqueue(T);
                                    }
                                }
                            }
                        }
                        else
                        {
                            typeDict.Add(fieldType, new RawTypeInfo(fieldType));
                            types.Enqueue(fieldType);
                        }
                    }

                    // set child type's typeId
                    if (fieldType.IsGenericType)
                    {
                        var fullName = string.Empty;
                        if (fieldType.GetGenericTypeDefinition() == listType)
                        {
                            fullName = Util.GetListTypeIdentifier(fieldType);
                        }
                        else
                        {
                            fullName = Util.GetGenericTypeIdentifier(fieldType);
                        }
                        typeInfo.fields[fieldName] = new RawFieldInfo() { fullName = fullName };
                    }
                    else
                    {
                        // typeInfo.childNodes[fieldName] = $"{fieldType.Namespace}.{fieldType.Name}";
                        var fullName = Util.GetTypeIdentifier(fieldType);
                        typeInfo.fields[fieldName] = new RawFieldInfo() { fullName = fullName };
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
                var rawTypeInfo = pair.Value;

                // populate rawTypeInfo
                if (type.IsEnum)
                {
					// set leafNodeCompletions and specialType (obsolete), now moved to language-server part
                    // var values = type.GetEnumValues().Cast<Object>().Select(obj => obj.ToString())
                        // .Select(name => new CompletionItem() { label = name, kind = CompletionItemKind.Enum })
                        // .ToArray();
                    // rawTypeInfo.leafNodeCompletions = values;
                    // rawTypeInfo.specialType.@enum = true;
                }
                if (type.IsGenericType)
                {
                    if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(List<>).GetGenericTypeDefinition())
                    {
                        var T = type.GetGenericArguments()[0];
						rawTypeInfo.metadata.enumerable.genericType = Util.GetTypeIdentifier(T);
						// rawTypeInfo doesn't accept enumerableType anymore, leave this code for future use.
                        // enumerable.enumerableType = "list";
                    }
                }
                else if (type.IsArray)
                {
                    var T = type.GetElementType();
                    rawTypeInfo.metadata.enumerable.genericType = Util.GetTypeIdentifier(T);
					// rawTypeInfo doesn't accept enumerableType anymore, leave this code for future use.
                    // enumerable.enumerableType = "array";
                }
                if (type == stringType)
                {
                    // rawTypeInfo.specialType.@string = true;
                }
                if (type.IsPrimitive)
                {
                    if (integers.Contains(type))
                    {
                        // rawTypeInfo.specialType.integer = true;
                    }
                    else if (floats.Contains(type))
                    {
                        // rawTypeInfo.specialType.@float = true;
                    }
                }
                if (type == typeof(bool))
                {
                    // rawTypeInfo.specialType.@bool = true;
                }
                if (type.IsSubclassOf(UnityEngineTypes.Color))
                {
                    // rawTypeInfo.specialType.color = true;
                }
                if (type == RWTypes.IntRange)
                {
                    // rawTypeInfo.specialType.intRange = true;
                }
                if (type == RWTypes.FloatRange)
                {
                    // rawTypeInfo.specialType.floatRange = true;
                }
                if (type == RWTypes.IntVec3)
                {
                    // rawTypeInfo.specialType.intVec3 = true;
                }
                if (type.IsSubclassOf(def))
                {
					if (type.IsArray)
					{
						rawTypeInfo.metadata.defType.name = Util.GetArrayTypeIdentifier(type);
					}
					else
					{
						rawTypeInfo.metadata.defType.name = Util.GetTypeIdentifier(type);
					}
                }
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

					rawTypeInfo.metadata.compClass.baseClass = Util.GetTypeIdentifier(baseType);
                }

                // populate fieldInfo in fields

                foreach(var pair2 in rawTypeInfo.fields)
                {
                    var fieldName = pair2.Key;
                    var rawFieldInfo = pair2.Value;

                    var fieldInfo = type.GetField(fieldName, BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance);

                    rawFieldInfo.fullName = Util.GetTypeIdentifier(fieldInfo.FieldType);
                    
                    if (fieldInfo.IsPublic)
                    {
                        rawFieldInfo.accessModifier = "public";
                    }
                    else if (fieldInfo.IsPrivate)
                    {
                        rawFieldInfo.accessModifier = "private";
                    }

                    // check MustTranslateAttribute
                    if (Attribute.IsDefined(fieldInfo, RWTypes.MustTranslateAttribute, false))
                    {
                        rawFieldInfo.fieldMetadata.mustTranslate = true;
                    }
                }

                rawTypeInfo.populated = true;
            }
        }
    }
}

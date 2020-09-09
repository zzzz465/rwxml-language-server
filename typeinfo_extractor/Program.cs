using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Verse;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Schema;
using Newtonsoft.Json.Serialization;
using System.IO;
using System.IO.Pipes;
using System.Text;
using RimWorld;

namespace Program
{
    class Program
    {
        static Dictionary<Type, TypeInfo> typeDict = new Dictionary<Type, TypeInfo>();
        static void Main(string[] args)
        {
            if (args.Length > 0 && args[0] == "--stdout")
            {
                var stdout = Console.OpenStandardOutput();
                var assemblies = new List<Assembly>();
                // Console.WriteLine("asdf");
                // var pipeStream = new NamedPipeClientStream(".", "rwxml", PipeDirection.InOut, PipeOptions.Asynchronous);
                // pipeStream.Connect(10);
                // Console.WriteLine("[C#]: stream connected");
                
                try
                {
                    foreach(var arg in args.Skip(1)) // arg[0] is pipe name
                    {
                        var assem = Assembly.LoadFrom(arg);
                        assemblies.Add(assem);
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine(ex.Message);
                    return;
                }

                var types = new HashSet<Type>();
                var defType = typeof(Def);
                foreach(var assem in assemblies)
                {
                    var targetTypes = assem.GetTypes().Where(type => type.IsSubclassOf(defType));
                    foreach(var type in targetTypes)
                    {
                        types.Add(type);
                    }
                }

                CollectRelatedData_BFS(types);
                PopulateData();
                MarkDefNodes();

                var result = new Dictionary<string, TypeInfo>();
                foreach (var (_, typeInfo) in typeDict)
                {
                    if (result.ContainsKey(typeInfo.typeIdentifier))
                        continue;
                    result.Add(typeInfo.typeIdentifier, typeInfo);
                }

                var serializerSetting = new JsonSerializerSettings();
                serializerSetting.Formatting = Formatting.None;
                serializerSetting.NullValueHandling = NullValueHandling.Ignore;
                serializerSetting.DefaultValueHandling = DefaultValueHandling.Ignore;

                var serializedObject = JsonConvert.SerializeObject(result.Select(d => d.Value), serializerSetting);
                var utf8bytes = UTF8Encoding.UTF8.GetBytes(serializedObject);
                stdout.Write(utf8bytes);
                // pipeStream.Write(utf8bytes);
                // pipeStream.Close();
            }
            else
            { // for test purpose
                var inheritedTypes = from type in typeof(Editable).Assembly.GetTypes().AsEnumerable()
                                     where (type.IsSubclassOf(typeof(Editable)) ||
                                     type.GetMember("compClass") != null ) && // get all compClass
                                     !type.IsAbstract
                                     select type;

                CollectRelatedData_BFS(inheritedTypes);
                PopulateData();
                MarkDefNodes();
                // MoveTempToAppropriateNode();
                
                var result = new Dictionary<string, TypeInfo>();
                foreach(var (_, typeInfo) in typeDict)
                {
                    if(result.ContainsKey(typeInfo.typeIdentifier))
                        continue;
                    result.Add(typeInfo.typeIdentifier, typeInfo);
                }
                
                var serializerSetting = new JsonSerializerSettings();
                serializerSetting.Formatting = Formatting.Indented;
                serializerSetting.NullValueHandling = NullValueHandling.Ignore;
                serializerSetting.DefaultValueHandling = DefaultValueHandling.Ignore;

                var serializedObject = JsonConvert.SerializeObject(result.Select(d => d.Value), serializerSetting);
                // var typeInfos = typeDict.Select(d => d.Value);
                // var serializedObject = JsonConvert.SerializeObject(typeInfos);
                File.WriteAllText("./output.json", serializedObject);
                // Console.WriteLine(serializedObject);
            }
        }

        static void CollectRelatedData_BFS(IEnumerable<Type> _types)
        {
            var listType = typeof(List<>).GetGenericTypeDefinition();

            Queue<Type> types = new Queue<Type>(_types);
            while(types.Count > 0)
            {
                var type = types.Dequeue();

                TypeInfo typeInfo;
                if(!typeDict.TryGetValue(type, out typeInfo))
                {
                    typeInfo = TypeInfo.Create(type);
                    typeDict.Add(type, typeInfo);
                }

                if (type.IsPrimitive || type == typeof(String))
                    continue;

                var name = type.Name;
    
                var fields = type.GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic);
                foreach(var field in fields)
                {
                    var fieldType = field.FieldType;
                    var fieldName = field.Name;
                    
                    if (field.TryGetAttribute<UnsavedAttribute>(out var unsavedAttr))
                        if (!unsavedAttr.allowLoading)
                            continue;

                    if(!typeDict.ContainsKey(fieldType)) {
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
                    if(fieldType.IsGenericType)
                    {
                        var identifier = string.Empty;
                        if(fieldType.GetGenericTypeDefinition() == typeof(List<>))
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

            var def = typeof(Def);
            foreach(var (type, typeInfo) in targets)
            {
                typeInfo.isLeafNode = true;
                if(type.IsEnum)
                {
                    var values = type.GetEnumValues().Cast<Object>().Select(obj => obj.ToString())
                        .Select(name => new CompletionItem() { label = name, kind = CompletionItemKind.EnumMember })
                        .ToArray();
                    typeInfo.leafNodeCompletions = values;
                    typeInfo.specialType.@enum = true;
                }
                if(type.IsGenericType)
                {
                    if(type.IsGenericType && type.GetGenericTypeDefinition() == typeof(List<>).GetGenericTypeDefinition())
                    {
                        var T = type.GetGenericArguments()[0];
                        ref var enumerable = ref typeInfo.specialType.enumerable;
                        enumerable.genericType = Util.GetTypeIdentifier(T);
                        enumerable.enumerableType = "list";
                    }
                }
                else if(type.IsArray)
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
                    else if(floats.Contains(type))
                    {
                        typeInfo.specialType.@float = true;
                    }
                }
                if(type == typeof(bool))
                {
                    typeInfo.specialType.@bool = true;
                }
                if(type.IsSubclassOf(typeof(UnityEngine.Color)))
                {
                    typeInfo.specialType.color = true;
                }
                if(type == typeof(IntRange))
                {
                    typeInfo.specialType.intRange = true;
                }
                if(type == typeof(FloatRange))
                {
                    typeInfo.specialType.floatRange = true;
                }
                if(type == typeof(IntVec3))
                {
                    typeInfo.specialType.intVec3 = true;
                }
                if(type.IsSubclassOf(def)) {
                    ref var defType = ref typeInfo.specialType.defType;
                    if(type.IsArray)
                        defType.name = type.GetElementType().Name;
                    else
                        defType.name = type.Name;
                }
                if(type.GetField("compClass") != null)
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

        static void MarkDefNodes()
        {
            /*
            var targets = from data in typeDict
                        where data.Value.childNodes.ContainsKey("defName")
                        select data.Value;
            foreach(var typeInfo in targets)
                typeInfo.isDefNode = true;
            */
        }
        /*
        static void MoveTempToAppropriateNode()
        {
            foreach(var (type, typeInfo) in typeDict)
            {
                foreach(var (key, value) in typeInfo.tempNodes)
                {
                    if(value.isLeafNode)
                        typeInfo.leafNodes[key] = value;
                    else
                }
            }
        }
        */
        /*
        static void populateData(Type type) {
            TypeInfo typeInfo;
            if(!typeDict.TryGetValue(type, out typeInfo))
                typeInfo = new TypeInfo();
            
            var childNodes = typeInfo.childNodes;
            var leafNodes = typeInfo.leafNodes;

            var fields = type.GetFields(BindingFlags.Public | BindingFlags.Instance);
            foreach(var field in fields)
            {
                var fieldType = field.FieldType;
                var fieldName = field.Name;
                if(!typeDict.ContainsKey(fieldType))
                    typeDict.Add(fieldType, new TypeInfo());
            }
            foreach(var field in fields)
            {
                var fieldType = field.FieldType;
                var fieldName = field.Name;
                if(typeDict.TryGetValue(fieldType, out var result))
                {
                    typeInfo.childNodes.SetOrAdd(fieldName, result);
                }
                else
                {
                    if(fieldType.IsEnum)
                    {
                        
                        var values = fieldType.GetEnumValues().Cast<Object>().Select(obj => obj.ToString())
                            .Select(name => new CompletionItem() { label = name, kind = CompletionItemKind.EnumMember })
                            .ToArray();
                        leafNodes.SetOrAdd(fieldName, values);
                    }
                    else if(fieldType.IsGenericType)
                    {
                        var genericType = fieldType.GetGenericTypeDefinition();
                        if(genericType == typeof(List<>))
                        {
                            try 
                            {
                                var T = fieldType.GetGenericArguments().First();
                                var genericTypeInfo = new GenericTypeInfo();
                                if(!typeDict.ContainsKey(T))
                                    populateData(T);
                                genericTypeInfo.genericType = typeDict[T];
                                childNodes[fieldName] = genericTypeInfo;
                            }
                            catch
                            {
                                Console.WriteLine($"err while extracting data from generic parameter {genericType.Name}");
                            }
                        }
                    }
                    else if(fieldType.IsPrimitive)
                    {
                        // TODO
                        leafNodes.Add(fieldName, new CompletionItem[] { new CompletionItem() { label = fieldType.Name } });
                    }
                }
            }

            Console.WriteLine($"Added type {typeInfo.qualifiedName} with field count {childNodes.Count + leafNodes.Count}");
        }
        */
    }
}

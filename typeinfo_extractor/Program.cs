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

namespace Program
{
    class Program
    {
        static Dictionary<Type, TypeInfo> typeDict = new Dictionary<Type, TypeInfo>();
        static void Main(string[] args)
        {
            var inheritedTypes = from type in typeof(Editable).Assembly.GetTypes().AsEnumerable()
                                 where type.IsSubclassOf(typeof(Editable)) && !type.IsAbstract
                                 select type;


            // populateData(type);
            CollectRelatedData_BFS(inheritedTypes);
            PopulateTempData();
            MarkDefNodes();
            // MoveTempToAppropriateNode();
            
            var result = new Dictionary<string, TypeInfo>();
            foreach(var (_, typeInfo) in typeDict)
            {
                if(result.ContainsKey(typeInfo.typeIdentifier))
                    continue;
                result.Add(typeInfo.typeIdentifier, typeInfo);
            }
            

            var serializedObject = JsonConvert.SerializeObject(result.Select(d => d.Value));
            // var typeInfos = typeDict.Select(d => d.Value);
            // var serializedObject = JsonConvert.SerializeObject(typeInfos);
            File.WriteAllText("./output.json", serializedObject);
            // Console.WriteLine(serializedObject);
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

                var name = type.Name;
    
                var fields = type.GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic);
                foreach(var field in fields)
                {
                    var fieldType = field.FieldType;
                    var fieldName = field.Name;
                    
                    if (field.TryGetAttribute<UnsavedAttribute>(out var unsavedAttr))
                        if (!unsavedAttr.allowLoading)
                            continue;

                    if (fieldType.IsGenericType && fieldType.GetGenericTypeDefinition() == listType)
                    {
                        if (typeDict.ContainsKey(fieldType))
                        {
                            Console.WriteLine("!!!!");
                        }
                        Console.WriteLine("asdf");
                    }

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

        static void PopulateTempData()
        {
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
                }
                if(type.IsGenericType)
                {
                    if(type.IsGenericType && type.GetGenericTypeDefinition() == typeof(List<>).GetGenericTypeDefinition())
                    {
                        var T = type.GetGenericArguments()[0];
                        ref var enumerable = ref typeInfo.specialTypes.enumerable;
                        enumerable.genericType = Util.GetTypeIdentifier(T);
                        enumerable.enumerableType = "list";
                    }
                }
                else if(type.IsArray)
                {
                    var T = type.GetElementType();
                    ref var enumerable = ref typeInfo.specialTypes.enumerable;
                    enumerable.genericType = Util.GetTypeIdentifier(T);
                    enumerable.enumerableType = "array";
                }
                if(type.IsPrimitive)
                {
                    typeInfo.leafNodeCompletions = new CompletionItem[] { new CompletionItem() { label = type.Name } };
                }
                if(type.IsSubclassOf(def)) {
                    ref var defType = ref typeInfo.specialTypes.defType;
                    if(type.IsArray)
                        defType.defType = type.GetElementType().Name;
                    else
                        defType.defType = type.Name;
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

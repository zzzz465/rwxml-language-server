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

namespace typeinfo_extractor
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
            LinkTempData(inheritedTypes);
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

        static void LinkTempData(IEnumerable<Type> _types)
        {
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
                    if(!typeDict.ContainsKey(fieldType)) {
                        typeDict.Add(fieldType, TypeInfo.Create(fieldType));
                        types.Enqueue(fieldType);
                    }
                    if(fieldType.IsGenericType)
                    {
                        var identifier = string.Empty;
                        if(fieldType.GetGenericTypeDefinition() == typeof(List<>))
                        {
                            var T = fieldType.GetGenericArguments()[0];
                            var namespaceName = fieldType.Namespace;
                            identifier = $"{namespaceName}.List<{T}>";
                        }
                        typeInfo.childNodes[fieldName] = identifier;
                    }
                    else
                    {
                        typeInfo.childNodes[fieldName] = $"{fieldType.Namespace}.{fieldType.Name}";
                    }
                    // Console.WriteLine();
                }
            }
        }

        static void PopulateTempData()
        {
            var targets = from data in typeDict
                        where data.Key.IsArray ||
                            data.Key.IsEnum || 
                            data.Key.IsGenericType ||
                            data.Key.IsPrimitive
                        select data;
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
                else if(type.IsGenericType)
                {
                    // TODO
                }
                else if(type.IsPrimitive)
                {
                    typeInfo.leafNodeCompletions = new CompletionItem[] { new CompletionItem() { label = type.Name } };
                }
            }
        }

        static void MarkDefNodes()
        {
            var targets = from data in typeDict
                        where data.Value.childNodes.ContainsKey("defName")
                        select data.Value;
            foreach(var typeInfo in targets)
                typeInfo.isDefNode = true;
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

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;

namespace extractor
{
    public static class AssemblyLoader
    {
        static Dictionary<AssemblyName, Assembly> cache = new Dictionary<AssemblyName, Assembly>();
        static readonly Regex blacklist = new Regex("Mono\\.Security");

        static string SanitizePath(string path)
        {
            return path.Trim((char)7234);
        }

        static AssemblyLoader()
        {
            // AppDomain.CurrentDomain.ReflectionOnlyAssemblyResolve += ResolveHandler;
            AppDomain.CurrentDomain.AssemblyResolve += ResolveHandler;
        }

        static Assembly ResolveHandler(object sender, ResolveEventArgs e)
        {
            // 1) find on cache
            var assemName = new AssemblyName(e.Name);
            if (cache.TryGetValue(assemName, out var result))
                return result;

            // 2) try to find on current appdomain
            // var assem = Assembly.ReflectionOnlyLoad(e.Name);
            var name = e.Name.Split(',')[0].Trim();
            var assem = AppDomain.CurrentDomain.GetAssemblies().FirstOrDefault(assembly => assembly.GetName().Name == name);
            if (assem != null)
                return assem;

            // 3) try to load
            if (e.RequestingAssembly == null)
            {
                Log.Error($"DLL [{e.Name}] was not provided to AssemblyReference, you should include it.");
                throw new DllNotFoundException($"DLL {e.Name} was not provided");
            }

            var assem2 = Assembly.Load(e.Name); // it is now registered to appdomain, so we don't have to store it.
            if (assem2 != null)
                return assem2;

            // unused
            if (assem != null)
            {
                cache.Add(assem.GetName(), assem);
                return assem;
            }
            else
                return null;
        }

        public static IEnumerable<Assembly> Load(IEnumerable<string> _paths)
        {
            var paths = _paths.Select(path => SanitizePath(path));
            var list = new List<Assembly>();
            foreach (var path in paths)
            {
                var fullPath = Path.GetFullPath(path);
                if (Directory.Exists(fullPath))
                {
                    var files = Directory.GetFiles(fullPath, "*.dll");
                    foreach (var file in files)
                    {
                        if (blacklist.IsMatch(file))
                            continue;
                        try
                        {
                            list.Add(_Load(file));
                        }
                        catch (Exception ex)
                        {
                            Log.Warn(ex.ToString());
                        }
                    }
                }
                else if (File.Exists(fullPath))
                {
                    if (blacklist.IsMatch(fullPath))
                        continue;
                    try
                    {
                        list.Add(_Load(fullPath));
                    }
                    catch (Exception ex)
                    {
                        Log.Warn(ex.ToString());
                    }
                }
            }

            return list;
        }

        static Assembly _Load(string path)
        {
            // var raw = File.ReadAllBytes(path);
            var assem = Assembly.UnsafeLoadFrom(path);
            // var assem = Assembly.ReflectionOnlyLoadFrom(path);
            cache.Add(assem.GetName(), assem);

            return assem;
        }
    }
}

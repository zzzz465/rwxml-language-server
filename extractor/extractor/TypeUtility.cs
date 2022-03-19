using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace extractor
{
    public static class TypeUtility
    {
        public static IEnumerable<Type> GetTypes(this Assembly assembly)
        {
            try
            {
                return assembly.GetTypes();
            }
            catch (Exception ex)
            {
                if (ex is ReflectionTypeLoadException)
                {
                    var typeLoadException = ex as ReflectionTypeLoadException;
                    return typeLoadException.Types;
                }

                throw ex;
            }
        }
    }
}

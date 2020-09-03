using System;
using System.Reflection;
using System.Collections.Generic;

namespace Program
{
    public class TypeReader
    {
        public static void ExtractField(Type type)
        {
            var instance = new TypeReader(type);
            instance._ExtractField();
        }
        private Type type;
        private TypeReader(Type type)
        {
            this.type = type;
        }

        private void _ExtractField()
        {
            var fields = type.GetFields(BindingFlags.Instance|BindingFlags.Public);
            foreach(var field in fields)
            {
                
            }
            
        }
    }
}
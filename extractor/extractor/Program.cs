using CommandLine;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net.Sockets;

namespace extractor
{
    public enum OutputMode
    {
        stdout = 0,
        stdoutBytes = 1,
        // file = 2,
        TCP = 3
    }

    public class ProgramOptions
    {
        [Option('v', "verbose", Required = false, HelpText = "Set output to verbose messages.")]
        public bool Verbose { get; set; }

        [Option("output-mode", Required = false, Default = OutputMode.stdout, HelpText = "select extraction ouptut mode, stdout or file")]
        public OutputMode outputMode { get; set; }

        // [Option('o', "out", Required = false, HelpText = "select output mode")]
        // public string outputPath { get; set; }

        [Option("formatted", Required = false, Default = true, HelpText = "print output json as formatted")]
        public bool formatted { get; set; }

        // [Option("log", Required = false, Default = false, HelpText = "Set log output path")]
        // public string logOutputPath { get; set; }

        [Option("port", Required = false, Default = 9870, HelpText = "connection port on trasnporting via TCP")]
        public int port { get; set; }

        [Value(0, Required = true, HelpText = "dll file/directory to extract data")]
        public IEnumerable<string> targetFiles { get; set; }
    }

    class Program
    {
        static int port = 9870;
        static int Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;

            var commandline = Parser.Default.ParseArguments<ProgramOptions>(args);
            int exitCode = 1;
            commandline.WithParsed(option =>
            {
                try
                {
                    Log.SetStdOutput();

                    port = option.port;

                    Log.Info("Extracting data from");
                    foreach (var file in option.targetFiles)
                    {
                        Log.Info(file);
                    }
                    var assemblies = AssemblyLoader.Load(option.targetFiles);
                    Log.Info("extracting data...");
                    var parseResult = Extractor.parse(assemblies);
                    Log.Info($"Completed extracting data, data count: {parseResult.Count}");

                    var result = new Dictionary<string, RawTypeInfo>();
                    foreach (var pair in parseResult)
                    {
                        var typeInfo = pair.Value;
                        if (result.ContainsKey(typeInfo.fullName))
                            continue;
                        result.Add(typeInfo.fullName, typeInfo);
                    }

                    var serializerSetting = new JsonSerializerSettings();
                    serializerSetting.Formatting = option.formatted ? Formatting.Indented : Formatting.None;
                    serializerSetting.NullValueHandling = NullValueHandling.Ignore;
                    serializerSetting.DefaultValueHandling = DefaultValueHandling.Ignore;

                    var serializedObject = JsonConvert.SerializeObject(result.Select(d => d.Value), serializerSetting);
                    Log.Info($"serialized Object string length: {serializedObject.Length}");

                    SendSerializedData(option.outputMode, serializedObject);
                    Log.Info("Extraction completed!");
                    exitCode = 0;
                }
                catch (Exception ex)
                {
                    Log.Error(ex.ToString());
                    exitCode = 1;
                }
            });

            return exitCode;
        }

        static void SendSerializedData(OutputMode type, string data)
        {
            switch (type)
            {
                case OutputMode.stdout:
                    Console.WriteLine(data);
                    break;

                case OutputMode.TCP:
                    SendSerializedDataUsingTCP(data);
                    break;
            }
        }

        static void SendSerializedDataUsingTCP(string data)
        {
            var client = new TcpClient();
            Console.WriteLine($"Connecting to localhost server, port: {port}");
            client.Connect("127.0.0.1", port);            

            var stream = client.GetStream();

            var byteSerializedData = Encoding.UTF8.GetBytes(data);

            int bufferSize = 1024;
            int offset = 0;

            while (offset < byteSerializedData.Length)
            {
                int len = offset + bufferSize < byteSerializedData.Length ? bufferSize : byteSerializedData.Length - offset;

                stream.Write(byteSerializedData, offset, len);

                offset += len;
            }

            client.Close();
        }
    }
}

using CommandLine;
using log4net.Appender;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.RegularExpressions;

namespace extractor
{
	public enum OutputMode
	{
		stdout = 0,
		stdoutBytes = 1,
		file = 2
	}

	public class ProgramOptions
	{
		[Option('v', "verbose", Required = false, HelpText = "Set output to verbose messages.")]
		public bool Verbose { get; set; }

		// [Option("output-mode", Required = true, HelpText = "select extraction ouptut mode, stdout or file")]
		// public OutputMode outputMode { get; set; }

		// [Option('o', "out", Required = false, HelpText = "select output mode")]
		// public string outputPath { get; set; }

		[Option("formatted", Required = false, Default = true, HelpText = "print output json as formatted")]
		public bool formatted { get; set; }

		// [Option("log", Required = false, Default = false, HelpText = "Set log output path")]
		// public string logOutputPath { get; set; }

		[Value(0, Required = true, HelpText = "dll file/directory to extract data")]
		public IEnumerable<string> targetFiles { get; set; }
	}

	class Program
	{
		static int Main(string[] args)
		{
			var commandline = Parser.Default.ParseArguments<ProgramOptions>(args);
			int exitCode = 1;
			commandline.WithParsed(option =>
			{
				// if (option.logOutputPath != null)
				// {
				// 	Log.SetOutput(option.logOutputPath);
				// }

					Log.Info("Extracting data from");
					foreach (var file in option.targetFiles) { 
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

					/*
					switch (option.outputMode)
					{
						case OutputMode.stdout:
							Console.WriteLine(serializedObject);
							break;

						case OutputMode.stdoutBytes:
							var utf8bytes = UTF8Encoding.UTF8.GetBytes(serializedObject);
							Log.Info($"serialized text bytes length: {utf8bytes.Length}");
							Console.OpenStandardOutput().Write(utf8bytes, 0, utf8bytes.Length);
							break;

						case OutputMode.file:
							var path = option.outputPath;
							File.WriteAllText(path, serializedObject);
							break;
					}
					*/

					Console.WriteLine(serializedObject);
					Log.Info("Extraction completed!");
					exitCode = 0;
			});

			return exitCode;
		}
	}
}

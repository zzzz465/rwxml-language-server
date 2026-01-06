using log4net;
using log4net.Appender;
using log4net.Core;
using log4net.Filter;
using log4net.Layout;
using log4net.Repository.Hierarchy;

namespace extractor
{
    public static class Log
    {
        static ILog log = LogManager.GetLogger("Extractor");
        static PatternLayout layout;

        static Log()
        {
            layout = new PatternLayout();
            layout.ConversionPattern = "%type %method %line - %c [%p]: %m%n";
            layout.ActivateOptions();
        }

        public static void SetStdOutput()
        {
            var hierarchy = (Hierarchy)LogManager.GetRepository();

            var appenderStdout = new ConsoleAppender();
            appenderStdout.Layout = layout;
            appenderStdout.Target = ConsoleAppender.ConsoleError;
            var stdOutFilter = new LevelRangeFilter();
            stdOutFilter.LevelMax = Level.Warn;
            stdOutFilter.LevelMin = Level.All;
            appenderStdout.AddFilter(stdOutFilter);
            appenderStdout.ActivateOptions();

            var appenderStderr = new ConsoleAppender();
            appenderStderr.Layout = layout;
            appenderStderr.Target = ConsoleAppender.ConsoleError;
            var stdErrFilter = new LevelRangeFilter();
            stdErrFilter.LevelMax = Level.Fatal;
            stdErrFilter.LevelMin = Level.Error;
            appenderStderr.Layout = layout;
            appenderStderr.AddFilter(stdErrFilter);
            appenderStderr.ActivateOptions();

            hierarchy.Root.AddAppender(appenderStdout);
            hierarchy.Root.AddAppender(appenderStderr);

            hierarchy.Root.Level = Level.Info;
            hierarchy.Configured = true;
        }

        // https://stackoverflow.com/questions/16336917/can-you-configure-log4net-in-code-instead-of-using-a-config-file
        public static void SetOutput(string path)
        {
            var hierarchy = (Hierarchy)LogManager.GetRepository();
            
            var appender = new RollingFileAppender();
            appender.Name = "FileAppender";
            appender.File = path;
            appender.AppendToFile = false;
            appender.StaticLogFileName = true;

            appender.Layout = layout;
            appender.ActivateOptions();
            hierarchy.Root.AddAppender(appender);

            hierarchy.Root.Level = Level.Info;
            hierarchy.Configured = true;
        }

        public static void Info(string message)
        {
            log.Info(message);
        }

        public static void Debug(string message)
        {
            log.Debug(message);
        }

        public static void Warn(string message)
        {
            log.Warn(message);
        }

        public static void Error(string message)
        {
            log.Error(message);
        }
    }
}

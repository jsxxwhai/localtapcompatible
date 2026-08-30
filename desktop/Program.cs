namespace TapNowLocal;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        // 单实例：重复启动只提示一次
        const string mutexName = @"Global\TapNowLocal_SingleInstance";
        using var mutex = new Mutex(true, mutexName, out var createdNew);
        if (!createdNew)
        {
            var locale = Loc.Normalize(System.Globalization.CultureInfo.CurrentUICulture.TwoLetterISOLanguageName);
            MessageBox.Show(Loc.T(locale, "ui.alreadyRunning"), "TapNow Local");
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}

using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace TapNowLocal;

// 主窗口：WebView2 全屏加载本地虚拟主机上的前端资源
public sealed class MainForm : Form
{
    private readonly WebView2 _webView = new();
    private readonly ApiBridge _bridge = new();

    public MainForm()
    {
        Text = "TapNow Local — 本地 AI 画布";
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        BackColor = Color.FromArgb(11, 14, 23);
        MinimumSize = new Size(960, 640);

        _webView.Dock = DockStyle.Fill;
        Controls.Add(_webView);

        Load += OnLoad;
        FormClosing += OnFormClosing;
    }

    private async void OnLoad(object? sender, EventArgs e)
    {
        try
        {
            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "TapNowLocal", "WebView2");
            // 精简参数：关闭 GPU 合成 / 扩展 / 同步，限制 JS 堆，尽量降低内存占用
            var options = new CoreWebView2EnvironmentOptions
            {
                AdditionalBrowserArguments = "--disable-gpu --in-process-gpu --disable-extensions --disable-sync --disable-crash-reporter --noerrdialogs --disable-background-networking --disable-component-update --js-flags=--max-old-space-size=256",
                Language = "zh-CN",
            };
            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder, options);
            await _webView.EnsureCoreWebView2Async(env);

            var core = _webView.CoreWebView2!;
            var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            core.SetVirtualHostNameToFolderMapping(
                "tapnow.local", wwwroot, CoreWebView2HostResourceAccessKind.DenyCors);

            await core.AddScriptToExecuteOnDocumentCreatedAsync(_bridge.InjectScript);
            _bridge.Attach(core);
            core.Navigate("https://tapnow.local/index.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show("启动失败：" + ex.Message, "TapNow Local", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private void OnFormClosing(object? sender, FormClosingEventArgs e)
    {
        // 关闭窗口即完全退出，不驻留后台
        _bridge.Dispose();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _webView.Dispose();
            _bridge.Dispose();
        }
        base.Dispose(disposing);
    }
}




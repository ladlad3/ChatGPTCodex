using GisApp.Services;

namespace GisApp
{
    /// <summary>アプリケーションエントリポイント</summary>
    // WPF アプリケーション本体
    public partial class App : System.Windows.Application
    {
        protected override void OnStartup(System.Windows.StartupEventArgs e)
        {
            base.OnStartup(e);
            // GDAL初期化
            GdalService.ConfigureGdal();
        }
    }
}

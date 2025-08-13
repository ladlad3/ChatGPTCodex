using System.Windows;
using GisApp.Services;

namespace GisApp
{
    /// <summary>アプリケーションエントリポイント</summary>
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            // GDAL初期化
            GdalService.ConfigureGdal();
        }
    }
}

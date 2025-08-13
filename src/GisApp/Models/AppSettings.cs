namespace GisApp.Models
{
    /// <summary>ユーザー設定モデル</summary>
    public class AppSettings
    {
        public int DefaultEpsg { get; set; } = 4326;
        public string OutputFolder { get; set; } = "out";
        public bool Overwrite { get; set; } = false;
        public int Parallel { get; set; } = 4;
        public string Compression { get; set; } = "LZW";
        public bool Tiled { get; set; } = true;
        public int Retry { get; set; } = 2;
    }
}

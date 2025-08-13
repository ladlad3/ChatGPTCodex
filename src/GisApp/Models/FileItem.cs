using System;
using CommunityToolkit.Mvvm.ComponentModel;

namespace GisApp.Models
{
    /// <summary>スキャン結果を表すモデル</summary>
    public partial class FileItem : ObservableObject
    {
        [ObservableProperty] private bool isSelected;
        public string Path { get; init; } = string.Empty;
        public string Extension { get; init; } = string.Empty;
        public long Size { get; init; }
        public DateTime Modified { get; init; }
        public string Type { get; set; } = string.Empty;
        public string? Epsg { get; set; }
        public string? BandOrFeature { get; set; }
        public string? Driver { get; set; }
        public string Status { get; set; } = "Scanned";
    }
}

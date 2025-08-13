using System;
using System.IO;
using System.Text;
using System.Text.Json;
using GisApp.Models;

namespace GisApp.Services
{
    /// <summary>アプリ設定の読み書きサービス</summary>
    public class SettingsService
    {
        private readonly string _path;

        public SettingsService()
        {
            var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "GisApp");
            Directory.CreateDirectory(dir);
            _path = Path.Combine(dir, "appsettings.json");
        }

        public AppSettings Load()
        {
            if (!File.Exists(_path)) return new AppSettings();
            var json = File.ReadAllText(_path, Encoding.UTF8);
            return JsonSerializer.Deserialize<AppSettings>(json) ?? new AppSettings();
        }

        public void Save(AppSettings settings)
        {
            var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(_path, json, new UTF8Encoding(true));
        }
    }
}

using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.Json;
using CsvHelper;
using CsvHelper.Configuration;
using GisApp.Models;

namespace GisApp.Services
{
    /// <summary>CSV/JSONへのエクスポート機能</summary>
    public class ExportService
    {
        public void ExportCsv(IEnumerable<FileItem> items, string path, char delimiter = ',')
        {
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                Delimiter = delimiter.ToString()
            };
            using var writer = new StreamWriter(path, false, new UTF8Encoding(true));
            using var csv = new CsvWriter(writer, config);
            csv.WriteRecords(items);
        }

        public void ExportJson(IEnumerable<FileItem> items, string path)
        {
            var json = JsonSerializer.Serialize(items, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(path, json, new UTF8Encoding(true));
        }
    }
}

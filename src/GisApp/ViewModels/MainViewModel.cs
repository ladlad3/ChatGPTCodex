using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GisApp.Models;
using GisApp.Services;

namespace GisApp.ViewModels
{
    /// <summary>MainWindowのViewModel</summary>
    public partial class MainViewModel : ObservableObject
    {
        private readonly ScanService _scan = new();
        private readonly ExportService _export = new();
        private readonly BatchService _batch = new();

        [ObservableProperty] private ObservableCollection<FileItem> files = new();
        [ObservableProperty] private string? selectedFolder;
        public string[] Modes { get; } = new[] { "EPSG付与", "EPSG変換", "バンド操作" };
        [ObservableProperty] private string selectedMode = "EPSG付与";
        [ObservableProperty] private string epsgText = "4326";
        [ObservableProperty] private int parallelDegree = 4;
        [ObservableProperty] private double progress;
        [ObservableProperty] private string currentTask = string.Empty;

        public IRelayCommand SelectFolderCommand { get; }
        public IAsyncRelayCommand ScanCommand { get; }
        public IRelayCommand ExportCsvCommand { get; }
        public IRelayCommand ExportJsonCommand { get; }
        public IAsyncRelayCommand StartBatchCommand { get; }
        public IRelayCommand CancelCommand { get; }
        public IRelayCommand OpenSettingsCommand { get; }

        private CancellationTokenSource? _cts;

        public MainViewModel()
        {
            SelectFolderCommand = new RelayCommand(SelectFolder);
            ScanCommand = new AsyncRelayCommand(ScanAsync);
            ExportCsvCommand = new RelayCommand(ExportCsv);
            ExportJsonCommand = new RelayCommand(ExportJson);
            StartBatchCommand = new AsyncRelayCommand(StartBatchAsync);
            CancelCommand = new RelayCommand(() => _cts?.Cancel());
            OpenSettingsCommand = new RelayCommand(() => { });
        }

        private void SelectFolder()
        {
            var dlg = new System.Windows.Forms.FolderBrowserDialog();
            if (dlg.ShowDialog() == System.Windows.Forms.DialogResult.OK)
            {
                SelectedFolder = dlg.SelectedPath;
            }
        }

        private async Task ScanAsync()
        {
            if (string.IsNullOrEmpty(SelectedFolder)) return;
            Files.Clear();
            foreach (var item in _scan.Scan(SelectedFolder))
            {
                Files.Add(item);
                await Task.Yield();
            }
        }

        private void ExportCsv()
        {
            var dlg = new Microsoft.Win32.SaveFileDialog { Filter = "CSV|*.csv" };
            if (dlg.ShowDialog() == true)
            {
                _export.ExportCsv(Files, dlg.FileName);
            }
        }

        private void ExportJson()
        {
            var dlg = new Microsoft.Win32.SaveFileDialog { Filter = "JSON|*.json" };
            if (dlg.ShowDialog() == true)
            {
                _export.ExportJson(Files, dlg.FileName);
            }
        }

        private async Task StartBatchAsync()
        {
            if (Files.Count == 0 || string.IsNullOrEmpty(SelectedFolder)) return;
            _cts = new CancellationTokenSource();
            var targets = Files.Where(f => f.IsSelected).ToList();
            if (targets.Count == 0) targets = Files.ToList();
            int epsg = int.TryParse(EpsgText, out var e) ? e : 4326;
            var settings = new AppSettings { DefaultEpsg = epsg, Parallel = ParallelDegree, OutputFolder = Path.Combine(SelectedFolder, "out") };
            int done = 0;
            foreach (var item in targets)
            {
                if (_cts.IsCancellationRequested) break;
                CurrentTask = item.Path;
                var outPath = _batch.BuildOutputPath(SelectedFolder!, item.Path, settings.OutputFolder);
                switch (SelectedMode)
                {
                    case "EPSG付与":
                        _batch.AssignEpsg(item, epsg, outPath, false);
                        break;
                    case "EPSG変換":
                        _batch.Reproject(item, epsg, outPath, "Nearest", settings, false);
                        break;
                    case "バンド操作":
                        _batch.AddAlpha(item, outPath, false);
                        break;
                }
                item.Status = "Done";
                done++;
                Progress = done * 100.0 / targets.Count;
                await Task.Yield();
            }
            CurrentTask = "";
        }
    }
}

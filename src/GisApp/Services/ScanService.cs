using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using GisApp.Models;
using OSGeo.GDAL;
using OSGeo.OGR;

namespace GisApp.Services
{
    /// <summary>フォルダを再帰的にスキャンしメタ情報を取得するサービス</summary>
    public class ScanService
    {
        private static readonly string[] _extensions = new[] { ".tif", ".tiff", ".shp", ".geojson" };

        public IEnumerable<FileItem> Scan(string folder)
        {
            foreach (var path in Directory.EnumerateFiles(folder, "*.*", SearchOption.AllDirectories)
                .Where(f => _extensions.Contains(Path.GetExtension(f).ToLower())))
            {
                var info = new FileInfo(path);
                var item = new FileItem
                {
                    Path = path,
                    Extension = info.Extension.ToLower(),
                    Size = info.Length,
                    Modified = info.LastWriteTime
                };
                try
                {
                    if (item.Extension == ".tif" || item.Extension == ".tiff")
                    {
                        using var ds = Gdal.Open(path, Access.GA_ReadOnly);
                        item.Type = "TIF";
                        item.Driver = ds.GetDriver().ShortName;
                        item.Epsg = GdalService.GetEpsgFromDataset(ds);
                        item.BandOrFeature = ds.RasterCount.ToString();
                    }
                    else
                    {
                        using var ds = Ogr.Open(path, 0);
                        item.Type = item.Extension == ".shp" ? "SHP" : "GeoJSON";
                        item.Driver = ds.GetDriver().name;
                        var layer = ds.GetLayerByIndex(0);
                        item.Epsg = GdalService.GetEpsgFromLayer(layer);
                        item.BandOrFeature = layer.GetFeatureCount(1).ToString();
                    }
                    item.Status = "OK";
                }
                catch (Exception ex)
                {
                    item.Status = "Error";
                    item.Driver = ex.Message;
                }
                yield return item;
            }
        }
    }
}

using System;
using System.IO;
using GisApp.Models;
using OSGeo.GDAL;

namespace GisApp.Services
{
    /// <summary>GDALを利用したバッチ処理サービス</summary>
    public class BatchService
    {
        public string BuildOutputPath(string root, string sourcePath, string outDir)
        {
            var rel = Path.GetRelativePath(root, sourcePath);
            return Path.Combine(outDir, rel);
        }

        public void AssignEpsg(FileItem item, int epsg, string outPath, bool overwrite)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
            if (File.Exists(outPath) && !overwrite) return;
            if (item.Extension == ".tif" || item.Extension == ".tiff")
            {
                using var src = Gdal.Open(item.Path, Access.GA_ReadOnly);
                var driver = src.GetDriver();
                using var dst = driver.CreateCopy(outPath, src, 0, new string[] { });
                var wkt = GdalService.GetWktFromEpsg(epsg);
                dst.SetProjection(wkt);
            }
            else if (item.Extension == ".shp")
            {
                File.Copy(item.Path, outPath, overwrite);
                var wkt = GdalService.GetWktFromEpsg(epsg);
                File.WriteAllText(Path.ChangeExtension(outPath, ".prj"), wkt ?? "");
            }
            else if (item.Extension == ".geojson")
            {
                var opt = new VectorTranslateOptions(new[] { "-t_srs", $"EPSG:{epsg}" });
                Gdal.VectorTranslate(outPath, new[] { item.Path }, opt, null, null);
            }
        }

        public void Reproject(FileItem item, int epsg, string outPath, string resample, AppSettings opt, bool overwrite)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
            if (File.Exists(outPath) && !overwrite) return;
            if (item.Extension == ".tif" || item.Extension == ".tiff")
            {
                using var src = Gdal.Open(item.Path, Access.GA_ReadOnly);
                var warpOpts = new WarpOptions
                {
                    DestinationSRS = $"EPSG:{epsg}",
                    ResampleAlg = resample switch
                    {
                        "Bilinear" => ResampleAlg.Bilinear,
                        "Cubic" => ResampleAlg.Cubic,
                        _ => ResampleAlg.NearestNeighbour
                    }
                };
                warpOpts.SetWarpOption("COMPRESS", opt.Compression);
                warpOpts.SetWarpOption("TILED", opt.Tiled ? "YES" : "NO");
                Gdal.Warp(outPath, new Dataset[] { src }, warpOpts);
            }
            else
            {
                var vecOpt = new VectorTranslateOptions(new[] { "-t_srs", $"EPSG:{epsg}" });
                Gdal.VectorTranslate(outPath, new[] { item.Path }, vecOpt, null, null);
            }
        }

        public void AddAlpha(FileItem item, string outPath, bool overwrite)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
            if (File.Exists(outPath) && !overwrite) return;
            var opts = new GDALTranslateOptions(new[] { "-b", "1", "-b", "2", "-b", "3", "-mask", "1", "-b", "mask" });
            Gdal.Translate(outPath, item.Path, opts);
        }

        public void AddConstBand(FileItem item, string outPath, byte value, bool overwrite)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
            if (File.Exists(outPath) && !overwrite) return;
            using var src = Gdal.Open(item.Path, Access.GA_ReadOnly);
            var driver = Gdal.GetDriverByName("GTiff");
            using var dst = driver.CreateCopy(outPath, src, 0, new string[] { });
            dst.AddBand(DataType.GDT_Byte, new string[] { });
            var band = dst.GetRasterBand(dst.RasterCount);
            var buffer = new byte[src.RasterXSize * src.RasterYSize];
            for (int i = 0; i < buffer.Length; i++) buffer[i] = value;
            band.WriteRaster(0, 0, src.RasterXSize, src.RasterYSize, buffer, src.RasterXSize, src.RasterYSize, 0, 0);
            band.FlushCache();
        }
    }
}

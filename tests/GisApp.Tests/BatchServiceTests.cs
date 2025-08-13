using System.IO;
using GisApp.Models;
using GisApp.Services;
using Xunit;

namespace GisApp.Tests
{
    public class BatchServiceTests
    {
        [Fact]
        public void BuildOutputPath_KeepRelative()
        {
            var svc = new BatchService();
            var path = svc.BuildOutputPath("/root", "/root/a/b.tif", "/out");
            Assert.EndsWith(Path.Combine("a", "b.tif"), path);
        }

        [Fact]
        public void SkipWhenExists()
        {
            var svc = new BatchService();
            var tmp = Path.GetTempFileName();
            var item = new FileItem { Path = tmp, Extension = ".tif" };
            var outPath = tmp + "_out.tif";
            File.WriteAllText(outPath, "old");
            svc.AssignEpsg(item, 4326, outPath, false);
            Assert.Equal("old", File.ReadAllText(outPath));
            File.Delete(tmp);
            File.Delete(outPath);
        }
    }
}

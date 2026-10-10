using System.Runtime.InteropServices;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;

namespace AssetDesk.Core;

// Windows ships winsqlite3. Use its C API so the first build needs no NuGet dependencies.
public sealed class WorkspaceStore : IDisposable
{
    private IntPtr db;
    private Dictionary<string, Dictionary<string, string>> persisted = [];
    private string persistedVersion = "";
    public SaveStatistics LastSave { get; private set; } = new(0, 0, 0);
    public sealed record SaveStatistics(int Written, int Deleted, int Unchanged);
    public WorkspaceStore(string path)
    {
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(System.IO.Path.GetFullPath(path))!);
        Check(Native.sqlite3_open_v2(path, out db, 6, IntPtr.Zero));
        try
        {
            Exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
            var version = Read("PRAGMA user_version;").FirstOrDefault();
            if (version != "0" && version != "1" && version != "2" && version != "3") throw new InvalidOperationException("索引版本高于当前应用，请使用新版，不能覆盖数据。");
            // v2 provider profiles are additive JSON settings; v3 adds separate cache tables.
            // v1/v2 assets and settings remain untouched during migration.
            Exec("CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS suggestions(id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS scan_cache(id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS analysis_cache(id TEXT PRIMARY KEY,payload TEXT NOT NULL); PRAGMA user_version=3;");
        }
        catch { Dispose(); throw; }
    }
    public Workspace Load()
    {
        var settings = Read("SELECT payload FROM settings WHERE id='workspace';").FirstOrDefault();
        var workspace = settings == null ? new Workspace() : JsonSerializer.Deserialize<Workspace>(settings) ?? throw new InvalidDataException("索引设置无效。");
        workspace.Assets = Read("SELECT payload FROM assets ORDER BY rowid;").Select(p => JsonSerializer.Deserialize<Asset>(p) ?? throw new InvalidDataException("资产记录无效。")).ToList();
        workspace.Suggestions = Read("SELECT payload FROM suggestions ORDER BY rowid;").Select(p => JsonSerializer.Deserialize<Suggestion>(p) ?? throw new InvalidDataException("建议记录无效。")).ToList();
        workspace.Reports = Read("SELECT payload FROM reports ORDER BY rowid;").Select(p => JsonSerializer.Deserialize<ScanReport>(p) ?? throw new InvalidDataException("扫描记录无效。")).ToList();
        workspace.ScanCache = Read("SELECT payload FROM scan_cache ORDER BY rowid;").Select(p => JsonSerializer.Deserialize<ScanSnapshot>(p) ?? throw new InvalidDataException("扫描缓存无效。")).ToList();
        workspace.AnalysisCache = Read("SELECT payload FROM analysis_cache ORDER BY rowid;").Select(p => JsonSerializer.Deserialize<AnalysisSnapshot>(p) ?? throw new InvalidDataException("分析缓存无效。")).ToList();
        return workspace;
    }
    public void Save(Workspace workspace)
    {
        Exec("BEGIN IMMEDIATE;");
        var dataVersion = "";
        var next = new Dictionary<string, Dictionary<string, string>>();
        var written = 0; var deleted = 0; var unchanged = 0;
        void Sync(string table, IEnumerable<(string Id, string Payload)> rows)
        {
            var previous = persisted.TryGetValue(table, out var known) ? known : ReadStoredHashes(table);
            var current = new Dictionary<string, string>();
            IEnumerable<(string Id, string Payload)> Changes()
            {
                foreach (var row in rows)
                {
                    var hash = Fingerprint(row.Payload);
                    if (!current.TryAdd(row.Id, hash)) throw new InvalidDataException("重复索引身份，保存已回滚。");
                    if (previous.TryGetValue(row.Id, out var prior) && prior == hash) unchanged++;
                    else { written++; yield return row; }
                }
            }
            // Stream changed payloads through one prepared statement instead of retaining all JSON.
            WriteRows(table, Changes());
            foreach (var id in previous.Keys.Where(id => !current.ContainsKey(id))) { DeleteRow(table, id); deleted++; }
            next[table] = current;
        }
        try
        {
            dataVersion = Read("PRAGMA data_version;").Single();
            if (dataVersion != persistedVersion) persisted.Clear();
            Sync("assets", workspace.Assets.Select(a => (a.Id, JsonSerializer.Serialize(a))));
            Sync("suggestions", workspace.Suggestions.Select(a => (a.Id, JsonSerializer.Serialize(a))));
            Sync("reports", workspace.Reports.TakeLast(100).Select((a, i) => (i.ToString(), JsonSerializer.Serialize(a))));
            Sync("scan_cache", workspace.ScanCache.Select(a => (a.Key, JsonSerializer.Serialize(a))));
            Sync("analysis_cache", workspace.AnalysisCache.TakeLast(200).Select(a => (a.Key, JsonSerializer.Serialize(a))));
            var settings = new Workspace { Endpoint = workspace.Endpoint, Model = workspace.Model, ProviderId = workspace.ProviderId, ProviderSettings = workspace.ProviderSettings, AppIconView = workspace.AppIconView, ShowSystemApps = workspace.ShowSystemApps };
            Sync("settings", [("workspace", JsonSerializer.Serialize(settings))]);
            Exec("COMMIT;");
            persisted = next; persistedVersion = dataVersion; LastSave = new(written, deleted, unchanged);
        }
        catch { Exec("ROLLBACK;"); throw; }
    }
    private static string Fingerprint(string payload) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload)));
    private Dictionary<string, string> ReadStoredHashes(string table)
    {
        Check(Native.sqlite3_prepare_v2(db, $"SELECT id,payload FROM {table};", -1, out var statement, IntPtr.Zero));
        var rows = new Dictionary<string, string>();
        try
        {
            int rc;
            while ((rc = Native.sqlite3_step(statement)) == 100)
            {
                var id = Marshal.PtrToStringUTF8(Native.sqlite3_column_text(statement, 0)) ?? "";
                rows.Add(id, Fingerprint(Marshal.PtrToStringUTF8(Native.sqlite3_column_text(statement, 1)) ?? ""));
            }
            if (rc != 101) Check(rc);
            return rows;
        }
        finally { Native.sqlite3_finalize(statement); }
    }
    private void DeleteRow(string table, string id)
    {
        Check(Native.sqlite3_prepare_v2(db, $"DELETE FROM {table} WHERE id=?1;", -1, out var statement, IntPtr.Zero));
        try
        {
            Check(Native.sqlite3_bind_text(statement, 1, id, -1, new IntPtr(-1)));
            var rc = Native.sqlite3_step(statement); if (rc != 101) Check(rc);
        }
        finally { Native.sqlite3_finalize(statement); }
    }
    private void WriteRows(string table, IEnumerable<(string Id, string Payload)> rows)
    {
        Check(Native.sqlite3_prepare_v2(db, $"INSERT INTO {table}(id,payload) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload;", -1, out var statement, IntPtr.Zero));
        try
        {
            foreach (var row in rows)
            {
                Check(Native.sqlite3_bind_text(statement, 1, row.Id, -1, new IntPtr(-1)));
                Check(Native.sqlite3_bind_text(statement, 2, row.Payload, -1, new IntPtr(-1)));
                var rc = Native.sqlite3_step(statement);
                if (rc != 101) Check(rc);
                Check(Native.sqlite3_reset(statement));
                Check(Native.sqlite3_clear_bindings(statement));
            }
        }
        finally { Native.sqlite3_finalize(statement); }
    }
    private List<string> Read(string sql)
    {
        Check(Native.sqlite3_prepare_v2(db, sql, -1, out var statement, IntPtr.Zero));
        var rows = new List<string>();
        try
        {
            int rc;
            while ((rc = Native.sqlite3_step(statement)) == 100) rows.Add(Marshal.PtrToStringUTF8(Native.sqlite3_column_text(statement, 0)) ?? "");
            if (rc != 101) Check(rc);
            return rows;
        }
        finally { Native.sqlite3_finalize(statement); }
    }
    private void Exec(string sql) => Check(Native.sqlite3_exec(db, sql, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero));
    private void Check(int rc) { if (rc != 0) throw new IOException($"SQLite ({rc})：{Marshal.PtrToStringUTF8(Native.sqlite3_errmsg(db))}"); }
    public void Dispose() { if (db != IntPtr.Zero) { Native.sqlite3_close(db); db = IntPtr.Zero; } }
    private static class Native
    {
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern int sqlite3_open_v2([MarshalAs(UnmanagedType.LPUTF8Str)] string path, out IntPtr db, int flags, IntPtr vfs);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern int sqlite3_close(IntPtr db);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern IntPtr sqlite3_errmsg(IntPtr db);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern int sqlite3_exec(IntPtr db, [MarshalAs(UnmanagedType.LPUTF8Str)] string sql, IntPtr callback, IntPtr arg, IntPtr error);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern int sqlite3_prepare_v2(IntPtr db, [MarshalAs(UnmanagedType.LPUTF8Str)] string sql, int length, out IntPtr statement, IntPtr tail);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern int sqlite3_bind_text(IntPtr statement, int index, [MarshalAs(UnmanagedType.LPUTF8Str)] string value, int length, IntPtr destructor);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern int sqlite3_step(IntPtr statement);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern int sqlite3_reset(IntPtr statement);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern int sqlite3_clear_bindings(IntPtr statement);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern IntPtr sqlite3_column_text(IntPtr statement, int index);
        [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)] internal static extern int sqlite3_finalize(IntPtr statement);
    }
}

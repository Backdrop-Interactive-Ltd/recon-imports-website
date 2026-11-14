using System;
using System.Drawing;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security;
using System.Text;
using System.Windows.Forms;

// Operator-only Windows helper. It cannot create roles or change the migrator.
public static class ReconRuntimePassword
{
    public static bool SafeCharacters(string value)
    {
        if (value == null) return false;
        foreach (char c in value) if (c < 33 || c > 126) return false;
        return true;
    }
    public static string ConfirmationStatus(string first, string second)
    {
        if (!SafeCharacters(first) || !SafeCharacters(second)) return "USE_SINGLE_LINE_PRINTABLE_ASCII";
        if (first.Length < 24 || first.Length > 128) return "USE_24_TO_128_CHARACTERS";
        return String.Equals(first, second, StringComparison.Ordinal) ? "MATCH" : "PASSWORDS_DO_NOT_MATCH";
    }
    public sealed class PasswordBox : TextBox
    {
        public PasswordBox() { UseSystemPasswordChar = true; Multiline = false; MaxLength = 128; }
        protected override void WndProc(ref Message message)
        {
            if (message.Msg == 0x302) // Reject multiline/hidden clipboard characters; never trim secrets.
            {
                string pasted = Clipboard.GetText(TextDataFormat.UnicodeText);
                if (!SafeCharacters(pasted) || pasted.Length > 128) { System.Media.SystemSounds.Beep.Play(); return; }
            }
            base.WndProc(ref message);
        }
    }
    public static Form CreateDialog()
    {
        var form = new Form { Text = "RECON IMPORTS - Confirm recon_runtime password", ClientSize = new Size(570, 250), FormBorderStyle = FormBorderStyle.FixedDialog, StartPosition = FormStartPosition.CenterScreen, MaximizeBox = false, MinimizeBox = false, TopMost = true };
        var description = new Label { Text = "Only recon_runtime changes. recon_migrator stays unchanged.\nUse a saved password with 24-128 printable ASCII characters, without spaces.", Location = new Point(18, 15), Size = new Size(535, 40) };
        var first = new PasswordBox { Name = "RuntimePassword", Location = new Point(195, 70), Size = new Size(355, 24), TabIndex = 0 };
        var second = new PasswordBox { Name = "RuntimeConfirmation", Location = new Point(195, 110), Size = new Size(355, 24), TabIndex = 1 };
        var status = new Label { Name = "ConfirmationStatus", Location = new Point(18, 155), Size = new Size(535, 25) };
        var confirm = new Button { Name = "ConfirmPassword", Text = "Confirm password", Location = new Point(290, 200), Size = new Size(135, 30), Enabled = false, TabIndex = 2 };
        var cancel = new Button { Text = "Cancel", Location = new Point(435, 200), Size = new Size(115, 30), DialogResult = DialogResult.Cancel, TabIndex = 3 };
        EventHandler validate = delegate { string code = ConfirmationStatus(first.Text, second.Text); status.Text = code == "MATCH" ? "Entries match. Save this password in your password manager." : code.Replace('_', ' '); confirm.Enabled = code == "MATCH"; };
        first.TextChanged += validate; second.TextChanged += validate;
        confirm.Click += delegate {
            if (ConfirmationStatus(first.Text, second.Text) != "MATCH") return;
            var secret = new SecureString(); foreach (char c in first.Text) secret.AppendChar(c); secret.MakeReadOnly();
            form.Tag = secret; first.Clear(); second.Clear(); form.DialogResult = DialogResult.OK;
        };
        form.Controls.AddRange(new Control[] { description, new Label { Text = "New runtime password", Location = new Point(18, 73), AutoSize = true }, first, new Label { Text = "Repeat runtime password", Location = new Point(18, 113), AutoSize = true }, second, status, confirm, cancel });
        form.AcceptButton = confirm; form.CancelButton = cancel;
        return form;
    }
    public static SecureString Prompt()
    {
        using (Form form = CreateDialog())
        {
            try { if (form.ShowDialog() != DialogResult.OK) throw new InvalidOperationException("PASSWORD_ENTRY_CANCELLED"); return (SecureString)form.Tag; }
            finally { foreach (Control control in form.Controls) if (control is TextBox) ((TextBox)control).Clear(); }
        }
    }
    private static Dictionary<string, SecureString> PromptFields(string title, string description, string[] names, string[] labels)
    {
        using (var form = new Form { Text = title, ClientSize = new Size(650, 140 + names.Length * 42), FormBorderStyle = FormBorderStyle.FixedDialog, StartPosition = FormStartPosition.CenterScreen, MaximizeBox = false, MinimizeBox = false, TopMost = true })
        {
            form.Controls.Add(new Label { Text = description, Location = new Point(18, 15), Size = new Size(610, 42) });
            var fields = new TextBox[names.Length];
            var accept = new Button { Text = "Verify existing credentials", Location = new Point(325, 90 + names.Length * 42), Size = new Size(180, 30), Enabled = false };
            var cancel = new Button { Text = "Cancel", Location = new Point(515, 90 + names.Length * 42), Size = new Size(110, 30), DialogResult = DialogResult.Cancel };
            EventHandler validate = delegate { bool ready = true; foreach (TextBox field in fields) if (field == null || field.Text.Length == 0) ready = false; accept.Enabled = ready; };
            for (int i = 0; i < names.Length; i++)
            {
                fields[i] = new TextBox { Name = names[i], UseSystemPasswordChar = true, Multiline = false, Location = new Point(295, 65 + i * 42), Size = new Size(330, 24), TabIndex = i };
                fields[i].TextChanged += validate;
                form.Controls.Add(new Label { Text = labels[i], Location = new Point(18, 68 + i * 42), Size = new Size(275, 24) }); form.Controls.Add(fields[i]);
            }
            accept.TabIndex = names.Length; cancel.TabIndex = names.Length + 1;
            accept.Click += delegate {
                var secrets = new Dictionary<string, SecureString>();
                for (int i = 0; i < fields.Length; i++) { var secret = new SecureString(); foreach (char c in fields[i].Text) secret.AppendChar(c); secret.MakeReadOnly(); secrets.Add(names[i], secret); fields[i].Clear(); }
                form.Tag = secrets; form.DialogResult = DialogResult.OK;
            };
            form.Controls.Add(accept); form.Controls.Add(cancel); form.AcceptButton = accept; form.CancelButton = cancel;
            try { if (form.ShowDialog() != DialogResult.OK) throw new InvalidOperationException("PASSWORD_ENTRY_CANCELLED"); return (Dictionary<string, SecureString>)form.Tag; }
            finally { foreach (TextBox field in fields) field.Clear(); }
        }
    }
    public static Dictionary<string, SecureString> PromptCredentials()
    {
        return PromptFields("RECON IMPORTS - Existing credentials only", "Enter existing saved secrets here. The NEW runtime password is requested later in a separate confirmation dialog.", new[] { "backup", "operator", "migrator" }, new[] { "EXISTING backup encryption passphrase", "EXISTING Supabase operator password", "EXISTING recon_migrator password" });
    }
    public static Dictionary<string, SecureString> PromptOperatorCredentials()
    {
        return PromptFields("RECON IMPORTS - Read-only password state", "Read-only inspection only. No password changes or migrations.", new[] { "backup", "operator" }, new[] { "EXISTING backup encryption passphrase", "EXISTING Supabase operator password" });
    }
    public static Dictionary<string, SecureString> PromptMigrationCredentials()
    {
        return PromptFields("RECON IMPORTS - Authorized migrations and import", "Use existing saved credentials. No role creation or password changes will run.", new[] { "backup", "migrator", "runtime" }, new[] { "EXISTING backup encryption passphrase", "EXISTING recon_migrator password", "EXISTING recon_runtime password" });
    }
    public static SecureString PromptExistingRuntime()
    {
        return PromptFields("RECON IMPORTS - Existing runtime login", "Runtime is already configured. Its password will be preserved; enter the existing password for read-only verification.", new[] { "runtime" }, new[] { "EXISTING recon_runtime password" })["runtime"];
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern IntPtr LoadLibraryEx(string file, IntPtr reserved, uint flags);
    [DllImport("kernel32.dll", CharSet = CharSet.Ansi)] private static extern IntPtr GetProcAddress(IntPtr module, string name);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern int PQlibVersion();
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern IntPtr PQconnectdb([MarshalAs(UnmanagedType.LPStr)] string service);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern int PQstatus(IntPtr connection);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern IntPtr PQerrorMessage(IntPtr connection);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern int PQsslInUse(IntPtr connection);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern IntPtr PQexec(IntPtr connection, [MarshalAs(UnmanagedType.LPStr)] string sql);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern IntPtr PQchangePassword(IntPtr connection, [MarshalAs(UnmanagedType.LPStr)] string role, IntPtr password);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern int PQresultStatus(IntPtr result);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern int PQntuples(IntPtr result);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern IntPtr PQgetvalue(IntPtr result, int row, int column);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern IntPtr PQresultErrorField(IntPtr result, int field);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern void PQclear(IntPtr result);
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern void PQfinish(IntPtr connection);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] private delegate void Notice(IntPtr arg, IntPtr message);
    private static readonly Notice IgnoreNotice = delegate { };
    [DllImport("libpq.dll", CallingConvention = CallingConvention.Cdecl)] private static extern IntPtr PQsetNoticeProcessor(IntPtr connection, Notice callback, IntPtr arg);
    public static int InitializeLibrary(string file)
    {
        string expected = Path.GetFullPath(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ReconImports/PostgreSQL-17.11-rehearsal/pgsql/bin/libpq.dll"));
        if (!String.Equals(Path.GetFullPath(file), expected, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("UNEXPECTED_LIBPQ_PATH");
        IntPtr module = LoadLibraryEx(expected, IntPtr.Zero, 0x100 | 0x1000);
        if (module == IntPtr.Zero || GetProcAddress(module, "PQchangePassword") == IntPtr.Zero) throw new InvalidOperationException("POSTGRES_CLIENT_API_UNAVAILABLE");
        int version = PQlibVersion(); if (version < 170000 || version >= 180000) throw new InvalidOperationException("POSTGRES_CLIENT_VERSION_MISMATCH"); return version;
    }
    private static string ConnectionFailure(IntPtr connection)
    {
        string text = connection == IntPtr.Zero ? "" : (Marshal.PtrToStringAnsi(PQerrorMessage(connection)) ?? "").ToLowerInvariant();
        if (text.Contains("definition of service") || text.Contains("service file")) return "LIBPQ_SERVICE_FILE_UNAVAILABLE";
        if (text.Contains("no password supplied")) return "LIBPQ_PASSWORD_FILE_UNAVAILABLE";
        if (text.Contains("password authentication failed")) return "LIBPQ_AUTHENTICATION_FAILED";
        if (text.Contains("certificate") || text.Contains("ssl error")) return "LIBPQ_TLS_VERIFICATION_FAILED";
        if (text.Contains("could not translate host")) return "LIBPQ_DNS_FAILED";
        if (text.Contains("connection refused")) return "LIBPQ_CONNECTION_REFUSED";
        if (text.Contains("timeout expired")) return "LIBPQ_CONNECTION_TIMEOUT";
        return "LIBPQ_CONNECTION_FAILED";
    }
    // Offline diagnostic only: fixed loopback port 1, never a database/write target.
    public static string ProbeSyntheticConnection(bool service)
    {
        string parameters = "host=127.0.0.1 port=1 user=offline_probe dbname=postgres password='' sslmode=disable connect_timeout=1";
        IntPtr connection = PQconnectdb((service ? "service=recon_launch06_offline_probe " : "") + parameters);
        try { return PQstatus(connection) == 0 ? "UNEXPECTED_LOCAL_SERVICE" : ConnectionFailure(connection); }
        finally { if (connection != IntPtr.Zero) PQfinish(connection); }
    }
    public static string ProbeSyntheticEmptyService()
    {
        IntPtr connection = PQconnectdb("service='' host=127.0.0.1 port=1 user=offline_probe dbname=postgres password='' sslmode=disable connect_timeout=1");
        try { return PQstatus(connection) == 0 ? "UNEXPECTED_LOCAL_SERVICE" : ConnectionFailure(connection); }
        finally { if (connection != IntPtr.Zero) PQfinish(connection); }
    }
    private static void RequireResult(IntPtr result, int expected)
    {
        if (result != IntPtr.Zero && PQresultStatus(result) == expected) return;
        string state = result == IntPtr.Zero ? null : Marshal.PtrToStringAnsi(PQresultErrorField(result, 67));
        if (state == null || !System.Text.RegularExpressions.Regex.IsMatch(state, "^[A-Z0-9]{5}$")) state = "UNKNOWN";
        throw new InvalidOperationException("LIBPQ_SQLSTATE_" + state); // Never include raw errors, SQL or verifier.
    }
    private static string Scalar(IntPtr connection, string sql)
    {
        IntPtr result = PQexec(connection, sql);
        try { RequireResult(result, 2); if (PQntuples(result) != 1) throw new InvalidOperationException("PASSWORD_STATE_UNVERIFIED"); return Marshal.PtrToStringAnsi(PQgetvalue(result, 0, 0)); }
        finally { if (result != IntPtr.Zero) PQclear(result); }
    }
    private static void Command(IntPtr connection, string sql)
    {
        IntPtr result = PQexec(connection, sql); try { RequireResult(result, 1); } finally { if (result != IntPtr.Zero) PQclear(result); }
    }
    public static string ConnectionValue(string value)
    {
        if (value == null || value.IndexOfAny(new[] { '\r', '\n', '\0' }) >= 0) throw new InvalidOperationException("CONNECTION_PARAMETERS_INVALID");
        return "'" + value.Replace("\\", "\\\\").Replace("'", "\\'") + "'";
    }
    private static string ExplicitConnection(string directory)
    {
        string root = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), ".local/launch06"));
        string full = Path.GetFullPath(directory);
        if (!String.Equals(Path.GetDirectoryName(full), root, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("CONNECTION_PARAMETERS_INVALID");
        var options = new Dictionary<string, string>();
        foreach (string line in File.ReadAllLines(Path.Combine(full, "connection.service.tmp")))
        {
            if (line.Length == 0 || line[0] == '[') continue;
            int equals = line.IndexOf('='); if (equals < 1) throw new InvalidOperationException("CONNECTION_PARAMETERS_INVALID");
            options.Add(line.Substring(0, equals), line.Substring(equals + 1));
        }
        if (options["port"] != "5432" || options["dbname"] != "postgres" || options["sslmode"] != "verify-full" || !options["user"].StartsWith("postgres.", StringComparison.Ordinal) || !options["host"].EndsWith(".pooler.supabase.com", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("CONNECTION_PARAMETERS_INVALID");
        string certificate = Path.GetFullPath(options["sslrootcert"]), passfile = Path.Combine(full, "connection.pgpass.tmp");
        if (!String.Equals(certificate, Path.Combine(full, "connection-ca.tmp"), StringComparison.OrdinalIgnoreCase) || !File.Exists(certificate) || !File.Exists(passfile)) throw new InvalidOperationException("CONNECTION_PARAMETERS_INVALID");
        // Explicit options avoid the native CRT's stale environment snapshot.
        // The operator password stays in its short-lived protected passfile.
        var result = new StringBuilder("password='' sslmode=verify-full gssencmode=disable client_encoding=UTF8 connect_timeout=12");
        foreach (string key in new[] { "host", "port", "dbname", "user" }) result.Append(" ").Append(key).Append("=").Append(ConnectionValue(options[key]));
        result.Append(" sslrootcert=").Append(ConnectionValue(certificate)).Append(" passfile=").Append(ConnectionValue(passfile));
        return result.ToString();
    }
    public static string SetMissingRuntimePassword(SecureString password, string directory)
    {
        if (password == null || password.Length < 24 || password.Length > 128) throw new InvalidOperationException("PASSWORD_FORMAT_INVALID");
        IntPtr connection = IntPtr.Zero, bstr = IntPtr.Zero, utf8 = IntPtr.Zero; byte[] bytes = null; char[] chars = null; bool transaction = false;
        try
        {
            bstr = Marshal.SecureStringToBSTR(password); chars = new char[password.Length];
            for (int i = 0; i < chars.Length; i++) { chars[i] = (char)Marshal.ReadInt16(bstr, i * 2); if (chars[i] < 33 || chars[i] > 126) throw new InvalidOperationException("PASSWORD_FORMAT_INVALID"); }
            bytes = Encoding.UTF8.GetBytes(chars); utf8 = Marshal.AllocHGlobal(bytes.Length + 1); Marshal.Copy(bytes, 0, utf8, bytes.Length); Marshal.WriteByte(utf8, bytes.Length, 0);
            connection = PQconnectdb(ExplicitConnection(directory));
            if (connection == IntPtr.Zero || PQstatus(connection) != 0) throw new InvalidOperationException(ConnectionFailure(connection));
            PQsetNoticeProcessor(connection, IgnoreNotice, IntPtr.Zero);
            if (PQsslInUse(connection) != 1) throw new InvalidOperationException("TLS_REQUIRED");
            if (Scalar(connection, "SELECT current_database()='postgres' AND current_user='postgres' AND current_setting('server_version_num')::int BETWEEN 170000 AND 179999") != "t") throw new InvalidOperationException("TARGET_IDENTITY_MISMATCH");
            Command(connection, "BEGIN READ WRITE"); transaction = true;
            Command(connection, "SET LOCAL statement_timeout='30s'");
            if (Scalar(connection, "SELECT rolpassword IS NULL FROM pg_authid WHERE rolname='recon_runtime'") != "t") throw new InvalidOperationException("RUNTIME_ALREADY_CONFIGURED_NO_OVERWRITE");
            if (Scalar(connection, "SELECT rolpassword IS NOT NULL FROM pg_authid WHERE rolname='recon_migrator'") != "t") throw new InvalidOperationException("MIGRATOR_PASSWORD_MUST_BE_PRESERVED");
            Command(connection, "SET LOCAL password_encryption='scram-sha-256'");
            IntPtr changed = PQchangePassword(connection, "recon_runtime", utf8);
            try { RequireResult(changed, 1); } finally { if (changed != IntPtr.Zero) PQclear(changed); }
            Command(connection, "COMMIT"); transaction = false; return "RUNTIME_PASSWORD_SET";
        }
        finally
        {
            if (transaction) { IntPtr rollback = PQexec(connection, "ROLLBACK"); if (rollback != IntPtr.Zero) PQclear(rollback); }
            if (connection != IntPtr.Zero) PQfinish(connection);
            if (utf8 != IntPtr.Zero) { for (int i = 0; i <= (bytes == null ? 0 : bytes.Length); i++) Marshal.WriteByte(utf8, i, 0); Marshal.FreeHGlobal(utf8); }
            if (bstr != IntPtr.Zero) Marshal.ZeroFreeBSTR(bstr);
            if (bytes != null) Array.Clear(bytes, 0, bytes.Length); if (chars != null) Array.Clear(chars, 0, chars.Length);
        }
    }
}

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

// PENTING: Sesuaikan "WcpBackend.Data" dengan nama folder tempat file AppDbContext.cs Anda berada
using WcpBackend.Data; 

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. BAGIAN PENDAFTARAN SERVIS (DI DAPUR)
// ==========================================

// Daftarkan Controllers
builder.Services.AddControllers();

// Daftarkan Swagger (Dokumentasi API)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Daftarkan CORS (Agar React tidak diblokir saat minta data)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()   
              .AllowAnyMethod()   
              .AllowAnyHeader();  
    });
});

// ==========================================
// 🔥 PERBAIKAN: DAFTARKAN DATABASE DI SINI 🔥
// ==========================================
builder.Services.AddDbContext<AppDbContext>(options =>
{
    // Cek appsettings.json Anda, pastikan nama connection string-nya "DefaultConnection"
    
    // OPSI 1: Gunakan ini jika Anda memakai SQLite (File .db)
    // options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"));
    
    // OPSI 2: Gunakan ini jika Anda memakai SQL Server (Matikan opsi SQLite di atas, nyalakan ini)
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

var app = builder.Build();


// ==========================================
// 2. BAGIAN PENGATURAN MESIN (MIDDLEWARE)
// PERHATIAN: Urutan di bawah ini sangat penting!
// ==========================================

// Nyalakan Swagger secara paksa bahkan saat di IIS Production
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "WCP 4 API v1");
    // Kosongkan RoutePrefix agar Swagger langsung muncul di localhost:8888 (tanpa /swagger)
    c.RoutePrefix = string.Empty; 
});

// Nyalakan CORS (Wajib SEBELUM Authorization)
app.UseCors("AllowAll");

// Nyalakan sistem otorisasi standar
app.UseAuthorization();

// Arahkan URL (/api/...) ke Controller
app.MapControllers();

// Jalankan!
app.Run();
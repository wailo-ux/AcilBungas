using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

// Sesuaikan "WcpBackend.Data" dengan nama folder tempat file AppDbContext.cs Anda berada
using WcpBackend.Data; 

var builder = WebApplication.CreateBuilder(args);


// Daftarkan Controllers
builder.Services.AddControllers();

// Daftarkan Swagger (Dokumentasi API)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Daftarkan CORS (Agar React tidak diblokir saat minta data)
builder.Services.AddCors(options =>
{
    // Nama polisinya adalah "AllowReactApp"
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:2005","http://topswspu401:2005")   
              .AllowAnyMethod()   
              .AllowAnyHeader();  
    });
});


builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

var app = builder.Build();



// Nyalakan Swagger secara paksa bahkan saat di IIS Production
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "WCP 4 API v1");
    // Kosongkan RoutePrefix agar Swagger langsung muncul di localhost:8888 (tanpa /swagger)
    c.RoutePrefix = string.Empty; 
});

// 1. Nyalakan Routing (Penting untuk ditaruh sebelum CORS di IIS)
app.UseRouting();

// 2. Nyalakan CORS (Panggil nama polisi yang BENAR)
app.UseCors("AllowReactApp");

// 3. Nyalakan sistem otorisasi standar
app.UseAuthorization();

// 4. Arahkan URL (/api/...) ke Controller
app.MapControllers();

// Jalankan!
app.Run();
using Microsoft.EntityFrameworkCore;
using WcpBackend.Data;
using WcpBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Tambahkan konfigurasi SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Daftarkan MQTT Worker sebagai Background Service
builder.Services.AddHostedService<MqttWorker>();

// 3. Tambahkan konfigurasi CORS agar React bisa menembak API ini
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Port default Vite React
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();

var app = builder.Build();

app.UseCors("AllowReactApp");
app.MapControllers();

app.Run();